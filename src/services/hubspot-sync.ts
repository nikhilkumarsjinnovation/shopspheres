/**
 * Outbound HubSpot contact upsert. Phone, address, and any extra fields are dropped.
 * https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/batch/post-crm-v3-objects-contacts-batch-upsert
 */

const HUBSPOT_UPSERT_URL = 'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert';

export type HubSpotContactInput = {
  email: string;
  fullName?: string | null;
  phone?: string | null;
  address?: unknown;
};

export type HubSpotContactProperties = {
  email: string;
  firstname: string;
  lastname: string;
};

export type HubSpotUpsertResult =
  | { ok: true; contactId: string | null; status: number }
  | { ok: false; error: string; status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function toHubSpotContactProperties(input: HubSpotContactInput): HubSpotContactProperties {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('A valid email is required for HubSpot sync.');
  }
  const parts = (input.fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    email,
    firstname: parts[0] ?? '',
    lastname: parts.slice(1).join(' '),
  };
}

export function hubSpotUpsertBody(properties: HubSpotContactProperties): string {
  return JSON.stringify({
    inputs: [
      {
        idProperty: 'email',
        id: properties.email,
        properties,
      },
    ],
  });
}

export async function upsertHubSpotContact(
  input: HubSpotContactInput,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HubSpotUpsertResult> {
  if (!token) {
    return { ok: false, error: 'HubSpot is not configured.', status: 501 };
  }
  const properties = toHubSpotContactProperties(input);
  const response = await fetchImpl(HUBSPOT_UPSERT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: hubSpotUpsertBody(properties),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = hubSpotErrorMessage(payload) ?? `HubSpot responded ${response.status}.`;
    return { ok: false, error: message, status: response.status };
  }
  return { ok: true, contactId: readContactId(payload), status: response.status };
}

function readContactId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('results' in payload)) return null;
  const results = payload.results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0];
  if (!first || typeof first !== 'object' || !('id' in first) || typeof first.id !== 'string') return null;
  return first.id;
}

function hubSpotErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return null;
  return typeof payload.message === 'string' ? payload.message.slice(0, 300) : null;
}
