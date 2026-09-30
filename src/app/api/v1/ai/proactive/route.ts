import { NextRequest, NextResponse } from 'next/server';
import { requireApiVersion } from '@/lib/api-version';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkProactiveNotifications } from '@/services/notification-service';
import { recomputeRecentFeatures } from '@/services/behavior-service';
import { completeReadyGroupGifts, revealDueGifts } from '@/services/gift-service';
import { runRagJanitorAndSync } from '@/services/rag-janitor-service';
import { runStockoutPrediction } from '@/services/stock-predictor-service';
import { evaluateAbandonedCartRecovery } from '@/services/flash-offer-service';
import { runWeeklyStoreIntelligence } from '@/services/store-intelligence-service';

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  const cronAuthorized = Boolean(secret && header === `Bearer ${secret}`);
  if (!cronAuthorized) {
    const versionError = requireApiVersion(request);
    if (versionError) return versionError;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Core notifications & behavior features
  const result = await checkProactiveNotifications();
  const featuresComputed = await recomputeRecentFeatures().catch(() => 0);
  const giftsRevealed = await revealDueGifts().catch(() => 0);
  const groupGiftsCompleted = await completeReadyGroupGifts().catch(() => 0);

  // Automation 1: Background RAG Self-Learner & Grace Period Janitor
  const ragSync = await runRagJanitorAndSync(admin).catch((err) => ({
    error: err instanceof Error ? err.message : String(err),
    janitor: { purgedCount: 0, purgedProductIds: [], executedAt: new Date().toISOString() },
    learner: { indexedCount: 0, failedCount: 0, totalUnindexedRemaining: 0, executedAt: new Date().toISOString() },
    durationMs: 0,
  }));

  // Automation 3: Smart Low-Stock & Restock Predictor
  const stockoutAnalysis = await runStockoutPrediction(admin).catch((err) => ({
    error: err instanceof Error ? err.message : String(err),
    totalAnalyzed: 0,
    outOfStockCount: 0,
    criticalCount: 0,
    warningCount: 0,
    healthyCount: 0,
    alertsGenerated: 0,
    items: [],
    executedAt: new Date().toISOString(),
  }));

  // Automation 4: Abandoned Cart & Wishlist Flash Offer Engine
  const flashOffers = await evaluateAbandonedCartRecovery(admin).catch((err) => ({
    error: err instanceof Error ? err.message : String(err),
    evaluatedEvents: 0,
    offersGenerated: 0,
    skippedCooldown: 0,
    offers: [],
    executedAt: new Date().toISOString(),
  }));

  // Automation 5: Weekly Store Intelligence Digest (Trigger on Mondays or when digest=true param passed)
  const isMonday = new Date().getDay() === 1;
  const runDigestNow = isMonday || request.nextUrl.searchParams.get('digest') === 'true';
  const storeDigestResult = runDigestNow
    ? await runWeeklyStoreIntelligence(admin).catch(() => ({ processedSellers: 0, executedAt: new Date().toISOString() }))
    : { processedSellers: 0, skipped: 'Scheduled for Mondays (use ?digest=true to force)' };

  return NextResponse.json({
    ...result,
    featuresComputed,
    giftsRevealed,
    groupGiftsCompleted,
    automations: {
      ragJanitorAndSync: ragSync,
      stockoutPredictor: {
        totalAnalyzed: stockoutAnalysis.totalAnalyzed,
        criticalCount: stockoutAnalysis.criticalCount,
        outOfStockCount: stockoutAnalysis.outOfStockCount,
        warningCount: stockoutAnalysis.warningCount,
      },
      flashOfferEngine: {
        evaluatedEvents: flashOffers.evaluatedEvents,
        offersGenerated: flashOffers.offersGenerated,
        skippedCooldown: flashOffers.skippedCooldown,
      },
      storeIntelligence: storeDigestResult,
    },
  });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
