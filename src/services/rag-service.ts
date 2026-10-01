import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbedding, toVectorLiteral } from '@/lib/embeddings';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export interface RagUserContext {
  userId: string;
  role: 'admin' | 'seller';
  shopId?: string | null;
  shopName?: string | null;
}

export interface ProductKnowledgeNode {
  id: string;
  seller_id: string;
  shop_id: string | null;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  category: string;
  sub_category?: string | null;
  tags: string[];
  attributes: Record<string, any>;
  image_urls: string[];
  approval_status: string;
  is_soft_deleted?: boolean;
  deleted_at?: string | null;
  restore_deadline?: string | null;
  similarity?: number;
}

export interface GracePeriodItem {
  id: string;
  title: string;
  price: number;
  category: string;
  stock: number;
  deletedAt: string;
  restoreDeadline: string;
  daysRemaining: number;
  hoursRemaining: number;
  imageUrls: string[];
}

export interface TenantLearningStats {
  totalProducts: number;
  activeProducts: number;
  learnedProducts: number;
  pendingProducts: number;
  gracePeriodProducts: number;
  learningPercentage: number;
  lastLearnedAt: string | null;
  gracePeriodItems: GracePeriodItem[];
}

export interface RagChatTurn {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface RagChatResponse {
  reply: string;
  isPersonalized: boolean;
  matchedNodes: ProductKnowledgeNode[];
  provenance?: {
    verifiedAt: string;
    source: string;
    nodesRetrieved: number;
    tenantScope: string;
  };
  sessionId: string;
}

/**
 * Computes Cosine Similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Parses vector string format '[0.1, 0.2, ...]' from PostgreSQL into number[]
 */
export function parseVectorLiteral(vectorStr: string | null | undefined): number[] | null {
  if (!vectorStr || typeof vectorStr !== 'string') return null;
  try {
    const trimmed = vectorStr.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((val) => Number.parseFloat(val.trim()))
        .filter((num) => !Number.isNaN(num));
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Formats structured product attributes into a clean string chunk for embeddings.
 */
export function generateProductKnowledgeChunk(product: {
  title: string;
  category: string;
  sub_category?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  condition?: string | null;
  tags?: string[];
  attributes?: any;
  description: string;
}): string {
  const parts: string[] = [];
  parts.push(`Product: ${product.title}`);
  parts.push(`Category: ${product.category}${product.sub_category ? ` > ${product.sub_category}` : ''}`);
  parts.push(`Price: ₹${product.price}${product.compare_at_price ? ` (MSRP: ₹${product.compare_at_price})` : ''}`);
  parts.push(`Stock: ${product.stock} units available in inventory`);
  if (product.condition) {
    parts.push(`Condition: ${product.condition}`);
  }
  if (product.tags && Array.isArray(product.tags) && product.tags.length > 0) {
    parts.push(`Tags: ${product.tags.join(', ')}`);
  }
  if (product.attributes && typeof product.attributes === 'object') {
    const cleanAttrs: Record<string, string> = {};
    for (const [key, val] of Object.entries(product.attributes)) {
      if (!key.startsWith('_') && !key.startsWith('is_soft') && !key.startsWith('deleted') && !key.startsWith('restore')) {
        cleanAttrs[key] = String(val);
      }
    }
    if (Object.keys(cleanAttrs).length > 0) {
      parts.push(`Specifications: ${JSON.stringify(cleanAttrs)}`);
    }
  }
  parts.push(`Description: ${product.description}`);
  return parts.join(' | ');
}

/**
 * Checks if a product is soft-deleted based on attributes or deleted_at column.
 */
export function isProductSoftDeleted(product?: {
  attributes?: any;
  deleted_at?: string | null;
} | null): boolean {
  if (!product) return false;
  if (product.deleted_at) return true;
  if (product.attributes && typeof product.attributes === 'object') {
    return product.attributes.is_soft_deleted === true;
  }
  return false;
}

/**
 * Retrieves the 7-day grace period deadline for a soft-deleted product.
 */
export function getProductGracePeriodInfo(product?: {
  attributes?: any;
  deleted_at?: string | null;
} | null): { isDeleted: boolean; deletedAt: string | null; restoreDeadline: string | null; daysLeft: number; hoursLeft: number } {
  const isDeleted = isProductSoftDeleted(product);
  if (!isDeleted || !product) {
    return { isDeleted: false, deletedAt: null, restoreDeadline: null, daysLeft: 0, hoursLeft: 0 };
  }

  const attrs = product.attributes && typeof product.attributes === 'object' ? product.attributes : {};
  const deletedAt = product.deleted_at || attrs.deleted_at || new Date().toISOString();
  let restoreDeadline = attrs.restore_deadline;

  if (!restoreDeadline && deletedAt) {
    const deadlineDate = new Date(new Date(deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
    restoreDeadline = deadlineDate.toISOString();
  }

  const now = Date.now();
  const deadlineTime = restoreDeadline ? new Date(restoreDeadline).getTime() : now;
  const diffMs = Math.max(0, deadlineTime - now);
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { isDeleted: true, deletedAt, restoreDeadline, daysLeft, hoursLeft };
}

/**
 * Soft deletes a product with 1-week (7-day) grace period.
 * Does NOT delete the embedding or row immediately.
 */
export async function softDeleteProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  userContext: RagUserContext
): Promise<{ success: boolean; message: string; restoreDeadline: string }> {
  // 1. Fetch current product
  let query = supabase.from('products').select('*').eq('id', productId);
  if (userContext.role === 'seller') {
    query = query.eq('seller_id', userContext.userId);
  }
  const { data: product, error: fetchErr } = await query.maybeSingle();

  if (fetchErr || !product) {
    throw new Error('Product not found or access denied.');
  }

  const now = new Date();
  const restoreDeadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const restoreDeadline = restoreDeadlineDate.toISOString();

  const currentAttrs = (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes))
    ? { ...product.attributes }
    : {};

  const updatedAttrs = {
    ...currentAttrs,
    is_soft_deleted: true,
    deleted_at: now.toISOString(),
    restore_deadline: restoreDeadline,
    deleted_by: userContext.userId,
    previous_approval_status: product.approval_status,
  };

  const updatePayload: any = {
    attributes: updatedAttrs,
    updated_at: now.toISOString(),
  };

  // If deleted_at column exists in database schema, update it too
  if ('deleted_at' in product) {
    updatePayload.deleted_at = now.toISOString();
  }

  const { error: updateErr } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId);

  if (updateErr) {
    throw new Error(`Failed to soft-delete product: ${updateErr.message}`);
  }

  return {
    success: true,
    message: 'Product soft-deleted. RAG embeddings will be retained for 1 week (7-day grace period). You can recover this product anytime before the deadline.',
    restoreDeadline,
  };
}

/**
 * Restores a soft-deleted product within its 1-week grace period.
 * Embeddings are preserved so no relearning is required!
 */
export async function restoreProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  userContext: RagUserContext
): Promise<{ success: boolean; message: string }> {
  let query = supabase.from('products').select('*').eq('id', productId);
  if (userContext.role === 'seller') {
    query = query.eq('seller_id', userContext.userId);
  }
  const { data: product, error: fetchErr } = await query.maybeSingle();

  if (fetchErr || !product) {
    throw new Error('Product not found or access denied.');
  }

  const graceInfo = getProductGracePeriodInfo(product);
  if (!graceInfo.isDeleted) {
    return { success: true, message: 'Product is already active.' };
  }

  if (graceInfo.restoreDeadline && new Date(graceInfo.restoreDeadline).getTime() < Date.now()) {
    throw new Error('The 1-week recovery deadline for this product has expired. It can no longer be restored.');
  }

  const currentAttrs = (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes))
    ? { ...product.attributes }
    : {};

  delete currentAttrs.is_soft_deleted;
  delete currentAttrs.deleted_at;
  delete currentAttrs.restore_deadline;
  delete currentAttrs.deleted_by;

  delete currentAttrs.previous_approval_status;

  const updatePayload: any = {
    attributes: currentAttrs,
    updated_at: new Date().toISOString(),
  };

  if ('deleted_at' in product) {
    updatePayload.deleted_at = null;
  }

  const { error: updateErr } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId);

  if (updateErr) {
    throw new Error(`Failed to restore product: ${updateErr.message}`);
  }

  return {
    success: true,
    message: 'Product restored successfully! Existing RAG embeddings and knowledge nodes were preserved without needing to relearn.',
  };
}

/**
 * Purges products that have passed the 1-week grace period.
 */
export async function cleanupExpiredSoftDeleted(
  supabase: SupabaseClient<Database>,
  userContext?: RagUserContext
): Promise<{ purgedCount: number }> {
  let query = supabase.from('products').select('id, attributes');
  if (userContext && userContext.role === 'seller') {
    query = query.eq('seller_id', userContext.userId);
  }

  const { data: products } = await query;
  if (!products || products.length === 0) return { purgedCount: 0 };

  const now = Date.now();
  const toDeleteIds: string[] = [];

  for (const p of products) {
    const grace = getProductGracePeriodInfo(p);
    if (grace.isDeleted && grace.restoreDeadline) {
      if (new Date(grace.restoreDeadline).getTime() < now) {
        toDeleteIds.push(p.id);
      }
    }
  }

  if (toDeleteIds.length === 0) return { purgedCount: 0 };

  const { error: delErr } = await supabase.from('products').delete().in('id', toDeleteIds);
  if (delErr) {
    console.warn('[RAG Service] Error purging expired products:', delErr.message);
    return { purgedCount: 0 };
  }

  return { purgedCount: toDeleteIds.length };
}

/**
 * Calculates real-time learning progress and grace period metrics for a tenant.
 */
export async function getTenantLearningStats(
  supabase: SupabaseClient<Database>,
  userContext: RagUserContext
): Promise<TenantLearningStats> {
  let query = supabase
    .from('products')
    .select('id, title, price, category, stock, image_urls, embedding, attributes, updated_at');

  if (userContext.role === 'seller') {
    // Strict seller tenant isolation
    query = query.eq('seller_id', userContext.userId);
  } else if (userContext.role === 'admin' && userContext.shopId) {
    query = query.eq('shop_id', userContext.shopId);
  }

  const { data: products, error } = await query;
  if (error || !products) {
    return {
      totalProducts: 0,
      activeProducts: 0,
      learnedProducts: 0,
      pendingProducts: 0,
      gracePeriodProducts: 0,
      learningPercentage: 100,
      lastLearnedAt: null,
      gracePeriodItems: [],
    };
  }

  let totalProducts = products.length;
  let activeProducts = 0;
  let learnedProducts = 0;
  let pendingProducts = 0;
  let gracePeriodProducts = 0;
  let latestLearnedTimestamp: string | null = null;
  const gracePeriodItems: GracePeriodItem[] = [];

  for (const product of products) {
    const grace = getProductGracePeriodInfo(product);
    const hasEmbedding = Boolean(product.embedding);

    if (grace.isDeleted) {
      gracePeriodProducts++;
      gracePeriodItems.push({
        id: product.id,
        title: product.title,
        price: product.price,
        category: product.category,
        stock: product.stock,
        deletedAt: grace.deletedAt || new Date().toISOString(),
        restoreDeadline: grace.restoreDeadline || new Date().toISOString(),
        daysRemaining: grace.daysLeft,
        hoursRemaining: grace.hoursLeft,
        imageUrls: Array.isArray(product.image_urls) ? product.image_urls : [],
      });
    } else {
      activeProducts++;
      if (hasEmbedding) {
        learnedProducts++;
        const indexedAt = (product.attributes as any)?.rag_indexed_at || product.updated_at;
        if (!latestLearnedTimestamp || new Date(indexedAt) > new Date(latestLearnedTimestamp)) {
          latestLearnedTimestamp = indexedAt;
        }
      } else {
        pendingProducts++;
      }
    }
  }

  const learningPercentage = activeProducts > 0
    ? Math.round((learnedProducts / activeProducts) * 100)
    : (totalProducts > 0 ? 100 : 100);

  return {
    totalProducts,
    activeProducts,
    learnedProducts,
    pendingProducts,
    gracePeriodProducts,
    learningPercentage,
    lastLearnedAt: latestLearnedTimestamp,
    gracePeriodItems,
  };
}

/**
 * Synchronizes / self-learns products that do not have embeddings.
 * Processes in batches to respect rate limits.
 */
export async function syncTenantKnowledge(
  supabase: SupabaseClient<Database>,
  userContext: RagUserContext,
  batchLimit = 30
): Promise<{ learnedCount: number; stats: TenantLearningStats }> {
  let query = supabase
    .from('products')
    .select('id, title, description, category, sub_category, price, compare_at_price, stock, condition, tags, attributes, image_urls')
    .is('embedding', null);

  if (userContext.role === 'seller') {
    query = query.eq('seller_id', userContext.userId);
  } else if (userContext.role === 'admin' && userContext.shopId) {
    query = query.eq('shop_id', userContext.shopId);
  }

  const { data: unindexed, error } = await query.limit(batchLimit);

  if (error) {
    throw new Error(`Failed to query unindexed products: ${error.message}`);
  }

  let learnedCount = 0;
  for (const product of unindexed || []) {
    // Skip soft-deleted items during active learning sync
    if (isProductSoftDeleted(product)) {
      continue;
    }

    try {
      const chunk = generateProductKnowledgeChunk(product);
      const vector = await generateEmbedding(chunk);
      const vectorLiteral = toVectorLiteral(vector);

      const currentAttrs = (product.attributes && typeof product.attributes === 'object' && !Array.isArray(product.attributes))
        ? { ...product.attributes }
        : {};

      const updatedAttrs = {
        ...currentAttrs,
        rag_indexed_at: new Date().toISOString(),
        rag_status: 'indexed',
      };

      const { error: updateErr } = await supabase
        .from('products')
        .update({
          embedding: vectorLiteral,
          attributes: updatedAttrs,
        })
        .eq('id', product.id);

      if (!updateErr) {
        learnedCount++;
      } else {
        console.warn(`[RAG Sync] Failed to store embedding for product ${product.id}:`, updateErr.message);
      }
    } catch (embedErr) {
      console.warn(`[RAG Sync] Failed embedding for product ${product.id}:`, embedErr);
    }
  }

  const updatedStats = await getTenantLearningStats(supabase, userContext);
  return { learnedCount, stats: updatedStats };
}

/**
 * Multi-Tenant RAG Vector Retrieval.
 * Enforces airtight privacy:
 * - Shop Owner: Only searches products with seller_id = userContext.userId.
 * - Admin: Can search all shops or filter by specific shopId.
 */
export async function retrieveTenantProducts(
  supabase: SupabaseClient<Database>,
  queryText: string,
  userContext: RagUserContext,
  limit = 6
): Promise<ProductKnowledgeNode[]> {
  // 1. Generate query embedding vector
  const queryVector = await generateEmbedding(queryText);

  // 2. Fetch candidate products for the scoped tenant
  let dbQuery = supabase
    .from('products')
    .select('id, seller_id, shop_id, title, description, price, compare_at_price, stock, category, sub_category, tags, attributes, image_urls, approval_status, embedding');

  if (userContext.role === 'seller') {
    // AIRTIGHT PRIVACY: strictly scoped to seller
    dbQuery = dbQuery.eq('seller_id', userContext.userId);
  } else if (userContext.role === 'admin' && userContext.shopId) {
    dbQuery = dbQuery.eq('shop_id', userContext.shopId);
  }

  const { data: candidates, error } = await dbQuery;

  if (error || !candidates || candidates.length === 0) {
    return [];
  }

  // 3. Filter out soft-deleted products and calculate cosine similarity
  const ranked: Array<ProductKnowledgeNode & { similarity: number }> = [];

  for (const p of candidates) {
    if (isProductSoftDeleted(p)) {
      continue;
    }

    let similarity = 0;
    if (p.embedding) {
      const prodVector = parseVectorLiteral(p.embedding);
      if (prodVector) {
        similarity = cosineSimilarity(queryVector, prodVector);
      }
    } else {
      // Fallback text match heuristic if unindexed
      const qLower = queryText.toLowerCase();
      const titleLower = p.title.toLowerCase();
      const catLower = p.category.toLowerCase();
      if (titleLower.includes(qLower) || qLower.includes(titleLower)) {
        similarity = 0.75;
      } else if (catLower.includes(qLower) || qLower.includes(catLower)) {
        similarity = 0.55;
      }
    }

    ranked.push({
      id: p.id,
      seller_id: p.seller_id,
      shop_id: p.shop_id,
      title: p.title,
      description: p.description,
      price: p.price,
      compare_at_price: p.compare_at_price,
      stock: p.stock,
      category: p.category,
      sub_category: p.sub_category,
      tags: p.tags || [],
      attributes: (p.attributes as any) || {},
      image_urls: p.image_urls || [],
      approval_status: p.approval_status,
      similarity,
    });
  }

  // Sort descending by similarity
  ranked.sort((a, b) => b.similarity - a.similarity);

  return ranked.slice(0, limit);
}

/**
 * Handles LLM interaction for both Normal Mode and Personalized RAG Mode.
 */
export async function executeRagChat(params: {
  message: string;
  isPersonalized: boolean;
  sessionId: string;
  history?: RagChatTurn[];
  userContext: RagUserContext;
  supabase: SupabaseClient<Database>;
}): Promise<RagChatResponse> {
  const { message, isPersonalized, sessionId, history = [], userContext, supabase } = params;
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  let matchedNodes: ProductKnowledgeNode[] = [];
  let systemPrompt = '';

  if (isPersonalized) {
    // 1. Retrieve tenant-scoped knowledge nodes
    matchedNodes = await retrieveTenantProducts(supabase, message, userContext, 6);
    const stats = await getTenantLearningStats(supabase, userContext);

    // Format nodes for prompt
    const nodesContext = matchedNodes.length > 0
      ? matchedNodes.map((node, i) => `[Node ${i + 1}]
- Title: ${node.title}
- Price: ₹${node.price}${node.compare_at_price ? ` (MSRP: ₹${node.compare_at_price})` : ''}
- Stock: ${node.stock} in inventory
- Category: ${node.category}${node.sub_category ? ` > ${node.sub_category}` : ''}
- Tags: ${node.tags.join(', ')}
- Description: ${node.description}
- Similarity Match Score: ${(node.similarity! * 100).toFixed(1)}%`).join('\n\n')
      : 'No matching products found in the store database for this query.';

    const tenantLabel = userContext.role === 'seller'
      ? `Shop Owner (${userContext.shopName || 'Merchant Store'})`
      : (userContext.shopId ? `Admin auditing shop (${userContext.shopName || userContext.shopId})` : 'Platform Administrator (Global Store Access)');

    // Enrich with dynamic store intelligence if relevant
    let additionalIntelligence = '';
    const lowerQuery = message.toLowerCase();
    if (lowerQuery.includes('stock') || lowerQuery.includes('restock') || lowerQuery.includes('inventory') || lowerQuery.includes('deplet') || lowerQuery.includes('supply')) {
      try {
        const { getSellerRestockAlerts } = await import('@/services/stock-predictor-service');
        const alerts = await getSellerRestockAlerts(supabase, userContext.userId);
        if (alerts.length > 0) {
          additionalIntelligence += `\n\nPROACTIVE RESTOCK PREDICTIONS (VELOCITY-BASED):\n` +
            alerts.slice(0, 5).map((a) => `- "${a.productTitle}": Stock: ${a.currentStock} units | Velocity: ${a.dailyVelocity} units/day | Depletion in: ${a.daysUntilStockout} days (${a.urgency.toUpperCase()}) | Recommended Reorder: ${a.recommendedReorderQty} units`).join('\n');
        }
      } catch {
        // ignore
      }
    }

    if (lowerQuery.includes('digest') || lowerQuery.includes('weekly') || lowerQuery.includes('performance') || lowerQuery.includes('analytics') || lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
      try {
        const { getLatestStoreDigest } = await import('@/services/store-intelligence-service');
        const digest = await getLatestStoreDigest(supabase, userContext.userId);
        additionalIntelligence += `\n\nWEEKLY STORE INTELLIGENCE DIGEST:\n` +
          `- Executive Summary: ${digest.executiveSummary}\n` +
          `- 7-Day GMV: ₹${digest.metrics.totalRevenue7d} across ${digest.metrics.totalOrders7d} orders\n` +
          `- AI Strategic Recommendations:\n${digest.actionableRecommendations.map((r) => `  * ${r}`).join('\n')}`;
      } catch {
        // ignore
      }
    }

    systemPrompt = `You are ShopSphere's Store Intelligence AI Copilot.
User Scope: ${tenantLabel}
PERSONALIZATION MODE: ON (Grounded RAG Store Embeddings Activated)

STORE KNOWLEDGE BASE (STRICTLY PRIVATE & TENANT-ISOLATED):
- Total Products: ${stats.totalProducts} (${stats.activeProducts} active, ${stats.gracePeriodProducts} in 1-week recovery grace period)
- RAG Knowledge Coverage: ${stats.learningPercentage}% learned
${stats.gracePeriodProducts > 0 ? `- Notice: ${stats.gracePeriodProducts} products are currently soft-deleted and held in 1-week recovery.` : ''}

RETRIEVED GROUNDED KNOWLEDGE NODES FOR THIS QUERY:
${nodesContext}${additionalIntelligence}

CRITICAL OPERATIONAL RULES:
1. Base your answer strictly on the retrieved knowledge nodes and store data above.
2. If asked about prices, stock, or product specifics, always cite the real data (in ₹ INR).
3. If the user asks about soft-deleted or removed products, explain that ShopSphere keeps removed products in a 1-week grace period where they can be restored without relearning.
4. Maintain strict multi-tenant privacy: NEVER mention or hallucinate data from any other shops.
5. Provide actionable, professional, and clear advice. If items have low stock (<= 5), highlight it constructively.
6. Format your responses with clean, semantic Markdown (bullet points, bold key highlights, italics for product names, and clean standard notation like <= or ≤ instead of raw LaTeX formulas).`;
  } else {
    // Normal Chat Mode (No RAG embeddings)
    systemPrompt = `You are ShopSphere's General AI Merchant Assistant.
PERSONALIZATION MODE: OFF (Normal Conversational Mode)
You assist admins and shop owners with business strategy, marketing copywriting, customer care templates, e-commerce best practices, and general guidance.
Do not hallucinate specific store inventory since personalized store knowledge is toggled OFF.
Provide courteous, insightful, and well-structured answers.`;
  }

  // Format conversation history for Gemini API
  const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  // Add system instruction as first user/model framing
  contents.push({
    role: 'user',
    parts: [{ text: `[System Configuration]\n${systemPrompt}` }],
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Understood. I will operate according to these parameters.' }],
  });

  // Append recent history turns
  const priorTurns = history.slice(-8);
  for (const turn of priorTurns) {
    const geminiRole = (turn.role === 'assistant' || turn.role === 'model') ? 'model' : 'user';
    contents.push({
      role: geminiRole,
      parts: [{ text: turn.content }],
    });
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Call Gemini generateContent API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const geminiResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: isPersonalized ? 0.2 : 0.7,
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    throw new Error(`Gemini API error (${geminiResponse.status}): ${errText}`);
  }

  const payload = await geminiResponse.json();
  const replyText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

  // Save conversation turns to Supabase ai_conversations table
  try {
    await supabase.from('ai_conversations').insert([
      {
        user_id: userContext.userId,
        session_id: sessionId,
        role: 'user',
        content: message,
        extracted_intents: { mode: isPersonalized ? 'personalized_rag' : 'normal_chat' },
      },
      {
        user_id: userContext.userId,
        session_id: sessionId,
        role: 'assistant',
        content: replyText,
        recommended_product_ids: matchedNodes.map((n) => n.id),
        extracted_intents: {
          mode: isPersonalized ? 'personalized_rag' : 'normal_chat',
          nodesCount: matchedNodes.length,
        },
      },
    ]);
  } catch (convErr) {
    console.warn('[RAG Service] Failed to save conversation turn:', convErr);
  }

  return {
    reply: replyText,
    isPersonalized,
    matchedNodes: isPersonalized ? matchedNodes : [],
    provenance: isPersonalized ? {
      verifiedAt: new Date().toISOString(),
      source: 'ShopSphere Multi-Tenant RAG Store Embeddings',
      nodesRetrieved: matchedNodes.length,
      tenantScope: userContext.role === 'seller' ? `Shop Owner (${userContext.userId.slice(0, 8)})` : 'Admin Global Database',
    } : undefined,
    sessionId,
  };
}
