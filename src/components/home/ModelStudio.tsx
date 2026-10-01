'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Link from 'next/link';
import {
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Box,
  Gift,
  ShoppingBag,
  PackageCheck,
  ChevronRight,
  Bot,
} from 'lucide-react';

export type ModelItem = {
  id: string;
  name: string;
  tag: string;
  category: 'Customer Gifting' | 'Artisan Craft' | 'Curated Goods' | 'Seller Warehouse' | 'Customer Intelligence';
  audience: 'For Shoppers' | 'For Sellers';
  accent: string;
  url: string;
  height: number;
  initialRotation: [number, number, number];
  title: string;
  description: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  icon: typeof Gift;
};

// Luxury Gift Box & Artisan Craft are now first, not the robot!
const MODELS: ModelItem[] = [
  {
    id: 'gift-box',
    name: 'Luxury Gift Box',
    tag: 'PHOTO-TO-GIFT',
    category: 'Customer Gifting',
    audience: 'For Shoppers',
    accent: '#f43f5e',
    url: '/assets/landing/models/gift-box.glb',
    height: 1.45,
    initialRotation: [0.25, 0.45, 0],
    title: 'Photo-to-Gift Engine & Custom Unboxing',
    description:
      'Snap a photo or paste inspiration to automatically discover matching artisan goods. Wrap in premium silk ribbons, attach a digital wax-sealed note, and surprise-deliver directly to friends with zero address awkwardness.',
    highlights: [
      'Visual lens matching from any photo',
      'Bespoke gift wrap & wax-seal note',
      'Direct doorstep surprise delivery to friends',
    ],
    ctaLabel: 'Explore Gifting Engine',
    ctaHref: '/gifts',
    icon: Gift,
  },
  {
    id: 'pouch',
    name: 'Artisan Textile Pouch',
    tag: '3D CRAFT INSPECTOR',
    category: 'Artisan Craft',
    audience: 'For Shoppers',
    accent: '#f59e0b',
    url: '/assets/landing/models/pouch.glb',
    height: 1.35,
    initialRotation: [0.2, -0.4, 0],
    title: '360° Handcrafted Texture Inspection',
    description:
      'Shop independent studios with confidence. Our real-time 3D inspection lets you rotate handcrafted items, examine organic weave textures, and verify artisan finishing prior to placing an order.',
    highlights: [
      'Sub-millimeter texture & weave inspection',
      'Zero surprise returns or mismatched sizing',
      'Direct-from-studio verified provenance',
    ],
    ctaLabel: 'Browse Artisan Boutiques',
    ctaHref: '/shops',
    icon: ShoppingBag,
  },
  {
    id: 'long-product',
    name: 'Curated Designer Good',
    tag: 'DIMENSION VERIFIER',
    category: 'Curated Goods',
    audience: 'For Shoppers',
    accent: '#06b6d4',
    url: '/assets/landing/models/long-product.glb',
    height: 1.5,
    initialRotation: [0.3, 0.35, 0],
    title: 'Precision Dimension & Material Inspection',
    description:
      'Experience goods in true spatial perspective before checkout. Inspect ergonomics, metallic luster, and sleek finishes from every conceivable angle.',
    highlights: [
      'Accurate scale & dimension perspective',
      'Physically-based rendering (PBR) finishes',
      'Curated from top independent creators',
    ],
    ctaLabel: 'Explore Product Catalog',
    ctaHref: '/products',
    icon: PackageCheck,
  },
  {
    id: 'brown-box',
    name: 'Merchant Dispatch Box',
    tag: 'SELLER FULFILLMENT',
    category: 'Seller Warehouse',
    audience: 'For Sellers',
    accent: '#8b5cf6',
    url: '/assets/landing/models/brown-box.glb',
    height: 1.4,
    initialRotation: [0.25, 0.5, 0],
    title: 'Smart Inventory & Barcode Packaging',
    description:
      'For boutique sellers: 1-click shipping label generation, automated airway bills, multi-variant inventory control, and scheduled courier pickups managed seamlessly from your Seller Desk.',
    highlights: [
      'Automated airway bill (AWB) generation',
      'Batch packing slips & barcode integration',
      'Live stock syncing across variants',
    ],
    ctaLabel: 'View Seller Inventory Tools',
    ctaHref: '/seller/inventory',
    icon: Box,
  },
  {
    id: 'robot',
    name: 'AI Shopping Robot',
    tag: 'AUTONOMOUS AGENT',
    category: 'Customer Intelligence',
    audience: 'For Shoppers',
    accent: '#6c63ff',
    url: '/assets/landing/models/robot.glb',
    height: 1.6,
    initialRotation: [0.15, -0.3, 0],
    title: 'Autonomous AI Shopping Agent',
    description:
      'Meet your personal shopping copilot. ShopSphere’s AI Agent understands natural language, analyzes boutique catalogs, respects your spending limits, and autonomously finds exact matches from verified artisans.',
    highlights: [
      'Conversational multi-turn memory',
      'Wallet-authorized 1-tap checkout',
      'Understands aesthetic & budget constraints',
    ],
    ctaLabel: 'Test AI Agent Workspace',
    ctaHref: '/agent',
    icon: Bot,
  },
];

function fitHeight(raw: THREE.Object3D, height: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(raw);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  raw.position.sub(center);
  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
  const scale = height / maxDimension;
  const holder = new THREE.Group();
  holder.scale.setScalar(scale);
  holder.add(raw);
  const pivot = new THREE.Group();
  pivot.add(holder);
  return pivot;
}

export default function ModelStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Default to gift-box instead of robot!
  const [activeModelId, setActiveModelId] = useState<string>('gift-box');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const activeModel = MODELS.find((m) => m.id === activeModelId) ?? MODELS[0];

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelContainerRef = useRef<THREE.Group | null>(null);
  const modelsCacheRef = useRef<Record<string, THREE.Group>>({});
  const activePivotRef = useRef<THREE.Group | null>(null);
  const rotationRef = useRef<{ x: number; y: number }>({ x: 0.25, y: 0.45 });
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateRef = useRef<boolean>(true);

  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Dedicated single container for models: guarantees no models leak or duplicate!
    const modelContainer = new THREE.Group();
    scene.add(modelContainer);
    modelContainerRef.current = modelContainer;

    const camera = new THREE.PerspectiveCamera(36, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 0.4, 4.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Studio Lighting matching Dark Neumorphic Light Direction (Top-Left Key Light)
    const ambient = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.6);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcde3f5, 1.1);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xbad7ff, 1.8);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Neumorphic Pedestal Disc Molded from #12151c
    const pedestalGeo = new THREE.CylinderGeometry(1.65, 1.75, 0.09, 64);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x12151c,
      roughness: 0.45,
      metalness: 0.25,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.92;
    scene.add(pedestal);

    // Opposing Bevel Accent Ring
    const ringGeo = new THREE.TorusGeometry(1.72, 0.016, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6c63ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.88;
    scene.add(ring);

    const handleResize = () => {
      if (!canvas || !renderer || !camera) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Tranquil, subtle auto-rotation speed (0.0006 rad/frame)
      if (autoRotateRef.current && !isDraggingRef.current) {
        rotationRef.current.y += 0.0006;
      }

      if (activePivotRef.current) {
        activePivotRef.current.rotation.x = rotationRef.current.x;
        activePivotRef.current.rotation.y = rotationRef.current.y;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Dedicated single model loader: completely clears previous models before adding the new one
  useEffect(() => {
    const container = modelContainerRef.current;
    if (!container) return;

    setLoading(true);

    // Thoroughly remove ANY previous models so no orphaned robot/models can ever linger!
    while (container.children.length > 0) {
      container.remove(container.children[0]);
    }
    activePivotRef.current = null;

    let isCurrentEffect = true;
    const cached = modelsCacheRef.current[activeModelId];

    if (cached) {
      container.add(cached);
      activePivotRef.current = cached;
      rotationRef.current = {
        x: activeModel.initialRotation[0],
        y: activeModel.initialRotation[1],
      };
      setLoading(false);
    } else {
      const loader = new GLTFLoader();
      loader.load(
        activeModel.url,
        (gltf) => {
          if (!isCurrentEffect) return;
          // Re-clear to prevent any race condition
          while (container.children.length > 0) {
            container.remove(container.children[0]);
          }
          const pivot = fitHeight(gltf.scene, activeModel.height);
          modelsCacheRef.current[activeModelId] = pivot;
          container.add(pivot);
          activePivotRef.current = pivot;
          rotationRef.current = {
            x: activeModel.initialRotation[0],
            y: activeModel.initialRotation[1],
          };
          setLoading(false);
        },
        undefined,
        (err) => {
          if (!isCurrentEffect) return;
          console.error(`Error loading model ${activeModelId}:`, err);
          setLoading(false);
        }
      );
    }

    return () => {
      isCurrentEffect = false;
    };
  }, [activeModelId, activeModel]);

  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (direction === 'reset') {
      camera.position.z = 4.4;
      setZoomLevel(1);
      return;
    }
    const delta = direction === 'in' ? -0.45 : 0.45;
    const newZ = Math.max(2.6, Math.min(6.2, camera.position.z + delta));
    camera.position.z = newZ;
    setZoomLevel(Number(((4.4 / newZ) * 1).toFixed(2)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.y += deltaX * 0.007;
    rotationRef.current.x = Math.max(-0.6, Math.min(0.6, rotationRef.current.x + deltaY * 0.005));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoom('in');
    } else {
      handleZoom('out');
    }
  };

  return (
    <section
      id="3d-studio"
      style={{
        position: 'relative',
        padding: 'clamp(5rem, 8vw, 8rem) 1.5rem',
        background: '#12151c',
        color: '#f8fafc',
      }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          {/* Neumorphic Inset Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.1rem',
              borderRadius: 999,
              background: '#12151c',
              boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.8), inset -3px -3px 8px rgba(255,255,255,0.04)',
              marginBottom: '1.2rem',
            }}
          >
            <Sparkles size={14} color="#6c63ff" />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#8b84ff',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-display)',
              }}
            >
              Interactive 3D Studio & Ecosystem
            </span>
          </div>

          <h2
            style={{
              margin: '0 0 1rem',
              fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: '#f8fafc',
              fontFamily: 'var(--font-display)',
            }}
          >
            Inspect Every Dimension. Nothing Left to Guess.
          </h2>

          <p
            style={{
              margin: '0 auto',
              maxWidth: 680,
              fontSize: 'clamp(0.95rem, 1.2vw, 1.1rem)',
              lineHeight: 1.65,
              color: '#94a3b8',
              fontFamily: 'var(--font-body)',
            }}
          >
            Whether you are a customer examining artisan craftsmanship before buying, or a merchant tracking
            warehouse parcel logistics — ShopSphere bridges physical fidelity with modern digital shopping.
          </p>
        </div>

        {/* Neumorphic Model Selector Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '0.85rem',
            marginBottom: '2.5rem',
          }}
        >
          {MODELS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeModelId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModelId(item.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.7rem 1.2rem',
                  borderRadius: 16,
                  border: 'none',
                  background: '#12151c',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  boxShadow: isActive
                    ? 'inset 6px 6px 14px rgba(0, 0, 0, 0.85), inset -5px -5px 12px rgba(255, 255, 255, 0.04)'
                    : '6px 6px 14px rgba(0, 0, 0, 0.7), -5px -5px 12px rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: '#12151c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive
                      ? '3px 3px 6px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.04)'
                      : 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.03)',
                  }}
                >
                  <Icon size={14} color={isActive ? item.accent : '#94a3b8'} />
                </div>
                <span>{item.name}</span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 6,
                    background: '#12151c',
                    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.03)',
                    color: isActive ? item.accent : '#64748b',
                    fontWeight: 700,
                  }}
                >
                  {item.audience.includes('Shop') ? 'Customer' : item.audience.includes('Sell') ? 'Seller' : 'Fleet'}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3D Stage & Interactive Specs Dual Deck */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
            alignItems: 'stretch',
          }}
        >
          {/* Left Canvas Deck (7 Cols) — Deep Inset Carved Display Stage */}
          <div
            style={{
              gridColumn: 'span 7',
              position: 'relative',
              borderRadius: 32,
              background: '#12151c',
              boxShadow: 'inset 12px 12px 28px rgba(0, 0, 0, 0.95), inset -10px -10px 24px rgba(255, 255, 255, 0.04)',
              border: 'none',
              overflow: 'hidden',
              minHeight: 540,
              display: 'flex',
              flexDirection: 'column',
            }}
            className="canvas-deck"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              style={{
                width: '100%',
                height: '100%',
                flex: 1,
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
              }}
            />

            {loading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(18, 21, 28, 0.75)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 10,
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#12151c',
                    boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.8), inset -4px -4px 8px rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: `3px solid ${activeModel.accent}33`,
                      borderTopColor: activeModel.accent,
                      animation: 'spin 1.2s linear infinite',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8', fontFamily: 'var(--font-body)' }}>
                  Rendering {activeModel.name}...
                </span>
              </div>
            )}

            {/* Top Interactive Overlay Controls */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                right: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.95rem',
                  borderRadius: 999,
                  background: '#12151c',
                  boxShadow: '6px 6px 12px rgba(0,0,0,0.8), -5px -5px 12px rgba(255,255,255,0.04)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: activeModel.accent,
                    boxShadow: `0 0 8px ${activeModel.accent}`,
                  }}
                />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
                  {activeModel.tag}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.55rem', pointerEvents: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  title={autoRotate ? 'Pause auto-spin' : 'Resume auto-spin'}
                  className="neu-btn"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    padding: 0,
                    color: autoRotate ? activeModel.accent : '#94a3b8',
                    boxShadow: autoRotate
                      ? 'inset 3px 3px 7px rgba(0,0,0,0.8), inset -3px -3px 7px rgba(255,255,255,0.04)'
                      : '5px 5px 10px rgba(0,0,0,0.7), -4px -4px 10px rgba(255,255,255,0.04)',
                  }}
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom('in')}
                  title="Zoom In"
                  className="neu-btn"
                  style={{ width: 40, height: 40, borderRadius: 12, padding: 0 }}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom('out')}
                  title="Zoom Out"
                  className="neu-btn"
                  style={{ width: 40, height: 40, borderRadius: 12, padding: 0 }}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom('reset')}
                  title="Reset Camera"
                  className="neu-btn"
                  style={{ width: 40, height: 40, borderRadius: 12, padding: 0 }}
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Bottom 360° Drag Instruction Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '0.45rem 1.1rem',
                borderRadius: 999,
                background: '#12151c',
                boxShadow: '6px 6px 14px rgba(0,0,0,0.8), -5px -5px 12px rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                pointerEvents: 'none',
              }}
            >
              <RotateCcw size={13} color="#6c63ff" />
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                Click & drag to rotate 360° • Scroll to zoom
              </span>
            </div>
          </div>

          {/* Right Specs Deck (5 Cols) — Extruded Tactile Card */}
          <div
            style={{
              gridColumn: 'span 5',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 32,
              padding: 'clamp(1.8rem, 2.5vw, 2.4rem)',
              background: '#12151c',
              boxShadow: '12px 12px 28px rgba(0, 0, 0, 0.85), -10px -10px 24px rgba(255, 255, 255, 0.04)',
              border: 'none',
            }}
            className="specs-deck"
          >
            <div>
              {/* Audience & Category Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '1.2rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '0.3rem 0.75rem',
                    borderRadius: 999,
                    background: '#12151c',
                    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.8), inset -3px -3px 6px rgba(255,255,255,0.04)',
                    color: activeModel.accent,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {activeModel.audience}
                </span>

                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>

                <span
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#94a3b8',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {activeModel.category}
                </span>
              </div>

              {/* Title */}
              <h3
                style={{
                  margin: '0 0 1rem',
                  fontSize: 'clamp(1.4rem, 2vw, 1.85rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                  color: '#f8fafc',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {activeModel.title}
              </h3>

              {/* In-depth description */}
              <p
                style={{
                  margin: '0 0 1.6rem',
                  fontSize: '0.92rem',
                  lineHeight: 1.65,
                  color: '#94a3b8',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {activeModel.description}
              </p>

              {/* Bulleted Highlights in Inset Wells */}
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                {activeModel.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 16,
                      background: '#12151c',
                      boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.8), inset -3px -3px 8px rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 8,
                        background: '#12151c',
                        boxShadow: '3px 3px 6px rgba(0,0,0,0.6), -2px -2px 6px rgba(255,255,255,0.04)',
                        color: activeModel.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: '0.84rem', lineHeight: 1.45, color: '#e2e8f0', fontFamily: 'var(--font-body)' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <div>
              <Link
                href={activeModel.ctaHref}
                className="neu-btn-primary"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.95rem 1.4rem',
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                }}
              >
                <span>{activeModel.ctaLabel}</span>
                <ChevronRight size={18} />
              </Link>

              <div
                style={{
                  marginTop: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span>Molded Three.js Surface</span>
                <span>Zoom Level: {zoomLevel}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 1024px) {
          .canvas-deck {
            grid-column: span 12 !important;
            min-height: 420px !important;
          }
          .specs-deck {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </section>
  );
}
