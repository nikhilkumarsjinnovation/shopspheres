import { createClient } from '@supabase/supabase-js';
import {
  generateProductKnowledgeChunk,
  getTenantLearningStats,
  syncTenantKnowledge,
  retrieveTenantProducts,
  softDeleteProduct,
  restoreProduct,
  executeRagChat,
  isProductSoftDeleted,
  getProductGracePeriodInfo,
  type RagUserContext,
} from '../src/services/rag-service';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting Multi-Tenant RAG & Soft Deletion Tests');
  console.log('====================================================\n');

  // 1. Fetch two distinct sellers from the database
  const { data: sellers, error: sellersErr } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('role', 'seller')
    .limit(2);

  if (sellersErr || !sellers || sellers.length < 2) {
    throw new Error('Need at least 2 sellers to test multi-tenant isolation.');
  }

  const sellerA = sellers[0];
  const sellerB = sellers[1];

  console.log(`✅ Seller A: ${sellerA.email} (${sellerA.id})`);
  console.log(`✅ Seller B: ${sellerB.email} (${sellerB.id})\n`);

  const userContextA: RagUserContext = {
    userId: sellerA.id,
    role: 'seller',
    shopName: `${sellerA.full_name}'s Store`,
  };

  const userContextB: RagUserContext = {
    userId: sellerB.id,
    role: 'seller',
    shopName: `${sellerB.full_name}'s Store`,
  };

  const adminContext: RagUserContext = {
    userId: 'admin-test-id',
    role: 'admin',
    shopName: 'Platform Global',
  };

  // 2. Test Learning Stats for Seller A
  console.log('--- Test 1: Real-time Learning Progress & Stats ---');
  const statsA = await getTenantLearningStats(supabase as any, userContextA);
  console.log(`Seller A Catalog Stats:
  - Total Products: ${statsA.totalProducts}
  - Active: ${statsA.activeProducts}
  - Learned: ${statsA.learnedProducts}
  - Pending: ${statsA.pendingProducts}
  - Grace Period: ${statsA.gracePeriodProducts}
  - Coverage: ${statsA.learningPercentage}%`);

  if (statsA.pendingProducts > 0) {
    console.log(`\nSyncing knowledge base for Seller A (${statsA.pendingProducts} pending)...`);
    const syncRes = await syncTenantKnowledge(supabase as any, userContextA, 5);
    console.log(`Synced ${syncRes.learnedCount} products. New coverage: ${syncRes.stats.learningPercentage}%`);
  }

  // 3. Test Multi-Tenant Privacy & Retrieval Isolation
  console.log('\n--- Test 2: Airtight Multi-Tenant Privacy Isolation ---');
  // Query with Seller A
  const nodesForA = await retrieveTenantProducts(supabase as any, 'product inventory smartphone headphones', userContextA, 10);
  console.log(`Seller A retrieved ${nodesForA.length} product nodes.`);
  const leakedFromBtoA = nodesForA.filter((n) => n.seller_id !== sellerA.id);
  if (leakedFromBtoA.length > 0) {
    throw new Error(`CRITICAL PRIVACY LEAK: Seller A retrieved products belonging to other sellers!`);
  }
  console.log('🔒 Verified: 100% of nodes retrieved by Seller A strictly belong to Seller A.');

  // Query with Seller B
  const nodesForB = await retrieveTenantProducts(supabase as any, 'product inventory smartphone headphones', userContextB, 10);
  console.log(`Seller B retrieved ${nodesForB.length} product nodes.`);
  const leakedFromAtoB = nodesForB.filter((n) => n.seller_id !== sellerB.id);
  if (leakedFromAtoB.length > 0) {
    throw new Error(`CRITICAL PRIVACY LEAK: Seller B retrieved products belonging to other sellers!`);
  }
  console.log('🔒 Verified: 100% of nodes retrieved by Seller B strictly belong to Seller B. ZERO LEAKAGE.');

  // 4. Test Soft Deletion & 7-Day Grace Period
  console.log('\n--- Test 3: 7-Day Soft Deletion & Recovery ---');
  // Pick one product belonging to Seller A
  const { data: testProduct } = await supabase
    .from('products')
    .select('id, title, attributes, embedding')
    .eq('seller_id', sellerA.id)
    .limit(1)
    .maybeSingle();

  if (testProduct) {
    console.log(`Testing soft delete on product: "${testProduct.title}" (${testProduct.id})`);

    // Ensure it has embedding for testing preservation
    if (!testProduct.embedding) {
      const chunk = generateProductKnowledgeChunk(testProduct as any);
      const { generateEmbedding, toVectorLiteral } = await import('../src/lib/embeddings');
      const vec = await generateEmbedding(chunk);
      await supabase.from('products').update({ embedding: toVectorLiteral(vec) }).eq('id', testProduct.id);
      testProduct.embedding = toVectorLiteral(vec);
    }

    // Step A: Soft delete product
    const deleteRes = await softDeleteProduct(supabase as any, testProduct.id, userContextA);
    console.log('Soft Delete Response:', deleteRes.message);
    console.log('Restore Deadline:', deleteRes.restoreDeadline);

    // Verify it is flagged as soft deleted
    const { data: afterDelete } = await supabase.from('products').select('attributes, embedding').eq('id', testProduct.id).single();
    const graceInfo = getProductGracePeriodInfo(afterDelete as any);
    console.log(`Grace period info: isDeleted=${graceInfo.isDeleted}, daysLeft=${graceInfo.daysLeft}`);

    if (!graceInfo.isDeleted) {
      throw new Error('Product should be marked as soft deleted.');
    }
    if (!afterDelete?.embedding) {
      throw new Error('RAG Embedding MUST be preserved during grace period!');
    }
    console.log('🧠 Embedding was retained intact in knowledge base during deletion.');

    // Verify it is excluded from normal RAG search
    const nodesWhileDeleted = await retrieveTenantProducts(supabase as any, testProduct.title, userContextA, 10);
    const foundDeletedInSearch = nodesWhileDeleted.some((n) => n.id === testProduct.id);
    if (foundDeletedInSearch) {
      throw new Error('Soft-deleted product must NOT be returned in active RAG search!');
    }
    console.log('✅ Soft-deleted product is excluded from active store queries.');

    // Step B: Restore product
    console.log('\nRestoring product within 7-day grace period...');
    const restoreRes = await restoreProduct(supabase as any, testProduct.id, userContextA);
    console.log('Restore Response:', restoreRes.message);

    const { data: afterRestore } = await supabase.from('products').select('attributes, embedding').eq('id', testProduct.id).single();
    const graceAfterRestore = getProductGracePeriodInfo(afterRestore as any);
    if (graceAfterRestore.isDeleted) {
      throw new Error('Product should no longer be soft deleted after restore.');
    }
    if (!afterRestore?.embedding) {
      throw new Error('RAG Embedding MUST remain intact without relearning!');
    }
    console.log('✅ Product successfully recovered! RAG embeddings are active again with ZERO relearning.');
  }

  // 5. Test Two Chat Modes (Normal Chat vs. Personalized RAG Mode)
  console.log('\n--- Test 4: Dual Chat Modes (Normal vs. Personalized RAG) ---');

  // Mode 1: Normal Chat (Personalized = OFF)
  console.log('Calling Chat in NORMAL MODE (Personalized = OFF)...');
  const normalChatRes = await executeRagChat({
    message: 'Give me 2 quick tips on customer retention for my boutique.',
    isPersonalized: false,
    sessionId: `test_normal_${Date.now()}`,
    userContext: userContextA,
    supabase: supabase as any,
  });
  console.log(`Normal Chat Response (isPersonalized=${normalChatRes.isPersonalized}, matchedNodes=${normalChatRes.matchedNodes.length}):`);
  console.log(normalChatRes.reply.slice(0, 150) + '...\n');

  if (normalChatRes.isPersonalized !== false || normalChatRes.matchedNodes.length !== 0) {
    throw new Error('Normal chat should not use personalized RAG nodes.');
  }

  // Mode 2: Personalized RAG Chat (Personalized = ON)
  console.log('Calling Chat in PERSONALIZED RAG MODE (Personalized = ON)...');
  const ragChatRes = await executeRagChat({
    message: 'What products do we have in inventory and what are their prices?',
    isPersonalized: true,
    sessionId: `test_rag_${Date.now()}`,
    userContext: userContextA,
    supabase: supabase as any,
  });
  console.log(`Personalized RAG Response (isPersonalized=${ragChatRes.isPersonalized}, matchedNodes=${ragChatRes.matchedNodes.length}):`);
  console.log(ragChatRes.reply.slice(0, 200) + '...\n');
  if (ragChatRes.matchedNodes.length > 0) {
    console.log('Retrieved Grounded Nodes:', ragChatRes.matchedNodes.map((n) => `${n.title} (₹${n.price}, stock: ${n.stock})`));
  }

  if (ragChatRes.isPersonalized !== true) {
    throw new Error('Personalized RAG mode should be true.');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL MULTI-TENANT RAG & SOFT-DELETE TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
