'use client';

import { useCallback, useState } from 'react';
import CampaignPanel, { type CampaignHistoryRow } from '@/components/admin/CampaignPanel';
import MarketingAgentPanel from '@/components/admin/MarketingAgentPanel';
import type { CampaignSegment } from '@/services/campaign-segments';

type SegmentCounts = Record<CampaignSegment, number>;

type Props = {
  initialCounts?: SegmentCounts | null;
  initialCampaigns?: CampaignHistoryRow[];
};

export default function CampaignsWorkspace({
  initialCounts = null,
  initialCampaigns = [],
}: Props) {
  const [refreshSignal, setRefreshSignal] = useState(0);

  const bump = useCallback(() => {
    setRefreshSignal((n) => n + 1);
  }, []);

  return (
    <>
      <MarketingAgentPanel onScheduled={bump} />
      <CampaignPanel
        initialCounts={initialCounts}
        initialCampaigns={initialCampaigns}
        refreshSignal={refreshSignal}
      />
    </>
  );
}
