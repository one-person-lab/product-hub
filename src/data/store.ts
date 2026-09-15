import raw from './generated.json'
import {
  PhCompass,
  PhGraph,
  PhSparkle,
  PhDeviceMobile,
  PhMapTrifold,
  PhPath,
  PhCoins,
  PhPalette,
  PhStack,
  PhNotebook,
  PhLightbulb,
  PhTrophy,
  PhFileText,
  PhMonitor,
  PhTarget,
  PhHouse,
  PhFlag,
  PhArrowsClockwise,
  PhBinoculars,
  PhListChecks,
} from '@phosphor-icons/vue'

/* ==================== 产品叙事 ==================== */

export interface Space {
  name: string
  layer: string
  question: string
  desc: string
}

export interface LoopStep {
  step: string
  name: string
  where: string
  desc: string
}

export interface Narrative {
  file: string
  title: string
  version: string
  updatedAt: string
  status: string
  source: string
  positioning: string
  notList: string[]
  mission: Record<string, string>[]
  keyQuestions: Record<string, string>[]
  changes: Record<string, string>[]
  spaces: Space[]
  loop: LoopStep[]
  model: string[]
  aiBoundary: Record<string, string>[]
  boundaries: string[]
  boundaryReason: string
  risks: Record<string, string>[]
  extra: { title: string; rows: Record<string, string>[] }[]
  sections: string[]
}

/* ==================== 流程 ==================== */

export interface Flow {
  id: string
  name: string
  file: string
  code: string
}

/* ==================== 身份资产 ==================== */

export interface Identity {
  id: string
  file: string
  name: string
  legacy: boolean
  taskRows: number
  full: string
  subtitle: string
  shortName: string
  goal: string
  type: string
  cycle: string
  deposit: number | null
  depositRaw: string
  painCount: number
  pains: string[]
  chars: number
  intro: string[]
}

/* ==================== 原型 ==================== */

export interface Prototype {
  file: string
  title: string
  url: string
  group: string
  groupLabel: string
  note: string
  chars: number
}

/* ==================== 文档地图 ==================== */

export interface DocItem {
  path: string
  name: string
  title: string
  dir: string
  version: string
  status: string
  updated: string
  declared: string
  gitDate: string
  mtime: string
  chars: number
  archived: boolean
  static: boolean
  key: string
  inbound: number
  chatish: boolean
  hasMeta: boolean
}

export interface DirStat {
  dir: string
  count: number
  last: string
  days: number | null
  level: string
}

export interface DocStats {
  total: number
  active: number
  archived: number
  chars: number
  byDir: DirStat[]
}

export interface DocAlerts {
  duplicates: { key: string; docs: { path: string; title: string; dir: string }[] }[]
  stale: (DocItem & { days: number })[]
  missingVersion: DocItem[]
  orphans: DocItem[]
  chatish: DocItem[]
}

/* ==================== 通用板块（content/<目录>/） ==================== */

export type Block =
  | { type: 'para'; text: string }
  | { type: 'h'; level: number; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; head: string[]; rows: Record<string, string>[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'mermaid'; lang: string; text: string }

export interface Chunk {
  name: string
  blocks: Block[]
}

export interface SectionDoc {
  name: string
  path: string
  title: string
  version: string
  status: string
  updated: string
  intro: string[]
  chunks: Chunk[]
  flowCount: number
  chars: number
}

export interface Section {
  id: string
  label: string
  group: string
  order: number
  icon: string
  /** 导航里的色块底色 class */
  tone: string
  builtin: boolean
  /** 内容板块对应的 content/ 子目录名；内置视图没有 */
  dir?: string
  docs: SectionDoc[]
}

/* ==================== 导出 ==================== */

export const narrative: Narrative | null = (raw as Record<string, unknown>).narrative as Narrative | null
export const sections: Section[] = (raw as Record<string, unknown>).sections as Section[]
export const flows: Flow[] = (raw as Record<string, unknown>).flows as Flow[]
export const identities: Identity[] = (raw as Record<string, unknown>).identities as Identity[]
export const prototypes: Prototype[] = (raw as Record<string, unknown>).prototypes as Prototype[]
export const docs: DocItem[] = (raw as Record<string, unknown>).docs as DocItem[]
export const docStats: DocStats = (raw as Record<string, unknown>).docStats as DocStats
export const docAlerts: DocAlerts = (raw as Record<string, unknown>).docAlerts as DocAlerts
export const generatedAt: string = (raw as Record<string, unknown>).generatedAt as string

/* 层级色板：理解层相关走 teal，行动层走 yellow */
export const LAYER_CLASS: Record<string, string> = {
  理解层: 'layer-kernel',
  行动层: 'layer-action',
}

export const LAYER_DESC: Record<string, string> = {
  理解层: '积累认知，不直接产生行动',
  行动层: '消耗认知，产出新的认知',
}

export const IDENTITY_TYPES: Record<string, string> = {
  life: '生活方式',
  health: '身心健康',
  work: '工作事业',
  mind: '心智成长',
  relation: '关系连接',
}

export function identityTypeLabel(t: string): string {
  const key = (t.match(/（([a-z]+)）/) || [])[1] || t
  return IDENTITY_TYPES[key] || t.replace(/（.*?）/, '') || '未分类'
}

export const activeDocs = (): DocItem[] => docs.filter((d) => !d.archived)

export const docsInDir = (dir: string): DocItem[] => activeDocs().filter((d) => d.dir === dir)

export const alertCount = (): number =>
  docAlerts.duplicates.length +
  docAlerts.stale.length +
  docAlerts.missingVersion.length +
  docAlerts.orphans.length

export function unlinkWarn(layer: string): boolean {
  return layer !== '理解层' && layer !== '行动层'
}

/* ==================== 板块导航 ==================== */

/** sections 按 group 分组，保持 build-data 给出的顺序 */
export const sectionGroups: { group: string; items: Section[] }[] = (() => {
  const map = new Map<string, Section[]>()
  for (const s of sections) {
    if (!map.has(s.group)) map.set(s.group, [])
    map.get(s.group)!.push(s)
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }))
})()

/** 数据里的 icon 键 → 组件。新增板块时在这里加一行即可 */
const SECTION_ICONS: Record<string, unknown> = {
  compass: PhCompass,
  graph: PhGraph,
  sparkle: PhSparkle,
  device: PhDeviceMobile,
  map: PhMapTrifold,
  route: PhPath,
  coins: PhCoins,
  palette: PhPalette,
  stack: PhStack,
  notebook: PhNotebook,
  lightbulb: PhLightbulb,
  trophy: PhTrophy,
  monitor: PhMonitor,
  target: PhTarget,
  house: PhHouse,
  flag: PhFlag,
  arrows: PhArrowsClockwise,
  binoculars: PhBinoculars,
  listChecks: PhListChecks,
  doc: PhFileText,
}

export const sectionIcon = (key: string): unknown => SECTION_ICONS[key] || PhFileText

export const sectionById = (id: string): Section | undefined => sections.find((s) => s.id === id)

/* ==================== 产品现状（客户端仓库 只读解析） ==================== */

export interface AppPage {
  route: string
  label: string
  module: string
  lines: number
  tab: string
  title: string
  order: number
}

export interface AppModule {
  module: string
  label: string
  desc: string
  pages: AppPage[]
  comps: number
  compLines: number
  lines: number
}

export interface AppApi {
  name: string
  label: string
  fns: number
  endpoints: string[]
  epCount: number
  lines: number
}

/** 模块与叙事的范式关系：current=叙事与实现一致 / old=待重构的旧机制 / new=新地基 */
export type ModuleParadigm = 'current' | 'old' | 'new'

export const MODULE_PARADIGM: Record<string, ModuleParadigm> = {
  home: 'old',
  challenge: 'current',
  stats: 'old',
  profile: 'current',
  'identity-test': 'new',
  onboarding: 'current',
  login: 'current',
  terms: 'current',
  webview: 'current',
}

export const PARADIGM_META: Record<ModuleParadigm, { label: string; chip: string }> = {
  current: { label: '两版通用', chip: 'status-ready' },
  old: { label: '旧机制（待重构）', chip: 'status-failed' },
  new: { label: '新地基', chip: 'status-creating' },
}

export interface AppStatus {
  info: {
    name: string
    versionName: string
    versionCode: number
    appid: string
    vueVersion: number
    platforms: string[]
  }
  stats: {
    pages: number
    pageLines: number
    comps: number
    compLines: number
    apis: number
    apiFns: number
    endpoints: number
    modules: number
    tabs: { label: string; route: string }[]
    tabCustom: boolean
  }
  modules: AppModule[]
  apis: AppApi[]
  prefixes: { prefix: string; count: number }[]
}

export const appStatus: AppStatus | null = (raw as Record<string, unknown>).appStatus as
  | AppStatus
  | null

/* ==================== 需求攻坚（推进路线数据源） ==================== */

export interface AttackAction {
  done: boolean
  text: string
}

export interface AttackItem {
  tier: 'P0' | 'P1' | 'P2'
  title: string
  problem: string
  actions: AttackAction[]
  done: number
  total: number
  verdict: string
}

export interface Attack {
  items: AttackItem[]
  stats: { total: number; done: number }
}

export const attack: Attack =
  (raw as Record<string, unknown>).attack as Attack ?? { items: [], stats: { total: 0, done: 0 } }

/* ==================== 需求池 ==================== */

export interface BacklogItem {
  id: string
  title: string
  domain: string
  module: string
  status: string
  priority: string
  version: string
  source: string
  desc: string
  acceptance: string
}

export interface Backlog {
  items: BacklogItem[]
  tree: { name: string; count: number; modules: { name: string; count: number }[] }[]
  stats: { total: number; byStatus: Record<string, number> }
}

export const backlog: Backlog =
  (raw as Record<string, unknown>).backlog as Backlog ?? {
    items: [],
    tree: [],
    stats: { total: 0, byStatus: {} },
  }

/** 状态色：顺序即需求在池子里的推进顺序 */
export const BACKLOG_STATUS_META: Record<string, { chip: string; hint: string }> = {
  待评估: { chip: 'status-not-start', hint: '收集到但未定' },
  已规划: { chip: 'status-ready', hint: '排期已定、未开工' },
  开发中: { chip: 'status-creating', hint: '本迭代已开工' },
  已上线: { chip: 'status-published', hint: '线上跑着' },
  已搁置: { chip: 'status-failed', hint: '明确暂缓' },
}

export const BACKLOG_PRIORITY_META: Record<string, string> = {
  P0: 'status-failed',
  P1: 'status-creating',
  P2: 'status-not-start',
}

/** 档位 → 路线图列。P0=现在做，P1=接着做，P2=以后做 */
export const TIER_META: Record<string, { col: string; chip: string }> = {
  P0: { col: 'NOW', chip: 'status-failed' },
  P1: { col: 'NEXT', chip: 'status-creating' },
  P2: { col: 'LATER', chip: 'status-ready' },
}

/* ==================== 终态目标 ==================== */

export interface Goal {
  file: string
  kqFile: string
  visionVersion: string
  vision: {
    title: string
    status: string
    updated: string
    positioning: string
    mission: Record<string, string>[]
    who: string[]
  } | null
  keyQuestions: Record<string, string>[]
  decisions: Record<string, string>[]
  tensions: string[]
}

export const goal: Goal | null = ((raw as Record<string, unknown>).goal as Goal) ?? null

/* ==================== 版本管理 ==================== */

export interface VersionRow {
  tier: string
  version: string
  theme: string
  desc: string
  exit: string
  live: boolean
}

export interface Versions {
  rows: VersionRow[]
  card: { key: string; value: string }[]
  liveVersion: string
  versionCode: number
}

export const versions: Versions =
  ((raw as Record<string, unknown>).versions as Versions) ?? {
    rows: [],
    card: [],
    liveVersion: '',
    versionCode: 0,
  }

/* ==================== 版本时间线 ==================== */

export interface TimelineEvent {
  date: string
  title: string
  desc: string
  kind: string
}

export const timeline: TimelineEvent[] =
  (raw as Record<string, unknown>).timeline as TimelineEvent[] ?? []

/** 时间线事件类型 → 色块 class */
export const TIMELINE_KIND_CLASS: Record<string, string> = {
  客户端: 'bg-neo-blue',
  文档: 'bg-neo-yellow',
  工作台: 'bg-neo-green',
  决策: 'bg-neo-pink',
}

/* ==================== 行内渲染 ==================== */

/**
 * md 行内标记 → 安全 HTML（先转义再放行 ** 与 `）。
 * 全站唯一的富文本出口，别在视图里另写一套。
 */
export function inline(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded-[3px] bg-black/10 px-1 py-px text-[0.92em]">$1</code>')
}
