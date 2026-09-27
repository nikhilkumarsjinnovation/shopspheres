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

      {/* Saksham Floating Accessibility Trigger Button (Bottom Left) */}
      <button
        type="button"
        className="saksham-trigger-btn"
        onClick={() => setIsOpenModal(!isOpenModal)}
        aria-label="Open Saksham Accessibility Settings"
      >
        <span aria-hidden="true" style={{ fontSize: '1rem' }}>♿</span>
        <span>Saksham Access</span>
        {settings.hasDisability && (
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
        )}
      </button>

      {/* Saksham Accessibility Quick Control Modal */}
      {isOpenModal && (
        <div
          className="saksham-modal-overlay animate-slide-up"
          role="dialog"
          aria-label="Saksham Inclusive Accessibility Controls"
          onClick={() => setIsOpenModal(false)}
        >
          <div
            className="saksham-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Saksham Access Hub
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                  Universal accessibility tailored for all abilities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--fg-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Controls Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Font Magnification */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Text Magnification:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { label: '100%', scale: 1.0 },
                    { label: '125%', scale: 1.25 },
                    { label: '150%', scale: 1.5 },
                    { label: '175%', scale: 1.75 },
                  ].map((item) => (
                    <button
                      key={item.scale}
                      type="button"
                      className={`variant-option-chip ${settings.visualFontMagnification === item.scale ? 'selected' : ''}`}
                      onClick={() => setFontMagnification(item.scale)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* High Contrast Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                    High Contrast Mode
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    Amplifies contrast for low vision & reading ease
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn-card-toggle ${settings.visualHighContrast ? 'active' : ''}`}
                  style={{ background: settings.visualHighContrast ? 'var(--fg-primary)' : 'var(--bg-surface)', color: settings.visualHighContrast ? 'var(--fg-inverted)' : 'var(--fg-primary)' }}
                  onClick={toggleHighContrast}
                >
                  {settings.visualHighContrast ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Large Touch Targets Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                    Large Touch Targets
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    Enlarges buttons for motor & tremor accessibility
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn-card-toggle ${settings.motorLargeTouchTargets ? 'active' : ''}`}
                  style={{ background: settings.motorLargeTouchTargets ? 'var(--fg-primary)' : 'var(--bg-surface)', color: settings.motorLargeTouchTargets ? 'var(--fg-inverted)' : 'var(--fg-primary)' }}
                  onClick={toggleLargeTouchTargets}
                >
                  {settings.motorLargeTouchTargets ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Simplified Cognitive UI Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                    Simplified Interface
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    Reduces visual distractions for focus ease
                  </span>
                </div>
                <button
                  type="button"
                  className={`btn-card-toggle ${settings.cognitiveSimplifiedUI ? 'active' : ''}`}
                  style={{ background: settings.cognitiveSimplifiedUI ? 'var(--fg-primary)' : 'var(--bg-surface)', color: settings.cognitiveSimplifiedUI ? 'var(--fg-inverted)' : 'var(--fg-primary)' }}
                  onClick={toggleSimplifiedUI}
                >
                  {settings.cognitiveSimplifiedUI ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Voice Guide / Screen Reader TTS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                    Voice Guide (Screen Reader)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    Reads active page aloud in clear natural voice
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-card-toggle"
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
                >
                  🔊 Speak
                </button>
              </div>

              {/* Reset Defaults */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', fontSize: '0.825rem', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={resetSettings}
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  className="btn-card-add"
                  style={{ padding: '0.5rem 1.25rem' }}
                  onClick={() => setIsOpenModal(false)}
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
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
