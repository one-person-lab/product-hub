/**
 * 数据源配置 —— 工作台与外部文件系统之间的唯一接缝。
 *
 * 本文件是「本地开发版」：指向 SMZS 的私有目录（smzs-docs / smzs-ui-app）。
 * 它不会进开源仓库——publish-oss.mjs 会用 templates/sources.example.mjs
 * 覆盖它，因此公开仓库里不含任何 SMZS 路径与品牌词。
 *
 * 想接你自己的产品：
 *   1. 复制 templates/sources.example.mjs 覆盖本文件
 *   2. 改 DOCS / APP 指向你自己的文档仓库与客户端仓库
 *   3. 按你的产品结构填 APP_MODULES / PAGE_LABELS / APP_API_LABELS
 *
 * 这些映射只是「命名翻译层」：把英文目录/路由翻成中文展示名。
 * 不填也能跑，只是展示为原始英文。
 */
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const CONFIG_DIR = join(fileURLToPath(import.meta.url), '..')
const ROOT = join(CONFIG_DIR, '..')

/**
 * 文档仓库（只读）：文档地图、身份资产、原型清单、mermaid 流程的来源。
 * 目录不存在时相关板块自动降级为空，不会报错。
 */
export const DOCS = join(ROOT, '..', '..', 'smzs', 'smzs-docs')

/**
 * 客户端代码仓库（只读）：「产品现状」板块的数据源。
 * 读 manifest.json / pages.json / pages/**\/*.vue / api/*.js。
 * 目录不存在时「产品现状」自动隐藏，不会报错。
 */
export const APP = join(ROOT, '..', '..', 'smzs', 'smzs-ui-app')

/** 品牌词：文档主题归一时先剥掉它们，避免同主题被品牌前缀判成两个 */
export const BRANDS = ['醒醒老己', 'smzs']

/** 高变更目录：文档 30 天未动即告警，其余目录 90 天 */
export const HOT_DIRS = new Set(['01-产品设计'])

/** 原型清单分组（相对 DOCS） */
export const PROTOTYPE_GROUPS = [
  { key: 'challenge', label: '挑战金体系原型', dir: '02-原型设计', note: '围绕挑战金与打卡' },
  {
    key: 'change',
    label: 'AI 改变系统原型',
    dir: 'AI个人改变与成长系统原型/pages',
    note: '围绕改变方案与成长档案',
  },
]

/** 身份资产目录（相对 DOCS） */
export const IDENTITY_DIR = '03-产品内容/身份挑战'

/** 身份文档里「承诺金」字段的标题——build-data 靠它解析押金数额 */
export const IDENTITY_DEPOSIT_FIELD = '挑战金'

/** 客户端模块目录 → 中文名与说明 */
export const APP_MODULES = {
  home: { label: '首页', desc: '今日行动、打卡、挑战记录' },
  challenge: { label: '身份', desc: '身份库、详情、挑战金、自定义' },
  stats: { label: '成长', desc: '成长与能量记录' },
  profile: { label: '我的', desc: '资料、钱包、PRO、测试结果、设置' },
  'identity-test': { label: '身份测试', desc: '答题 → 计算 → 结果 → 详情 → 海报' },
  onboarding: { label: '引导', desc: '首次进入引导' },
  login: { label: '登录', desc: '登录' },
  terms: { label: '协议', desc: '用户协议 / 隐私政策 / 支付条款' },
  webview: { label: '内嵌浏览', desc: 'WebView 资源浏览' },
}

/** 客户端路由 → 中文页名 */
export const PAGE_LABELS = {
  'pages/home/index': '首页',
  'pages/home/challenge-daily': '今日打卡',
  'pages/home/challenge-history': '挑战记录',
  'pages/home/participation-list': '参与记录',
  'pages/challenge/index': '身份列表',
  'pages/challenge/challenge-detail': '身份详情',
  'pages/challenge/select-fund': '选择挑战金',
  'pages/challenge/custom-create': '自定义身份',
  'pages/stats/index': '成长',
  'pages/profile/index': '我的',
  'pages/profile/wallet': '钱包',
  'pages/profile/wallet-detail': '钱包明细',
  'pages/profile/pro-subscription': 'PRO 会员',
  'pages/profile/test-results': '测试结果',
  'pages/profile/settings': '设置',
  'pages/profile/about': '关于',
  'pages/profile/complete': '完善资料',
  'pages/identity-test/index': '测试答题',
  'pages/identity-test/loading': '测试计算中',
  'pages/identity-test/result': '测试结果',
  'pages/identity-test/detail': '结果详情',
  'pages/identity-test/poster': '结果海报',
  'pages/onboarding/index': '引导页',
  'pages/login/index': '登录',
  'pages/terms/user': '用户协议',
  'pages/terms/privacy': '隐私政策',
  'pages/terms/terms-pay': '支付条款',
  'pages/webview/index': '内嵌浏览',
}

/** 客户端 api 文件 → 中文名 */
export const APP_API_LABELS = {
  member: '用户',
  challenge: '挑战',
  payment: '支付',
  wallet: '钱包',
  pro: 'PRO 会员',
  'identity-test': '身份测试',
  misc: '其他',
}
