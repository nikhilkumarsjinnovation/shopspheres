export type NotificationChannel = 'push' | 'email' | 'sms';

export interface NotificationInput {
  channel: NotificationChannel | 'in_app';
  userId: string;
  template: string;
  payload?: Record<string, string | number | boolean | null>;
}

export interface NotificationResult {
  queued: boolean;
  channel: NotificationInput['channel'];
  reason: 'provider_not_configured';
}

function result(input: NotificationInput): NotificationResult {
  return { queued: false, channel: input.channel, reason: 'provider_not_configured' };
}

export async function sendPush(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'push' });
}

export async function sendEmail(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'email' });
}

export async function sendSMS(input: NotificationInput): Promise<NotificationResult> {
  return result({ ...input, channel: 'sms' });
}

export async function queueNotification(input: NotificationInput): Promise<NotificationResult> {
  return result(input);
}
