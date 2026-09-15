<script setup lang="ts">
import { computed } from 'vue'
import {
  PhMonitor,
  PhWarningCircle,
  PhDeviceMobile,
  PhPlugs,
  PhSquaresFour,
  PhSelection,
} from '@phosphor-icons/vue'
import {
  appStatus,
  MODULE_PARADIGM,
  PARADIGM_META,
  type ModuleParadigm,
  type AppModule,
} from '../data/store'

const a = appStatus

const paradigmOf = (m: AppModule): ModuleParadigm => MODULE_PARADIGM[m.module] || 'current'

/** 旧范式模块（承诺金链路）——迭代时重点关注的悬空资产 */
const oldModules = computed(() => (a?.modules || []).filter((m) => paradigmOf(m) === 'old'))
/** 新叙事地基 */
const newModules = computed(() => (a?.modules || []).filter((m) => paradigmOf(m) === 'new'))

const stats = computed(() =>
  a
    ? [
        { label: '页面', value: a.stats.pages, sub: `${a.stats.pageLines} 行` },
        { label: '页面组件', value: a.stats.comps, sub: `${a.stats.compLines} 行` },
        { label: 'API 模块', value: a.stats.apis, sub: `${a.stats.apiFns} 个方法` },
        { label: '后端端点', value: a.stats.endpoints, sub: a.prefixes.map((p) => p.prefix).join(' ') },
      ]
    : [],
)
</script>

<template>
  <div v-if="!a" class="neo-card">
    <h2 class="text-2xl font-black">未解析到产品现状</h2>
    <p class="mt-2 text-sm text-neutral-500">
      需要 <code>../客户端仓库/manifest.json</code> 与 <code>pages.json</code> 存在。跑一次
      <code>npm run gen:data</code> 试试。
    </p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <!-- 端与版本 -->
    <div class="neo-card">
      <div class="flex flex-wrap items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-blue text-black"
        >
          <PhMonitor :size="20" weight="bold" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-black">{{ a.info.name }} · 客户端现状</h2>
          <p class="mt-1 text-sm text-neutral-500">
            从 <code>客户端仓库</code> 真实代码解析（manifest / pages / api），产品迭代自动跟随。
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="neo-chip">v{{ a.info.versionName }} ({{ a.info.versionCode }})</span>
          <span v-for="p in a.info.platforms" :key="p" class="neo-chip !bg-neutral-100">{{ p }}</span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <div
          v-for="s in stats"
          :key="s.label"
          class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm"
        >
          <div class="text-xs font-bold text-neutral-500">{{ s.label }}</div>
          <div class="text-3xl font-black">{{ s.value }}</div>
          <div class="mt-0.5 text-[11px] text-neutral-400">{{ s.sub }}</div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span class="flex items-center gap-1 text-xs font-bold text-neutral-500">
          <PhSelection :size="14" weight="bold" /> TabBar
        </span>
        <span
          v-for="t in a.stats.tabs"
          :key="t.route"
          class="neo-chip !border-2 !border-black !bg-white font-bold shadow-neo-sm"
        >
          {{ t.label }}
        </span>
        <span v-if="a.stats.tabCustom" class="neo-chip status-creating">custom 组件</span>
      </div>
    </div>

    <!-- 范式对齐 -->
    <div class="neo-card">
      <div class="flex items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-pink text-black"
        >
          <PhWarningCircle :size="20" weight="bold" />
        </span>
        <div>
          <h3 class="text-lg font-black">现状 × 叙事对齐度</h3>
          <p class="mt-1 text-sm leading-relaxed text-neutral-600">
            当产品叙事发生转向时，
            下面这些模块会从「资产」变成「待决资产」。改哪、留哪、删哪，决定了后续迭代的成本。
          </p>
        </div>
      </div>

      <div class="mt-3 grid gap-2.5 md:grid-cols-3">
        <div class="rounded-lg border-2 border-black bg-neo-pink/60 p-3">
          <div class="flex items-center gap-1.5 text-xs font-black">
            <span class="neo-chip !px-1.5 !py-0 text-[10px] status-failed">旧机制</span>待重构链路
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-700">
            {{ oldModules.map((m) => m.label).join('、') || '—' }}
            —— 这些模块在新叙事里没有对应物，留改弃需要尽快拍板。
          </p>
        </div>
        <div class="rounded-lg border-2 border-black bg-neo-green/50 p-3">
          <div class="flex items-center gap-1.5 text-xs font-black">
            <span class="neo-chip !px-1.5 !py-0 text-[10px] status-creating">新地基</span>身份测试
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-700">
            {{ newModules.map((m) => m.label).join('、') || '—' }}
            —— 答题 → 结果 → 海报，不依赖历史数据、当场给反馈。新叙事下冷启动缺口目前唯一的解。
          </p>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3">
          <div class="text-xs font-black">两版通用</div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-600">
            登录、协议、引导、我的（部分）——不管叙事怎么调都要留着，迭代时不用动。
          </p>
        </div>
      </div>
    </div>

    <!-- 模块明细 -->
    <div class="neo-card">
      <div class="flex items-center gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-yellow text-black"
        >
          <PhSquaresFour :size="20" weight="bold" />
        </span>
        <h3 class="text-lg font-black">功能模块（{{ a.stats.modules }}）</h3>
      </div>

      <div class="mt-3 grid gap-3 lg:grid-cols-2">
        <div
          v-for="m in a.modules"
          :key="m.module"
          class="rounded-lg border-2 border-black bg-white p-3.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-black">{{ m.label }}</span>
                <span
                  class="neo-chip !px-1.5 !py-0 text-[10px]"
                  :class="PARADIGM_META[paradigmOf(m)].chip"
                >
                  {{ PARADIGM_META[paradigmOf(m)].label }}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-neutral-500">{{ m.desc }}</p>
            </div>
            <div class="shrink-0 text-right text-[11px] leading-tight text-neutral-400">
              <div>{{ m.lines }} 行页面</div>
              <div v-if="m.comps">{{ m.comps }} 组件 / {{ m.compLines }} 行</div>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5 border-t-2 border-dashed border-neutral-300 pt-2">
            <span
              v-for="p in m.pages"
              :key="p.route"
              class="neo-chip !px-1.5 !py-0 text-[10px]"
              :class="p.tab ? '!border-2 !border-black !bg-white font-bold' : '!bg-neutral-100 !border-neutral-300'"
              :title="p.route"
            >
              {{ p.label }}<template v-if="p.lines"> · {{ p.lines }}行</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- API 清单 -->
    <div class="neo-card">
      <div class="flex items-center gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-purple text-black"
        >
          <PhPlugs :size="20" weight="bold" />
        </span>
        <h3 class="text-lg font-black">接口依赖（{{ a.stats.endpoints }} 个端点）</h3>
      </div>

      <div class="mt-3 overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="border-b-2 border-black text-left text-xs font-black uppercase tracking-wide">
              <th class="w-24 px-3 py-2">模块</th>
              <th class="w-16 px-3 py-2">方法</th>
              <th class="w-16 px-3 py-2">端点</th>
              <th class="px-3 py-2">真实路径</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="api in a.apis"
              :key="api.name"
              class="border-b border-neutral-200 align-top hover:bg-neo-yellow/30"
            >
              <td class="px-3 py-2 font-bold">
                {{ api.label }}
                <span class="ml-1 font-mono text-[10px] text-neutral-400">{{ api.name }}.js</span>
              </td>
              <td class="px-3 py-2 tabular-nums">{{ api.fns }}</td>
              <td class="px-3 py-2 tabular-nums font-black">{{ api.epCount }}</td>
              <td class="px-3 py-2">
                <div class="flex flex-wrap gap-1">
                  <code
                    v-for="ep in api.endpoints.slice(0, 6)"
                    :key="ep"
                    class="rounded-[3px] bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600"
                  >
                    {{ ep }}
                  </code>
                  <span v-if="api.endpoints.length > 6" class="text-[11px] text-neutral-400">
                    +{{ api.endpoints.length - 6 }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-neutral-500">
        <PhDeviceMobile :size="13" weight="bold" class="mt-0.5 shrink-0" />
        端点前缀分布：{{ a.prefixes.map((p) => `${p.prefix}×${p.count}`).join(' · ') }}。
        与后端约定一致：`/portal/*` 移动端、`/admin/*` 管理后台。
      </p>
    </div>
  </div>
</template>
