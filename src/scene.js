/* ============================================================
   scene.js —— 摄影棚布光（复刻主项目 vibe-submarine）
   - 程序生成浮点摄影棚环境贴图（5 块柔光箱）
   - 暖主光 + 冷补光 + 暖轮廓光 + 2048 软阴影
   - ShadowMaterial 地面 + 柔和接触阴影（blush）
   - ACES Filmic 色调映射
   ============================================================ */
import * as THREE from "three";

const TAU = Math.PI * 2;
const GROUND_Y = -0.82;

function smooth01(value) {
  return value * value * (3 - 2 * value);
}

function buildStudioEnvironment() {
  const width = 384;
  const height = 192;
  const data = new Float32Array(width * height * 4);
  const softboxes = [
    { direction: new THREE.Vector3(0.45, 0.85, 0.35), intensity: 5.2, exponent: 16, color: [1, 0.98, 0.94] },
    { direction: new THREE.Vector3(-0.85, 0.25, 0.15), intensity: 1.5, exponent: 7, color: [0.82, 0.9, 1] },
    { direction: new THREE.Vector3(0.15, 0.35, -0.95), intensity: 2.6, exponent: 12, color: [1, 0.86, 0.66] },
    { direction: new THREE.Vector3(0.95, 0.05, 0.3), intensity: 0.9, exponent: 9, color: [1, 0.95, 0.85] },
    { direction: new THREE.Vector3(0, -1, 0), intensity: 0.5, exponent: 4, color: [1, 0.93, 0.82] },
  ];
  for (const softbox of softboxes) softbox.direction.normalize();
  const direction = new THREE.Vector3();
  for (let y = 0; y < height; y += 1) {
    const phi = ((y + 0.5) / height) * Math.PI;
    for (let x = 0; x < width; x += 1) {
      const theta = ((x + 0.5) / width) * TAU;
      direction.set(
        -Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
        -Math.sin(phi) * Math.cos(theta),
      );
      const up = direction.y * 0.5 + 0.5;
      let red = THREE.MathUtils.lerp(0.32, 1.05, smooth01(up)) * 0.9;
      let green = red * 0.985;
      let blue = red * 0.94;
      for (const softbox of softboxes) {
        const weight =
          softbox.intensity *
          Math.pow(Math.max(direction.dot(softbox.direction), 0), softbox.exponent);
        red += weight * softbox.color[0];
        green += weight * softbox.color[1];
        blue += weight * softbox.color[2];
      }
      const index = (y * width + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = 1;
    }
  }
  const environment = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  environment.magFilter = THREE.LinearFilter;
  environment.minFilter = THREE.LinearFilter;
  environment.needsUpdate = true;
  return environment;
}

/* 柔和接触阴影（径向渐变圆片，替代主项目 TSL blush） */
function buildBlushTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(107,92,68,0.42)");
  gradient.addColorStop(0.55, "rgba(107,92,68,0.20)");
  gradient.addColorStop(1, "rgba(107,92,68,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStudioScene({ renderer, scene, camera }) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;

  scene.background = new THREE.Color(0xc9c2b8);

  const environment = buildStudioEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(environment);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.42;
  environment.dispose();
  pmrem.dispose();

  /* —— 主光（暖色 + 软阴影） —— */
  const key = new THREE.DirectionalLight(0xffead4, 1.9);
  key.position.set(3.2, 4.4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -2.4;
  key.shadow.camera.bottom = -2.4;
  key.shadow.camera.right = 2.4;
  key.shadow.camera.top = 2.4;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);

  /* —— 补光 + 轮廓光 —— */
  const fill = new THREE.DirectionalLight(0xcadcf2, 0.34);
  fill.position.set(-3.4, 1.8, 1.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc98f, 0.62);
  rim.position.set(-1.4, 2.2, -3.6);
  scene.add(rim);

  /* —— 地面 + 接触阴影 —— */
  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.24 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  const blushMaterial = new THREE.MeshBasicMaterial({
    map: buildBlushTexture(),
    transparent: true,
    depthWrite: false,
  });
  const blush = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), blushMaterial);
  blush.rotation.x = -Math.PI / 2;
  blush.position.set(0, GROUND_Y + 0.004, 0);
  blush.renderOrder = -1;
  scene.add(blush);

  return {
    ground,
    blush,
    dispose() {
      scene.environment = null;
      envRT.texture.dispose();
      ground.geometry.dispose();
      groundMaterial.dispose();
      blush.geometry.dispose();
      blushMaterial.map.dispose();
      blushMaterial.dispose();
    },
  };
}
