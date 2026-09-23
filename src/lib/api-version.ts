import { NextRequest, NextResponse } from 'next/server';

export const API_V1_MEDIA = 'application/vnd.shopsphere.v1+json';

export function requireApiVersion(request: NextRequest): NextResponse | null {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes(API_V1_MEDIA)) {
    return null;
  }
  return NextResponse.json(
    { error: `Send Accept: ${API_V1_MEDIA}` },
    { status: 406 },
  );
}
