/* ============================================================
   eye-mesh.js —— 2D 表情环 → 3D 立体眼睛
   学习主项目 vibe-submarine 的程序化几何思路：
   表情环（SVG 坐标）→ 映射到陶瓷脸球面 → 顶面(fan)+侧面(带)
   = 带厚度的立体陶瓷眼睛，表情 morph 每帧实时更新顶点。
   ============================================================ */
import * as THREE from "three";

export const FACE_RADIUS = 0.74;      // 脸球半径
export const EYE_THICK = 0.032;       // 眼睛厚度（凸出脸面，薄一点更贴脸更萌）
const ORIGIN_X = 114.2705;            // 原版脸心 x
const ORIGIN_Y = 114.2705;            // 原版脸心 y
const NORM = 105;                     // 原版半脸宽（归一化系数）
// 原版画布 230px ↔ 3D 脸直径 2*FACE_RADIUS 的比例（像素→米）
const PX_TO_M = (FACE_RADIUS * 2) / 230;

const UP = new THREE.Vector3(0, 1, 0);

export class EyeMesh {
  /**
   * @param {number} ringCount 环点数（每条环）
   */
  constructor(ringCount) {
    this.ringCount = ringCount;
    this.geometry = buildEyeGeometry(ringCount);
    this.mesh = new THREE.Mesh(this.geometry, null); // 材质由外部设置
    // 中间变量（避免每帧 GC）
    this._center = new THREE.Vector3();
    this._disk = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._n = new THREE.Vector3();
    this._pn = new THREE.Vector3(); // 各点自身球面法线
    this._p = new THREE.Vector3();
    this._pos = this.geometry.attributes.position;
    this._nor = this.geometry.attributes.normal;
  }

  /**
   * 每帧更新：环点 + 引擎变换 → 顶点
   * @param {number[][]} ring 环点（原版 SVG 坐标）
   * @param {{tx:number, ty:number, sy:number}} tr 引擎变换（中心 + 眨眼）
   * @param {THREE.Vector3} faceCenter 脸球心（世界坐标）
   * @param {number} yawOffset 可选：眼睛跟随 3D 转向
   */
  update(ring, tr, faceCenter, { yaw = 0 } = {}) {
    const count = this.ringCount;
    const pos = this._pos;
    const nor = this._nor;
    const cx = tr.tx;
    const cy = tr.ty;
    const sy = tr.sy ?? 1;

    // 眼睛中心在球面上的位置（归一化方向；注意原版 SVG y 向下 → 3D y 向上需翻转）
    // 压缩映射范围：保留表情的位置关系，但眼睛始终落在脸正面可见区域
    const nx = THREE.MathUtils.clamp((cx - ORIGIN_X) / NORM, -1, 1) * 0.85;
    const ny = THREE.MathUtils.clamp(-(cy - ORIGIN_Y) / NORM, -1, 1) * 0.85;
    const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny));
    this._n.set(nx, ny, nz).normalize();
    // 局部基
    this._t.crossVectors(UP, this._n).normalize();
    this._b.crossVectors(this._n, this._t).normalize();
    // 眼睛中心 3D
    this._center.copy(this._n).multiplyScalar(FACE_RADIUS);

    // 顶点布局：idx 0 = 顶面中心；1..count = 顶面环；count+1..2*count = 底面环
    const center = this._center;
    const tAxis = this._t;
    const bAxis = this._b;
    const nAxis = this._n;
    const thick = EYE_THICK;
    const rScale = PX_TO_M;

    // —— 顶面中心（凸起在环质心上，沿该点自身球面法线） ——
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < count; i += 1) {
      sumX += ring[i][0];
      sumY += ring[i][1];
    }
    const mcx = sumX / count;
    const mcy = sumY / count;
    const gu = (mcx - cx) * rScale;
    const gv = -(mcy - cy) * rScale * sy; // SVG y 向下 → 3D 翻转
    this._disk.copy(center)
      .addScaledVector(tAxis, gu)
      .addScaledVector(bAxis, gv);
    this._dir.copy(this._disk).sub(faceCenter).normalize();
    this._p.copy(this._dir).multiplyScalar(FACE_RADIUS);
    // 中心点自身球面法线（与环点凸起方向一致，避免大表情 fan 面扭曲）
    this._pn.copy(this._p).sub(faceCenter).normalize();
    pos.setXYZ(0, this._p.x + this._pn.x * thick, this._p.y + this._pn.y * thick, this._p.z + this._pn.z * thick);
    this._dir.copy(this._p).addScaledVector(this._pn, thick).sub(faceCenter).normalize();
    nor.setXYZ(0, this._dir.x, this._dir.y, this._dir.z);

    // —— 环 → 球面 ——
    for (let i = 0; i < count; i += 1) {
      const u = (ring[i][0] - cx) * rScale;
      const v = -(ring[i][1] - cy) * rScale * sy; // SVG y 向下 → 3D 翻转
      this._disk.copy(center).addScaledVector(tAxis, u).addScaledVector(bAxis, v);
      this._dir.copy(this._disk).sub(faceCenter).normalize();
      this._p.copy(this._dir).multiplyScalar(FACE_RADIUS);
      // 该点自身的球面法线（贴合球面，大表情/拉长眼睛边缘不再穿模）
      this._pn.copy(this._p).sub(faceCenter).normalize();
      // 顶面顶点（沿自身法线凸起），法线用真实曲面法线（更圆润的光照）
      const topIdx = 1 + i;
      pos.setXYZ(topIdx, this._p.x + this._pn.x * thick, this._p.y + this._pn.y * thick, this._p.z + this._pn.z * thick);
      this._dir.copy(this._p).addScaledVector(this._pn, thick).sub(faceCenter).normalize();
      nor.setXYZ(topIdx, this._dir.x, this._dir.y, this._dir.z);
      // 底面顶点（贴脸面），法线用该点球面法线（侧面带光照正确，避免黑缝/穿模感）
      const botIdx = 1 + count + i;
      pos.setXYZ(botIdx, this._p.x, this._p.y, this._p.z);
      nor.setXYZ(botIdx, this._pn.x, this._pn.y, this._pn.z);
    }

    pos.needsUpdate = true;
    nor.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  dispose() {
    this.geometry.dispose();
  }
}

/* —— 每眼网格：顶面 fan（中心+环）+ 侧面带 —— */
function buildEyeGeometry(ringCount) {
  const topCenter = 1;
  const ringStart = 1;
  const bottomStart = 1 + ringCount;
  const vertexCount = 1 + ringCount * 2;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = [];

  // 顶面 fan：中心 + 环（逆时针，法线朝外）
  for (let i = 0; i < ringCount; i += 1) {
    const next = (i + 1) % ringCount;
    indices.push(topCenter, ringStart + next, ringStart + i);
  }
  // 侧面带：顶环 ↔ 底环
  for (let i = 0; i < ringCount; i += 1) {
    const next = (i + 1) % ringCount;
    const a = ringStart + i;
    const b = ringStart + next;
    const c = bottomStart + i;
    const d = bottomStart + next;
    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}
