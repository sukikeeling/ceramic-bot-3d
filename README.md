# 🍑 头脑风暴2：3D 立体陶瓷 Bot（Pet-2 · Ceramic Bot）

> **结论：可行，已实现并验证。** 学习 vibe-submarine（主项目）的程序化几何、
> 陶瓷材质与摄影棚布光，把 moodie-pet 的 2D 小脸做成了**真·3D 立体 bot**——
> 眼睛是贴在陶瓷球面上的立体凸起形状，表情数据实时驱动 3D morph。

**🌐 在线体验：https://sukikeeling.github.io/ceramic-bot-3d/**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 学了主项目的什么

| 主项目技术 | 本项目的落地 |
| --- | --- |
| **程序化几何**（240 采样船体 / gridGeometry / latheZ / sweepTube） | 脸 = 64×48 球面 + 低频噪声顶点微扰（手工陶瓷起伏感）；眼睛 = **2D 表情环 → 球面映射 → 顶面 fan + 侧面带**的程序化立体网格 |
| **陶瓷材质**（porcelain：metalness 0 / roughness 0.33 / clearcoat 0.9 / clearcoatRoughness 0.14） | 原配方移植到 `MeshPhysicalMaterial`；眼睛用釉面白瓷（clearcoat 1） |
| **摄影棚布光**（程序浮点环境贴图：5 块柔光箱 + 主光/补光/轮廓光 + 2048 软阴影 + ACES） | `src/scene.js` 原样复刻，PMREM 处理 + ShadowMaterial 地面 + 柔和接触阴影（blush） |
| **细节有语义**（黄铜/玻璃/皮革各司其职） | 半透明釉下彩腮红、状态光环（Torus 发光）、3D 粒子系统（爱心/星星/Z/音符上浮） |

## 立体 bot 怎么实现

1. **脸**：程序化球体 + 正弦噪声微扰 + 陶瓷材质（换色 = 换釉色）；
2. **眼睛**（核心创新）：moodie-pet 的 25 表情 × 2 条环（每条 47 点）不再画成
   2D 路径，而是：
   - 环点 → 归一化 → 映射到脸球面（SVG y 向下 → 3D y 向上翻转）
   - 沿球面法线凸起 `EYE_THICK` → 顶面（fan 三角化）+ 侧面（带）=
     **带厚度的立体陶瓷眼睛**
   - 表情 morph：引擎每帧插值环点 → 重建顶点 → 眼睛形状实时变化
   - 眨眼 = 环点 Y 压缩；视线跟随 = 眼睛中心球面滑动
3. **自动轮询**：FaceEngine（与任务 A 同一套移植引擎）——39 状态切换 /
   表情池循环 / 眨眼 / 自言自语台词气泡（3D 投影 DOM）；
4. **炫丽特效系统**（three-nebula 粒子引擎 + UnrealBloomPass 辉光）：
   - **辉光**：全场景后处理 Bloom，陶瓷/光环/粒子发光；
   - **烟花**：celebrate 3 发径向爆发（重力回落 + 颜色渐变）；
   - **喷泉**：happy/excited/playful 头顶彩色粒子喷泉；
   - **轨道**：双激光环反向旋转 + 26 颗彩色星点绕球公转；
   - **雷达波纹 / 加载霓虹弧 / 警报脉冲 / 状态切换冲击波**；
5. **交互**：拖拽旋转视角（OrbitControls）、按住 bot 转向（yaw/pitch 弹簧）、
   点击摸头（果冻挤压 + 台词）、鼠标悬停视线跟随、按钮换心情/暂停/换釉色。

## 运行

```bash
npm install
npm run dev        # http://127.0.0.1:5182
npm run build      # 产物在 dist/
```

## 验证记录

- `vite build` 通过；Edge 实测 60 FPS、~6K tris、无 JS 错误；
- GLM 视觉模型确认：粉陶瓷釉面球体、两只白色椭圆立体眼睛（凸起、带边缘阴影）、
  柔和光影 + 地面投影；
- 程序验证：表情 morph 生效（眼睛中心/尺寸随表情变化）、状态自动切换
  （radar → powering-down）、特效状态（orbit）光环亮起。

## 来源

- 主项目 [zhulin025/vibe-submarine](https://github.com/zhulin025/vibe-submarine)（MIT）
- 辅项目 [sukikeeling/moodie-pet](https://github.com/sukikeeling/moodie-pet)（MIT）
