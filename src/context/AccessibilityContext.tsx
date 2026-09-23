'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';

export interface AccessibilitySettings {
  hasDisability: boolean;
  visualHighContrast: boolean;
  visualFontMagnification: number;
  visualScreenReaderOptimized: boolean;
  motorLargeTouchTargets: boolean;
  cognitiveSimplifiedUI: boolean;
  auditoryCaptions: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
  toggleHighContrast: () => void;
  setFontMagnification: (scale: number) => void;
  toggleLargeTouchTargets: () => void;
  toggleSimplifiedUI: () => void;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  hasDisability: false,
  visualHighContrast: false,
  visualFontMagnification: 1.0,
  visualScreenReaderOptimized: false,
  motorLargeTouchTargets: false,
  cognitiveSimplifiedUI: false,
  auditoryCaptions: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount (first check localStorage, then sync with API if logged in)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('shopsphere_accessibility');
      if (cached) {
        setSettings(JSON.parse(cached));
      }
    } catch {
      // ignore localStorage errors
    }

    // Attempt to fetch from API
    fetchWithCsrf('/api/v1/accessibility')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          const p = data.profile;
          const merged: AccessibilitySettings = {
            hasDisability: Boolean(p.has_disability),
            visualHighContrast: Boolean(p.visual_high_contrast),
            visualFontMagnification: Number(p.visual_font_magnification) || 1.0,
            visualScreenReaderOptimized: Boolean(p.visual_screen_reader_optimized),
            motorLargeTouchTargets: Boolean(p.motor_large_touch_targets),
            cognitiveSimplifiedUI: Boolean(p.cognitive_simplified_ui),
            auditoryCaptions: Boolean(p.auditory_text_captions),
          };
          setSettings(merged);
          try {
            localStorage.setItem('shopsphere_accessibility', JSON.stringify(merged));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  // Apply visual styles to documentElement whenever settings change
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // 1. Font Magnification: alters root rem unit
    if (settings.visualFontMagnification && settings.visualFontMagnification !== 1.0) {
      root.style.fontSize = `${settings.visualFontMagnification * 100}%`;
    } else {
      root.style.fontSize = '100%';
    }

    // 2. High Contrast
    if (settings.visualHighContrast) {
      root.setAttribute('data-high-contrast', 'true');
      root.style.filter = 'contrast(120%)';
    } else {
      root.removeAttribute('data-high-contrast');
      root.style.filter = 'none';
    }

    // 3. Large Touch Targets
    if (settings.motorLargeTouchTargets) {
      root.setAttribute('data-large-touch-targets', 'true');
    } else {
      root.removeAttribute('data-large-touch-targets');
    }

    // 4. Simplified UI
    if (settings.cognitiveSimplifiedUI) {
      root.setAttribute('data-simplified-ui', 'true');
    } else {
      root.removeAttribute('data-simplified-ui');
    }
  }, [settings]);

  // Persist settings
  const persistSettings = useCallback(async (updated: AccessibilitySettings) => {
    setSettings(updated);
    try {
      localStorage.setItem('shopsphere_accessibility', JSON.stringify(updated));
    } catch {}

    try {
      await fetchWithCsrf('/api/v1/accessibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          has_disability: updated.hasDisability,
          visual_high_contrast: updated.visualHighContrast,
          visual_font_magnification: updated.visualFontMagnification,
          visual_screen_reader_optimized: updated.visualScreenReaderOptimized,
          motor_large_touch_targets: updated.motorLargeTouchTargets,
          cognitive_simplified_ui: updated.cognitiveSimplifiedUI,
          auditory_text_captions: updated.auditoryCaptions,
        }),
      });
    } catch (err) {
      console.warn('Could not sync accessibility settings to server:', err);
    }
  }, []);

  const toggleHighContrast = () => {
    persistSettings({
      ...settings,
      visualHighContrast: !settings.visualHighContrast,
      hasDisability: true,
    });
  };

  const setFontMagnification = (scale: number) => {
    persistSettings({
      ...settings,
      visualFontMagnification: scale,
      hasDisability: scale > 1.0 ? true : settings.hasDisability,
    });
  };

  const toggleLargeTouchTargets = () => {
    persistSettings({
      ...settings,
      motorLargeTouchTargets: !settings.motorLargeTouchTargets,
      hasDisability: true,
    });
  };

  const toggleSimplifiedUI = () => {
    persistSettings({
      ...settings,
      cognitiveSimplifiedUI: !settings.cognitiveSimplifiedUI,
      hasDisability: true,
    });
  };

  const updateSettings = async (newSettings: Partial<AccessibilitySettings>) => {
    await persistSettings({ ...settings, ...newSettings });
  };

  const resetSettings = () => {
    persistSettings(defaultSettings);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        isOpenModal,
        setIsOpenModal,
        toggleHighContrast,
        setFontMagnification,
        toggleLargeTouchTargets,
        toggleSimplifiedUI,
        updateSettings,
        resetSettings,
      }}
    >
      {children}

      {/* Saksham Floating Accessibility Trigger Button (Bottom Left) — hidden until the feature is ready */}
      {false && (
      <>
      <button
        type="button"
        onClick={() => setIsOpenModal(!isOpenModal)}
        aria-label="Open Saksham Accessibility Settings"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: 0,
          backgroundColor: '#111111',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.4)',
          border: '1px solid #8a8a8a',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '18px' }} aria-hidden="true">
          
        </span>
        <span>Saksham Access</span>
        {settings.hasDisability && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: 0,
              backgroundColor: '#f2f2f2',
            }}
          />
        )}
      </button>

      {/* Saksham Accessibility Quick Control Modal */}
      {isOpenModal && (
        <div
          role="dialog"
          aria-label="Saksham Inclusive Accessibility Controls"
          style={{
            position: 'fixed',
            bottom: '84px',
            left: '24px',
            zIndex: 50,
            width: 'min(92vw, 380px)',
            backgroundColor: '#ffffff',
            borderRadius: 0,
            border: '1px solid #cccccc',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              backgroundColor: '#111111',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}></span>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                  Saksham Access Hub
                </h2>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#cccccc' }}>
                Inclusive accessibility tailored for all abilities
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpenModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {/* Controls Body */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Font Magnification */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#111111', display: 'block', marginBottom: '6px' }}>
                Text Magnification:
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '100%', scale: 1.0 },
                  { label: '125%', scale: 1.25 },
                  { label: '150%', scale: 1.5 },
                  { label: '175%', scale: 1.75 },
                ].map((item) => (
                  <button
                    key={item.scale}
                    type="button"
                    onClick={() => setFontMagnification(item.scale)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: 0,
                      fontSize: '12px',
                      fontWeight: 600,
                      border: settings.visualFontMagnification === item.scale ? '2px solid #111111' : '1px solid #cccccc',
                      backgroundColor: settings.visualFontMagnification === item.scale ? '#f2f2f2' : '#ffffff',
                      color: settings.visualFontMagnification === item.scale ? '#111111' : '#404040',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: '#f2f2f2',
                borderRadius: 0,
                border: '1px solid #e6e6e6',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111', display: 'block' }}>
                  High Contrast Mode
                </span>
                <span style={{ fontSize: '11px', color: '#737373' }}>
                  Amplifies contrast for low vision & reading ease
                </span>
              </div>
              <button
                type="button"
                onClick={toggleHighContrast}
                style={{
                  padding: '6px 12px',
                  borderRadius: 0,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: settings.visualHighContrast ? '#111111' : '#cccccc',
                  color: '#ffffff',
                }}
              >
                {settings.visualHighContrast ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Large Touch Targets Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: '#f2f2f2',
                borderRadius: 0,
                border: '1px solid #e6e6e6',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111', display: 'block' }}>
                  Large Touch Targets
                </span>
                <span style={{ fontSize: '11px', color: '#737373' }}>
                  Enlarges buttons for motor & tremor accessibility
                </span>
              </div>
              <button
                type="button"
                onClick={toggleLargeTouchTargets}
                style={{
                  padding: '6px 12px',
                  borderRadius: 0,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: settings.motorLargeTouchTargets ? '#111111' : '#cccccc',
                  color: '#ffffff',
                }}
              >
                {settings.motorLargeTouchTargets ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Simplified Cognitive UI Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: '#f2f2f2',
                borderRadius: 0,
                border: '1px solid #e6e6e6',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111', display: 'block' }}>
                  Simplified Interface
                </span>
                <span style={{ fontSize: '11px', color: '#737373' }}>
                  Reduces visual distractions for focus ease
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSimplifiedUI}
                style={{
                  padding: '6px 12px',
                  borderRadius: 0,
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: settings.cognitiveSimplifiedUI ? '#111111' : '#cccccc',
                  color: '#ffffff',
                }}
              >
                {settings.cognitiveSimplifiedUI ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Voice Guide / Screen Reader TTS */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: '#f2f2f2',
                borderRadius: 0,
                border: '1px solid #cccccc',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111', display: 'block' }}>
                  Voice Guide (Screen Reader)
                </span>
                <span style={{ fontSize: '11px', color: '#525252' }}>
                  Reads active page and prices in clear natural voice
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    const h1Text = document.querySelector('h1')?.textContent || document.title;
                    const msg = `ShopSphere India. You are viewing: ${h1Text}. Accessible mode is active. Touch targets are ${settings.motorLargeTouchTargets ? 'enlarged' : 'standard'}. All amounts are in Indian Rupees.`;
                    const u = new SpeechSynthesisUtterance(msg);
                    u.rate = 0.95;
                    window.speechSynthesis.speak(u);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 0,
                  border: '1px solid #111111',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: '#111111',
                  color: '#ffffff',
                }}
              >
                Speak
              </button>
            </div>

            {/* Reset Defaults */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={resetSettings}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#737373',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset to Standard
              </button>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 0,
                  backgroundColor: '#111111',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
