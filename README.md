# 产品工作台（smzs-product-hub）

把 `smzs-docs` 的产品文档变成可看、可讲的可视化界面。
视觉沿用 `smzs-media-hub` 的 **Neo-Brutalism** 风格（同一套 `style.css` 令牌与组件类）。

## 为什么单独建仓库

- `smzs-docs` 是 Obsidian vault，塞 npm 工程会被 Obsidian 索引进 `node_modules`
- 与自媒体工作台受众不同、数据源不同（一个读 `content/`，一个读 `smzs-docs/`），混在一起导航会变长

## 技术栈

Vue 3（`<script setup>`）+ TypeScript + Vite + Tailwind CSS 4 + `@phosphor-icons/vue`（统一 `weight="bold"`）+ mermaid。

## 导航结构

侧栏按**使用场景**分五组，共 15 个板块：

| 分组 | 板块 | 实现 |
|------|------|------|
| **推进** | 工作台首页 | `HomeView.vue`（落地页；「下一步」从各板块数据推导） |
| | 推进路线 | `RoadmapView.vue`（Now/Next/Later + 版本时间线，源 = 需求攻坚 md） |
| | 迭代流程 | 通用板块（流程定义 + 版本时间线记录） |
| **对外讲解** | 产品概览 | `OverviewView.vue` |
| | 核心结构 | `StructureView.vue` |
| | 核心流程 | 通用板块 `DocView.vue` |
| | 商业模型 | 通用板块 |
| **诊断与迭代** | 产品现状 | `AppStatusView.vue`（从 `smzs-ui-app` 代码实时解析） |
| | 需求攻坚 | 通用板块 |
| **日常建设** | 身份资产 | `IdentityView.vue` |
| | 原型库 | `PrototypeView.vue` |
| | 品牌资产 | 通用板块 |
| | 技术架构 | 通用板块（3 篇，带 tab） |
| **决策留痕** | 决策日志 | 通用板块 |
| | 文档地图 | `DocsMapView.vue` |

分组依据是使用场景：推进回答「现在做什么、先做哪个」；对外讲解要能 5 分钟讲明白产品是什么；诊断与迭代回答「产品现在长什么样、已知问题怎么一个个攻破」；日常建设是改内容时知道去哪找；决策留痕是半年后回来看还能知道当初为什么这么定。

**推进层的约定**：不引入第二套任务系统。待办 = 需求攻坚 md 的章节（`## P0 · 标题` 即 Now 档），checkbox 即进度，改 md 就是改计划；首页「下一步」与 media-dashboard 同哲学——从数据推导，不写死。

> 「演示模式」入口已在侧栏占位，待产品定稿后接 Driver.js 类分步导览。

## 数据层：三个来源

```
content/<板块>/*.md      ─┐
content/产品叙事/*.md     ├→ scripts/build-data.mjs → src/data/generated.json → src/data/store.ts → 视图
../smzs-docs/**（只读）   ├
../smzs-ui-app/**（只读）─┘
```

- **`content/<板块>/`** —— 本仓库内的产品文档。**一个目录 = 一个板块**
- **`content/产品叙事/`** —— 产品概览与核心结构，走专用解析（表格 → 结构化字段）
- **`../smzs-docs/`** —— 文档真源，只读：文档地图、身份资产、原型清单、mermaid 流程
- **`../smzs-ui-app/`** —— 客户端真源，只读：「产品现状」板块从 manifest / pages / api 实时解析，产品迭代自动跟随

**这是唯一的接缝。** 调整内容 = 改 md，视图层零改动。

### 叙事型内容不写死在视图里

内容分两类：

- **结构型资产**（文档地图 / 身份资产 / 原型库）—— 产品怎么改都还在，做扎实
- **叙事型资产**（产品概览 / 核心流程 / 商业模型 / 品牌资产 / 技术架构 / 决策日志）—— 会随产品重大调整变，**只做薄渲染**

叙事型内容全部从 md 实时解析，视图里没有任何硬编码文案。

### 目录即导航：怎么新增一个板块

**在 `content/` 下新建一个目录、放一个 md、重新生成数据，侧栏就会多一项。不需要改任何 Vue 代码。**

```bash
mkdir -p content/增长实验
# 写一个 md，正文用 ## 分节
node scripts/build-data.mjs
```

未登记的目录会自动归到「日常建设」分组末尾，用兜底的图标与配色。想控制位置、图标、色调，在 `scripts/build-data.mjs` 的 `SECTION_DEFS` 里加一行：

```js
增长实验: { id: 'growth', label: '增长实验', group: '对外讲解', order: 5, icon: 'route', tone: 'bg-neo-green' },
```

`icon` 的取值需要在 `src/data/store.ts` 的 `SECTION_ICONS` 里登记（换新图标时只改这一处）。
内置视图（不走 content 的那些）在 `BUILTIN_NAV` 里配置。

### md 支持的语法

`parseBlocks()` 把正文拆成块，视图逐块渲染：

| 语法 | 渲染为 |
|------|--------|
| `## 标题` | 一张分节卡片 |
| 段落 | 正文，支持 `**加粗**` 与行内代码 |
| `- 列表` / `1. 列表` | 无序 / 有序列表 |
| 表格 | 黑底表头 + 斑马纹的 neo 表格 |
| `> 引用` | 左侧粗黑边的强调块；md 的首个引用会作为整篇导语 |
| mermaid 代码块 | 流程图，按需加载 |
| 其他代码块 | 深色代码块 |
| frontmatter | `版本` / `状态` / `最后更新` 显示为文档头徽章 |

**视图层不认识新语法。** 要加一种块类型，改 `parseBlocks()` 和 `DocView.vue` 的渲染分支各一处。

## 健康度算法

与 `scripts/docs/dashboard.py` 对齐，5 类告警：

| 告警 | 判定 |
|------|------|
| 同主题多副本 | H1 标题归一化（去品牌词/版本词/序号/标点）后重名 |
| 长期未更新 | `01-产品设计` 超 30 天、其余超 90 天；归档与素材目录不计 |
| 缺版本头 | 只看 `01-产品设计` 的顶层权威稿 |
| 孤岛文档 | 入链数为 0（`首页.md` / `README.md` 除外） |
| 疑似 AI 对话原文 | 开头是「可以。」「以下是」这类对话口吻 |

**比 dashboard.py 改进的两点**：

1. `git log` 加 `-c core.quotePath=false`——否则中文路径被转义成八进制，所有 git 日期都会落空
2. 日期优先级改为 **文档头声明 → git 提交 → mtime**。文档头的「最后更新」是作者自己的声明，比 git 的「文件被提交时间」更贴近内容时效

## 开发

```bash
npm install
npm run gen:data   # 解析两个来源 → src/data/generated.json（dev/build 前自动跑）
npm run dev        # 默认 5173，被占用时自动顺延（与自媒体工作台并存，当前跑在 5174）
npm run build      # vue-tsc 类型检查 + 产物构建
```

> 原型库的 iframe 通过 `vite.config.ts` 里的 `docsStatic()` 插件把 `/prototypes/*` 映射到 `../smzs-docs/*`，
> 因此**必须与 `smzs-docs` 放在同一工作区**，且该能力只在 dev / preview 生效。

## 已知边界

- 原型库里「挑战金体系原型」那 20 个页面围绕挑战金与打卡，v5.0 后大部分作废——界面已标注，未删除
- 13 个身份中 8 份是老格式（只有 Day 任务表，无挑战概览/副标题/痛点），迁进「探索」空间前需补齐
