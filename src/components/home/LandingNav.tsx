'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Center toggle — always visible; click shows / hides the banner */}
      <button
        type="button"
        aria-label={open ? 'Hide navigation' : 'Show navigation'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          position: 'fixed',
          top: open ? '0.55rem' : '1.35rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 110,
          width: open ? 12 : 14,
          height: open ? 12 : 14,
          padding: 0,
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          background: open
            ? 'linear-gradient(135deg, #8b5cf6 0%, #6c63ff 100%)'
            : 'linear-gradient(135deg, #a78bfa 0%, #6c63ff 100%)',
          boxShadow: open
            ? '0 0 0 3px rgba(108, 99, 255, 0.25), 0 4px 14px rgba(0, 0, 0, 0.45)'
            : '0 0 0 4px rgba(108, 99, 255, 0.18), 8px 8px 18px rgba(0, 0, 0, 0.55), -4px -4px 12px rgba(255, 255, 255, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {open ? (
        <header
          style={{
            position: 'fixed',
            top: '1.2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            width: 'min(1180px, calc(100vw - 2rem))',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1.4rem',
              borderRadius: 999,
              background: '#12151c',
              border: 'none',
              boxShadow: scrolled
                ? '12px 12px 26px rgba(0, 0, 0, 0.9), -8px -8px 20px rgba(255, 255, 255, 0.05)'
                : '8px 8px 20px rgba(0, 0, 0, 0.8), -6px -6px 16px rgba(255, 255, 255, 0.035)',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: '#12151c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.8), inset -3px -3px 8px rgba(255, 255, 255, 0.05)',
                }}
              >
                <span
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#6c63ff',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  S
                </span>
              </div>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ShopSphere
              </span>
            </Link>

            <nav
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.5rem',
                borderRadius: 999,
                background: '#12151c',
                boxShadow: 'inset 3px 3px 7px rgba(0, 0, 0, 0.75), inset -3px -3px 7px rgba(255, 255, 255, 0.03)',
              }}
              className="desktop-nav"
            >
              <a
                href="#3d-studio"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 999,
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                3D Studio
              </a>
              <a
                href="#customers"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 999,
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                For Shoppers
              </a>
              <a
                href="#sellers"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 999,
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                For Sellers
              </a>
              <Link
                href="/products"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 999,
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Catalog
              </Link>
              <Link
                href="/agent"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 999,
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#6c63ff';
                  e.currentTarget.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.6), -4px -4px 10px rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                AI Shopping
              </Link>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Link
                href="/login"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  padding: '0.55rem 1.1rem',
                  borderRadius: 14,
                  background: '#12151c',
                  boxShadow: '4px 4px 10px rgba(0,0,0,0.6), -3px -3px 8px rgba(255,255,255,0.035)',
                  transition: 'all 0.25s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.boxShadow = '6px 6px 14px rgba(0,0,0,0.7), -4px -4px 10px rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.boxShadow = '4px 4px 10px rgba(0,0,0,0.6), -3px -3px 8px rgba(255,255,255,0.035)';
                }}
              >
                Sign In
              </Link>

              <Link
                href="/products"
                className="neu-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  padding: '0.55rem 1.3rem',
                  borderRadius: 14,
                }}
              >
                <span>Explore</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <style jsx>{`
            @media (min-width: 860px) {
              .desktop-nav {
                display: flex !important;
              }
            }
          `}</style>
        </header>
      ) : null}
    </>
  );
}
