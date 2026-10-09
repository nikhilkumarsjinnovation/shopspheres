/**
 * Sends the Resend onboarding email using RESEND_API_KEY from the environment or .env.local.
 * Run: npx tsx scripts/send-resend-hello.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sendHelloEmail } from '../src/services/resend-mail';

loadLocalEnv();

function loadLocalEnv() {
  let text = '';
  try {
    text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  const result = await sendHelloEmail();
  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(`sent ${result.id}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : 'send failed');
  process.exit(1);
});
