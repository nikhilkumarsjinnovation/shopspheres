import { Redis } from '@upstash/redis';
import { fetchFeedFromDB, type FeedResponse } from '@/lib/personalized-feed';

const memory = new Map<string, { value: string; expiresAt: number }>();
const TTL_SECONDS = 300;

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return null;
  }
  return Redis.fromEnv();
}

function readCached(raw: unknown): FeedResponse | null {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as FeedResponse;
  }
  if (raw && typeof raw === 'object') {
    return raw as FeedResponse;
  }
  return null;
}

export async function getPersonalizedFeed(userId: string): Promise<FeedResponse> {
  const key = `feed:${userId}`;
  const redis = redisClient();

  if (redis) {
    const cached = readCached(await redis.get(key));
    if (cached) {
      return cached;
    }
  } else {
    const hit = memory.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return JSON.parse(hit.value) as FeedResponse;
    }
  }

  const fresh = await fetchFeedFromDB(userId);
  const payload = JSON.stringify(fresh);
  if (redis) {
    await redis.setex(key, TTL_SECONDS, payload);
  } else {
    memory.set(key, { value: payload, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  }
  return fresh;
}

export async function invalidatePersonalizedFeed(userId: string): Promise<void> {
  const key = `feed:${userId}`;
  memory.delete(key);
  const redis = redisClient();
  if (redis) {
    await redis.del(key);
  }
}
