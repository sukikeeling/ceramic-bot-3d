/* ============================================================
   bot-model.js —— 3D 立体萌系陶瓷 Sonnet Bot
   升级：
   1. 萌系水滴团子（Teardrop Blob）程序化曲面雕刻
   2. 顶级温润骨瓷配方（高光 Clearcoat + Sheen 柔光漫反射）
   3. 双侧温润白瓷萌翼（带黄铜轴套，随呼吸轻扑）
   4. 头顶悬浮黄铜双层天使小光环（Mini Floating Crown）
   5. Q 弹果冻摸头形变（Squash & Stretch）与爆心星光粒子（Boop Sparks）
   6. 自动轮询 + 表情环 3D 实时 Morph
   ============================================================ */
import * as THREE from "three";
import { FaceEngine } from "./face-engine.js";
import { EyeMesh, FACE_RADIUS } from "./eye-mesh.js";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/* mulberry32 随机种子 */
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
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    sheen: 0.85,
    sheenRoughness: 0.22,
    sheenColor: new THREE.Color(0xffffff),
    reflectivity: 0.9,
    envMapIntensity: 1.15,
  });
}

/* —— 黄铜金属材质 —— */
function createBrass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc7973f,
    metalness: 1,
    roughness: 0.28,
    clearcoat: 0.5,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.0,
  });
}

export function createCeramicBot({ onLine = null } = {}) {
  const group = new THREE.Group();

  /* —— 1. 身体：程序化水滴团子（Teardrop Cute Blob）+ 骨瓷起伏 —— */
  const faceGeometry = new THREE.SphereGeometry(FACE_RADIUS, 64, 48);
  {
    const random = mulberry32(20260816);
    const pos = faceGeometry.attributes.position;
    const norm = faceGeometry.attributes.normal;
    for (let i = 0; i < pos.count; i += 1) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // 计算球面极角 phi (0 顶部, PI 底部)
      const rOrig = Math.sqrt(x * x + y * y + z * z) || 1;
      const cosPhi = y / rOrig; // 1 顶, -1 底

      // 水滴形下沉变形：上部微收、中下部饱满扩展
      const shapeMod = 1.0 - 0.09 * cosPhi + 0.07 * (1.0 - cosPhi * cosPhi);
      x *= shapeMod * 1.04;
      z *= shapeMod * 1.04;
      y = y * 0.94 - 0.04; // 重心轻微下移

      // 手工骨瓷微正弦起伏
      const bump =
        Math.sin(x * 9.5 + y * 4.2) * 0.003 +
        Math.sin(y * 7.1 + z * 5.8) * 0.0028 +
        (random() - 0.5) * 0.0035;

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

  /* —— 2. 配件：温润白瓷微翅膀 / 萌耳 ×2（带黄铜轴套） —— */
  const wingGroupL = new THREE.Group();
  const wingGroupR = new THREE.Group();
  const wingMat = createPorcelain(0xfffdf7);
  const brassMat = createBrass();

  // 翅膀小扇形几何
  const wingGeo = new THREE.SphereGeometry(0.18, 24, 16);
  wingGeo.scale(0.35, 1.4, 0.75); // 压成扁平椭圆翼片
  const wingMeshL = new THREE.Mesh(wingGeo, wingMat);
  const wingMeshR = new THREE.Mesh(wingGeo, wingMat);
  wingMeshL.castShadow = true;
  wingMeshR.castShadow = true;

  // 黄铜微型轴套
  const socketGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16);
  const socketL = new THREE.Mesh(socketGeo, brassMat);
  const socketR = new THREE.Mesh(socketGeo, brassMat);
  socketL.rotation.z = Math.PI / 2;
  socketR.rotation.z = Math.PI / 2;

  wingGroupL.add(socketL);
  wingGroupL.add(wingMeshL);
  wingMeshL.position.set(-0.14, 0.06, 0);
  wingMeshL.rotation.z = 0.45;

  wingGroupR.add(socketR);
  wingGroupR.add(wingMeshR);
  wingMeshR.position.set(0.14, 0.06, 0);
  wingMeshR.rotation.z = -0.45;

  wingGroupL.position.set(-0.72, 0.12, -0.06);
  wingGroupR.position.set(0.72, 0.12, -0.06);
  wingGroupL.rotation.y = -0.28;
  wingGroupR.rotation.y = 0.28;
  wingGroupL.userData.ignorePointer = true;
  wingGroupR.userData.ignorePointer = true;

  group.add(wingGroupL, wingGroupR);

  /* —— 3. 配件：头顶悬浮微型黄铜发光光冠（Mini Halo） —— */
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, FACE_RADIUS * 1.08, 0);
  crownGroup.userData.ignorePointer = true;

  const crownBrassRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.014, 8, 36),
    brassMat
  );
  crownBrassRing.rotation.x = Math.PI / 2;
  crownGroup.add(crownBrassRing);

  const crownGlowRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd84d,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crownGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.008, 8, 36),
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
    envMapIntensity: 1.1,
    side: THREE.DoubleSide,
  });
  const eye0 = new EyeMesh(ringCount);
  const eye1 = new EyeMesh(ringCount);
  eye0.mesh.material = eyeMaterial;
  eye1.mesh.material = eyeMaterial;
  eye0.mesh.castShadow = true;
  eye1.mesh.castShadow = true;
  group.add(eye0.mesh, eye1.mesh);

  /* —— 5. 腮红（柔和釉下彩渐变） —— */
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7d9e,
    transparent: true,
    opacity: 0.38,
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

  /* —— 7. 3D 粒子系统（状态上浮粒子 + 摸头彩屑爆散） —— */
  const PARTICLE_COLORS = {
    happy: 0xff5d9e, excited: 0xffd84d, sleeping: 0xa8b8ff, humming: 0x79e2d0,
    thinking: 0xc9b8ff, celebrate: 0xff5d9e, sad: 0x7fa8ff, surprised: 0xffd84d,
    scared: 0xff9d5c, angry: 0xff3347, laughing: 0xff5d9e,
  };
  const MAX_PARTICLES = 180;
  const particleGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pCol = new Float32Array(MAX_PARTICLES * 3);
  const pLife = new Float32Array(MAX_PARTICLES);
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  particleGeo.setDrawRange(0, 0);
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.048,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
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
      const r = 0.96 + Math.random() * 0.42;
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
      const radius = FACE_RADIUS * (isBoop ? 0.35 : 0.65);
      pPos[i * 3] = Math.cos(angle) * radius;
      pPos[i * 3 + 1] = isBoop ? (FACE_RADIUS * 0.8 + Math.random() * 0.2) : (-FACE_RADIUS * 0.25);
      pPos[i * 3 + 2] = Math.sin(angle) * radius;
      pVel[i * 3] = (Math.random() - 0.5) * (isBoop ? 0.8 : 0.25);
      pVel[i * 3 + 1] = isBoop ? (0.65 + Math.random() * 0.6) : (0.35 + Math.random() * 0.3);
      pVel[i * 3 + 2] = (Math.random() - 0.5) * (isBoop ? 0.8 : 0.25);
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

  // Q 弹果冻形变状态
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
      squashTime = 0; // 触发 Q 弹果冻变形
      spawnParticles("happy", 12, true); // 爆散 12 颗星光粒子
    },

    togglePause() { return engine.togglePause(); },
    nextMood() { engine.nextMood(); },

    update(now) {
      const snap = engine.frame(now);
      const delta = 0.016;

      // 1. Q 弹果冻受击变形计算（Squash & Stretch）
      let jellyY = 1;
      let jellyXZ = 1;
      if (squashTime < 1.2) {
        squashTime += delta * 2.8;
        const decay = Math.exp(-squashTime * 3.2);
        const osc = Math.sin(squashTime * Math.PI * 4.5);
        const factor = decay * osc * 0.24;
        jellyY = 1.0 - factor;
        jellyXZ = 1.0 + factor * 0.65;
      }

      // 2. 身体弹簧与呼吸起伏
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

      // 3. 翅膀/侧耳跟随呼吸与动作轻扑
      const wingFlutter = Math.sin(now * 0.005) * 0.12;
      wingGroupL.rotation.z = wingFlutter;
      wingGroupR.rotation.z = -wingFlutter;

      // 4. 头顶光冠轻柔旋转与沉浮
      crownGroup.rotation.y = now * 0.0015;
      crownGroup.position.y = FACE_RADIUS * 1.08 + Math.sin(now * 0.003) * 0.018;

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
