/**
 * Next.js instrumentation — boots Sentry on the Node server runtime.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initServerSentry } = await import('@/lib/sentry');
    initServerSentry();
  }
}
