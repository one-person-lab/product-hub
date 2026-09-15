/**
 * 数据源配置 · 开源示例版
 *
 * 这是 publish-oss.mjs 导出开源快照时用来替换 config/sources.mjs 的中性版本。
 * 默认值刻意留空：目录不存在时相关板块自动降级为空，开箱即可跑，不会报错。
 *
 * 想接你自己的产品，改成这样即可：
 *   export const DOCS = '/abs/path/to/你的文档仓库'   // Obsidian vault 或任意 md 目录
 *   export const APP  = '/abs/path/to/你的客户端仓库'  // 含 manifest.json / pages.json
 *
 * DOCS 提供的板块：文档地图（含健康度告警）、身份资产、原型库、mermaid 流程
 * APP  提供的板块：产品现状（页面清单、模块规模、接口清单）
 *
 * 两者都只读，且都不是必需——只写 content/ 也能用工作台。
 */
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const CONFIG_DIR = join(fileURLToPath(import.meta.url), '..')
const ROOT = join(CONFIG_DIR, '..')

/** 文档仓库（只读）。留空 = 文档地图/身份资产/原型库/流程 这几个板块为空 */
export const DOCS = join(ROOT, 'docs')

/** 客户端代码仓库（只读）。留空 =「产品现状」板块隐藏 */
export const APP = join(ROOT, 'app')

/** 品牌词：主题归一时剥掉的前缀。没有品牌词就留空数组 */
export const BRANDS = []

/** 高变更目录：这些目录 30 天未动即告警，其余 90 天 */
export const HOT_DIRS = new Set()

/** 原型清单分组（相对 DOCS）。没有原型就留空数组 */
export const PROTOTYPE_GROUPS = []

/** 身份资产目录（相对 DOCS）。没有身份内容就随便填，解析不到会自动为空 */
export const IDENTITY_DIR = 'identity'

/** 身份文档里「承诺金」字段的标题——build-data 靠它解析押金数额 */
export const IDENTITY_DEPOSIT_FIELD = '承诺金'

/** 客户端模块目录 → 中文名与说明 */
export const APP_MODULES = {}

/** 客户端路由 → 中文页名 */
export const PAGE_LABELS = {}

/** 客户端 api 文件 → 中文名 */
export const APP_API_LABELS = {}
