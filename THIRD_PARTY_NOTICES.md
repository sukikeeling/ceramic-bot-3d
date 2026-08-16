# THIRD-PARTY NOTICES

This project (ceramic-bot-3d) is a derivative work. The following
upstream projects are used, all under the MIT License.

## vibe-submarine

- **Repository**: https://github.com/zhulin025/vibe-submarine
- **Author**: zhulin025 (Scott Sun)
- **License**: MIT — Copyright (c) 2026 Scott Sun
- **Used for**: Procedural geometry techniques (2D ring -> sphere mapping,
  extruded surfaces), porcelain material recipe (clearcoat 0.9 / roughness 0.33),
  studio environment lighting (procedural float environment map, key/fill/rim
  lights, 2048 soft shadows, ACES tone mapping), and `mulberry32` seeded noise.

## moodie-pet

- **Repository**: https://github.com/sukikeeling/moodie-pet
- **Author**: sukikeeling
- **License**: MIT — Copyright (c) 2026 sukikeeling
- **Used for**: The pet face animation engine (25 expressions, 39 states,
  auto-polling scheduler), ported to a pure-logic module in `src/bot/face-engine.js`
  and driving 3D eye morphs.

## LaoA-GrokBot

- **Repository**: https://github.com/zhulin025/LaoA-GrokBot
- **Author**: zhulin025 (老A玩AI)
- **License**: MIT
- **Used for**: Original expression coordinate data (via moodie-pet).

## Third-party runtime libraries

- **three.js** (MIT) — 3D engine, `three` npm dependency
- **vite** (MIT) — build tooling, devDependency

MIT License texts of upstream projects are preserved in their respective
repositories. This project adds no additional restrictions on top of MIT.
