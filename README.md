# 进化丛林

PandaAI 苏客松赛题 Demo。需求见 [PRD.md](PRD.md)。

纯静态页面：用任意静态服务打开 `index.html` 即可，无依赖、无后端。

```bash
python3 -m http.server 8000
```

```bash
node --test
```

所有行情都是人工编写的示例数据（`data/seasons.js`），不是真实行情，不构成投资建议。

开发说明：PRD 与实现由 Claude Code 完成，未使用 Panda Data。
