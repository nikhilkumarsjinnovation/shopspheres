'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LandingNav from './LandingNav';
import ModelStudio from './ModelStudio';
import CustomerSection from './CustomerSection';
import SellerSection from './SellerSection';
import ComparisonSection from './ComparisonSection';
import TrustSection from './TrustSection';
import DualCtaSection from './DualCtaSection';
import LandingFooter from './LandingFooter';
import {
  HERO_SCROLL_VH,
  scrollPhase,
  type FilmPhase,
} from './film/beats';
import { mountFrameScrub, type FrameApi } from './film/frameScrub';
import { Sparkles, ChevronDown, ShoppingBag, Store, Box } from 'lucide-react';

type Props = {
  diveHref: string;
  diveLabel: string;
  signedIn: boolean;
};

export default function LandingPage({ diveHref, diveLabel, signedIn }: Props) {
  const router = useRouter();
  const frameRef = useRef<HTMLCanvasElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const framesApi = useRef<FrameApi | null>(null);
  const [loadRatio, setLoadRatio] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [phase, setPhase] = useState<FilmPhase>('loading');
  const [reduced, setReduced] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [isDiving, setIsDiving] = useState(false);
  const [climbing, setClimbing] = useState(false);
  const divingRef = useRef(false);
  const diveLayerRef = useRef<HTMLDivElement>(null);
  const truckRef = useRef<HTMLImageElement>(null);
  const diveCopyRef = useRef<HTMLDivElement>(null);
  const diveTimer = useRef<number | null>(null);

  const triggerDive = useCallback(() => {
    if (divingRef.current) return;
    divingRef.current = true;
    if (diveTimer.current !== null) {
      window.clearTimeout(diveTimer.current);
      diveTimer.current = null;
    }
    setIsDiving(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setClimbing(true));
    });
    window.setTimeout(() => {
      router.push(diveHref);
    }, 1400);
  }, [router, diveHref]);

  useEffect(() => {
    const onScroll = () => {
      if (divingRef.current) return;
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      const zone = window.innerHeight * 3.2;
      const climb =
        maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, (window.scrollY - (maxScroll - zone)) / zone));
      root.style.setProperty('--dive', climb > 0.02 ? '1' : '0');
      root.style.setProperty('--truck-y', `${(70 - climb * 150).toFixed(2)}vh`);
      root.style.setProperty('--dive-copy', climb > 0.78 ? Math.min(1, (climb - 0.78) / 0.16).toFixed(3) : '0');
      const atEnd = climb >= 0.995 && window.scrollY > window.innerHeight * 2;
      if (atEnd) {
        if (diveTimer.current === null) {
          diveTimer.current = window.setTimeout(() => {
            if (!divingRef.current) {
              divingRef.current = true;
              router.push(diveHref);
            }
          }, 900);
        }
      } else if (diveTimer.current !== null) {
        window.clearTimeout(diveTimer.current);
        diveTimer.current = null;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (diveTimer.current !== null) window.clearTimeout(diveTimer.current);
    };
  }, [router, diveHref]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = frameRef.current;
    if (!canvas) return;

    let cancelled = false;
    let loaded = 0;

    try {
      framesApi.current = mountFrameScrub(canvas, (ratio) => {
        loaded = ratio;
        if (!cancelled) setLoadRatio(ratio);
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'The animation frames failed to initialize.');
    }

    let lastPhase: FilmPhase = 'loading';
    let raf = 0;
    let targetProgress = 0;
    let currentProgress = 0;

    const tick = () => {
      raf = window.requestAnimationFrame(tick);
      const track = heroTrackRef.current;
      if (!track) return;

      const trackRect = track.getBoundingClientRect();
      const trackHeight = track.offsetHeight - window.innerHeight;
      targetProgress =
        trackHeight > 0
          ? Math.min(1, Math.max(0, -trackRect.top / trackHeight))
          : 0;

      // Smooth, weighted lerp interpolation to prevent rapid or jarring frame jumps
      currentProgress += (targetProgress - currentProgress) * 0.04;

      if (loaded < 0.9) {
        if (lastPhase !== 'loading') {
          lastPhase = 'loading';
          setPhase('loading');
        }
        return;
      }

      if (!unlocked) {
        setUnlocked(true);
      }

      framesApi.current?.setScroll(currentProgress);
      const nextPhase = scrollPhase(currentProgress);

      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase;
        setPhase(nextPhase);
      }
    };
    raf = window.requestAnimationFrame(tick);

    const onResize = () => {
      framesApi.current?.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      framesApi.current?.dispose();
      framesApi.current = null;
    };
  }, [reduced, unlocked]);

  const scrollToSection = useCallback((id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  if (reduced) {
    return (
      <main style={{ minHeight: '100vh', background: '#12151c', color: '#f8fafc' }}>
        <LandingNav />
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '7.5rem 1.5rem 4rem', textAlign: 'center' }}>
          <div
            style={{
              padding: '1.5rem',
              borderRadius: 32,
              background: '#12151c',
              boxShadow: '12px 12px 28px rgba(0,0,0,0.85), -10px -10px 24px rgba(255,255,255,0.04)',
              marginBottom: 32,
            }}
          >
            <img
              src="/assets/landing/starting-video-truck-moving-from-front-to-back/ezgif-frame-001.jpg"
              alt="ShopSphere delivery truck"
              style={{ width: '100%', borderRadius: 24 }}
            />
          </div>
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
              lineHeight: 1.08,
              margin: '0 0 1.2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: '#f8fafc',
            }}
          >
            Where Independent Craft Meets Modern Commerce
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: '#94a3b8',
              maxWidth: 640,
              margin: '0 auto 2rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            Shop across hundreds of verified artisan boutiques, inspect goods in 3D, and enjoy 1-tap unified checkout.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a
              href="#3d-studio"
              className="neu-btn-primary"
              style={{ padding: '0.85rem 1.8rem', textDecoration: 'none' }}
            >
              Explore 3D Studio
            </a>
            <a
              href={diveHref}
              className="neu-btn"
              style={{ padding: '0.85rem 1.8rem', textDecoration: 'none' }}
            >
              {diveLabel}
            </a>
          </div>
        </div>

        <ModelStudio />
        <CustomerSection />
        <SellerSection />
        <ComparisonSection />
        <TrustSection />
        <DualCtaSection diveHref={diveHref} diveLabel={diveLabel} signedIn={signedIn} />
        <LandingFooter />
      </main>
    );
  }

  const isLoading = phase === 'loading';

  return (
    <div style={{ background: '#12151c', color: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
      {/* Top Glass Navbar */}
      <LandingNav />

      {/* Cinematic Hero Sticky Scrub Track (DO NOT REMOVE: Preserves video-image frame truck scroll scrub) */}
      <section
        id="hero-track"
        ref={heroTrackRef}
        style={{
          position: 'relative',
          height: `${HERO_SCROLL_VH}vh`,
          background: '#090b0f',
        }}
      >
        {/* Sticky 100vh Viewport */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          {/* Canvas scrubbing the 240 video frames */}
          <canvas
            ref={frameRef}
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              zIndex: 1,
            }}
          />

          {/* Vignette Overlay softly blending into Dark Neumorphic #12151c */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              background: 'radial-gradient(ellipse at center, transparent 35%, #090b0f 95%)',
              pointerEvents: 'none',
            }}
          />

          {/* Scroll Prompt during initial sequence */}
          {phase === 'lights' && !isLoading && (
            <div
              style={{
                position: 'absolute',
                bottom: 34,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 1.2rem',
                borderRadius: 999,
                background: '#12151c',
                boxShadow: '6px 6px 14px rgba(0,0,0,0.8), -5px -5px 12px rgba(255,255,255,0.04)',
                color: '#94a3b8',
                pointerEvents: 'none',
                animation: 'gentleFloat 6s ease-in-out infinite',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ fontSize: '0.74rem', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
                Scroll to Drive Delivery
              </span>
              <ChevronDown size={16} color="#6c63ff" />
            </div>
          )}

          {/* Reveal Card: Molded Dark Neumorphic Hero Panel */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              pointerEvents: phase === 'reveal' ? 'auto' : 'none',
              opacity: phase === 'reveal' ? 1 : 0,
              transform: phase === 'reveal' ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                maxWidth: 840,
                width: '100%',
                borderRadius: 32,
                padding: 'clamp(2.2rem, 4vw, 3.4rem) clamp(1.8rem, 3.5vw, 3rem)',
                background: '#12151c',
                boxShadow: '16px 16px 36px rgba(0, 0, 0, 0.9), -12px -12px 30px rgba(255, 255, 255, 0.05)',
                border: 'none',
                textAlign: 'center',
              }}
            >
              {/* Molded Inset Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.45rem 1.1rem',
                  borderRadius: 999,
                  background: '#12151c',
                  boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.8), inset -3px -3px 8px rgba(255,255,255,0.04)',
                  marginBottom: '1.4rem',
                }}
              >
                <Sparkles size={14} color="#6c63ff" />
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: '#8b84ff',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Autonomous Two-Sided Marketplace
                </span>
              </div>

              {/* Title */}
              <h1
                style={{
                  margin: '0 0 1.2rem',
                  fontSize: 'clamp(2.1rem, 4.2vw, 3.8rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.1,
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Where Independent Craft Meets Modern Commerce
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  margin: '0 auto 2.4rem',
                  maxWidth: 640,
                  fontSize: 'clamp(0.95rem, 1.25vw, 1.15rem)',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Shop directly from 350+ independent artisan boutiques with personal assistance, or scale your craft
                with enterprise inventory, 3D showcases, and automated logistics.
              </p>

              {/* Action Buttons: Varied Icons (ShoppingBag + Store, NOT duplicate robots) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => scrollToSection('3d-studio')}
                  className="neu-btn-primary"
                  style={{
                    gap: '0.55rem',
                    padding: '0.9rem 1.8rem',
                    borderRadius: 16,
                  }}
                >
                  <Box size={18} />
                  <span>Inspect in 3D Studio</span>
                  <ChevronDown size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('customers')}
                  className="neu-btn"
                  style={{
                    gap: '0.55rem',
                    padding: '0.9rem 1.6rem',
                    borderRadius: 16,
                  }}
                >
                  <ShoppingBag size={18} color="#10b981" />
                  <span>For Shoppers</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('sellers')}
                  className="neu-btn"
                  style={{
                    gap: '0.55rem',
                    padding: '0.9rem 1.6rem',
                    borderRadius: 16,
                  }}
                >
                  <Store size={18} color="#6c63ff" />
                  <span>For Sellers</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Floating Skip Intro / Scroll Down Button */}
          {!isLoading && phase !== 'reveal' && (
            <button
              type="button"
              onClick={() => scrollToSection('3d-studio')}
              className="neu-btn"
              style={{
                position: 'absolute',
                zIndex: 50,
                right: 24,
                bottom: 24,
                padding: '0.6rem 1.25rem',
                borderRadius: 16,
                fontSize: '0.84rem',
                gap: '0.45rem',
              }}
            >
              <span>Explore Platform</span>
              <ChevronDown size={14} />
            </button>
          )}

          {/* Loading Screen */}
          {isLoading && (
            <div
              role="status"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 80,
                background: '#12151c',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              {/* Concentric Tactile Depth Icon Well */}
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 24,
                  background: '#12151c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 6px 6px 14px rgba(0,0,0,0.85), inset -5px -5px 12px rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: '#12151c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '5px 5px 12px rgba(0,0,0,0.7), -4px -4px 10px rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#6c63ff', fontFamily: 'var(--font-display)' }}>
                    S
                  </span>
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  letterSpacing: '0.2em',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}
              >
                Molding ShopSphere Surface
              </p>

              {loadError ? (
                <>
                  <p style={{ margin: 0, maxWidth: 360, textAlign: 'center', color: '#f87171', fontSize: '0.88rem' }}>
                    {loadError}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="neu-btn"
                    style={{ padding: '0.65rem 1.4rem' }}
                  >
                    Reload
                  </button>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 220,
                      height: 10,
                      background: '#12151c',
                      borderRadius: 999,
                      boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.04)',
                      padding: 2,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(loadRatio * 100)}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: 'linear-gradient(90deg, #6c63ff, #8b84ff)',
                        boxShadow: '0 0 12px rgba(108, 99, 255, 0.6)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontFamily: 'var(--font-body)' }}>
                    {Math.round(loadRatio * 100)}%
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Flow: Dark Neumorphic Scrollable Sections Below Hero */}
      <main id="main-content" style={{ position: 'relative', zIndex: 10, background: '#12151c' }}>
        {/* 1. Interactive 3D Model Studio */}
        <ModelStudio />

        {/* 2. What Customers Have (Detailed Shopper Ecosystem) */}
        <CustomerSection />

        {/* 3. What Sellers Have (Detailed Merchant Operating System) */}
        <SellerSection />

        {/* 4. Why ShopSphere Advantage (Comparison Matrix) */}
        <ComparisonSection />

        {/* 5. Trust Metrics & Verified Artisan Stats */}
        <TrustSection />

        {/* 6. High-Converting Dual Conversion CTA */}
        <DualCtaSection diveHref={diveHref} diveLabel={diveLabel} signedIn={signedIn} />

        {/* 7. Finale Dispatch Track: Triggers the Truck Driving UP into Sign-In / App */}
        <section
          id="finale-dispatch"
          style={{
            position: 'relative',
            minHeight: '75vh',
            background: '#090b0f',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5rem 1.5rem',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Ambient road perspective glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 100%, rgba(108, 99, 255, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Finale Inset Capsule */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: 680,
              width: '100%',
              borderRadius: 32,
              padding: 'clamp(2.4rem, 4vw, 3.4rem) clamp(1.8rem, 3.5vw, 2.8rem)',
              background: '#12151c',
              boxShadow: '16px 16px 36px rgba(0, 0, 0, 0.9), -12px -12px 30px rgba(255, 255, 255, 0.05)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 1.1rem',
                borderRadius: 999,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.04)',
                color: '#6c63ff',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '1.4rem',
              }}
            >
              <span>Ready to Enter ShopSphere?</span>
            </div>

            <h2
              style={{
                margin: '0 0 1.1rem',
                fontSize: 'clamp(2rem, 3.4vw, 2.8rem)',
                fontWeight: 800,
                color: '#f8fafc',
                letterSpacing: '-0.03em',
                fontFamily: 'var(--font-display)',
              }}
            >
              Dispatch the Fleet & Dive In
            </h2>

            <p
              style={{
                margin: '0 auto 2.2rem',
                maxWidth: 480,
                fontSize: '0.96rem',
                lineHeight: 1.65,
                color: '#94a3b8',
                fontFamily: 'var(--font-body)',
              }}
            >
              Dispatch the express logistics fleet and launch directly into your personalized marketplace.
            </p>

            <button
              type="button"
              onClick={triggerDive}
              className="neu-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.7rem',
                padding: '1.05rem 2.6rem',
                borderRadius: 18,
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>{diveLabel}</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* 8. Comprehensive Platform Footer */}
        <LandingFooter />
        <div aria-hidden style={{ height: '320vh', background: '#090b0f' }} />
      </main>

      {/* Fullscreen Delivery Truck Driving UP Animation into Sign-In / App */}
      <div
        ref={diveLayerRef}
        aria-hidden={!isDiving}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: isDiving ? 1 : 'var(--dive, 0)',
          visibility: 'visible',
          background: '#090b0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Unfurling road/light sweep backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 120%, rgba(108, 99, 255, 0.28) 0%, transparent 65%)',
          }}
        />

        {/* The Top-View Delivery Truck driving UP off the top of screen */}
        <img
          ref={truckRef}
          src="/assets/landing/images/top-view-truck.png"
          alt="ShopSphere Delivery Truck"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 'min(52vh, 460px)',
            height: 'auto',
            transform: climbing
              ? 'translate(-50%, -130vh) rotate(90deg)'
              : 'translate(-50%, var(--truck-y, 48vh)) rotate(90deg)',
            transition: climbing
              ? 'transform 1.1s cubic-bezier(0.18, 0.95, 0.25, 1)'
              : 'none',
            filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.9))',
            pointerEvents: 'none',
          }}
        />

        {/* Cinematic Text: ShopSphere & {diveLabel} */}
        <div
          ref={diveCopyRef}
          style={{
            position: 'absolute',
            bottom: '12vh',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#f8fafc',
            transform: 'translateY(0)',
            opacity: climbing ? 1 : 'var(--dive-copy, 0)',
            transition: 'all 0.5s ease 0.15s',
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              margin: 0,
              letterSpacing: '0.22em',
              fontSize: 13,
              textTransform: 'uppercase',
              color: '#8b84ff',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}
          >
            ShopSphere
          </p>
          <p
            style={{
              margin: '0.45rem 0 0',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
            }}
          >
            {diveLabel}
          </p>
        </div>
      </div>

      {/* Persistent Floating Skip Button — Triggers Truck Drive-Up into Sign-in/App */}
      {!isDiving && (
        <button
          type="button"
          onClick={triggerDive}
          className="neu-btn"
          style={{
            position: 'fixed',
            zIndex: 100,
            right: 22,
            bottom: 22,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.15rem',
            borderRadius: 999,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#94a3b8',
            background: '#12151c',
            border: 'none',
            boxShadow: '6px 6px 14px rgba(0,0,0,0.8), -4px -4px 10px rgba(255,255,255,0.04)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <span>Skip to {signedIn ? 'Catalog' : 'Sign In'}</span>
          <span>→</span>
        </button>
      )}

      <style jsx>{`
        @keyframes gentleFloat {
          0%,
          100% {
            transform: translate(-50%, 0);
          }
          50% {
            transform: translate(-50%, 3px);
          }
        }
      `}</style>
    </div>
  );
}
