'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        width: 'min(1150px, calc(100vw - 2rem))',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          borderRadius: 999,
          background: scrolled
            ? 'rgba(10, 10, 15, 0.75)'
            : 'rgba(15, 15, 22, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: scrolled
            ? '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(139, 92, 246, 0.15)'
            : 'none',
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>S</span>
          </div>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ShopSphere
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.8rem',
          }}
          className="desktop-nav"
        >
          <Link
            href="/products"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
          >
            Catalog
          </Link>
          <Link
            href="/categories"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
          >
            Categories
          </Link>
          <Link
            href="/seller/onboarding"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 500,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
          >
            Sell on ShopSphere
          </Link>
        </nav>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/auth/login"
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: 999,
              transition: 'all 0.2s',
            }}
          >
            Sign In
          </Link>

          <Link
            href="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.5rem 1.25rem',
              borderRadius: 999,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.35)';
            }}
          >
            <span>Shop Now</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
