#!/usr/bin/env node
/**
 * 产品工作台数据管道：扫描两个来源，生成 src/data/generated.json
 *
 *  1. content/产品叙事/*.md   —— 本仓库内的产品叙事草案
 *  2. DOCS（config/sources.mjs）—— 文档仓库（只读）：文档地图、身份资产、原型清单、mermaid 流程
 *
 * 这是工作台与文件系统之间的唯一接缝。
 * 与 media-dashboard 的 build-data.mjs 同构：视图层零改动即可换数据源。
 *
 * 用法：npm run gen:data（dev/build 前自动执行）
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import {
  DOCS,
  APP,
  BRANDS,
  HOT_DIRS,
  PROTOTYPE_GROUPS,
  APP_MODULES,
  PAGE_LABELS,
  APP_API_LABELS,
  IDENTITY_DIR,
  IDENTITY_DEPOSIT_FIELD,
} from '../config/sources.mjs'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const CONTENT = join(ROOT, 'content')
const NARRATIVE = join(ROOT, 'content/产品叙事')
const OUT = join(ROOT, 'src/data/generated.json')

const EXCLUDE_DIRS = new Set(['.obsidian', '_meta', '.git', 'node_modules', '.trash', '.kiro'])
const ARCHIVE_DIR = '99-归档'
const STALE_DAYS_HOT = 30
const STALE_DAYS_COLD = 90
const STATIC_HINTS = ['参考资料', '素材', 'images', '图片', 'assets', 'attachments']

const today = new Date()
today.setHours(0, 0, 0, 0)

// ── 通用解析工具 ──────────────────────────────────────────────

/** 按 ## 标题切分，返回 name → body */
function sections(md) {
  const map = {}
  const parts = md.split(/^## (.+)$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].replace(/[（(].*$/, '').trim()
    map[name] = (parts[i + 1] || '').trim()
  }
  return map
}

/** frontmatter（--- 包裹的 键: 值） */
function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return {}
  const o = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([^：:]+)[：:]\s*(.*)$/)
    if (kv) o[kv[1].trim()] = kv[2].trim()
  }
  return o
}

/** markdown 表格 → 对象数组（支持一个 body 里多张表） */
function tables(body) {
  const groups = []
  let cur = []
  for (const line of (body || '').split('\n')) {
    if (/^\s*\|/.test(line)) cur.push(line)
    else {
      if (cur.length) groups.push(cur)
      cur = []
    }
  }
  if (cur.length) groups.push(cur)

  return groups.map((rows) => {
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim())
    const head = cells(rows[0])
    return rows
      .slice(1)
      .filter((r) => !/^[\s|:-]+$/.test(r))
      .map((r) => {
        const c = cells(r)
        const o = {}
        head.forEach((h, i) => (o[h] = c[i] ?? ''))
        return o
      })
  })
}

/** "- item" / "* item" / "1. item" 列表 */
function bullets(body) {
  return (body || '')
    .split('\n')
    .map((l) => l.match(/^\s*(?:[-*]|\d+[.、])\s+(.+)$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
}

/** 第一段引用块内容 */
function firstQuote(body) {
  const m = (body || '').match(/^>\s*(.+)$/m)
  return m ? m[1].replace(/\*\*/g, '').trim() : ''
}

function stripMd(s) {
  return (s || '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
}

/** 行内清洗：去掉链接语法，保留 ** 与 ` 交给前端做强调渲染 */
function cleanInline(s) {
  return (s || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim()
}

/**
 * 把 markdown 正文拆成可渲染的块序列。
 * 支持：围栏代码块（含 mermaid）/ 段落 / 列表 / 表格 / 引用 / 三四级标题。
 * 这是「任意 md 目录都能变成一个板块」的底层能力——视图层不需要认识新语法。
 */
function parseBlocks(body) {
  const lines = (body || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  const isTable = (l) => /^\s*\|/.test(l)
  const isQuote = (l) => /^>/.test(l)
  const isList = (l) => /^\s*(?:[-*]|\d+\.)\s+/.test(l)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i += 1
      continue
    }

    // 围栏代码块：mermaid 交给前端渲染，其余按代码展示
    const fence = line.match(/^```([\w-]*)\s*$/)
    if (fence) {
      const lang = (fence[1] || '').toLowerCase()
      const buf = []
      i += 1
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      blocks.push({ type: lang === 'mermaid' ? 'mermaid' : 'code', lang, text: buf.join('\n').trim() })
      continue
    }

    const h = line.match(/^(#{3,4})\s+(.+)$/)
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: cleanInline(h[2]) })
      i += 1
      continue
    }

    if (isTable(line)) {
      const buf = []
      while (i < lines.length && isTable(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      const t = tables(buf.join('\n'))
      if (t[0] && t[0].length) blocks.push({ type: 'table', head: Object.keys(t[0][0]), rows: t[0] })
      continue
    }

    if (isQuote(line)) {
      const buf = []
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i])
        i += 1
      }
      blocks.push({ type: 'quote', lines: buf.map((l) => cleanInline(l.replace(/^>\s?/, ''))).filter(Boolean) })
      continue
    }

    if (isList(line)) {
      const buf = []
      while (i < lines.length && (isList(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        buf.push(lines[i])
        i += 1
      }
      blocks.push({
        type: 'list',
        ordered: /^\s*\d+\./.test(buf[0]),
        items: buf.filter((l) => isList(l)).map((l) => cleanInline(l.replace(/^\s*(?:[-*]|\d+\.)\s+/, ''))),
      })
      continue
    }

    const buf = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{3,4}\s|```|\s*\||>|\s*(?:[-*]|\d+\.)\s)/.test(lines[i])
    ) {
      buf.push(lines[i])
      i += 1
    }
    if (buf.length) blocks.push({ type: 'para', text: cleanInline(buf.join(' ')) })
    else i += 1
  }
  return blocks
}

/** 递归找文件 */
function walk(dir, filter, skipDirs = EXCLUDE_DIRS) {
  const out = []
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (skipDirs.has(e.name) || e.name.startsWith('.')) continue
      out.push(...walk(join(dir, e.name), filter, skipDirs))
    } else if (filter(join(dir, e.name), e.name)) out.push(join(dir, e.name))
  }
  return out
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const ms = today - new Date(dateStr + 'T00:00:00')
  return Math.max(0, Math.round(ms / 86400000))
}

// ── 1. 产品叙事（content/产品叙事） ──────────────────────────

function parseNarrative() {
  const files = existsSync(NARRATIVE)
    ? readdirSync(NARRATIVE).filter((f) => f.endsWith('.md'))
    : []
  if (!files.length) return null

  // 取文件名字典序最后一份作为当前叙事（-草案 / -最终 等后缀自然靠后）
  const file = join(NARRATIVE, files.sort().at(-1))
  const md = readFileSync(file, 'utf8')
  const fm = frontmatter(md)
  const sec = sections(md)
  const h1 = (md.match(/^#\s+(.+)$/m) || [])[1] || basename(file, '.md')

  // 节名支持别名：概览一页化后用了更口语的标题（v5.1 结构稿）
  const positionSec = sec['一句话定位'] || ''
  const headQuote = firstQuote(md.split(/^##\s+/m)[0] || '')
  const changeTables = tables(sec['核心变化'] || '')
  const spaceTables = tables(sec['空间结构'] || sec['产品结构'] || '')
  const loopTables = tables(sec['核心闭环'] || sec['怎么运作'] || '')
  const aiTables = tables(sec['AI 的介入边界'] || sec['AI 做什么，不做什么'] || '')
  const riskTables = tables(sec['待解决问题'] || sec['已知问题'] || sec['定稿前必须收口'] || '')
  const missionTables = tables(sec['使命与愿景'] || '')
  const kqTables = tables(
    sec['关键问题（我们必须能回答）'] || sec['关键问题'] || ''
  )

  // 通用内容区：概览里除固定字段外的其余标准节，整表透传给视图渲染。
  // 加一节 = 文档里写一个标准节的表格，视图自动多一张卡，零代码改动。
  const EXTRA_SECTIONS = ['目标用户与场景', '痛点与价值主张', '商业模式', '竞争与差异化', '关键指标']
  const headMd = md.split(/^##\s+/m)[0] || ''
  const notBullets = bullets(positionSec).length ? bullets(positionSec) : bullets(headMd)
  const extra = EXTRA_SECTIONS.flatMap((title) => {
    const t = tables(sec[title] || '')[0]
    return t && t.length ? [{ title, rows: t }] : []
  })

  return {
    file: relative(ROOT, file).replaceAll('\\', '/'),
    title: h1,
    version: fm['版本'] || '',
    updatedAt: fm['最后更新'] || '',
    status: fm['状态'] || '',
    source: fm['来源'] || '',
    positioning: firstQuote(positionSec) || headQuote,
    notList: notBullets,
    mission: missionTables[0] || [],
    keyQuestions: kqTables[0] || [],
    changes: changeTables[0] || [],
    spaces: (spaceTables[0] || []).map((r) => ({
      name: r['空间'] || r['Tab'] || r['模块'] || '',
      layer: r['层级'] || '',
      question: r['它回答的问题'] || r['它做什么'] || '',
      desc: r['说明'] || r['核心页面'] || '',
    })),
    loop: (loopTables[0] || []).map((r) => ({
      step: r['#'] || '',
      name: r['环节'] || '',
      where: r['发生在'] || '',
      desc: r['说明'] || '',
    })),
    model: bullets(sec['个人长期模型'] || '').filter((x) => !x.includes('共同底座')),
    aiBoundary: aiTables[0] || [],
    boundaries: bullets(sec['产品边界'] || '').filter((x) => !x.startsWith('原因')),
    boundaryReason: bullets(sec['产品边界'] || '').find((x) => x.startsWith('原因')) || '',
    risks: riskTables[0] || [],
    extra,
    sections: Object.keys(sec),
  }
}

// ── 2. 通用板块（content/<目录>/） ───────────────────────────
//
// 「加一个 md 目录 = 加一个板块」的实现处。
// 已在 SECTION_DEFS 登记的目录按配置归组；未登记的自动兜底排到「日常建设」末尾。
// 因此新建 content/xxx/ 并放一个 md，工作台下次启动就会出现这个板块，零代码改动。

// 分组顺序即导航顺序。空串 = 置顶区（不显示分组标题，如「工作台首页」）。
const GROUP_ORDER = ['', '目标', '产品', '迭代', '日常建设', '决策留痕']

// 目录 → 导航项。改产品定义时只改这里的 group / order / icon / tone。
const SECTION_DEFS = {
  迭代流程: { id: 'iteration', label: '迭代流程', group: '迭代', order: 11, icon: 'arrows', tone: 'bg-neo-yellow' },
  核心流程: { id: 'flow', label: '核心流程', group: '产品', order: 4, icon: 'route', tone: 'bg-neo-green' },
  商业模型: { id: 'bd', label: '商业模型', group: '产品', order: 5, icon: 'coins', tone: 'bg-neo-pink' },
  需求攻坚: { id: 'attack', label: '需求攻坚', group: '迭代', order: 7, icon: 'target', tone: 'bg-neo-pink' },
  竞品分析: { id: 'competitors', label: '竞品分析', group: '迭代', order: 10, icon: 'binoculars', tone: 'bg-neo-blue' },
  品牌资产: { id: 'brand', label: '品牌资产', group: '日常建设', order: 13, icon: 'palette', tone: 'bg-neo-yellow' },
  技术架构: { id: 'arch', label: '技术架构', group: '日常建设', order: 14, icon: 'stack', tone: 'bg-neo-purple' },
  灵感库: { id: 'inspiration', label: '灵感库', group: '决策留痕', order: 15, icon: 'lightbulb', tone: 'bg-neo-yellow' },
  决策日志: { id: 'decisions', label: '决策日志', group: '决策留痕', order: 16, icon: 'notebook', tone: 'bg-neo-blue' },
}

// 内置视图：不来自 content，由 Vue 组件直接实现。
// 带 dir 的内置视图会吃掉同名 content 目录（避免导航里出现两个「产品现状」）。
const BUILTIN_NAV = [
  { id: 'home', label: '工作台首页', group: '', order: 0, icon: 'house', tone: 'bg-neo-yellow', builtin: true },
  { id: 'goal', label: '终态目标', group: '目标', order: 1, icon: 'trophy', tone: 'bg-neo-purple', builtin: true },
  { id: 'overview', label: '产品概览', group: '目标', order: 2, icon: 'compass', tone: 'bg-neo-yellow', builtin: true },
  { id: 'structure', label: '核心结构', group: '产品', order: 3, icon: 'graph', tone: 'bg-neo-blue', builtin: true },
  { id: 'appStatus', label: '产品现状', group: '迭代', order: 6, icon: 'monitor', tone: 'bg-neo-blue', builtin: true, dir: '产品现状' },
  { id: 'backlog', label: '需求池', group: '迭代', order: 8, icon: 'listChecks', tone: 'bg-neo-purple', builtin: true, dir: '需求池' },
  { id: 'roadmap', label: '推进路线', group: '迭代', order: 9, icon: 'flag', tone: 'bg-neo-green', builtin: true },
  { id: 'identities', label: '身份资产', group: '日常建设', order: 11, icon: 'sparkle', tone: 'bg-neo-green', builtin: true },
  { id: 'prototypes', label: '原型库', group: '日常建设', order: 12, icon: 'device', tone: 'bg-neo-pink', builtin: true },
  { id: 'docs', label: '文档地图', group: '决策留痕', order: 17, icon: 'map', tone: 'bg-neo-purple', builtin: true },
]

function parseSectionDocs(dir) {
  const abs = join(CONTENT, dir)
  if (!existsSync(abs)) return []
  const files = readdirSync(abs)
    .filter((f) => f.endsWith('.md'))
    .sort()
  return files.map((f) => {
    const md = readFileSync(join(abs, f), 'utf8')
    const fm = frontmatter(md)
    const h1 = (md.match(/^#\s+(.+)$/m) || [])[1] || basename(f, '.md')
    const body = md.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^#\s+.*$/m, '')
    const parts = body.split(/^##\s+(.+)$/m)
    const chunks = []
    for (let i = 1; i < parts.length; i += 2) {
      chunks.push({
        name: parts[i].replace(/[（(].*$/, '').trim(),
        blocks: parseBlocks(parts[i + 1] || ''),
      })
    }
    // 首个 H2 之前的引用块作为导语
    const head = parseBlocks(parts[0] || '')
    const intro = (head.find((b) => b.type === 'quote') || {}).lines || []
    return {
      name: basename(f, '.md'),
      path: relative(ROOT, join(abs, f)).replaceAll('\\', '/'),
      title: h1.replace(/\*\*/g, '').trim(),
      version: (fm['版本'] || '').replace(/[*\s]/g, ''),
      status: (fm['状态'] || '').replace(/[*\s]/g, ''),
      updated: (fm['最后更新'] || '').replace(/[*\s]/g, ''),
      intro,
      chunks,
      flowCount: chunks.reduce((s, c) => s + c.blocks.filter((b) => b.type === 'mermaid').length, 0),
      chars: md.length,
    }
  })
}

function parseSections() {
  // 被内置视图吃掉的 content 目录：不再单独出一项，避免同名重复
  const builtinDirs = new Set(BUILTIN_NAV.map((s) => s.dir).filter(Boolean))
  const out = BUILTIN_NAV.map((s) => ({ ...s, desc: '', docs: s.dir ? parseSectionDocs(s.dir) : [] }))

  const dirs = existsSync(CONTENT)
    ? readdirSync(CONTENT, { withFileTypes: true })
        .filter(
          (e) =>
            e.isDirectory() &&
            !e.name.startsWith('.') &&
            e.name !== '产品叙事' &&
            !builtinDirs.has(e.name),
        )
        .map((e) => e.name)
    : []
  // 并上已登记的目录，这样内容还没写时板块也能先出现在导航里
  for (const dir of [...new Set([...dirs, ...Object.keys(SECTION_DEFS)])]) {
    const def = SECTION_DEFS[dir] || {
      id: dir.replace(/[^\w\u4e00-\u9fa5]/g, '') || 'section',
      label: dir,
      group: '日常建设',
      order: 90,
      icon: 'doc',
      tone: 'bg-neo-yellow',
    }
    out.push({ ...def, builtin: false, dir, docs: parseSectionDocs(dir) })
  }

  const gi = (g) => {
    const i = GROUP_ORDER.indexOf(g)
    return i < 0 ? 99 : i
  }
  return out.sort((a, b) => gi(a.group) - gi(b.group) || a.order - b.order)
}

// ── 3. mermaid 流程（从 文档仓库 提取） ─────────────────────

function parseFlows() {
  const files = walk(DOCS, (p) => p.endsWith('.md'))
  const flows = []
  for (const p of files) {
    const md = readFileSync(p, 'utf8')
    const re = /```mermaid\n([\s\S]*?)```/g
    let m
    let i = 0
    while ((m = re.exec(md))) {
      i += 1
      // 往上找最近的标题，作为流程名
      const before = md.slice(0, m.index)
      const heads = [...before.matchAll(/^#{2,4}\s+(.+)$/gm)]
      const name = heads.length ? heads.at(-1)[1].replace(/\*\*/g, '').trim() : '流程'
      flows.push({
        id: `${basename(p, '.md')}-${i}`,
        name,
        file: relative(DOCS, p).replaceAll('\\', '/'),
        code: m[1].trim(),
      })
    }
  }
  return flows
}

// ── 4. 文档地图 + 健康度（文档仓库） ───────────────────────

function gitDates() {
  try {
    // core.quotePath=false：否则中文路径会被转义成 \344\272 形式，与真实路径对不上
    const raw = execSync(
      `git -C "${DOCS}" -c core.quotePath=false log --since=3.years --date=short --pretty=format:%x1f%ad --name-only`,
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const dates = {}
    let cur = null
    for (const line of raw.split('\n')) {
      if (line.startsWith('\x1f')) cur = line.slice(1).trim()
      else if (line.trim() && cur && !(line.trim() in dates)) {
        dates[line.trim().replace(/^"|"$/g, '')] = cur
      }
    }
    return dates
  } catch {
    return {}
  }
}

const VERSION_WORDS =/(最新|新版|终版|最终|完整|正式|真·|草稿|副本|备份|待定|草案|final|copy|draft|backup|tmp|v\d+(?:\.\d+)*)/gi
const NUM_PREFIX = /^[\d_]+[\s\-_.]+/
const PUNCT = /[\s｜|\-—_:：·、,，.。/\\()（）\[\]《》"“”']+/g

function normKey(raw) {
  let key = raw
  for (const b of BRANDS) key = key.replaceAll(b, '')
  key = key.replace(VERSION_WORDS, '')
  key = key.replace(NUM_PREFIX, '')
  key = key.replace(PUNCT, '')
  return key.trim().toLowerCase()
}

// 疑似 AI 对话原文入库：直接粘进仓库的对话记录，不是文档
const CHAT_PATTERN = /^\s*(可以[。！]|好的[。！,，]|对[，,]\s*我|没问题|以下是|我建议|确实[，,]|那我们就|收到|明白|好问题)/
const CHAT_INNER = /(你前面|你提到|你举的|你说的|你已经有|你觉得的|你的意思)/

function parseDocs() {
  const dates = gitDates()
  const files = walk(DOCS, (p) => p.toLowerCase().endsWith('.md'))
  const docs = files.map((p) => {
    const rel = relative(DOCS, p).replaceAll('\\', '/')
    const md = readFileSync(p, 'utf8')
    const fm = frontmatter(md)
    const h1 = (md.match(/^#\s+(.+)$/m) || [])[1]
    const bodyVersion = (md.match(/^>?\s*\**(?:文档)?版本\**\s*[：:]\s*(.+)$/m) || [])[1] || ''
    const bodyUpdated = (md.match(/^>?\s*\**最后更新\**\s*[：:]\s*(.+)$/m) || [])[1] || ''
    const seg = rel.split('/')
    const dir = seg.length > 1 ? seg[0] : '(根目录)'
    const gitDate = dates[rel] || ''
    const declared = (fm['最后更新'] || bodyUpdated || '').replace(/[*\s]/g, '')
    let mtime = ''
    try {
      mtime = new Date(statSync(p).mtimeMs).toISOString().slice(0, 10)
    } catch {
      /* 读不到 mtime 就忽略 */
    }
    // 与 dashboard.py 一致地用 git 时间；但它没识别文档头声明的日期，这里让声明优先
    const updated = declared || gitDate || mtime
    const head = md
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 3)
      .map((l) => l.trim())

    return {
      path: rel,
      name: basename(p, '.md'),
      // 只认开头的 H1，正文中间的 H1 不算标题（同 dashboard.py）
      title: (h1 || basename(p, '.md')).replace(/\*\*/g, '').trim(),
      dir,
      version: (fm['版本'] || bodyVersion || '').replace(/[*\s]/g, ''),
      status: (fm['状态'] || '').replace(/[*\s]/g, ''),
      updated,
      declared,
      gitDate,
      mtime,
      chars: md.length,
      archived: rel.startsWith(ARCHIVE_DIR),
      static: STATIC_HINTS.some((h) => rel.includes(h)),
      // 主题键取 H1 标题（与 dashboard.py 的 topic_key 一致），退化到文件名
      key: normKey((h1 || '').replace(/\*\*/g, '').trim()) || normKey(basename(p, '.md')),
      chatish: CHAT_PATTERN.test(head[0] || '') || (head.length > 1 && CHAT_INNER.test(head.slice(0, 2).join(' '))),
      hasMeta: /最后更新/.test(md.slice(0, 2000)) || /版本[:：\s]*[vV]?\d/.test(md.slice(0, 2000)),
    }
  })

  // 入链统计：[[wikilink]] 与 [text](path.md)
  const inbound = Object.fromEntries(docs.map((d) => [d.path, 0]))
  for (const p of files) {
    const rel = relative(DOCS, p).replaceAll('\\', '/')
    const md = readFileSync(p, 'utf8')
    const targets = new Set()
    for (const m of md.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      targets.add(m[1].trim().replace(/\.md$/, '') + '.md')
    }
    for (const m of md.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
      targets.add(join(relative('.', rel.split('/').slice(0, -1).join('/') || '.'), m[1]).replaceAll('\\', '/'))
    }
    for (const t of targets) {
      const norm = t.replace(/^\.\//, '')
      if (norm !== rel && norm in inbound) inbound[norm] += 1
    }
  }
  for (const d of docs) d.inbound = inbound[d.path]

  const active = docs.filter((d) => !d.archived)

  // 目录概览
  const dirMap = {}
  for (const d of active) {
    const g = (dirMap[d.dir] ||= { dir: d.dir, count: 0, last: '' })
    g.count += 1
    if (d.updated && d.updated > g.last) g.last = d.updated
  }
  const byDir = Object.values(dirMap)
    .map((g) => ({
      ...g,
      days: daysAgo(g.last),
      level: HOT_DIRS.has(g.dir) ? '高' : g.days !== null && g.days > STALE_DAYS_COLD ? '低' : '中',
    }))
    .sort((a, b) => b.count - a.count)

  // 告警 1：同主题多副本（key 来自 H1，README 各自标题不同，不会互相误判）
  const keyMap = {}
  for (const d of active) (keyMap[d.key] ||= []).push(d)
  const duplicates = Object.values(keyMap)
    .filter((g) => g.length > 1)
    .map((g) => ({ key: g[0].key, docs: g.map((d) => ({ path: d.path, title: d.title, dir: d.dir })) }))

  // 告警 2：文档腐化（高变更目录 30 天、其余 90 天未动）
  const stale = active
    .filter((d) => !d.static)
    .map((d) => ({ ...d, days: daysAgo(d.updated) }))
    .filter((d) => d.days !== null && d.days > (HOT_DIRS.has(d.dir) ? STALE_DAYS_HOT : STALE_DAYS_COLD))
    .sort((a, b) => b.days - a.days)

  // 告警 3：缺版本元数据（只看高变更目录的顶层权威稿，子目录文档不计）
  const missingVersion = active.filter((d) => HOT_DIRS.has(d.dir) && d.path.split('/').length === 2 && !d.hasMeta)

  // 告警 4：孤岛文档（没有任何入链；首页与 README 是入口，不算孤岛）
  const orphans = active.filter(
    (d) => d.inbound === 0 && !['README.md', '首页.md'].includes(basename(d.path)) && !d.static,
  )

  // 告警 5：疑似 AI 对话原文入库
  const chatish = active.filter((d) => d.chatish)

  return {
    docs,
    stats: {
      total: docs.length,
      active: active.length,
      archived: docs.length - active.length,
      chars: active.reduce((s, d) => s + d.chars, 0),
      byDir,
    },
    alerts: { duplicates, stale, missingVersion, orphans, chatish },
  }
}

// ── 5. 身份资产（文档仓库/03-产品内容/身份挑战） ─────────────

function parseIdentities() {
  const dir = join(DOCS, IDENTITY_DIR)
  const files = walk(dir, (p, n) => n.endsWith('.md') && /^\d{2}-/.test(n) && !n.startsWith('00-'))
  return files
    .map((p) => {
      const md = readFileSync(p, 'utf8')
      const h1 = (md.match(/^#\s+(.+)$/m) || [])[1] || basename(p, '.md')
      // 兼容两种格式：`- **键**：值` 与裸 `键：值`
      const field = (k) => {
        const re = new RegExp(`^[-*]?\\s*\\*{0,2}${k}\\*{0,2}[：:]\\s*(.+)$`, 'm')
        const m = md.match(re)
        return m ? m[1].replace(/\*\*/g, '').trim() : ''
      }
      const introSec = (md.match(/^##\s*开场文案\s*\n+([\s\S]*?)(?=\n---|\n##\s)/m) || [])[1] || ''
      const pains = [...md.matchAll(/^###\s*\d+\.\s*(.+)$/gm)].map((m) => m[1].trim())
      const depositRaw = field(IDENTITY_DEPOSIT_FIELD)
      const deposit = parseInt((depositRaw.match(/\d+/) || [])[0] || '', 10)
      // 老格式（如 04/05）只有 Day 任务表，没有「挑战概览」段
      const legacy = !/^##\s*挑战概览/m.test(md)
      const taskRows = [...md.matchAll(/^\|\s*\d+\s*\|/gm)].length
      return {
        id: basename(p, '.md').replace(/^\d+-/, ''),
        file: relative(DOCS, p).replaceAll('\\', '/'),
        name: h1.replace(/[（(][^）)]*[）)]\s*$/g, '').replace(/\*\*/g, '').trim(),
        legacy,
        taskRows,
        full: field('挑战标题').replace(/[「」]/g, ''),
        subtitle: field('副标题'),
        shortName: field('短名称').replace(/[（(][^）)]*[）)]\s*$/g, ''),
        goal: field('身份目标'),
        type: field('挑战类型'),
        cycle: field('挑战周期'),
        deposit: Number.isNaN(deposit) ? null : deposit,
        depositRaw,
        painCount: pains.length,
        pains: pains.slice(0, 3),
        chars: md.length,
        intro: stripMd(introSec).split('\n').map((s) => s.trim()).filter(Boolean),
      }
    })
    .sort((a, b) => a.file.localeCompare(b.file))
}

// ── 6. 原型清单（文档仓库/02-原型设计 + AI个人改变与成长系统原型） ──

function parsePrototypes() {
  const groups = PROTOTYPE_GROUPS
  const out = []
  for (const g of groups) {
    const dir = join(DOCS, g.dir)
    if (!existsSync(dir)) continue
    const items = readdirSync(dir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => {
        const md = readFileSync(join(dir, f), 'utf8')
        const title = (md.match(/<title>([^<]*)<\/title>/) || [])[1] || basename(f, '.html')
        return {
          file: f,
          title: title.trim(),
          url: `/prototypes/${encodeURI(g.dir)}/${encodeURI(f)}`,
          group: g.key,
          groupLabel: g.label,
          note: g.note,
          chars: md.length,
        }
      })
      .sort((a, b) => a.file.localeCompare(b.file))
    out.push(...items)
  }
  return out
}

// ── 7. 产品现状（../客户端仓库，只读） ──────────────────────
//
// 「产品现状」不是写出来的，是从真实客户端代码里抽出来的：
// manifest.json（端与版本）+ pages.json（路由与 TabBar）+ pages/**/*.vue（页面规模）
// + api/*.js（接口清单，含真实 /portal/* 端点）。
// 产品迭代时这里自动跟随，不需要有人来改文档。

// APP / APP_MODULES / PAGE_LABELS / APP_API_LABELS 全部来自 config/sources.mjs，
// 换产品时只改那份配置，不用动这里。

// manifest.json 顶层键 → 平台名
const APP_PLATFORMS = {
  'app-plus': 'App',
  'mp-weixin': '微信小程序',
  'mp-alipay': '支付宝小程序',
  'mp-baidu': '百度小程序',
  'mp-toutiao': '抖音小程序',
  quickapp: '快应用',
  h5: 'H5',
}

/** 统计 export 出来的方法名（用 Node 正则，不用 shell grep：BSD grep 不认 \s） */
function exportedNames(src) {
  return [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let)\s+([A-Za-z0-9_$]+)/gm)].map(
    (m) => m[1],
  )
}

/** 从 api 文件里抽真实请求端点 */
function endpoints(src) {
  return [...new Set([...src.matchAll(/url:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]))]
}

function parseAppStatus() {
  const manifestPath = join(APP, 'manifest.json')
  const pagesPath = join(APP, 'pages.json')
  if (!existsSync(manifestPath) || !existsSync(pagesPath)) return null

  let manifest = {}
  let pagesJson = {}
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    pagesJson = JSON.parse(readFileSync(pagesPath, 'utf8'))
  } catch {
    return null
  }

  const tabOf = {}
  for (const t of pagesJson.tabBar?.list || []) tabOf[t.pagePath] = t.text

  // 页面与页面级组件：一次遍历拿到路由、行数、模块
  const vueFiles = walk(join(APP, 'pages'), (p) => p.endsWith('.vue'))
  const info = {}
  for (const p of vueFiles) {
    const route = relative(APP, p).replaceAll('\\', '/').replace(/\.vue$/, '')
    info[route] = {
      lines: readFileSync(p, 'utf8').split('\n').length,
      isComp: route.includes('/components/'),
    }
  }

  const pages = (pagesJson.pages || []).map((p, i) => {
    const route = p.path
    return {
      route,
      label: PAGE_LABELS[route] || route.split('/').pop(),
      module: route.split('/')[1] || '',
      lines: info[route]?.lines || 0,
      tab: tabOf[route] || '',
      title: p.style?.navigationBarTitleText || '',
      order: i,
    }
  })

  const comps = Object.entries(info)
    .filter(([, v]) => v.isComp)
    .map(([route, v]) => ({
      route,
      label: route.split('/').pop(),
      module: route.split('/')[1] || '',
      lines: v.lines,
    }))

  const modules = [...new Set(pages.map((p) => p.module))].map((m) => {
    const own = pages.filter((p) => p.module === m)
    const ownComps = comps.filter((c) => c.module === m)
    return {
      module: m,
      label: APP_MODULES[m]?.label || m,
      desc: APP_MODULES[m]?.desc || '',
      pages: own.sort((a, b) => a.order - b.order),
      comps: ownComps.length,
      compLines: ownComps.reduce((s, c) => s + c.lines, 0),
      lines: own.reduce((s, p) => s + p.lines, 0),
    }
  })

  const apiDir = join(APP, 'api')
  const apis = existsSync(apiDir)
    ? readdirSync(apiDir)
        .filter((f) => f.endsWith('.js') && f !== 'index.js')
        .map((f) => {
          const src = readFileSync(join(apiDir, f), 'utf8')
          const name = basename(f, '.js')
          const eps = endpoints(src)
          return {
            name,
            label: APP_API_LABELS[name] || name,
            fns: exportedNames(src).length,
            endpoints: eps,
            epCount: eps.length,
            lines: src.split('\n').length,
          }
        })
        .sort((a, b) => b.epCount - a.epCount || b.fns - a.fns)
    : []

  const allEndpoints = apis.flatMap((a) => a.endpoints)
  const byPrefix = {}
  for (const ep of allEndpoints) {
    const pre = '/' + ep.split('/').filter(Boolean)[0]
    byPrefix[pre] = (byPrefix[pre] || 0) + 1
  }

  return {
    info: {
      name: manifest.name || '',
      versionName: manifest.versionName || '',
      versionCode: manifest.versionCode || 0,
      appid: manifest.appid || '',
      vueVersion: manifest.vueVersion || 2,
      platforms: Object.keys(APP_PLATFORMS)
        .filter((k) => k in manifest)
        .map((k) => APP_PLATFORMS[k]),
    },
    stats: {
      pages: pages.length,
      pageLines: pages.reduce((s, p) => s + p.lines, 0),
      comps: comps.length,
      compLines: comps.reduce((s, c) => s + c.lines, 0),
      apis: apis.length,
      apiFns: apis.reduce((s, a) => s + a.fns, 0),
      endpoints: allEndpoints.length,
      modules: modules.length,
      tabs: (pagesJson.tabBar?.list || []).map((t) => ({ label: t.text, route: t.pagePath })),
      tabCustom: !!pagesJson.tabBar?.custom,
    },
    modules,
    apis,
    prefixes: Object.entries(byPrefix)
      .map(([prefix, count]) => ({ prefix, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ── 8. 需求攻坚条目（content/需求攻坚，供路线图渲染） ─────────
//
// 攻坚项的「状态」就写在 md 里：勾选框是完成度，`## P0 · 标题` 的档位即
// Now / Next / Later。改 md 就是改计划，不引入第二套任务系统。

function parseAttack() {
  const file = join(CONTENT, '需求攻坚/需求攻坚.md')
  if (!existsSync(file)) return { items: [], stats: { total: 0, done: 0 } }

  const md = readFileSync(file, 'utf8')
  const parts = md.split(/^##\s+P(\d)\s*·\s*(.+)$/m)
  const items = []
  for (let i = 1; i + 1 < parts.length; i += 3) {
    const tier = `P${parts[i]}`
    const title = parts[i + 1].trim()
    const body = parts[i + 2] || ''
    const after = (label) => {
      const m = body.match(new RegExp(`\\*\\*${label}\\*\\*[：:]\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`))
      return m ? m[1].trim().replace(/\n+/g, ' ') : ''
    }
    const actions = [...body.matchAll(/^[-*]\s+\[([ xX])\]\s+(.+)$/gm)].map((m) => ({
      done: m[1] !== ' ',
      text: m[2].trim(),
    }))
    items.push({
      tier,
      title,
      problem: after('问题'),
      actions,
      done: actions.filter((a) => a.done).length,
      total: actions.length,
      verdict: after('验收标准'),
    })
  }
  items.sort((a, b) => a.tier.localeCompare(b.tier) || a.title.localeCompare(b.title))
  return {
    items,
    stats: {
      total: items.reduce((s, it) => s + it.total, 0),
      done: items.reduce((s, it) => s + it.done, 0),
    },
  }
}

// ── 8.5 需求池（content/需求池/ 下所有 md 的 REQ-* 小节） ─────
//
// 每条需求 = 一个「## REQ-xxx · 标题」小节，节内两行：
//   元信息行  **域** x | **模块** y | **状态** z | **优先级** P0 | **版本** v | **来源** s
//   **描述**：…       **验收**：…
// 分层（域 → 模块 → 需求）由字段聚合而成，不依赖文件或目录层级，
// 因此调整归类只需改字段，不用挪文件。
// 展示顺序 = 需求在池子里推进的顺序，已搁置排最后。
const BACKLOG_STATUS = ['待评估', '已规划', '开发中', '已上线', '已搁置']

function parseBacklog() {
  const dir = join(CONTENT, '需求池')
  const empty = { items: [], tree: [], stats: { total: 0, byStatus: {} } }
  if (!existsSync(dir)) return empty

  const items = []
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const md = readFileSync(join(dir, f), 'utf8')
    const parts = md.split(/^##\s+(REQ-\d+)\s*·\s*(.+)$/m)
    for (let i = 1; i + 2 <= parts.length; i += 3) {
      const body = parts[i + 2] || ''
      // 元信息行：同时含 **加粗** 与 | 分隔符，且不是正文的描述行
      const metaLine = body.split('\n').find((l) => l.includes('**') && l.includes('|')) || ''
      const meta = {}
      for (const seg of metaLine.split('|')) {
        const m = seg.match(/\*\*(.+?)\*\*\s*(.*)/)
        if (m) meta[m[1].trim()] = m[2].trim()
      }
      const pick = (label) => {
        const m = body.match(
          new RegExp(`\\*\\*${label}\\*\\*\\s*[：:]\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*|\\n##|$)`)
        )
        // 尾部可能粘到下一个节的分隔线（---），去掉
        return m ? m[1].trim().replace(/\n+/g, ' ').replace(/\s*-{3,}\s*$/, '').trim() : ''
      }
      items.push({
        id: parts[i],
        title: (parts[i + 1] || '').trim(),
        domain: meta['域'] || '未归类',
        module: meta['模块'] || '',
        status: meta['状态'] || '待评估',
        priority: meta['优先级'] || 'P2',
        version: meta['版本'] || '—',
        source: meta['来源'] || '',
        desc: pick('描述'),
        acceptance: pick('验收'),
      })
    }
  }

  // 域 → 模块 两级树，顺序即首次出现顺序
  const order = []
  const byDomain = new Map()
  for (const it of items) {
    if (!byDomain.has(it.domain)) {
      byDomain.set(it.domain, { count: 0, modules: new Map() })
      order.push(it.domain)
    }
    const d = byDomain.get(it.domain)
    d.count += 1
    d.modules.set(it.module, (d.modules.get(it.module) || 0) + 1)
  }
  const tree = order.map((name) => {
    const d = byDomain.get(name)
    return {
      name,
      count: d.count,
      modules: [...d.modules.entries()].map(([m, c]) => ({ name: m, count: c })),
    }
  })

  const byStatus = {}
  for (const s of BACKLOG_STATUS) byStatus[s] = 0
  for (const it of items) byStatus[it.status] = (byStatus[it.status] || 0) + 1

  return { items, tree, stats: { total: items.length, byStatus } }
}

// ── 9. 版本时间线（content/迭代流程/版本时间线.md 的表格） ────
//
// 只收已发生的事；未来要做的事在需求攻坚的 Now/Next/Later 里，不在时间线上。

function parseTimeline() {
  const file = join(CONTENT, '迭代流程/版本时间线.md')
  if (!existsSync(file)) return []
  const md = readFileSync(file, 'utf8')
  // 只解析「## 节点」一节里的表——同目录其它表格（版本管理）不算节点
  const nodeSec = sections(md)['节点']
  const body = nodeSec || md
  const out = []
  for (const line of body.split('\n')) {
    if (!line.trim().startsWith('|')) continue
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 6) continue // | 日期 | 标题 | 说明 | 类型 | → split 后首尾是空串
    const [, date, title, desc, kind] = cells
    if (!date || date === '日期' || /^[-: ]+$/.test(date)) continue
    out.push({ date: date.replace(/[*`]/g, ''), title: title.replace(/\*\*/g, ''), desc: desc.replace(/\*\*/g, ''), kind: kind.replace(/\*\*/g, '') })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ── 终态目标：愿景 + 关键问题 + 定位结论 ────────────────────
//
// 数据来自「灵感库」两篇：愿景稿（一句话定位/使命愿景）与关键问题稿。
// 这两篇是「我们要去哪」的唯一出处——终态目标视图只渲染它们，不另立一份。

function parseGoal() {
  const dir = join(CONTENT, '灵感库')
  if (!existsSync(dir)) return null
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
  const visionFile = files.find((f) => f.includes('愿景'))
  const kqFile = files.find((f) => f.includes('关键问题'))

  const out = { vision: null, keyQuestions: [], decisions: [], tensions: [], file: '', kqFile: '', visionVersion: '' }

  if (visionFile) {
    const abs = join(dir, visionFile)
    const md = readFileSync(abs, 'utf8')
    const fm = frontmatter(md)
    const sec = sections(md)
    out.file = relative(ROOT, abs).replaceAll('\\', '/')
    out.visionVersion = fm['版本'] || ''
    out.vision = {
      title: (md.match(/^#\s+(.+)$/m) || [])[1] || '',
      status: fm['状态'] || '',
      updated: fm['最后更新'] || '',
      positioning: firstQuote(md.split(/^##\s+/m)[0] || ''),
      mission: tables(sec['使命与愿景'] || '')[0] || [],
      who: bullets(sec['为谁解决什么'] || '').slice(0, 3),
    }
  }

  if (kqFile) {
    const abs = join(dir, kqFile)
    const md = readFileSync(abs, 'utf8')
    const sec = sections(md)
    out.kqFile = relative(ROOT, abs).replaceAll('\\', '/')
    out.keyQuestions = tables(sec['关键问题'] || '')[0] || []
    out.decisions = tables(sec['定位八题结论'] || '')[0] || []
    out.tensions = bullets(sec['遗留张力'] || '')
  }

  return out
}
// ── 版本管理：终态目标 / 当前版本 / 迭代版本 ──────────────────
//
// 当前版本号不手写——从 客户端仓库/manifest.json 读 versionName 覆盖，
// 保证工作台与 App 永远同一个版本号（两边不一致 = 事故）。

function parseVersions(appStatus) {
  const file = join(CONTENT, '迭代流程/版本管理.md')
  if (!existsSync(file)) return { rows: [], card: [] }
  const md = readFileSync(file, 'utf8')
  const sec = sections(md)

  const liveVersion = appStatus?.info?.versionName ? `v${appStatus.info.versionName}` : ''

  const rows = (tables(sec['版本'] || '')[0] || []).map((r) => ({
    tier: r['层级'] || '',
    version: r['层级'] === '当前版本' && liveVersion ? liveVersion : r['版本'] || '',
    theme: r['主题'] || '',
    desc: r['说明'] || '',
    exit: r['出口条件'] || '',
    live: r['层级'] === '当前版本',
  }))

  // 版本卡：两列表（项 | 说明），第二列有值时取它
  const card = (tables(sec['版本卡'] || '')[0] || []).map((r) => {
    const keys = Object.keys(r)
    return { key: r[keys[0]] || '', value: r[keys[1]] || '' }
  })

  return { rows, card, liveVersion, versionCode: appStatus?.info?.versionCode || 0 }
}

// ── 汇总输出 ─────────────────────────────────────────────────

const docsData = parseDocs()
const appStatusData = parseAppStatus()

const data = {
  generatedAt: new Date().toISOString(),
  narrative: parseNarrative(),
  sections: parseSections(),
  flows: parseFlows(),
  identities: parseIdentities(),
  prototypes: parsePrototypes(),
  appStatus: appStatusData,
  attack: parseAttack(),
  backlog: parseBacklog(),
  timeline: parseTimeline(),
  versions: parseVersions(appStatusData),
  goal: parseGoal(),
  docs: docsData.docs,
  docStats: docsData.stats,
  docAlerts: docsData.alerts,
}

mkdirSync(join(ROOT, 'src/data'), { recursive: true })
writeFileSync(OUT, JSON.stringify(data, null, 1))

const n = data.narrative
const sec = data.sections.filter((s) => !s.builtin)
const a = data.appStatus
console.log(
  `[gen:data] 叙事 ${n ? n.version || '未标版本' : '缺失'}` +
    ` · 板块 ${data.sections.length}（内容板块 ${sec.length}：${sec.map((s) => `${s.label}×${s.docs.length}`).join(' ')}）` +
    ` · 流程 ${data.flows.length}` +
    ` · 身份 ${data.identities.length}` +
    ` · 原型 ${data.prototypes.length}` +
    ` · 现状 ${a ? `${a.info.name} v${a.info.versionName} ${a.stats.pages}页/${a.stats.endpoints}端点` : '缺失'}` +
    ` · 攻坚 ${data.attack.stats.done}/${data.attack.stats.total}` +
    ` · 需求池 ${data.backlog.stats.total}（${Object.entries(data.backlog.stats.byStatus).map(([k, v]) => `${k}${v}`).join(' ')}）` +
    ` · 时间线 ${data.timeline.length} 条` +
    ` · 文档 ${data.docStats.active} 活跃/${data.docStats.archived} 归档` +
    ` → src/data/generated.json`,
)
