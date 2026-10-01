'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from './LandingNav';
import {
  SCROLL_VH,
  featureOpacity,
  frameOpacity,
  scrollPhase,
  sectionShift,
  zipOpen,
  type FilmPhase,
} from './film/beats';
import { mountFrameScrub, type FrameApi } from './film/frameScrub';
import { mountPackageRail, type PackageApi } from './film/packageRail';

const FEATURES = [
  {
    kicker: '01',
    tag: 'AI SEARCH',
    accent: '#10b981',
    title: 'Just say what you want',
    body: 'Type the way you speak. ShopSphere searches across boutiques to show real, high-quality matches instantly.',
    badge: '✦ Conversational Match',
  },
  {
    kicker: '02',
    tag: 'VISUAL LENS',
    accent: '#f43f5e',
    title: 'Send a gift from a photo',
    body: 'Have a photo of something you love? We match the look, wrap it with your personal note, and deliver it.',
    badge: '✦ Photo-to-Gift Engine',
  },
  {
    kicker: '03',
    tag: 'ONE CART',
    accent: '#f59e0b',
    title: 'Many shops, one place',
    body: 'Independent artisan stores live side by side. Browse hundreds of unique shops without switching tabs or carts.',
    badge: '✦ 300+ Verified Boutiques',
  },
  {
    kicker: '04',
    tag: '1-TAP UPI',
    accent: '#06b6d4',
    title: 'Pay one time',
    body: 'Add from any seller, pay once. Instant PhonePe, GPay, Paytm, or effortlessly split the bill with friends.',
    badge: '✦ Zero-Bounce Payments',
  },
  {
    kicker: '05',
    tag: 'SAKSHAM A11Y',
    accent: '#a855f7',
    title: 'Easy to use for everyone',
    body: 'Thoughtfully accessible: high-contrast palettes, large tap zones, voice guidance, and screen-reader harmony.',
    badge: '✦ Universal Usability',
  },
  {
    kicker: '06',
    tag: 'SELLER DESK',
    accent: '#14b8a6',
    title: 'A simple desk for sellers',
    body: 'Sellers track live inventory, receive instant order alerts, and dispatch seamlessly with AI stock predictions.',
    badge: '✦ Real-Time Intelligence',
  },
] as const;

function tiltGlass(event: MouseEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  card.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
  card.style.setProperty('--ry', `${((x - 0.5) * 6).toFixed(2)}deg`);
  card.style.setProperty('--ty', '-3px');
}

function resetGlass(event: MouseEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  card.style.setProperty('--gx', '28%');
  card.style.setProperty('--gy', '18%');
  card.style.setProperty('--rx', '0deg');
  card.style.setProperty('--ry', '0deg');
  card.style.setProperty('--ty', '0px');
}

type Props = {
  diveHref: string;
  diveLabel: string;
  signedIn: boolean;
};

export default function LandingPage({ diveHref, diveLabel, signedIn }: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLCanvasElement>(null);
  const packageRef = useRef<HTMLCanvasElement>(null);
  const framesApi = useRef<FrameApi | null>(null);
  const packagesApi = useRef<PackageApi | null>(null);
  const unlockedRef = useRef(false);
  const diveTimer = useRef<number | null>(null);
  const [loadRatio, setLoadRatio] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState<FilmPhase>('loading');
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const frameCanvas = frameRef.current;
    const packageCanvas = packageRef.current;
    if (!frameCanvas || !packageCanvas) return;

    const previousScroll = document.documentElement.style.scrollBehavior;
    const previousOverflow = document.documentElement.style.overflow;
    const previousBody = document.body.style.background;
    document.documentElement.style.scrollBehavior = 'auto';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.background = '#000';
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    let cancelled = false;
    let loaded = 0;
    try {
      framesApi.current = mountFrameScrub(frameCanvas, (ratio) => {
        loaded = ratio;
        if (!cancelled) setLoadRatio(ratio);
      });
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'The truck frames did not load.');
    }

    mountPackageRail(packageCanvas)
      .then((api) => {
        if (cancelled) {
          api.dispose();
          return;
        }
        packagesApi.current = api;
        api.resize();
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'The packages did not load.');
        }
      });

    const blockWheel = (event: WheelEvent) => {
      if (!unlockedRef.current) event.preventDefault();
    };
    const blockTouch = (event: TouchEvent) => {
      if (!unlockedRef.current) event.preventDefault();
    };
    const blockKey = (event: KeyboardEvent) => {
      if (unlockedRef.current) return;
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
      }
    };
    window.addEventListener('wheel', blockWheel, { passive: false });
    window.addEventListener('touchmove', blockTouch, { passive: false });
    window.addEventListener('keydown', blockKey);

    let lastPhase: FilmPhase = 'loading';
    let raf = 0;

    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      const root = document.getElementById('truck-film');
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = unlockedRef.current && max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      if (loaded < 0.9) {
        if (lastPhase !== 'loading') {
          lastPhase = 'loading';
          setPhase('loading');
        }
        return;
      }
      if (!unlockedRef.current) {
        unlockedRef.current = true;
        document.documentElement.style.overflow = '';
      }

      framesApi.current?.setScroll(progress);
      packagesApi.current?.setScroll(progress);

      const nextPhase = scrollPhase(progress);
      const zip = zipOpen(progress);
      const feat = featureOpacity(progress);
      const lift = `${(1 - zip) * 28 - zip * 46}vh`;
      root?.style.setProperty('--zip', zip.toFixed(4));
      root?.style.setProperty('--feat', feat.toFixed(4));
      root?.style.setProperty('--zipshow', Math.min(1, zip * 1.4).toFixed(4));
      root?.style.setProperty('--lifty', lift);
      root?.style.setProperty('--frames', frameOpacity(progress).toFixed(4));
      root?.style.setProperty('--shift', sectionShift(progress).toFixed(4));

      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase;
        setPhase(nextPhase);
      }

      const deepEnough = window.scrollY > window.innerHeight * 4;
      if (progress > 0.985 && deepEnough && diveHref) {
        if (diveTimer.current === null) {
          diveTimer.current = window.setTimeout(() => {
            router.push(diveHref);
          }, 700);
        }
      } else if (diveTimer.current !== null) {
        window.clearTimeout(diveTimer.current);
        diveTimer.current = null;
      }
    };
    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      framesApi.current?.resize();
      packagesApi.current?.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (diveTimer.current !== null) window.clearTimeout(diveTimer.current);
      window.removeEventListener('wheel', blockWheel);
      window.removeEventListener('touchmove', blockTouch);
      window.removeEventListener('keydown', blockKey);
      window.removeEventListener('resize', onResize);
      framesApi.current?.dispose();
      packagesApi.current?.dispose();
      framesApi.current = null;
      packagesApi.current = null;
      document.documentElement.style.scrollBehavior = previousScroll;
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.background = previousBody;
      history.scrollRestoration = previousRestoration;
    };
  }, [diveHref, reduced, router]);

  if (reduced) {
    return (
      <main style={{ minHeight: '100vh', background: '#070807', color: '#f6f3ec', padding: '4.5rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <img
            src="/assets/landing/starting-video-truck-moving-from-front-to-back/ezgif-frame-001.jpg"
            alt="ShopSphere delivery truck"
            style={{ width: '100%', borderRadius: 16, marginBottom: 28 }}
          />
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 0.95, margin: '0 0 1rem' }}>
            The truck is already on its way.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: 'rgba(246,243,236,0.72)', maxWidth: 520 }}>
            {signedIn ? 'Your shops are open.' : 'Make an account and the next stop is yours.'}
          </p>
          <a
            href={diveHref}
            style={{
              display: 'inline-block',
              marginTop: 24,
              background: '#f6f3ec',
              color: '#102116',
              borderRadius: 999,
              padding: '0.85rem 1.3rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {diveLabel}
          </a>
          <div style={{ marginTop: 48, display: 'grid', gap: 18 }}>
            {FEATURES.map((item) => (
              <section key={item.kicker}>
                <p style={{ margin: 0, color: '#8dcea8', fontSize: 12, letterSpacing: '0.08em' }}>{item.kicker}</p>
                <h2 style={{ margin: '0.25rem 0', fontSize: 22 }}>{item.title}</h2>
                <p style={{ margin: 0, color: 'rgba(246,243,236,0.7)', lineHeight: 1.5 }}>{item.body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const loading = phase === 'loading';

  return (
    <div id="truck-film" data-load={loadRatio.toFixed(3)} data-phase={phase} style={{ background: '#000', color: '#f6f3ec' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#000' }} />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: '#242428',
          opacity: 'var(--zipshow, 0)',
        }}
      />
      <canvas
        ref={frameRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          display: 'block',
          opacity: 'var(--frames, 1)',
          transform: 'translateY(calc(var(--shift, 0) * -100vh))',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3,
          background: '#000',
          transform: 'translateY(calc((1 - var(--shift, 0)) * 100vh))',
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={packageRef}
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 20,
          display: 'block',
          transform: 'translateY(calc((1 - var(--shift, 0)) * 100vh))',
          pointerEvents: 'none',
        }}
      />
      <img
        src="/assets/landing/images/top-view-truck.png"
        alt=""
        style={{
          position: 'fixed',
          zIndex: 5,
          left: '50%',
          top: '46%',
          width: 'min(52vh, 460px)',
          height: 'auto',
          opacity: 'var(--zipshow, 0)',
          transform: 'translate(-50%, calc(-50% + var(--lifty, 24vh))) rotate(90deg)',
          pointerEvents: 'none',
        }}
      />

      {phase === 'features' ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            transform: 'translateY(calc((1 - var(--shift, 0)) * 100vh))',
            pointerEvents: 'none',
          }}
        >
          <LandingNav />
        </div>
      ) : null}

      <section
        aria-label="What ShopSphere does"
        style={{
          position: 'fixed',
          zIndex: 10,
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'max(4.2rem, 5.5vh) 1.25rem 1.25rem',
          transform: 'translateY(calc((1 - var(--shift, 0)) * 100vh))',
          opacity: 'var(--feat, 0)',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Section Header */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 'clamp(0.6rem, 1.4vh, 1.25rem)',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.28rem 0.85rem',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px)',
                marginBottom: '0.4rem',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 10px #10b981',
                }}
              />
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#bbf7d0',
                  textTransform: 'uppercase',
                }}
              >
                Core Pillars
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 'clamp(1.35rem, 2.2vw, 2.05rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: '#ffffff',
              }}
            >
              Everything in One Place. Perfectly In Sync.
            </h2>
          </div>

          {/* Cards Grid: 3x2 on desktop, 2x3 on tablet, 1-col on mobile */}
          <div className="features-grid">
            {FEATURES.map((item, index) => (
              <article
                key={item.kicker}
                onMouseMove={tiltGlass}
                onMouseLeave={resetGlass}
                style={{
                  position: 'relative',
                  pointerEvents: 'auto',
                  borderRadius: 22,
                  padding: 'clamp(0.95rem, 1.4vh, 1.25rem) clamp(1rem, 1.3vw, 1.35rem)',
                  background: [
                    'radial-gradient(280px circle at var(--gx, 28%) var(--gy, 18%), rgba(255,255,255,0.12), transparent 46%)',
                    'linear-gradient(155deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.015) 100%)',
                    'rgba(11, 12, 16, 0.78)',
                  ].join(', '),
                  backdropFilter: 'blur(24px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                  border: '1px solid rgba(255, 255, 255, 0.11)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 18px 40px -15px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.14)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 'clamp(170px, 21vh, 210px)',
                  transform:
                    'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(var(--ty, 0px))',
                  transition: 'transform 100ms ease-out, border-color 200ms ease, box-shadow 200ms ease',
                  overflow: 'visible',
                }}
              >
                {/* Top Row: 3D Model Anchor Slot on TOP-LEFT & Top-Right Tag */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  {/* Top-Left Slot for 3D Model */}
                  <div
                    id={`model-slot-${index}`}
                    style={{
                      width: 68,
                      height: 68,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 18,
                      cursor: 'grab',
                      userSelect: 'none',
                      touchAction: 'none',
                      flexShrink: 0,
                    }}
                    title="Click and drag to spin 3D model"
                  >
                    {/* Ambient glow halo behind 3D model */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: -4,
                        borderRadius: 20,
                        background: `radial-gradient(circle, ${item.accent}33 0%, transparent 72%)`,
                        filter: 'blur(8px)',
                        pointerEvents: 'none',
                      }}
                    />
                    {/* Glass pedestal disc */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 16,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${item.accent}45`,
                        boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 6px 16px -4px ${item.accent}30`,
                        pointerEvents: 'none',
                      }}
                    />
                  </div>

                  {/* Top-Right Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.26rem 0.6rem',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: item.accent,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.kicker}
                    </span>
                    <span
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.72)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3
                    style={{
                      margin: '0 0 0.35rem',
                      fontSize: 'clamp(1.05rem, 1.25vw, 1.2rem)',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: '#ffffff',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'clamp(0.78rem, 0.88vw, 0.86rem)',
                      lineHeight: 1.48,
                      color: 'rgba(241, 245, 249, 0.78)',
                    }}
                  >
                    {item.body}
                  </p>
                </div>

                {/* Bottom capability micro-chip */}
                <div
                  style={{
                    marginTop: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: item.accent,
                      background: `${item.accent}14`,
                      border: `1px solid ${item.accent}33`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 6,
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <style jsx>{`
          .features-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: clamp(0.7rem, 1.1vw, 1rem);
            width: 100%;
          }
          @media (max-width: 1024px) {
            .features-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0.75rem;
            }
          }
          @media (max-width: 640px) {
            .features-grid {
              grid-template-columns: 1fr;
              gap: 0.65rem;
              max-height: 68vh;
              overflow-y: auto;
              pointer-events: auto;
              padding-right: 4px;
            }
          }
        `}</style>
      </section>

      <div
        style={{
          position: 'fixed',
          zIndex: 12,
          left: 0,
          right: 0,
          bottom: '10vh',
          textAlign: 'center',
          opacity: phase === 'zip' || phase === 'dive' ? 1 : 0,
          color: '#f4f1ea',
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, letterSpacing: '0.18em', fontSize: 12, textTransform: 'uppercase' }}>ShopSphere</p>
        <p style={{ margin: '0.35rem 0 0', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>{diveLabel}</p>
      </div>

      {phase === 'lights' ? (
        <p
          style={{
            position: 'fixed',
            zIndex: 6,
            bottom: 28,
            left: 0,
            right: 0,
            textAlign: 'center',
            letterSpacing: '0.22em',
            fontSize: 12,
            textTransform: 'uppercase',
            color: 'rgba(246,243,236,0.7)',
          }}
        >
          Scroll
        </p>
      ) : null}

      {phase !== 'loading' ? (
        <button
          type="button"
          onClick={() => router.push(diveHref)}
          style={{
            position: 'fixed',
            zIndex: 50,
            right: 18,
            bottom: 18,
            background: 'transparent',
            color: 'rgba(246,243,236,0.72)',
            border: '1px solid rgba(246,243,236,0.2)',
            borderRadius: 999,
            padding: '0.45rem 0.8rem',
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      ) : null}

      {loading ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 8,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          <p style={{ margin: 0, letterSpacing: '0.22em', fontSize: 13, textTransform: 'uppercase' }}>ShopSphere</p>
          {loadError ? (
            <>
              <p style={{ margin: 0, maxWidth: 360, textAlign: 'center', color: '#f0b4b4' }}>{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: '#f6f3ec',
                  color: '#111',
                  border: 0,
                  borderRadius: 999,
                  padding: '0.7rem 1rem',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <div style={{ width: 180, height: 2, background: 'rgba(255,255,255,0.15)' }}>
                <div style={{ width: `${Math.round(loadRatio * 100)}%`, height: '100%', background: '#f4e2b0' }} />
              </div>
              <p style={{ margin: 0, color: 'rgba(246,243,236,0.55)', fontSize: 13 }}>{Math.round(loadRatio * 100)}%</p>
            </>
          )}
        </div>
      ) : null}

      <div style={{ height: `${SCROLL_VH}vh` }} />
    </div>
  );
}
