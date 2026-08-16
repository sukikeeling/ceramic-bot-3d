/* ============================================================
   fx-system.js —— 任务B 炫丽特效系统
   基于 three-nebula（creativelifeform，MIT，1210★）粒子引擎：
   - celebrate：3D 烟花（径向爆发 + 重力 + 颜色渐变）
   - happy/excited/playful：爱心喷泉
   - 任意状态切换：小闪光 + 冲击波
   - orbit：双激光环反向旋转
   - radar：扩散波纹
   - alerting：红色脉冲
   自写部分：冲击波 Ring、扩散波纹、双环（轻量可靠）。
   ============================================================ */
import * as THREE from "three";
import System, {
  SpriteRenderer,
  Emitter,
  Rate,
  Span,
  Position,
  Mass,
  Radius,
  Life,
  RadialVelocity,
  Vector3D,
  Alpha,
  Scale,
  Color,
  PointZone,
  Force,
  VectorVelocity,
} from "three-nebula";

const TAU = Math.PI * 2;

const FIREWORK_COLORS = [
  ["#ff5d9e", "#ffd84d"],
  ["#79e2d0", "#ff5d9e"],
  ["#8656f6", "#2f86ed"],
  ["#ff9800", "#ff3347"],
  ["#2f86ed", "#79e2d0"],
];

export function createFxSystem({ scene }) {
  const nebula = new System();
  const renderer = new SpriteRenderer(scene, THREE);
  nebula.addRenderer(renderer);
  const group = new THREE.Group();
  group.name = "fx-system";
  scene.add(group);

  /* —— 冲击波（自写 Ring 扩散，半径从脸外圈 0.8 起） —— */
  const shockGeo = new THREE.RingGeometry(0.8, 0.87, 56);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shock = new THREE.Mesh(shockGeo, shockMat);
  shock.visible = false;
  group.add(shock);
  let shockState = null;

  function shockwave(color = 0x79e2d0) {
    shockMat.color.setHex(color);
    shock.visible = true;
    shock.scale.setScalar(1);
    shockState = { t: 0 };
  }

  /* —— 扩散波纹（radar 用，多个循环） —— */
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0x08b9a9,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.86, 56), rippleMat);
  ripple.visible = false;
  group.add(ripple);
  let rippleState = null;

  function startRipple() {
    ripple.visible = true;
    rippleState = { t: 0 };
  }
  function stopRipple() {
    ripple.visible = false;
    rippleState = null;
  }

  /* —— 环绕星点（orbit 用，自写 Points 绕球公转，保证可见） —— */
  const ORBIT_COUNT = 26;
  const orbitGeo = new THREE.BufferGeometry();
  const oPos = new Float32Array(ORBIT_COUNT * 3);
  const oCol = new Float32Array(ORBIT_COUNT * 3);
  const oData = [];
  {
    const palette = [0x7dfff0, 0xffffff, 0xff5d9e, 0xffd84d, 0x9d8cff];
    for (let i = 0; i < ORBIT_COUNT; i += 1) {
      const r = 0.95 + Math.random() * 0.4;
      const a = (i / ORBIT_COUNT) * TAU + Math.random() * 0.3;
      const y = -0.55 + Math.random() * 1.3;
      oData.push({ r, a, y, speed: 0.5 + Math.random() * 0.7, phase: Math.random() * TAU });
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
  const orbitMat = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const orbitPoints = new THREE.Points(orbitGeo, orbitMat);
  orbitPoints.visible = false;
  group.add(orbitPoints);

  /* —— 双激光环（orbit 用，加粗加亮） —— */
  const ringMatA = new THREE.MeshBasicMaterial({
    color: 0x7dfff0,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringMatB = new THREE.MeshBasicMaterial({
    color: 0xff5d9e,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.022, 10, 80), ringMatA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.015, 10, 80), ringMatB);
  ringA.rotation.x = Math.PI / 2.2;
  ringB.rotation.x = Math.PI / 1.8;
  ringA.visible = false;
  ringB.visible = false;
  group.add(ringA, ringB);
  let orbitActive = false;

  /* —— 脉冲环（alerting 用） —— */
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0xff3347,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.02, 8, 72), pulseMat);
  pulse.visible = false;
  group.add(pulse);
  let pulseState = null;

  /* —— 加载霓虹弧 —— */
  const arcMat = new THREE.MeshBasicMaterial({
    color: 0xff5d9e,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.018, 8, 64, TAU * 0.72), arcMat);
  arc.rotation.x = Math.PI / 2;
  arc.visible = false;
  group.add(arc);
  let loadingActive = false;

  /* —— 清理定时器 —— */
  const cleanupTimers = [];

  /* —— 粒子爆发：一次性径向发射（烟花） —— */
  function burstFirework(worldPos) {
    const pair = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const emitter = new Emitter()
      .setRate(new Rate(new Span(90, 130), new Span(0.01))) // 一次爆完
      .setInitializers([
        new Position(new PointZone(worldPos.x, worldPos.y, worldPos.z)),
        new Mass(1),
        new Radius(2, 4.5),
        new Life(1.1, 2.0),
        new RadialVelocity(3.2, new Vector3D(0, 1, 0), 360),
        new VectorVelocity(new Vector3D(0, 1.2, 0)),
      ])
      .setBehaviours([
        new Alpha(1, 0),
        new Scale(0.5, 1.8),
        new Color(new THREE.Color(pair[0]), new THREE.Color(pair[1])),
        new Force(0, -2.2, 0), // 重力回落
      ]);
    nebula.addEmitter(emitter);
    emitter.emit();
    cleanupTimers.push(setTimeout(() => nebula.removeEmitter(emitter), 3200));
  }

  /* —— 持续喷泉（happy/excited 用） —— */
  let fountainEmitter = null;
  function startFountain(color1 = "#ff5d9e", color2 = "#ffd84d", rate = 22) {
    if (fountainEmitter) return;
    fountainEmitter = new Emitter()
      .setRate(new Rate(new Span(rate * 0.7, rate), new Span(0.01)))
      .setInitializers([
        new Position(new PointZone(0, 0.95, 0)),
        new Mass(1),
        new Radius(1.5, 3.2),
        new Life(1.0, 2.2),
        new RadialVelocity(1.4, new Vector3D(0, 1, 0), 40),
        new VectorVelocity(new Vector3D(0, 1.6, 0)),
      ])
      .setBehaviours([
        new Alpha(0.9, 0),
        new Scale(0.3, 1.5),
        new Color(new THREE.Color(color1), new THREE.Color(color2)),
        new Force(0, -1.4, 0),
      ]);
    nebula.addEmitter(fountainEmitter);
    fountainEmitter.emit();
  }
  function stopFountain() {
    if (fountainEmitter) {
      fountainEmitter.stopEmit();
      nebula.removeEmitter(fountainEmitter);
      fountainEmitter = null;
    }
  }

  /* —— 环绕粒子开关（orbit 用，自写 Points） —— */
  function startOrbitParticles() {
    orbitPoints.visible = true;
  }
  function stopOrbitParticles() {
    orbitPoints.visible = false;
  }

  /* —— 状态 → 特效映射 —— */
  const FX = {
    celebrate: () => {
      burstFirework({ x: 0, y: 1.05, z: 0 });
      burstFirework({ x: 0.2, y: 1.35, z: 0.15 });
      burstFirework({ x: -0.2, y: 1.2, z: -0.1 });
      shockwave(0xffd84d);
    },
    happy: () => { startFountain("#ff5d9e", "#ffd84d", 20); shockwave(0xff5d9e); },
    excited: () => { startFountain("#ffd84d", "#ff9800", 30); shockwave(0xff9800); },
    playful: () => { startFountain("#79e2d0", "#ff5d9e", 18); shockwave(0x79e2d0); },
    laughing: () => { startFountain("#ff5d9e", "#8656f6", 16); },
    orbit: () => {
      ringA.visible = true;
      ringB.visible = true;
      orbitActive = true;
      startOrbitParticles();
      shockwave(0x79e2d0);
    },
    radar: () => { startRipple(); },
    loading: () => {
      arc.visible = true;
      loadingActive = true;
    },
    alerting: () => {
      pulse.visible = true;
      pulseState = { t: 0 };
    },
    sleeping: () => { startFountain("#a8b8ff", "#c9b8ff", 6); },
    thinking: () => { startFountain("#c9b8ff", "#ffffff", 8); },
    humming: () => { startFountain("#79e2d0", "#a8ffd8", 10); },
  };

  function stopAllLoops() {
    stopFountain();
    stopOrbitParticles();
    stopRipple();
    ringA.visible = false;
    ringB.visible = false;
    orbitActive = false;
    arc.visible = false;
    loadingActive = false;
    pulse.visible = false;
    pulseState = null;
  }

  function onState(state) {
    // 切换：先清循环类特效，再触发新状态特效
    stopAllLoops();
    const fx = FX[state];
    if (fx) fx();
  }

  /* —— 每帧更新 —— */
  function update(delta, now) {
    nebula.update(delta);
    if (shockState) {
      shockState.t += delta;
      const p = shockState.t / 0.9;
      if (p >= 1) {
        shock.visible = false;
        shockState = null;
      } else {
        const e = 1 - Math.pow(1 - p, 3);
        shock.scale.setScalar(1 + e * 4.5);
        shockMat.opacity = 0.85 * (1 - p);
      }
    }
    if (rippleState) {
      rippleState.t += delta;
      const p = rippleState.t / 1.6;
      const local = p % 1;
      ripple.scale.setScalar(1 + local * 5);
      rippleMat.opacity = 0.7 * (1 - local);
      ripple.rotation.z += delta * 0.6;
      if (p > 1.6 * 2) { rippleState.t = 0; }
    }
    if (orbitActive) {
      ringA.rotation.z += delta * 1.4;
      ringB.rotation.z -= delta * 2.2;
      ringA.rotation.x = Math.PI / 2.2 + Math.sin(now * 0.001) * 0.25;
      ringB.rotation.x = Math.PI / 1.8 + Math.sin(now * 0.001 + 1) * 0.25;
      // 环绕星点公转
      for (let i = 0; i < ORBIT_COUNT; i += 1) {
        const d = oData[i];
        d.a += delta * d.speed;
        oPos[i * 3] = Math.cos(d.a) * d.r;
        oPos[i * 3 + 1] = d.y + Math.sin(now * 0.0012 + d.phase) * 0.12;
        oPos[i * 3 + 2] = Math.sin(d.a) * d.r;
      }
      orbitGeo.attributes.position.needsUpdate = true;
    }
    if (loadingActive) {
      arc.rotation.z += delta * 2.6;
    }
    if (pulseState) {
      pulseState.t += delta;
      const p = pulseState.t / 2.4;
      const local = p % 1;
      pulse.scale.setScalar(0.92 + local * 0.18);
      pulseMat.opacity = 0.75 * (1 - local);
      if (p > 2.4) { pulseState.t = 0; }
    }
  }

  function dispose() {
    for (const t of cleanupTimers) clearTimeout(t);
    stopAllLoops();
    nebula.destroy();
    shockGeo.dispose();
    shockMat.dispose();
    ripple.geometry.dispose();
    rippleMat.dispose();
    ringA.geometry.dispose();
    ringB.geometry.dispose();
    ringMatA.dispose();
    ringMatB.dispose();
    orbitGeo.dispose();
    orbitMat.dispose();
    arc.geometry.dispose();
    arcMat.dispose();
    pulse.geometry.dispose();
    pulseMat.dispose();
  }

  return { group, onState, update, dispose, shockwave };
}
