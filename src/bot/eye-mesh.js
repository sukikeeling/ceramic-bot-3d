/* ============================================================
   eye-mesh.js —— 3D 立体温润纯白釉面陶瓷大眼睛（饱满穹顶凸起，吃满白瓷高光）
   ============================================================ */
import * as THREE from "three";

export const FACE_RADIUS = 0.74;      // 脸球半径
export const EYE_RADIUS = 0.145;      // 眼睛基准半径（大眼萌宠黄金比例）
export const EYE_THICK = 0.038;       // 眼睛立体凸起厚度

const UP = new THREE.Vector3(0, 1, 0);

export class EyeMesh {
  constructor(segments = 36, isRight = false) {
    this.segments = segments;
    this.isRight = isRight;
    this.geometry = buildSmoothEyeGeometry(segments);
    this.mesh = new THREE.Mesh(this.geometry, null);
    this._center = new THREE.Vector3();
    this._disk = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._n = new THREE.Vector3();
    this._pn = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._pos = this.geometry.attributes.position;
    this._nor = this.geometry.attributes.normal;
  }

  update(ring, tr, faceCenter) {
    const segs = this.segments;
    const pos = this._pos;
    const nor = this._nor;
    const sy = tr.sy ?? 1;

    // 1. 眼睛中心在正前方球面上的位置 (左右眼对称 ±0.22 弧度)
    const angleX = this.isRight ? 0.22 : -0.22;
    const angleY = 0.02;
    const nx = Math.sin(angleX);
    const ny = Math.sin(angleY);
    const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
    this._n.set(nx, ny, nz).normalize();

    // 局部切空间基
    this._t.crossVectors(UP, this._n).normalize();
    this._b.crossVectors(this._n, this._t).normalize();
    this._center.copy(this._n).multiplyScalar(FACE_RADIUS);

    const center = this._center;
    const tAxis = this._t;
    const bAxis = this._b;

    // 2. 眼睛半径（圆润灵动大眼）
    const rx = EYE_RADIUS * 1.05;
    const ry = EYE_RADIUS * 1.05 * Math.max(0.10, sy);

    // 3. 顶面中心点 (饱满微穹顶凸起，高度充足吃满白瓷高光)
    const centerThick = EYE_THICK + 0.016;
    this._p.copy(center);
    this._pn.copy(this._p).sub(faceCenter).normalize();
    pos.setXYZ(0, this._p.x + this._pn.x * centerThick, this._p.y + this._pn.y * centerThick, this._p.z + this._pn.z * centerThick);

    // 4. 环形顶点平滑映射
    const edgeThick = EYE_THICK;
    for (let i = 0; i < segs; i += 1) {
      const theta = (i / segs) * Math.PI * 2;
      const u = Math.cos(theta) * rx;
      const v = Math.sin(theta) * ry;

      this._disk.copy(center).addScaledVector(tAxis, u).addScaledVector(bAxis, v);
      this._dir.copy(this._disk).sub(faceCenter).normalize();
      this._p.copy(this._dir).multiplyScalar(FACE_RADIUS);
      this._pn.copy(this._p).sub(faceCenter).normalize();

      // 顶面外沿
      const topIdx = 1 + i;
      pos.setXYZ(topIdx, this._p.x + this._pn.x * edgeThick, this._p.y + this._pn.y * edgeThick, this._p.z + this._pn.z * edgeThick);

      // 底面贴合脸
      const botIdx = 1 + segs + i;
      pos.setXYZ(botIdx, this._p.x, this._p.y, this._p.z);
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  dispose() {
    this.geometry.dispose();
  }
}

function buildSmoothEyeGeometry(segments = 36) {
  const vertexCount = 1 + segments * 2;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = [];

  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    indices.push(0, 1 + i, 1 + next);
  }

  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    const t0 = 1 + i;
    const t1 = 1 + next;
    const b0 = 1 + segments + i;
    const b1 = 1 + segments + next;
    indices.push(t0, b0, t1);
    indices.push(t1, b0, b1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}
