import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HANDOFF, RANGES } from './beats';

const URLS = [
  '/assets/landing/models/brown-box.glb',
  '/assets/landing/models/gift-box.glb',
  '/assets/landing/models/pouch.glb',
  '/assets/landing/models/long-product.glb',
  '/assets/landing/models/robot.glb',
  '/assets/landing/models/big-truck.glb',
] as const;

const HEIGHTS = [0.84, 0.88, 0.82, 0.90, 0.96, 1.05];

export type PackageApi = {
  setScroll: (progress: number) => void;
  resize: () => void;
  dispose: () => void;
};

function fitHeight(raw: THREE.Object3D, height: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(raw);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  raw.position.sub(center);
  const scale = height / Math.max(size.x, size.y, size.z, 0.001);
  const holder = new THREE.Group();
  holder.scale.setScalar(scale);
  holder.add(raw);
  const pivot = new THREE.Group();
  pivot.add(holder);
  return pivot;
}

function load(loader: GLTFLoader, url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

export function mountPackageRail(canvas: HTMLCanvasElement): Promise<PackageApi> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0.15, 6.2);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.AmbientLight(0xfff8ef, 1.25));
  const key = new THREE.DirectionalLight(0xfff4e4, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc5d4c8, 0.8);
  fill.position.set(-4, 2, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbad7ff, 1.0);
  rim.position.set(0, -3, -3);
  scene.add(rim);

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  };
  resize();

  let disposed = false;
  let progress = 0;
  let anim = 0;
  const pivots: THREE.Group[] = [];
  const placed = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const aimDir = new THREE.Vector3();

  const loader = new GLTFLoader();
  return Promise.all(URLS.map((url) => load(loader, url))).then((models) => {
    if (disposed) {
      renderer.dispose();
      return { setScroll: () => undefined, resize: () => undefined, dispose: () => undefined };
    }
    models.forEach((model, index) => {
      const pivot = fitHeight(model, HEIGHTS[index]);
      scene.add(pivot);
      pivots.push(pivot);
    });

    const timer = new THREE.Timer();
    const userSpin = pivots.map(() => ({ x: 0.16, y: 0.42 }));
    let drag: { index: number; x: number; y: number } | null = null;
    const slotCleanups: Array<() => void> = [];

    // Attach direct interactive drag capture to the top-left slot elements of each card
    pivots.forEach((_, index) => {
      const slot = document.getElementById(`model-slot-${index}`);
      if (!slot) return;
      const onDown = (e: PointerEvent) => {
        drag = { index, x: e.clientX, y: e.clientY };
        try {
          slot.setPointerCapture(e.pointerId);
        } catch {}
        slot.style.cursor = 'grabbing';
      };
      const onMove = (e: PointerEvent) => {
        if (!drag || drag.index !== index) return;
        userSpin[index].y += (e.clientX - drag.x) * 0.014;
        userSpin[index].x += (e.clientY - drag.y) * 0.009;
        drag.x = e.clientX;
        drag.y = e.clientY;
      };
      const onUp = (e: PointerEvent) => {
        if (drag?.index === index) {
          drag = null;
          try {
            slot.releasePointerCapture(e.pointerId);
          } catch {}
          slot.style.cursor = 'grab';
        }
      };
      slot.addEventListener('pointerdown', onDown);
      slot.addEventListener('pointermove', onMove);
      slot.addEventListener('pointerup', onUp);
      slot.addEventListener('pointercancel', onUp);
      slotCleanups.push(() => {
        slot.removeEventListener('pointerdown', onDown);
        slot.removeEventListener('pointermove', onMove);
        slot.removeEventListener('pointerup', onUp);
        slot.removeEventListener('pointercancel', onUp);
      });
    });

    const loop = (now: number) => {
      if (disposed) return;
      anim = window.requestAnimationFrame(loop);
      timer.update(now);
      camera.updateMatrixWorld();
      const onStage = progress >= HANDOFF[0] && progress < RANGES.zip[0];
      const canvasBox = canvas.getBoundingClientRect();
      const focal = (canvasBox.height * 0.5) / Math.tan((camera.fov * Math.PI) / 360);

      pivots.forEach((pivot, index) => {
        const slot = document.getElementById(`model-slot-${index}`);
        const box = slot?.getBoundingClientRect();
        const live = onStage && !!box && box.width > 8 && box.height > 8;
        pivot.visible = live;
        if (!live || !box) return;

        // Auto-rotation when not user-dragged
        if (drag?.index !== index) userSpin[index].y += 0.005;

        // Aim ray directly at the center of the top-left slot
        const centerX = box.left + box.width * 0.5;
        const centerY = box.top + box.height * 0.5;
        const ndcX = ((centerX - canvasBox.left) / Math.max(canvasBox.width, 1)) * 2 - 1;
        const ndcY = -((centerY - canvasBox.top) / Math.max(canvasBox.height, 1)) * 2 + 1;
        aim.set(ndcX, ndcY, 0.5).unproject(camera);
        aimDir.copy(aim).sub(camera.position).normalize();

        // Size model precisely to fit the top-left slot (~64-68px)
        const targetSize = Math.max(Math.min(box.width, box.height) * 0.94, 32);
        const distance = (HEIGHTS[index] * focal) / targetSize;

        // Position slightly forward toward the camera so it floats in front of the card
        placed.copy(camera.position).addScaledVector(aimDir, distance - 0.12);
        pivot.position.copy(placed);
        pivot.rotation.set(userSpin[index].x, userSpin[index].y, 0);
        pivot.scale.setScalar(1);
      });

      renderer.render(scene, camera);
    };
    loop(performance.now());

    return {
      setScroll: (next) => {
        progress = next;
      },
      resize,
      dispose: () => {
        disposed = true;
        slotCleanups.forEach((cleanup) => cleanup());
        window.cancelAnimationFrame(anim);
        timer.dispose();
        renderer.dispose();
      },
    };
  });
}
