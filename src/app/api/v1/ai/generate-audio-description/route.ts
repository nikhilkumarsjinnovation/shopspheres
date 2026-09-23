import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { getAuthenticatedUser } from '@/lib/auth';
import { csrfMiddleware } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const versionError = requireApiVersion(request);
  if (versionError) return versionError;
  const productId = request.nextUrl.searchParams.get('product_id');
  if (!productId) {
    return NextResponse.json({ error: 'product_id is required.' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audio_descriptions')
    .select('id, script, audio_url, language, duration_seconds')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ description: data });
}

export async function POST(request: NextRequest) {
  try {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    const csrfError = csrfMiddleware(request);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const session = await getAuthenticatedUser(supabase);
    if (!session || session.profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access is required.' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const productId = body && typeof body === 'object' && 'product_id' in body ? body.product_id : null;
    if (typeof productId !== 'string') {
      return NextResponse.json({ error: 'product_id is required.' }, { status: 400 });
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('id, title, description, attributes, image_urls')
      .eq('id', productId)
      .maybeSingle();
    if (error || !product) {
      return NextResponse.json({ error: 'Product was not found.' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key is not configured.' }, { status: 500 });
    }

    const script = await writeScript(apiKey, product.title, product.description);
    const audioUrl = await synthesizeSpeech(script);
    if (!audioUrl) {
      return NextResponse.json({ script, stored: false, reason: 'tts_not_configured' });
    }

    const { data: saved, error: insertError } = await supabase.from('audio_descriptions').insert({
      product_id: product.id,
      script,
      audio_url: audioUrl,
      generated_by: 'ai-gemini',
    }).select('id, script, audio_url').single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ description: saved, stored: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Audio description failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function writeScript(apiKey: string, title: string, description: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Write a short spoken product description in plain English for a screen reader. Product: ${title}. Details: ${description}`,
        }],
      }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Script generation returned status ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('candidates' in payload) || !Array.isArray(payload.candidates)) {
    throw new Error('Script generation returned no text.');
  }
  const first = payload.candidates[0];
  if (!first || typeof first !== 'object' || !('content' in first) || !first.content || typeof first.content !== 'object' || !('parts' in first.content) || !Array.isArray(first.content.parts)) {
    throw new Error('Script generation returned no text.');
  }
  const part = first.content.parts[0];
  if (!part || typeof part !== 'object' || !('text' in part) || typeof part.text !== 'string') {
    throw new Error('Script generation returned no text.');
  }
  return part.text;
}

async function synthesizeSpeech(script: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return null;
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text: script }),
  });
  if (!response.ok) {
    throw new Error(`Speech synthesis returned status ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:audio/mpeg;base64,${bytes.toString('base64')}`;
}
