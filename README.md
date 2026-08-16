# 🍑 头脑风暴2：3D 立体陶瓷 Bot（Pet-2 · Ceramic Bot）

> **结论：可行，已实现并上线。** 学习 vibe-submarine（主项目）的程序化几何、
> 陶瓷材质与摄影棚布光，把 moodie-pet 的 2D 小脸做成了**真·3D 立体 bot**——
> 眼睛是贴在陶瓷球面上的立体凸起形状，表情数据实时驱动 3D morph。

**🌐 在线体验：https://sukikeeling.github.io/ceramic-bot-3d/**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 学了主项目的什么

| 主项目技术 | 本项目的落地 |
| --- | --- |
| **程序化几何**（240 采样船体 / gridGeometry / latheZ / sweepTube） | 脸 = 64×48 球面 + 低频噪声顶点微扰（手工陶瓷起伏感）；眼睛 = **2D 表情环 → 球面映射 → 顶面 fan + 侧面带**的程序化立体网格（各点沿自身球面法线凸起，大表情不穿模） |
| **陶瓷材质**（porcelain：metalness 0 / roughness 0.33 / clearcoat 0.9 / clearcoatRoughness 0.14） | 原配方移植到 `MeshPhysicalMaterial`；眼睛用釉面白瓷（clearcoat 1） |
| **摄影棚布光**（程序浮点环境贴图：5 块柔光箱 + 主光/补光/轮廓光 + 2048 软阴影 + ACES） | `src/scene.js` 原样复刻，PMREM 处理 + ShadowMaterial 地面 + 柔和接触阴影（blush） |
| **细节有语义**（黄铜/玻璃/皮革各司其职） | 半透明釉下彩腮红、状态光环、彩色环绕星点、雷达光波 |

## 立体 bot 怎么实现

1. **脸**：程序化球体 + 正弦噪声微扰 + 陶瓷材质（换色 = 换釉色）；
2. **眼睛**（核心创新）：moodie-pet 的 25 表情 × 2 条环（每条 47 点）不再画成
   2D 路径，而是：
   - 环点 → 归一化 → 对称化展开 → 映射到脸球面（SVG y 向下 → 3D y 向上翻转）
   - 每个顶点沿**自身球面法线**凸起 `EYE_THICK` → 顶面（fan）+ 侧面（带）=
     **带厚度的立体陶瓷眼睛**，任何表情都贴合球面不穿模
   - 表情 morph：引擎每帧插值环点 → 重建顶点 → 眼睛形状实时变化
   - 眨眼 = 环点 Y 压缩；视线跟随 = 眼睛中心球面滑动
3. **自动轮询 + 表情秀**：FaceEngine（39 状态切换 / 表情池循环 / 眨眼 /
   陶瓷小精灵台词气泡）；**表情秀默认开启**——2 秒一个遍历 25 个表情展示
   3D morph（按钮可停止/恢复）；
4. **特效**（自写轻量）：
   - **彩色环绕**：28 颗多彩星点（粉/青/金/紫/白/橙）常驻绕球公转；
   - **雷达光波**：radar 状态三圈青色同心波纹扩散；
   - 状态光环 / 爱心粒子 / 状态切换反应动画；
5. **交互**：拖拽旋转视角（OrbitControls）、按住 bot 转向（yaw/pitch 弹簧）、
   点击摸头（果冻挤压 + 台词）、鼠标悬停视线跟随、按钮换心情/暂停/换釉色/
   表情秀/特写/重置视角。

## 运行

```bash
npm install
npm run dev        # http://127.0.0.1:5182
npm run build      # 产物在 dist/
```

> 或双击桌面 `启动任务2-立体陶瓷bot.bat`（自动起服务 + 开浏览器）。

## 验证记录

- `vite build` 通过；Edge 实测 60 FPS、~6K tris、无 JS 错误；
- 用户评分 80/100（萌感优先：眼睛对称拉开、间距正常、凸起自然）。

## 来源

- 主项目 [zhulin025/vibe-submarine](https://github.com/zhulin025/vibe-submarine)（MIT）
- 辅项目 [sukikeeling/moodie-pet](https://github.com/sukikeeling/moodie-pet)（MIT）
