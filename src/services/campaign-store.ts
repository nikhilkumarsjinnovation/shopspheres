/**
 * Supabase adapters for campaign segments and send persistence.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { CampaignStore, CampaignRow, CampaignSendRecord } from '@/services/campaign-send';
import type { OrderUserLoader, OrderRowForSegment, UserRowForSegment } from '@/services/campaign-segments';

type Db = SupabaseClient<Database>;

export function createOrderUserLoader(supabase: Db): OrderUserLoader {
  return {
    async loadOrders(): Promise<OrderRowForSegment[]> {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id, status, created_at');
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as OrderRowForSegment[];
    },
    async loadUsers(ids: string[]): Promise<UserRowForSegment[]> {
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', ids);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as UserRowForSegment[];
    },
  };
}

export function createCampaignStore(supabase: Db): CampaignStore {
  return {
    async insertCampaign(row) {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(row)
        .select('id, name, segment, discount_percent, promo_code, status, created_by')
        .single();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as CampaignRow, error: null };
    },
    async updateCampaignStatus(id, status) {
      const { error } = await supabase.from('campaigns').update({ status }).eq('id', id);
      return { error: error?.message ?? null };
    },
    async insertSend(row: CampaignSendRecord) {
      const { error } = await supabase.from('campaign_sends').insert(row);
      return { error: error?.message ?? null };
    },
  };
}
