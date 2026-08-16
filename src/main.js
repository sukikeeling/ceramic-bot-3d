import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStudioScene } from "./scene.js";
import { createCeramicBot } from "./bot/bot-model.js";
import "./styles.css";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const errorPanel = document.querySelector("#error");
const bubble = document.querySelector("#bubble");

const CAMERA_POSITION = new THREE.Vector3(1.9, 0.85, 2.6);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

async function start() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.copy(CAMERA_POSITION);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.1;
  controls.maxDistance = 9;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = 1.55;
  controls.enablePan = false;
  controls.update();

  const studio = createStudioScene({ renderer, scene, camera });
  const bot = createCeramicBot({
    onLine: (line) => {
      bubble.textContent = line;
      bubble.classList.remove("show");
      void bubble.offsetWidth;
      bubble.classList.add("show");
      clearTimeout(bubble._t);
      bubble._t = setTimeout(() => bubble.classList.remove("show"), 3400);
    },
  });
  bot.group.position.y = 0;
  scene.add(bot.group);

  /* —— 气泡投影 —— */
  const anchor = new THREE.Vector3();

  /* —— 交互：点击摸头 / 拖住转向 / 悬停视线跟随 —— */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();
  const gazeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 0.78);
  let dragging = false;
  let dragTurn = 0;
  let dragPitch = 0;

  function screenToNdc(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  function hitBot() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(bot.group, true);
    return hits.length > 0;
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    screenToNdc(event);
    if (hitBot()) {
      dragging = true;
      dragTurn = bot.group.rotation.y / (Math.PI / 180);
      dragPitch = bot.group.rotation.x / (Math.PI / 180);
      controls.enabled = false;
      canvas.setPointerCapture?.(event.pointerId);
    } else {
      bot.boop(); // 点空处也会摸头（找 bot 方便）
    }
  });
  window.addEventListener("pointermove", (event) => {
    screenToNdc(event);
    if (dragging) {
      const turn = THREE.MathUtils.clamp(dragTurn + event.movementX * 0.55, -60, 60);
      const pitch = THREE.MathUtils.clamp(dragPitch + event.movementY * 0.42, -35, 35);
      bot.engine.setTurn(turn, pitch);
    } else {
      // 视线跟随
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectSphere(gazeSphere, hitPoint);
      if (hitPoint.x !== 0 || hitPoint.y !== 0 || hitPoint.z !== 0) {
        const dx = THREE.MathUtils.clamp(hitPoint.x / 0.78, -1, 1);
        const dy = THREE.MathUtils.clamp(hitPoint.y / 0.78, -1, 1);
        bot.engine.setGaze(dx, dy);
      } else {
        hitPoint.set(0, 0, 0);
      }
    }
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    controls.enabled = true;
    bot.engine.releaseTurn();
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* —— BOT 控制 —— */
  const botNextMood = document.querySelector("#bot-next-mood");
  const botPause = document.querySelector("#bot-pause");
  const botColor = document.querySelector("#bot-color");
  botNextMood.addEventListener("click", () => bot.nextMood());
  botPause.addEventListener("click", () => {
    const paused = bot.togglePause();
    botPause.textContent = paused ? "bot 继续" : "bot 暂停";
  });
  const COLORS = ["#ff2d8b", "#08c77a", "#2f86ed", "#8656f6", "#ff9800", "#ff3347", "#f8f4ea"];
  let colorIndex = 0;
  botColor.addEventListener("click", () => {
    colorIndex = (colorIndex + 1) % COLORS.length;
    bot.setColor(COLORS[colorIndex]);
  });

  /* —— 相机飞行：特写 / 重置 —— */
  const cameraFlight = { active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, targetTo: new THREE.Vector3() };
  document.querySelector("#bot-closeup").addEventListener("click", () => {
    cameraFlight.active = true;
    cameraFlight.from.copy(camera.position);
    cameraFlight.to.set(0, 0.28, 1.55); // 特写：脸前
    cameraFlight.targetTo.set(0, 0, 0);
    cameraFlight.t = 0;
  });
  document.querySelector("#bot-reset-view").addEventListener("click", () => {
    cameraFlight.active = true;
    cameraFlight.from.copy(camera.position);
    cameraFlight.to.copy(CAMERA_POSITION);
    cameraFlight.targetTo.copy(CAMERA_TARGET);
    cameraFlight.t = 0;
  });

  /* —— 表情秀：遍历 25 个表情展示 3D morph —— */
  const showcaseButton = document.querySelector("#bot-showcase");
  let showcaseTimer = null;
  showcaseButton.addEventListener("click", () => {
    if (showcaseTimer) {
      clearInterval(showcaseTimer);
      showcaseTimer = null;
      showcaseButton.textContent = "表情秀";
      return;
    }
    let exprIndex = bot.engine.expression;
    showcaseTimer = setInterval(() => {
      exprIndex = (exprIndex + 1) % 25;
      bot.engine.chooseExpression(exprIndex);
    }, 1200);
    showcaseButton.textContent = "停止";
  });

  /* —— 渲染循环 —— */
  let previous = performance.now();
  let fpsEl = document.querySelector("#fps");
  let trisEl = document.querySelector("#tris");
  let metricElapsed = 0;
  let metricFrames = 0;
  let frameInProgress = false;

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  function frame(now) {
    if (frameInProgress) return;
    frameInProgress = true;
    try {
      const rawDelta = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      controls.update();
      bot.update(now);

      // 相机飞行插值
      if (cameraFlight.active) {
        cameraFlight.t += rawDelta * 0.9;
        const k = cameraFlight.t >= 1 ? 1 : 1 - Math.pow(1 - cameraFlight.t, 3);
        camera.position.lerpVectors(cameraFlight.from, cameraFlight.to, k);
        controls.target.lerp(cameraFlight.targetTo, k);
        if (cameraFlight.t >= 1) cameraFlight.active = false;
      }

      // 气泡投影
      anchor.copy(bot.group.position);
      anchor.y += 1.05;
      anchor.project(camera);
      if (anchor.z < 1 && anchor.z > -1) {
        bubble.style.left = `${((anchor.x * 0.5 + 0.5) * window.innerWidth).toFixed(0)}px`;
        bubble.style.top = `${((-anchor.y * 0.5 + 0.5) * window.innerHeight).toFixed(0)}px`;
      }

      renderer.render(scene, camera);

      metricElapsed += rawDelta;
      metricFrames += 1;
      if (metricElapsed >= 1) {
        fpsEl.textContent = Math.round(metricFrames / metricElapsed);
        trisEl.textContent = Math.round(renderer.info.render.triangles / 1000) + "K";
        metricElapsed = 0;
        metricFrames = 0;
      }
    } finally {
      frameInProgress = false;
    }
  }
  renderer.setAnimationLoop(frame);
  loading.classList.add("is-hidden");
  window.__bot = bot; // 调试/验证句柄

  window.addEventListener("pagehide", () => {
    renderer.setAnimationLoop(null);
    controls.dispose();
    bot.dispose();
    studio.dispose();
    renderer.dispose();
  }, { once: true });
}

start().catch((error) => {
  console.error(error);
  loading.classList.add("is-hidden");
  errorPanel.hidden = false;
  errorPanel.textContent = `场景启动失败：${error.message}`;
});
