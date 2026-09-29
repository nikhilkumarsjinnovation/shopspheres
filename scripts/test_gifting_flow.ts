import * as fs from 'fs';
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { chat } from '../src/services/ai-service';

async function runGiftingFlowTest() {
  console.log('🚀 Testing ShopSphere Super Agent Multi-Turn Gifting Flow...\n');

  const history: Array<{ role: string; content: string }> = [];
  const sessionId = `test_gifting_${Date.now()}`;

  // Turn 1: User asks for suggestions for a female friend
  console.log('Turn 1: "i want to gift something to my female friend, can you suggest some thisn"');
  const t1 = await chat({
    message: 'i want to gift something to my female friend, can you suggest some thisn',
    persona: 'smart_companion',
    catalog: [],
    apiKey: process.env.GEMINI_API_KEY,
    mode: 'agent',
    history: [...history],
    sessionId,
  });

  console.log('Agent Reply 1:\n', t1.reply.slice(0, 300));
  console.log('Needs Clarification:', t1.needsClarification);
  console.log('Action Cards:', t1.actionCards?.map(c => c.type));
  console.log('Products:', t1.recommendedProducts?.map((p: any) => p.title));
  console.log('--------------------------------------------------\n');

  history.push({ role: 'user', content: 'i want to gift something to my female friend, can you suggest some thisn' });
  history.push({ role: 'assistant', content: t1.reply });

  // Turn 2: User selects Bella Vita
  console.log('Turn 2: "i go with bella vita"');
  const t2 = await chat({
    message: 'i go with bella vita',
    persona: 'smart_companion',
    catalog: [],
    apiKey: process.env.GEMINI_API_KEY,
    mode: 'agent',
    history: [...history],
    sessionId,
  });

  console.log('Agent Reply 2:\n', t2.reply.slice(0, 300));
  console.log('Needs Clarification:', t2.needsClarification);
  console.log('--------------------------------------------------\n');

  history.push({ role: 'user', content: 'i go with bella vita' });
  history.push({ role: 'assistant', content: t2.reply });

  // Turn 3: User gives email
  console.log('Turn 3: "name i do not knwo, her email id is list.append17@gmail.com"');
  const t3 = await chat({
    message: 'name i do not knwo, her email id is list.append17@gmail.com',
    persona: 'smart_companion',
    catalog: [],
    apiKey: process.env.GEMINI_API_KEY,
    mode: 'agent',
    history: [...history],
    sessionId,
  });

  console.log('Agent Reply 3:\n', t3.reply.slice(0, 300));
  console.log('--------------------------------------------------\n');

  history.push({ role: 'user', content: 'name i do not knwo, her email id is list.append17@gmail.com' });
  history.push({ role: 'assistant', content: t3.reply });

  // Turn 4: User gives message
  console.log('Turn 4: "happy birthday bro!"');
  const t4 = await chat({
    message: 'happy birthday bro!',
    persona: 'smart_companion',
    catalog: [],
    apiKey: process.env.GEMINI_API_KEY,
    mode: 'agent',
    history: [...history],
    sessionId,
  });

  console.log('Agent Reply 4:\n', t4.reply.slice(0, 300));
  console.log('Action Cards 4:', t4.actionCards?.map(c => c.type));
  console.log('--------------------------------------------------\n');

  history.push({ role: 'user', content: 'happy birthday bro!' });
  history.push({ role: 'assistant', content: t4.reply });

  // Turn 5: User confirms sending gift
  console.log('Turn 5: "yes, you can send this as gift to her"');
  const t5 = await chat({
    message: 'yes, you can send this as gift to her',
    persona: 'smart_companion',
    catalog: [],
    apiKey: process.env.GEMINI_API_KEY,
    mode: 'agent',
    history: [...history],
    sessionId,
  });

  console.log('Agent Reply 5:\n', t5.reply);
  console.log('Needs Clarification 5:', t5.needsClarification);
  console.log('Action Cards 5:', t5.actionCards?.map(c => c.type));
  if (t5.actionCards?.[0]?.data) {
    console.log('Gift Card Data:', t5.actionCards[0].data);
  }
}

runGiftingFlowTest().catch(console.error);
