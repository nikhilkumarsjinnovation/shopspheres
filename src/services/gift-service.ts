export type PendingResult = {
  ok: false;
  error: 'pending_phase_1_migration';
};

export interface CreateGiftInput {
  orderId?: string | null;
  senderId: string;
  recipientId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  revealTrigger?: 'date' | 'delivery' | 'manual';
  revealDate?: string | null;
  message?: string | null;
  wrappingOptionId?: string | null;
}

export interface CreateGroupGiftInput {
  organizerId: string;
  recipientEmail?: string | null;
  deadline?: string | null;
}

const pending = (): PendingResult => ({ ok: false, error: 'pending_phase_1_migration' });

/** gifts, gift_notifications, and group_gifts are not in database.types.ts yet (Phase 1.1). */
export async function createGift(_input: CreateGiftInput): Promise<PendingResult> {
  return pending();
}

export async function revealGift(_giftId: string, _userId: string): Promise<PendingResult> {
  return pending();
}

export async function thankSender(_giftId: string, _userId: string): Promise<PendingResult> {
  return pending();
}

export async function createGroupGift(_input: CreateGroupGiftInput): Promise<PendingResult> {
  return pending();
}
