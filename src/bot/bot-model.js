/* ============================================================
   bot-model.js —— 3D 立体萌系陶瓷 Sonnet Bot
   学习主项目 vibe-submarine：
   1. 萌系水滴团子（Teardrop Blob）程序化曲面雕刻
   2. 顶级温润骨瓷配方（高光 Clearcoat + Sheen 柔光漫反射）
   3. 双侧温润白瓷微翼（带黄铜轴套，大幅外展，随呼吸轻扑）
   4. 头顶悬浮黄铜双层天使小光冠（Mini Floating Halo，前倾20°优雅公转）
   5. 超 Q 弹果冻摸头形变（Squash & Stretch）与爆心星光粒子
   6. 自动轮询 + 表情环 3D 实时 Morph
   ============================================================ */
import * as THREE from "three";
import { FaceEngine } from "./face-engine.js";
import { EyeMesh, FACE_RADIUS } from "./eye-mesh.js";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

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

/* —— 顶级温润骨瓷材质（高透玻璃釉层 + 丝绸 Sheen 漫反光） —— */
function createPorcelain(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    sheen: 0.85,
    sheenRoughness: 0.20,
    sheenColor: new THREE.Color(0xffffff),
    reflectivity: 0.92,
    envMapIntensity: 1.18,
  });
}

/* —— 精致拉丝黄铜材质 —— */
function createBrass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc7973f,
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.5,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.05,
  });
}

export function createCeramicBot({ onLine = null } = {}) {
  const group = new THREE.Group();

  /* —— 1. 身体：程序化水滴团子（Teardrop Cute Blob） —— */
  const faceGeometry = new THREE.SphereGeometry(FACE_RADIUS, 64, 48);
  {
    const random = mulberry32(20260816);
    const pos = faceGeometry.attributes.position;
    const norm = faceGeometry.attributes.normal;
    for (let i = 0; i < pos.count; i += 1) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const rOrig = Math.sqrt(x * x + y * y + z * z) || 1;
      const cosPhi = y / rOrig; // 1 顶, -1 底

      // 水滴形软萌形变：头部轻微聚拢，下盘软糯饱满
      const shapeMod = 1.0 - 0.08 * cosPhi + 0.06 * (1.0 - cosPhi * cosPhi);
      x *= shapeMod * 1.02;
      z *= shapeMod * 1.02;
      y = y * 0.94 - 0.03;

      // 手工骨瓷微起伏
      const bump =
        Math.sin(x * 9.5 + y * 4.2) * 0.003 +
        Math.sin(y * 7.1 + z * 5.8) * 0.0028 +
        (random() - 0.5) * 0.003;

      pos.setXYZ(i, x + norm.getX(i) * bump, y + norm.getY(i) * bump, z + norm.getZ(i) * bump);
    }
    pos.needsUpdate = true;
    faceGeometry.computeVertexNormals();
  }

  const faceMaterial = createPorcelain(0xff5d9e);
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.castShadow = true;
  face.receiveShadow = true;
  group.add(face);

  /* —— 2. 配件：双侧温润白瓷萌翼（完全外展，清晰可见） —— */
  const wingGroupL = new THREE.Group();
  const wingGroupR = new THREE.Group();
  const wingMat = createPorcelain(0xfffdf7);
  const brassMat = createBrass();

  // 饱满白瓷羽翼片（长 0.34, 宽 0.20, 厚 0.06）
  const wingGeo = new THREE.SphereGeometry(0.20, 24, 16);
  wingGeo.scale(0.32, 1.45, 0.72);
  const wingMeshL = new THREE.Mesh(wingGeo, wingMat);
  const wingMeshR = new THREE.Mesh(wingGeo, wingMat);
  wingMeshL.castShadow = true;
  wingMeshR.castShadow = true;

  // 黄铜转轴轴套
  const socketGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 16);
  const socketL = new THREE.Mesh(socketGeo, brassMat);
  const socketR = new THREE.Mesh(socketGeo, brassMat);
  socketL.rotation.z = Math.PI / 2;
  socketR.rotation.z = Math.PI / 2;

  wingGroupL.add(socketL);
  wingGroupL.add(wingMeshL);
  wingMeshL.position.set(-0.16, 0.06, 0);
  wingMeshL.rotation.z = 0.52;

  wingGroupR.add(socketR);
  wingGroupR.add(wingMeshR);
  wingMeshR.position.set(0.16, 0.06, 0);
  wingMeshR.rotation.z = -0.52;

  // 外展至身体轮廓之外（x = ±0.86）
  wingGroupL.position.set(-0.86, 0.06, -0.04);
  wingGroupR.position.set(0.86, 0.06, -0.04);
  wingGroupL.rotation.y = -0.25;
  wingGroupR.rotation.y = 0.25;
  wingGroupL.userData.ignorePointer = true;
  wingGroupR.userData.ignorePointer = true;

  group.add(wingGroupL, wingGroupR);

  /* —— 3. 配件：头顶悬浮双层黄铜天使小光环（清晰醒目，前倾20°） —— */
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, FACE_RADIUS + 0.22, 0.04); // 悬浮在头顶上方
  crownGroup.rotation.x = -0.32; // 前倾约 18 度，正面一眼看到圆环
  crownGroup.userData.ignorePointer = true;

  // 外层黄铜拉丝光环（半径 0.36）
  const crownBrassRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.016, 12, 48),
    brassMat
  );
  crownBrassRing.rotation.x = Math.PI / 2;
  crownBrassRing.castShadow = true;
  crownGroup.add(crownBrassRing);

  // 内层发光金色光环（半径 0.26）
  const crownGlowRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd84d,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crownGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.010, 8, 36),
    crownGlowRingMat
  );
  crownGlowRing.rotation.x = Math.PI / 2;
  crownGroup.add(crownGlowRing);

  group.add(crownGroup);

  /* —— 4. 立体眼睛 ×2（表情环驱动，每帧实时 Morph） —— */
  const ringCount = 47;
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfffdf7,
    metalness: 0,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xffffff),
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });
  const eye0 = new EyeMesh(ringCount);
  const eye1 = new EyeMesh(ringCount);
  eye0.mesh.material = eyeMaterial;
  eye1.mesh.material = eyeMaterial;
  eye0.mesh.castShadow = true;
  eye1.mesh.castShadow = true;
  group.add(eye0.mesh, eye1.mesh);

  /* —— 5. 腮红（柔和釉下彩） —— */
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7d9e,
    transparent: true,
    opacity: 0.40,
    depthWrite: false,
  });
  const blushGeometry = new THREE.CircleGeometry(0.16, 24);
  const blushL = new THREE.Mesh(blushGeometry, blushMaterial);
  const blushR = new THREE.Mesh(blushGeometry, blushMaterial);
  blushL.position.set(-0.46, -0.26, 0.52).normalize().multiplyScalar(FACE_RADIUS + 0.005);
  blushL.lookAt(blushL.position.clone().multiplyScalar(2));
  blushR.position.set(0.46, -0.26, 0.52).normalize().multiplyScalar(FACE_RADIUS + 0.005);
  blushR.lookAt(blushR.position.clone().multiplyScalar(2));
  blushL.userData.ignorePointer = true;
  blushR.userData.ignorePointer = true;
  group.add(blushL, blushR);

  /* —— 6. 状态光环 —— */
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
  halo.userData.ignorePointer = true;
  halo.rotation.x = Math.PI / 2.4;
  halo.visible = false;
  group.add(halo);

  /* —— 7. 3D 粒子系统（状态上浮粒子 + 摸头爆散彩屑） —— */
  const PARTICLE_COLORS = {
    happy: 0xff5d9e, excited: 0xffd84d, sleeping: 0xa8b8ff, humming: 0x79e2d0,
    thinking: 0xc9b8ff, celebrate: 0xff5d9e, sad: 0x7fa8ff, surprised: 0xffd84d,
    scared: 0xff9d5c, angry: 0xff3347, laughing: 0xff5d9e,
  };
  const MAX_PARTICLES = 200;
  const particleGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pCol = new Float32Array(MAX_PARTICLES * 3);
  const pLife = new Float32Array(MAX_PARTICLES);
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  particleGeo.setDrawRange(0, 0);
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.052,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMaterial);
  particles.userData.ignorePointer = true;
  group.add(particles);
  let particleCursor = 0;

  /* —— 8. 彩色环绕星点（常驻 32 颗） —— */
  const ORBIT_COUNT = 32;
  const orbitGeo = new THREE.BufferGeometry();
  const oPos = new Float32Array(ORBIT_COUNT * 3);
  const oCol = new Float32Array(ORBIT_COUNT * 3);
  const oData = [];
  {
    const palette = [0xff5d9e, 0x7dfff0, 0xffd84d, 0x9d8cff, 0xffffff, 0xff9d5c];
    for (let i = 0; i < ORBIT_COUNT; i += 1) {
      const r = 0.98 + Math.random() * 0.45;
      const a = (i / ORBIT_COUNT) * TAU + Math.random() * 0.4;
      const y = -0.55 + Math.random() * 1.15;
      oData.push({ r, a, y, speed: 0.35 + Math.random() * 0.5, phase: Math.random() * TAU });
      oPos[i * 3] = Math.cos(a) * r;
      oPos[i * 3 + 1] = y;
      oPos[i * 3 + 2] = Math.sin(a) * r;
      const c = new THREE.Color(palette[i % palette.length]);
      oCol[i * 3] = c.r;
      oCol[i * 3 + 1] = c.g;
      oCol[i * 3 + 2] = c.b;
    }
  }
  orbitGeo.setAttribute("position", new THREE.BufferAttribute(oPos, 3));
  orbitGeo.setAttribute("color", new THREE.BufferAttribute(oCol, 3));
  const orbitMaterial = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const orbitPoints = new THREE.Points(orbitGeo, orbitMaterial);
  orbitPoints.userData.ignorePointer = true;
  group.add(orbitPoints);

  /* —— 9. 雷达光波 —— */
  const RIPPLE_COUNT = 3;
  const rippleRings = [];
  const rippleStates = [];
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x08b9a9,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < RIPPLE_COUNT; i += 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.83, 56), rippleMat);
    ring.userData.ignorePointer = true;
    ring.visible = false;
    group.add(ring);
    rippleRings.push(ring);
    rippleStates.push({ t: (i / RIPPLE_COUNT) * 1.4 });
  }

  /* —— 引擎（自动轮询） —— */
  const RING_HALO_COLORS = {
    orbit: 0x79e2d0, radar: 0x08b9a9, loading: 0xff5d9e,
    alerting: 0xff3347, searching: 0x79e2d0,
  };
  let haloShownAt = 0;

  function spawnParticles(state, count = 1, isBoop = false) {
    const color = isBoop ? 0xffd84d : (PARTICLE_COLORS[state] || 0xffffff);
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k += 1) {
      const i = particleCursor;
      particleCursor = (particleCursor + 1) % MAX_PARTICLES;
      const angle = Math.random() * TAU;
      const radius = FACE_RADIUS * (isBoop ? 0.4 : 0.65);
      pPos[i * 3] = Math.cos(angle) * radius;
      pPos[i * 3 + 1] = isBoop ? (FACE_RADIUS * 0.75 + Math.random() * 0.2) : (-FACE_RADIUS * 0.25);
      pPos[i * 3 + 2] = Math.sin(angle) * radius;
      pVel[i * 3] = (Math.random() - 0.5) * (isBoop ? 0.9 : 0.25);
      pVel[i * 3 + 1] = isBoop ? (0.75 + Math.random() * 0.7) : (0.35 + Math.random() * 0.3);
      pVel[i * 3 + 2] = (Math.random() - 0.5) * (isBoop ? 0.9 : 0.25);
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
      pLife[i] -= dt * 0.65;
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

  const FACE_CENTER = new THREE.Vector3(0, 0, 0);

  // Q 弹果冻形变时间（秒）
  let squashTime = 999;

  const api = {
    group,
    engine,
    faceMaterial,
    eyeMaterial,
    wingMat,
    crownGlowRingMat,
    FACE_CENTER,
    eye0,
    eye1,
    halo,
    haloMaterial,
    particles,

    setColor(hex) {
      faceMaterial.color.set(hex);
      engine.setColor(hex);
      if (hex) {
        const c = new THREE.Color(hex);
        crownGlowRingMat.color.copy(c);
        blushMaterial.color.copy(c);
      }
    },

    boop() {
      engine.boop();
      squashTime = 0; // 触发 Q 弹果冻形变
      spawnParticles("happy", 18, true); // 爆散 18 颗金色星光粒子
    },

    togglePause() { return engine.togglePause(); },
    nextMood() { engine.nextMood(); },

    update(now) {
      const snap = engine.frame(now);
      const delta = 0.016;

      // 1. Q 弹果冻形变计算（大幅增强视觉回弹感）
      let jellyY = 1.0;
      let jellyXZ = 1.0;
      if (squashTime < 1.6) {
        squashTime += delta * 3.2;
        // 衰减正弦波：先瞬间压扁 20%、水平外扩 18%，随后三次高频弹性回弹
        const decay = Math.exp(-squashTime * 2.8);
        const osc = Math.sin(squashTime * Math.PI * 4.2);
        const factor = decay * osc * 0.28;
        jellyY = 1.0 - factor;
        jellyXZ = 1.0 + factor * 0.70;
      }

      // 2. 呼吸与身体弹簧
      const breath = 1.0 + Math.sin(now * 0.003) * 0.02;
      group.scale.set(
        snap.body.sx * jellyXZ * breath,
        snap.body.sy * jellyY * breath,
        snap.body.sx * jellyXZ * breath
      );

      group.position.y = snap.body.y * 0.0065 + Math.sin(now * 0.0022) * 0.025;
      group.rotation.z = snap.body.rot * DEG * 0.012;
      group.rotation.y = snap.yaw * DEG;
      group.rotation.x = snap.pitch * DEG;

      // 3. 翅膀跟随呼吸轻扇
      const wingFlutter = Math.sin(now * 0.005) * 0.14;
      wingGroupL.rotation.z = wingFlutter;
      wingGroupR.rotation.z = -wingFlutter;

      // 4. 头顶天使光冠自转与悬浮
      crownGroup.rotation.y = now * 0.0018;
      crownGroup.position.y = FACE_RADIUS + 0.22 + Math.sin(now * 0.003) * 0.02;

      // 5. 立体眼睛 Morph
      const tr0 = snap.eyeTransforms[0];
      const tr1 = snap.eyeTransforms[1];
      if (tr0 && tr1) {
        const MID = 114.2705;
        const SPACING = 1.52;
        const half = (tr1.tx - tr0.tx) / 2;
        const mid = (tr0.tx + tr1.tx) / 2;
        const drift = (mid - MID) * 0.3;
        const leftX = MID + drift - half * SPACING;
        const rightX = MID + drift + half * SPACING;
        eye0.update(snap.rings[0], { ...tr0, tx: leftX }, FACE_CENTER);
        eye1.update(snap.rings[1], { ...tr1, tx: rightX }, FACE_CENTER);
      }

      // 6. 光环淡出
      if (halo.visible) {
        halo.rotation.z += 0.012;
        haloMaterial.opacity = 0.3 + 0.15 * Math.sin(now * 0.006);
        if (now - haloShownAt > 9000) halo.visible = false;
      }

      // 7. 彩色环绕星点公转
      for (let i = 0; i < ORBIT_COUNT; i += 1) {
        const d = oData[i];
        d.a += delta * d.speed;
        oPos[i * 3] = Math.cos(d.a) * d.r;
        oPos[i * 3 + 1] = d.y + Math.sin(now * 0.0012 + d.phase) * 0.14;
        oPos[i * 3 + 2] = Math.sin(d.a) * d.r;
      }
      orbitGeo.attributes.position.needsUpdate = true;

      // 8. 雷达光波扩散
      const radarOn = snap.state === "radar";
      for (let i = 0; i < RIPPLE_COUNT; i += 1) {
        const ring = rippleRings[i];
        const st = rippleStates[i];
        if (radarOn) {
          ring.visible = true;
          st.t += delta;
          const p = st.t % 1.4;
          const k = p / 1.4;
          const e = 1 - Math.pow(1 - k, 3);
          ring.scale.setScalar(1 + e * 4.2);
          rippleMat.opacity = 0.65 * (1 - k);
        } else {
          ring.visible = false;
          st.t = 0;
        }
      }

      // 9. 粒子推进
      updateParticles(delta);
      return snap;
    },

    dispose() {
      engine.dispose();
      faceGeometry.dispose();
      faceMaterial.dispose();
      eyeMaterial.dispose();
      wingMat.dispose();
      brassMat.dispose();
      wingGeo.dispose();
      socketGeo.dispose();
      blushGeometry.dispose();
      blushMaterial.dispose();
      halo.geometry.dispose();
      haloMaterial.dispose();
      particleGeo.dispose();
      particleMaterial.dispose();
      orbitGeo.dispose();
      orbitMaterial.dispose();
      rippleMat.dispose();
      for (const ring of rippleRings) ring.geometry.dispose();
      crownBrassRing.geometry.dispose();
      crownGlowRing.geometry.dispose();
      crownGlowRingMat.dispose();
      eye0.dispose();
      eye1.dispose();
    },
  };

  return api;
}
