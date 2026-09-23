import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type ShopRateLimiter = {
  limit: (identifier: string) => Promise<LimitResult>;
};

const WINDOW_MS = 60_000;

function hasUpstashEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

function memoryLimiter(tokens: number): ShopRateLimiter {
  const hits = new Map<string, number[]>();

  return {
    async limit(identifier: string): Promise<LimitResult> {
      const now = Date.now();
      const recent = (hits.get(identifier) ?? []).filter((stamp) => now - stamp < WINDOW_MS);

      if (recent.length >= tokens) {
        const oldest = recent[0] ?? now;
        hits.set(identifier, recent);
        return {
          success: false,
          limit: tokens,
          remaining: 0,
          reset: oldest + WINDOW_MS,
        };
      }

      recent.push(now);
      hits.set(identifier, recent);
      return {
        success: true,
        limit: tokens,
        remaining: tokens - recent.length,
        reset: now + WINDOW_MS,
      };
    },
  };
}

function upstashLimiter(tokens: number, prefix: string): ShopRateLimiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(tokens, '1 m'),
    prefix,
  });

  return {
    async limit(identifier: string): Promise<LimitResult> {
      const result = await ratelimit.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    },
  };
}

function createLimiter(tokens: number, prefix: string): ShopRateLimiter {
  if (hasUpstashEnv()) {
    return upstashLimiter(tokens, prefix);
  }
  return memoryLimiter(tokens);
}

export const chatLimiter = createLimiter(10, 'shopsphere:chat');
export const categorizeLimiter = createLimiter(5, 'shopsphere:categorize');
export const visualSearchLimiter = createLimiter(5, 'shopsphere:visual-search');

export async function rateLimitKey(request: NextRequest): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return `user:${user.id}`;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  return `ip:${ip}`;
}

export async function enforceRateLimit(
  limiter: ShopRateLimiter,
  identifier: string,
): Promise<NextResponse | null> {
  const result = await limiter.limit(identifier);
  if (result.success) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please wait a minute and try again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    },
  );
}
