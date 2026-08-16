/* ============================================================
   bot-model.js —— 3D 立体陶瓷 bot
   学习主项目 vibe-submarine：
   - 程序化几何：球面顶点噪声微扰 + 表情环→球面→立体眼睛
   - 陶瓷材质：MeshPhysicalMaterial clearcoat 0.9 配方
   - 自动轮询：FaceEngine 原样驱动（表情 morph / 眨眼 / 弹簧）
   ============================================================ */
import * as THREE from "three";
import { FaceEngine } from "./face-engine.js";
import { EyeMesh, FACE_RADIUS } from "./eye-mesh.js";

const DEG = Math.PI / 180;

/* mulberry32（主项目 mesh-kit 同款种子随机） */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* —— 陶瓷材质（复刻主项目 porcelain 配方） —— */
function createPorcelain(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: 0.33,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.85,
  });
}

export function createCeramicBot({ onLine = null } = {}) {
  const group = new THREE.Group();

  /* —— 脸：程序化球体 + 表面噪声微扰（避免玩具感） —— */
  const faceGeometry = new THREE.SphereGeometry(FACE_RADIUS, 64, 48);
  {
    const random = mulberry32(20260714);
    const position = faceGeometry.attributes.position;
    const normal = faceGeometry.attributes.normal;
    const bump = new Float32Array(position.count);
    // 低频噪声：多组正弦叠加，让表面像手工陶瓷有细微起伏
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      bump[i] =
        Math.sin(x * 9.7 + y * 4.1) * 0.0035 +
        Math.sin(y * 7.3 + z * 5.9) * 0.0032 +
        Math.sin(z * 6.1 + x * 8.3) * 0.0028 +
        (random() - 0.5) * 0.004;
    }
    for (let i = 0; i < position.count; i += 1) {
      position.setXYZ(
        i,
        position.getX(i) + normal.getX(i) * bump[i],
        position.getY(i) + normal.getY(i) * bump[i],
        position.getZ(i) + normal.getZ(i) * bump[i],
      );
    }
    position.needsUpdate = true;
    faceGeometry.computeVertexNormals();
  }
  const faceMaterial = createPorcelain(0xff5d9e); // 桃粉（可换色）
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.castShadow = true;
  face.receiveShadow = true;
  group.add(face);

  /* —— 立体眼睛 ×2（表情环驱动，每帧 morph） —— */
  const ringCount = 47; // 原版每条环 47 点
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfffdf7,
    metalness: 0,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });
  const eye0 = new EyeMesh(ringCount);
  const eye1 = new EyeMesh(ringCount);
  eye0.mesh.material = eyeMaterial;
  eye1.mesh.material = eyeMaterial;
  eye0.mesh.castShadow = true;
  eye1.mesh.castShadow = true;
  group.add(eye0.mesh, eye1.mesh);

  /* —— 腮红（半透明釉下彩，学主项目 blush 思路） —— */
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7d9e,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  const blushGeometry = new THREE.CircleGeometry(0.15, 24);
  const blushL = new THREE.Mesh(blushGeometry, blushMaterial);
  const blushR = new THREE.Mesh(blushGeometry, blushMaterial);
  blushL.position.set(-0.44, -0.28, 0.52).normalize().multiplyScalar(FACE_RADIUS + 0.004);
  blushL.lookAt(blushL.position.clone().multiplyScalar(2));
  blushR.position.set(0.44, -0.28, 0.52).normalize().multiplyScalar(FACE_RADIUS + 0.004);
  blushR.lookAt(blushR.position.clone().multiplyScalar(2));
  group.add(blushL, blushR);

  /* —— 状态光环（特效状态时绕脸发光） —— */
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x79e2d0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(FACE_RADIUS * 1.06, 0.014, 8, 72),
    haloMaterial,
  );
  halo.rotation.x = Math.PI / 2.4;
  halo.visible = false;
  group.add(halo);

  /* —— 3D 粒子系统（状态特效：爱心/星星/Z/音符上浮） —— */
  const PARTICLE_COLORS = {
    happy: 0xff5d9e, excited: 0xffd84d, sleeping: 0xa8b8ff, humming: 0x79e2d0,
    thinking: 0xc9b8ff, celebrate: 0xff5d9e, sad: 0x7fa8ff, surprised: 0xffd84d,
    scared: 0xff9d5c, angry: 0xff3347, laughing: 0xff5d9e,
  };
  const MAX_PARTICLES = 160;
  const particleGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pCol = new Float32Array(MAX_PARTICLES * 3);
  const pLife = new Float32Array(MAX_PARTICLES);
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  particleGeo.setDrawRange(0, 0);
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMaterial);
  group.add(particles);
  let particleCursor = 0;

  /* —— 引擎（自动轮询） —— */
  const engine = new FaceEngine({
    onLine,
    onFx: (type, payload) => {
      if (type === "ring") {
        halo.visible = true;
        haloShownAt = performance.now();
        haloMaterial.color.set(RING_HALO_COLORS[payload] || 0x79e2d0);
      } else if (type === "particle") {
        spawnParticles(payload, 3);
      }
    },
  });

  const RING_HALO_COLORS = {
    orbit: 0x79e2d0, radar: 0x08b9a9, loading: 0xff5d9e,
    alerting: 0xff3347, searching: 0x79e2d0,
  };
  let haloShownAt = 0;

  const FACE_CENTER = new THREE.Vector3(0, 0, 0); // 头组局部坐标的球心

  function spawnParticles(state, count = 1) {
    const color = PARTICLE_COLORS[state] || 0xffffff;
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k += 1) {
      const i = particleCursor;
      particleCursor = (particleCursor + 1) % MAX_PARTICLES;
      const angle = Math.random() * Math.PI * 2;
      const radius = FACE_RADIUS * (0.55 + Math.random() * 0.35);
      pPos[i * 3] = Math.cos(angle) * radius;
      pPos[i * 3 + 1] = -FACE_RADIUS * 0.25 + Math.random() * 0.2;
      pPos[i * 3 + 2] = Math.sin(angle) * radius;
      pVel[i * 3] = (Math.random() - 0.5) * 0.22;
      pVel[i * 3 + 1] = 0.34 + Math.random() * 0.3;
      pVel[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
      pLife[i] = 1;
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
    }
  }

  function updateParticles(dt) {
    let alive = 0;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt * 0.55;
      if (pLife[i] <= 0) { pLife[i] = 0; continue; }
      pPos[i * 3] += pVel[i * 3] * dt;
      pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
      pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      alive += 1;
    }
    particleGeo.setDrawRange(0, alive);
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  const api = {
    group,
    engine,
    faceMaterial,
    eyeMaterial,
    FACE_CENTER,
    eye0,
    eye1,
    halo,
    haloMaterial,
    particles,

    setColor(hex) {
      faceMaterial.color.set(hex);
      engine.setColor(hex);
    },

    update(now) {
      const snap = engine.frame(now);
      // 身体弹簧（原版 scale/rot/y 像素 → 3D 米）
      group.scale.set(snap.body.sx, snap.body.sy, snap.body.sx);
      group.position.y = snap.body.y * 0.0065;
      group.rotation.z = snap.body.rot * DEG * 0.012;
      // 3D 转向（yaw/pitch，拖动时驱动）
      group.rotation.y = snap.yaw * DEG;
      group.rotation.x = snap.pitch * DEG;
      // 立体眼睛 morph —— 对称化：GrokBot 原版数据眼睛挤在右半脸（歪眼设计），
      // 3D 里观感怪。以脸心为轴保持原间距并放大，去掉静态偏置、保留整体漂移（gaze）。
      const tr0 = snap.eyeTransforms[0];
      const tr1 = snap.eyeTransforms[1];
      if (tr0 && tr1) {
        const MID = 114.2705;
        const SPACING = 1.5; // 间距放大系数（萌系正常眼距）
        const half = (tr1.tx - tr0.tx) / 2;
        const mid = (tr0.tx + tr1.tx) / 2;
        const drift = (mid - MID) * 0.3; // 保留 30% 整体漂移（视线跟随/表情整体移动）
        const leftX = MID + drift - half * SPACING;
        const rightX = MID + drift + half * SPACING;
        eye0.update(snap.rings[0], { ...tr0, tx: leftX }, FACE_CENTER);
        eye1.update(snap.rings[1], { ...tr1, tx: rightX }, FACE_CENTER);
      }
      // 光环：特效状态旋转 + 淡出（9 秒后隐藏）
      if (halo.visible) {
        halo.rotation.z += 0.012;
        haloMaterial.opacity = 0.3 + 0.15 * Math.sin(now * 0.006);
        if (now - haloShownAt > 9000) halo.visible = false;
      }
      // 粒子推进
      updateParticles(0.016);
      return snap;
    },

    boop() { engine.boop(); },
    togglePause() { return engine.togglePause(); },
    nextMood() { engine.nextMood(); },

    dispose() {
      engine.dispose();
      faceGeometry.dispose();
      faceMaterial.dispose();
      eyeMaterial.dispose();
      blushGeometry.dispose();
      blushMaterial.dispose();
      halo.geometry.dispose();
      haloMaterial.dispose();
      particleGeo.dispose();
      particleMaterial.dispose();
      eye0.dispose();
      eye1.dispose();
    },
  };

  return api;
}
