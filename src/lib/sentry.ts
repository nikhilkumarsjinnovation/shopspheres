/**
 * Server-side Sentry helpers. No-ops when SENTRY_DSN is unset.
 */

import * as Sentry from '@sentry/nextjs';

let initialized = false;

export function initServerSentry(): void {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

export function captureRouteError(
  error: unknown,
  context: { route: string; method?: string },
): void {
  initServerSentry();
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    scope.setTag('route', context.route);
    if (context.method) scope.setTag('method', context.method);
    Sentry.captureException(error);
  });
}
