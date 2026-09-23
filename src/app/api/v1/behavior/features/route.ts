import { NextRequest, NextResponse } from 'next/server';
import { recomputeRecentFeatures } from '@/services/behavior-service';

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const computed = await recomputeRecentFeatures();
  return NextResponse.json({ computed });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const computed = await recomputeRecentFeatures();
  return NextResponse.json({ computed });
}
