/* ============================================================
   bot-model.js —— 3D 立体萌系陶瓷 Sonnet Bot（纯正圆滚滚饱满球体）
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

/* —— 顶级温润骨瓷材质 —— */
function createPorcelain(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    sheen: 0.88,
    sheenRoughness: 0.18,
    sheenColor: new THREE.Color(0xffffff),
    reflectivity: 0.95,
    envMapIntensity: 1.2,
  });
}

/* —— 精致拉丝黄铜材质 —— */
function createBrass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc7973f,
    metalness: 1,
    roughness: 0.25,
    clearcoat: 0.5,
    clearcoatRoughness: 0.10,
    envMapIntensity: 1.1,
  });
}

export function createCeramicBot({ onLine = null } = {}) {
  const group = new THREE.Group();

  /* —— 1. 身体：纯正圆润饱满球体（Perfect Cute Sphere） —— */
  const faceGeometry = new THREE.SphereGeometry(FACE_RADIUS, 64, 48);
  {
    const random = mulberry32(20260816);
    const pos = faceGeometry.attributes.position;
    const norm = faceGeometry.attributes.normal;
    // 仅保留极微细的手工陶瓷釉面微正弦起伏，绝不改变正圆几何轮廓
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const bump =
        Math.sin(x * 9.5 + y * 4.2) * 0.0012 +
        Math.sin(y * 7.1 + z * 5.8) * 0.0010 +
        (random() - 0.5) * 0.0012;
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

  /* —— 2. 配件：双侧温润白瓷小萌翼（带黄铜轴套） —— */
  const wingGroupL = new THREE.Group();
  const wingGroupR = new THREE.Group();
  const wingMat = createPorcelain(0xfffdf7);
  const brassMat = createBrass();

  const wingGeo = new THREE.SphereGeometry(0.19, 24, 16);
  wingGeo.scale(0.30, 1.40, 0.70);
  const wingMeshL = new THREE.Mesh(wingGeo, wingMat);
  const wingMeshR = new THREE.Mesh(wingGeo, wingMat);
  wingMeshL.castShadow = true;
  wingMeshR.castShadow = true;

  const socketGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.07, 16);
  const socketL = new THREE.Mesh(socketGeo, brassMat);
  const socketR = new THREE.Mesh(socketGeo, brassMat);
  socketL.rotation.z = Math.PI / 2;
  socketR.rotation.z = Math.PI / 2;

  wingGroupL.add(socketL);
  wingGroupL.add(wingMeshL);
  wingMeshL.position.set(-0.15, 0.05, 0);
  wingMeshL.rotation.z = 0.50;

  wingGroupR.add(socketR);
  wingGroupR.add(wingMeshR);
  wingMeshR.position.set(0.15, 0.05, 0);
  wingMeshR.rotation.z = -0.50;

  wingGroupL.position.set(-0.76, 0.04, -0.02);
  wingGroupR.position.set(0.76, 0.04, -0.02);
  wingGroupL.rotation.y = -0.20;
  wingGroupR.rotation.y = 0.20;
  wingGroupL.userData.ignorePointer = true;
  wingGroupR.userData.ignorePointer = true;

  group.add(wingGroupL, wingGroupR);

  /* —— 3. 配件：头顶悬浮天使小光环 —— */
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, FACE_RADIUS + 0.20, 0.04);
  crownGroup.rotation.x = -0.32;
  crownGroup.userData.ignorePointer = true;

  const crownBrassRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.015, 12, 48),
    brassMat
  );
  crownBrassRing.rotation.x = Math.PI / 2;
  crownBrassRing.castShadow = true;
  crownGroup.add(crownBrassRing);

  const crownGlowRingMat = new THREE.MeshBasicMaterial({
    color: 0xffd84d,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crownGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.009, 8, 36),
    crownGlowRingMat
  );
  crownGlowRing.rotation.x = Math.PI / 2;
  crownGroup.add(crownGlowRing);

  group.add(crownGroup);

  /* —— 4. 眼睛 ×2（实心饱满纯白白瓷大眼睛，高光纯净圆润） —— */
  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    sheen: 0.95,
    sheenColor: new THREE.Color(0xffffff),
    reflectivity: 0.98,
    envMapIntensity: 0.90,
    side: THREE.DoubleSide,
  });
  const eye0 = new EyeMesh(36, false); // 左眼
  const eye1 = new EyeMesh(36, true);  // 右眼
  eye0.mesh.material = eyeMaterial;
  eye1.mesh.material = eyeMaterial;
  eye0.mesh.castShadow = true;
  eye1.mesh.castShadow = true;
  group.add(eye0.mesh, eye1.mesh);

  /* —— 5. 腮红（柔和釉下彩，对称布局） —— */
  const blushMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7d9e,
    transparent: true,
    opacity: 0.40,
    depthWrite: false,
  });
  const blushGeometry = new THREE.CircleGeometry(0.15, 24);
  const blushL = new THREE.Mesh(blushGeometry, blushMaterial);
  const blushR = new THREE.Mesh(blushGeometry, blushMaterial);
  blushL.position.set(-0.42, -0.22, 0.56).normalize().multiplyScalar(FACE_RADIUS + 0.004);
  blushL.lookAt(blushL.position.clone().multiplyScalar(2));
  blushR.position.set(0.42, -0.22, 0.56).normalize().multiplyScalar(FACE_RADIUS + 0.004);
  blushR.lookAt(blushR.position.clone().multiplyScalar(2));
  blushL.userData.ignorePointer = true;
  blushR.userData.ignorePointer = true;
  group.add(blushL, blushR);

  /* —— 6. 状态光环（默认隐藏） —— */
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

  /* —— 7. 3D 粒子系统 —— */
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

  /* —— 8. 彩色环绕星点 —— */
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

  /* —— 9. 雷达光波（默认隐藏） —— */
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

  /* —— 引擎驱动 —— */
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
  let boopBounceTime = 999;

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
      boopBounceTime = 0;
      spawnParticles("happy", 18, true);
    },

    togglePause() { return engine.togglePause(); },
    nextMood() { engine.nextMood(); },

    update(now) {
      const snap = engine.frame(now);
      const delta = 0.016;

      // 1. 摸头轻盈弹跳
      let bounceY = 0;
      if (boopBounceTime < 1.2) {
        boopBounceTime += delta * 3.5;
        const decay = Math.exp(-boopBounceTime * 3.0);
        bounceY = Math.sin(boopBounceTime * Math.PI * 3) * 0.05 * decay;
      }

      // 2. 纯等比缩放呼吸
      const breath = 1.0 + Math.sin(now * 0.0028) * 0.015;
      group.scale.setScalar(breath);

      // 上下微沉浮与转向
      group.position.y = snap.body.y * 0.006 + Math.sin(now * 0.0022) * 0.018 + bounceY;
      group.rotation.z = snap.body.rot * DEG * 0.012;
      group.rotation.y = snap.yaw * DEG;
      group.rotation.x = snap.pitch * DEG;

      // 3. 翅膀随呼吸轻扇
      const wingFlutter = Math.sin(now * 0.0048) * 0.12;
      wingGroupL.rotation.z = wingFlutter;
      wingGroupR.rotation.z = -wingFlutter;

      // 4. 头顶天使光冠自转与悬浮
      crownGroup.rotation.y = now * 0.0018;
      crownGroup.position.y = FACE_RADIUS + 0.20 + Math.sin(now * 0.003) * 0.015;

      // 5. 眼睛网格 Morph（实心纯白瓷灵动大眼）
      const tr0 = snap.eyeTransforms[0];
      const tr1 = snap.eyeTransforms[1];
      eye0.update(snap.rings[0], tr0 || {}, FACE_CENTER);
      eye1.update(snap.rings[0], tr1 || tr0 || {}, FACE_CENTER);

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
        oPos[i * 3 + 1] = d.y + Math.sin(now * 0.0012 + d.phase) * 0.12;
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
