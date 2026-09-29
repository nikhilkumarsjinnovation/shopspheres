import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

console.log('--- Customer Super Agent Verification ---');
console.log('Supabase URL:', SUPABASE_URL ? '✅ Configured' : '❌ Missing');
console.log('Gemini API Key:', GEMINI_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('Configured Gemini Model:', GEMINI_MODEL);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runVerification() {
  // 1. Check Catalog Products
  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .select('id, title, price, category, stock')
    .eq('approval_status', 'approved')
    .limit(5);

  if (prodErr) {
    console.error('❌ Failed to query products:', prodErr.message);
  } else {
    console.log(`✅ Catalog Products Accessible: ${prods.length} sample items retrieved.`);
    prods.forEach((p) => console.log(`   - ${p.title} (₹${p.price.toLocaleString('en-IN')}) [${p.category}]`));
  }

  // 2. Check Order Table schema for placed_by
  const { data: orders, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, placed_by, total_amount')
    .limit(3);

  if (orderErr) {
    console.log('ℹ️ Orders query notice:', orderErr.message);
  } else {
    console.log(`✅ Orders Table Accessible: retrieved ${orders.length} orders.`);
    orders.forEach((o) => console.log(`   - Order #${o.id.slice(0, 8)} | Placed by: ${o.placed_by || 'customer'} | Status: ${o.status}`));
  }

  // 3. Test Gemini API with the free-tier model
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello, confirm you are active and free-tier compliant.' }],
            },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`✅ Gemini (${GEMINI_MODEL}) Online & Verified!`);
        console.log(`   Response snippet: ${text ? text.slice(0, 80).replace(/\n/g, ' ') : 'OK'}...`);
      } else {
        const errText = await res.text();
        console.log(`⚠️ Gemini API response status ${res.status}:`, errText.slice(0, 120));
      }
    } catch (err) {
      console.log('⚠️ Gemini test notice:', err.message);
    }
  }

  console.log('\n🎉 Super Agent backend verification complete!');
}

runVerification().catch(console.error);
