import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { checkProactiveNotifications } from '@/services/notification-service';
import { recomputeRecentFeatures } from '@/services/behavior-service';
import { completeReadyGroupGifts, revealDueGifts } from '@/services/gift-service';

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  const cronAuthorized = Boolean(secret && header === `Bearer ${secret}`);
  if (!cronAuthorized) {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await checkProactiveNotifications();
  const featuresComputed = await recomputeRecentFeatures().catch(() => 0);
  const giftsRevealed = await revealDueGifts().catch(() => 0);
  const groupGiftsCompleted = await completeReadyGroupGifts().catch(() => 0);
  return NextResponse.json({ ...result, featuresComputed, giftsRevealed, groupGiftsCompleted });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
