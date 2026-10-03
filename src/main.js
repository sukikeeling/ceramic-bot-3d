import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStudioScene } from "./scene.js";
import { createCeramicBot } from "./bot/bot-model.js";
import "./styles.css";

const canvas = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const errorPanel = document.querySelector("#error");
const bubble = document.querySelector("#bubble");

// 黄金全景构图：5.0 米开阔距离 + 34 度视角，完整呈现头顶天使光环、正圆球体、双翼与双层展台，上下左右留白极其舒适优雅，绝无任何裁切
const CAMERA_POSITION = new THREE.Vector3(0, 0.05, 5.00);
const CAMERA_TARGET = new THREE.Vector3(0, -0.18, 0);

async function start() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.copy(CAMERA_POSITION);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(CAMERA_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.2;
  controls.maxDistance = 9;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = 1.55;
  controls.enablePan = false;
  controls.update();

  const studio = createStudioScene({ renderer, scene, camera });
  let bubbleTimer = null;
  const bot = createCeramicBot({
    onLine: (line) => {
      bubble.textContent = line;
      bubble.hidden = false;
      bubble.classList.remove("show");
      void bubble.offsetWidth;
      bubble.classList.add("show");
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => {
        bubble.classList.remove("show");
        bubbleTimer = setTimeout(() => {
          bubble.hidden = true;
        }, 320);
      }, 3400);
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
  const gazeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 0.85);
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
    return hits.some((h) => !h.object.userData.ignorePointer);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    screenToNdc(event);
    if (hitBot()) {
      bot.boop();
      dragging = true;
      dragTurn = bot.group.rotation.y / (Math.PI / 180);
      dragPitch = bot.group.rotation.x / (Math.PI / 180);
      controls.enabled = false;
      canvas.setPointerCapture?.(event.pointerId);
    }
  });

  window.addEventListener("pointermove", (event) => {
    screenToNdc(event);
    if (dragging) {
      dragTurn = THREE.MathUtils.clamp(dragTurn + event.movementX * 0.45, -44, 44);
      dragPitch = THREE.MathUtils.clamp(dragPitch + event.movementY * 0.35, -26, 26);
      bot.engine.setTurn(dragTurn, dragPitch);
    } else {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectSphere(gazeSphere, hitPoint);
      if (hit) {
        const dx = THREE.MathUtils.clamp(hitPoint.x / 0.85, -1, 1);
        const dy = THREE.MathUtils.clamp(hitPoint.y / 0.85, -1, 1);
        bot.engine.setGaze(dx, dy);
      } else {
        bot.engine.clearGaze();
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
    botPause.classList.toggle("is-active", paused);
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
    cameraFlight.to.set(0, 0.12, 3.35); // 绝佳近景特写（完整呈现头顶天使金环）
    cameraFlight.targetTo.set(0, 0.02, 0);
    cameraFlight.t = 0;
  });
  document.querySelector("#bot-reset-view").addEventListener("click", () => {
    cameraFlight.active = true;
    cameraFlight.from.copy(camera.position);
    cameraFlight.to.copy(CAMERA_POSITION);
    cameraFlight.targetTo.copy(CAMERA_TARGET);
    cameraFlight.t = 0;
  });

  /* —— 表情秀 —— */
  const showcaseButton = document.querySelector("#bot-showcase");
  let showcaseTimer = null;
  function toggleShowcase() {
    if (showcaseTimer) {
      clearInterval(showcaseTimer);
      showcaseTimer = null;
      bot.engine.showcaseMode = false;
      bot.engine.cycleExpr();
      showcaseButton.textContent = "表情秀";
      showcaseButton.classList.remove("is-active");
    } else {
      let exprIndex = bot.engine.expression;
      bot.engine.showcaseMode = true;
      showcaseTimer = setInterval(() => {
        exprIndex = (exprIndex + 1) % 25;
        bot.engine.chooseExpression(exprIndex);
      }, 2000);
      showcaseButton.textContent = "停止秀";
      showcaseButton.classList.add("is-active");
    }
  }
  showcaseButton.addEventListener("click", toggleShowcase);
  toggleShowcase();

  /* —— 渲染循环 —— */
  let previous = performance.now();
  let fpsEl = document.querySelector("#fps");
  let trisEl = document.querySelector("#tris");
  let metricElapsed = 0;
  let metricFrames = 0;
  let frameInProgress = false;

  const resize = () => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
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

      if (cameraFlight.active) {
        cameraFlight.t += rawDelta * 0.9;
        const k = cameraFlight.t >= 1 ? 1 : 1 - Math.pow(1 - cameraFlight.t, 3);
        camera.position.lerpVectors(cameraFlight.from, cameraFlight.to, k);
        controls.target.lerp(cameraFlight.targetTo, k);
        if (cameraFlight.t >= 1) cameraFlight.active = false;
      }

      // 气泡投影（处于光环上方留白区，且带屏幕视口安全边界约束）
      if (!bubble.hidden) {
        anchor.copy(bot.group.position);
        anchor.y += 1.16;
        anchor.project(camera);
        if (anchor.z < 1 && anchor.z > -1) {
          const rawLeft = (anchor.x * 0.5 + 0.5) * window.innerWidth;
          const rawTop = (-anchor.y * 0.5 + 0.5) * window.innerHeight;
          // 确保气泡在任何特写或大角度缩放下，都不超出屏幕顶部或左右视口
          const clampLeft = THREE.MathUtils.clamp(rawLeft, 120, window.innerWidth - 120);
          const clampTop = THREE.MathUtils.clamp(rawTop, 44, window.innerHeight - 90);
          bubble.style.visibility = "visible";
          bubble.style.left = `${clampLeft.toFixed(0)}px`;
          bubble.style.top = `${clampTop.toFixed(0)}px`;
        } else {
          bubble.style.visibility = "hidden";
        }
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
  window.__bot = bot;

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
