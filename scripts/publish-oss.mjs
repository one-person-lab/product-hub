#!/usr/bin/env node
/**
 * 把本仓库导出成「可开源」的干净副本，并可选推送到 GitHub。
 *
 * 为什么不直接推本仓库？
 *   本仓库的构建产物（src/data/generated.json）里含真实产品数据，
 *   config/sources.mjs 指向私有目录，README 是内部视角口径。
 *   这些东西一旦进了历史就清不掉。所以这里导出的是**全新历史的快照**，
 *   且导出过程逐条剔除（见 EXCLUDE 清单）。
 *
 * 用法：
 *   node scripts/publish-oss.mjs           # 只导出到本地，打印产物路径，不碰远端
 *   node scripts/publish-oss.mjs --push    # 导出并强推覆盖远端 main
 *
 * 环境变量：
 *   OSS_REMOTE  远端地址，默认 git@github.com:one-person-lab/product-hub.git
 *   OSS_OUT     导出目录，默认 <tmp>/product-hub-oss
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REMOTE = process.env.OSS_REMOTE || 'git@github.com:one-person-lab/product-hub.git'
const OUT = process.env.OSS_OUT || path.join(os.tmpdir(), 'product-hub-oss')
const PUSH = process.argv.includes('--push')

/* ==================== 排除清单 ====================
 * 逐条都别删——每一条都对应一个具体的泄露面。
 * 目录 = 整棵子树排除。
 */
const EXCLUDE = [
  // —— 私有配置（开源版由 templates/sources.example.mjs 替代）——
  'config/sources.mjs', // 本地指向私有文档仓库与客户端仓库

  // —— 内部视角文档（公开版由 README.oss.md 覆盖）——
  'README.md',

  // —— 构建产物：含真实产品数据，绝不公开 ——
  'src/data/generated.json',
  'dist',

  // —— 仅用于导出，不进产物 ——
  'templates',
  'README.oss.md',
  'scripts/publish-oss.mjs',

  // —— 噪声 ——
  '.git',
  'node_modules',
]

/** 文件级替换：源 → 导出后的目标路径 */
const REMAP = [
  ['README.oss.md', 'README.md'],
  ['templates/sources.example.mjs', 'config/sources.mjs'],
]

/** 中性示例内容：整棵复制到 content/ */
const CONTENT_EXAMPLE = 'templates/content-example'

// 会被 REMAP 主动写回的路径不算泄露（例如模板替代掉的那份配置）
const REMAP_TARGETS = new Set(REMAP.map(([, to]) => to))

function isExcluded(rel) {
  return EXCLUDE.some((e) => rel === e || rel.startsWith(e + '/'))
}

function copyTree(srcDir, destDir, rel = '') {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (isExcluded(relPath)) continue
    const src = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      copyTree(src, dest, relPath)
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
    }
    // 符号链接一律跳过（不给它们进公开仓库的机会）
  }
}

function git(args, opts = {}) {
  const r = spawnSync('git', args, {
    cwd: OUT,
    encoding: 'utf8',
    stdio: opts.quiet ? 'pipe' : 'inherit',
  })
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} 失败（退出码 ${r.status}）\n${(r.stderr || '').slice(-500)}`)
  }
  return (r.stdout || '').trim()
}

/* ==================== 主流程 ==================== */

console.log(`📦 导出到 ${OUT}`)
// 清空旧产物，但保留 node_modules —— 它被 .gitignore 忽略、不会进提交，
// 保留它可以让「重新发布」不用每次重装依赖。
fs.mkdirSync(OUT, { recursive: true })
for (const entry of fs.readdirSync(OUT)) {
  if (entry === 'node_modules') continue
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true })
}

copyTree(ROOT, OUT)
console.log(`   已复制（排除 ${EXCLUDE.length} 条规则）`)

// 文件级重映射
for (const [from, to] of REMAP) {
  const src = path.join(ROOT, from)
  if (!fs.existsSync(src)) {
    console.error(`   ⚠️ 缺少 ${from}，跳过`)
    continue
  }
  const dest = path.join(OUT, to)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`   ${from} → ${to}`)
}

// 中性示例内容
const exampleSrc = path.join(ROOT, CONTENT_EXAMPLE)
if (fs.existsSync(exampleSrc)) {
  fs.cpSync(exampleSrc, path.join(OUT, 'content'), { recursive: true })
  console.log(`   ${CONTENT_EXAMPLE} → content`)
} else {
  console.error(`   ⚠️ 缺少 ${CONTENT_EXAMPLE}`)
}

// content/README.md：公开口径的内容说明
fs.writeFileSync(
  path.join(OUT, 'content', 'README.md'),
  `# content/ —— 你的产品内容库

这个目录就是数据源。工作台不连数据库，**你写的 markdown 文件就是全部数据**。

\`\`\`
content/
├── 产品叙事/     # 产品概览：定位、使命愿景、关键问题、边界
├── 需求池/       # 一条需求 = 一个 "## REQ-xxx · 标题" 小节
├── 迭代流程/     # 四步循环与出口条件
├── 决策日志/     # 只记「为什么这么定」
└── 灵感库/       # 愿景与关键问题（驱动「终态目标」视图）
\`\`\`

## 约定

- 新建目录 = 新建板块，下次启动自动出现在导航里，零代码改动
- 分层（域 → 模块 → 需求）由文件里的字段决定，不依赖目录层级
- frontmatter 用 YAML，缺字段会用默认值兜底
- 改完跑 \`npm run gen:data\`（dev/build 会自动跑）

## 示例内容

仓库自带的这几篇都是示例，直接换成你自己的产品即可。
`
)

// 生成 .gitkeep 之外的最终校验：确认排除项真的没进去
/* 这些是被 .gitignore 忽略的构建产物，永远不会进提交（git add -A 会跳过），
 * 但它们在 EXCLUDE 里、且清理时为了重跑速度会被保留，因此泄露校验需放行。 */
const IGNORED_IN_LEAK_CHECK = new Set(['node_modules', 'dist', '.git'])

const leaked = []
for (const e of EXCLUDE) {
  if (REMAP_TARGETS.has(e)) continue
  if (IGNORED_IN_LEAK_CHECK.has(e)) continue
  const p = path.join(OUT, e)
  if (!fs.existsSync(p)) continue
  leaked.push(e)
}
if (leaked.length) {
  console.error('\n❌ 排除失败，以下路径仍存在于导出产物中：')
  for (const l of leaked) console.error('   - ' + l)
  process.exit(1)
}
console.log('✅ 排除项校验通过（产物中无敏感路径）')

// 关键文件必须在
for (const must of ['README.md', 'LICENSE', 'package.json', '.gitignore']) {
  if (!fs.existsSync(path.join(OUT, must))) {
    console.error(`❌ 产物缺少 ${must}`)
    process.exit(1)
  }
}

// 全新历史
git(['init', '-q', '-b', 'main'])
git(['add', '-A'])
const staged = git(['-c', 'core.quotePath=false', 'status', '--short'], { quiet: true })
const fileCount = staged.split('\n').filter(Boolean).length
git([
  '-c', 'user.name=one-person-lab',
  '-c', 'user.email=one-person-lab@users.noreply.github.com',
  'commit', '-q', '-m',
  process.env.OSS_MESSAGE || '开源初始版本：产品工作台',
])
console.log(`   提交完成，${fileCount} 个文件`)

console.log(`\n📁 产出一份干净副本：${OUT}`)

if (!PUSH) {
  console.log('\n（未推送。确认无误后加 --push 推到远端）')
  console.log(`  远端：${REMOTE}`)
  process.exit(0)
}

console.log(`\n🚀 推送到 ${REMOTE}`)
const remotes = git(['remote'], { quiet: true }).split('\n').filter(Boolean)
if (remotes.includes('origin')) git(['remote', 'remove', 'origin'])
git(['remote', 'add', 'origin', REMOTE])
git(['push', '--force', 'origin', 'main:main'])
console.log('\n✅ 已推送')
