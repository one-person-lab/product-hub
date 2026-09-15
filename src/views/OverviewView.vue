<script setup lang="ts">
import { computed } from 'vue'
import { narrative, docStats, identities, prototypes, flows, generatedAt } from '../data/store'
import {
  PhCompass,
  PhArrowRight,
  PhWarningOctagon,
  PhWarning,
  PhInfo,
  PhCrosshair,
  PhUsers,
  PhHeart,
  PhCurrencyCircleDollar,
  PhScales,
  PhChartLine,
  PhPath,
} from '@phosphor-icons/vue'

const n = narrative

const emit = defineEmits<{ (e: 'go', view: string): void }>()

// 使命/愿景表里可能有 **加粗**，裸渲染太丑，去标记即可
const fmt = (s: string) => (s || '').replaceAll('**', '')

const answeredCount = computed(
  () => n.keyQuestions.filter((q) => q['状态']?.includes('✅')).length
)
const answeredAll = computed(
  () => n.keyQuestions.length > 0 && answeredCount.value === n.keyQuestions.length
)

const fatal = computed(() => (n ? n.risks.filter((r) => r['严重程度'] === '致命') : []))
const normal = computed(() => (n ? n.risks.filter((r) => r['严重程度'] !== '致命') : []))

const RISK_ICON: Record<string, unknown> = {
  致命: PhWarningOctagon,
  高: PhWarning,
  中: PhInfo,
}
const RISK_CLASS: Record<string, string> = {
  致命: 'status-failed',
  高: 'status-creating',
  中: 'status-ready',
}

// 通用内容区：标题 → 图标。文档里加 EXTRA_SECTIONS 的新节时在这里补图标。
const EXTRA_ICON: Record<string, unknown> = {
  目标用户与场景: PhUsers,
  痛点与价值主张: PhHeart,
  商业模式: PhCurrencyCircleDollar,
  竞争与差异化: PhScales,
  关键指标: PhChartLine,
}

const genTime = computed(() => new Date(generatedAt).toLocaleString('zh-CN', { hour12: false }))
</script>

<template>
  <div v-if="!n" class="neo-card">
    <h2 class="text-2xl font-black">未找到产品叙事</h2>
    <p class="mt-2 text-sm text-neutral-500">
      请在 <code>content/产品叙事/</code> 下放置一份 markdown，然后运行
      <code>npm run gen:data</code>。
    </p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <!-- 定位 -->
    <div class="neo-card">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-2xl font-black">
            <PhCompass :size="22" weight="bold" class="shrink-0" />
            {{ n.title }}
          </h2>
          <p class="mt-3 border-l-4 border-black pl-4 text-lg font-black leading-snug">
            {{ n.positioning }}
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <span class="neo-chip status-creating">{{ n.version }}</span>
          <span class="neo-chip">{{ n.status }}</span>
          <span class="text-[11px] text-neutral-400">更新 {{ n.updatedAt }}</span>
        </div>
      </div>

      <div v-if="n.notList.length" class="mt-4 flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-neutral-500">它不是什么：</span>
        <span v-for="x in n.notList" :key="x" class="neo-chip !bg-neutral-100 text-neutral-500">
          {{ x }}
        </span>
      </div>

      <!-- 使命与愿景 -->
      <div v-if="n.mission.length" class="mt-4 grid gap-2 border-t-2 border-dashed border-neutral-300 pt-4">
        <div
          v-for="(row, i) in n.mission"
          :key="i"
          class="flex items-start gap-3 rounded-lg border-2 border-black bg-white p-3 text-sm shadow-neo-sm"
        >
          <span class="w-20 shrink-0 font-black">{{ row['项'] }}</span>
          <span class="min-w-0 font-bold leading-relaxed" v-html="fmt(row['内容'])"></span>
        </div>
      </div>

      <p v-if="n.source" class="mt-4 border-t-2 border-dashed border-neutral-300 pt-3 text-[11px] text-neutral-500">
        来源：{{ n.source }} · 解析自 <code>{{ n.file }}</code> · 生成于 {{ genTime }}
      </p>
    </div>

    <!-- 关键问题 -->
    <div v-if="n.keyQuestions.length" class="neo-card">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-black">
          <PhCrosshair :size="18" weight="bold" class="shrink-0" />
          关键问题：我们必须能回答
        </h3>
        <span class="neo-chip" :class="answeredAll ? 'status-ready' : 'status-creating'">
          {{ answeredCount }} / {{ n.keyQuestions.length }} 已答
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="(q, i) in n.keyQuestions"
          :key="i"
          class="rounded-lg border-2 border-black p-3 shadow-neo-sm"
          :class="q['状态']?.includes('✅') ? 'bg-neo-green/30' : q['状态']?.includes('🔶') ? 'bg-white' : 'bg-neo-pink/25'"
        >
          <div class="flex items-start gap-2">
            <span class="mt-0.5 text-xs font-black text-neutral-400">{{ q['#'] || i + 1 }}</span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-black">{{ q['关键问题'] }}</span>
                <span
                  class="neo-chip !px-1.5 !py-0 text-[10px]"
                  :class="q['状态']?.includes('✅') ? 'status-ready' : q['状态']?.includes('🔶') ? 'status-creating' : 'status-failed'"
                >
                  {{ q['状态']?.includes('✅') ? '已答' : q['状态']?.includes('🔶') ? '部分答' : '未答' }}
                </span>
              </div>
              <p class="mt-1 text-sm text-neutral-600">{{ q['我们的答案'] }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速概览 -->
    <div class="grid grid-cols-4 gap-4">
      <button class="neo-card text-left transition-transform hover:-translate-y-0.5" @click="emit('go', 'structure')">
        <div class="text-sm font-bold text-neutral-500">空间 / 闭环</div>
        <div class="mt-1 text-4xl font-black">{{ n.spaces.length }}<span class="text-lg"> / {{ n.loop.length }}</span></div>
      </button>
      <button class="neo-card text-left transition-transform hover:-translate-y-0.5" @click="emit('go', 'identities')">
        <div class="text-sm font-bold text-neutral-500">身份资产</div>
        <div class="mt-1 text-4xl font-black">{{ identities.length }}</div>
      </button>
      <button class="neo-card text-left transition-transform hover:-translate-y-0.5" @click="emit('go', 'docs')">
        <div class="text-sm font-bold text-neutral-500">活跃文档</div>
        <div class="mt-1 text-4xl font-black">{{ docStats.active }}</div>
      </button>
      <button class="neo-card text-left transition-transform hover:-translate-y-0.5" @click="emit('go', 'prototypes')">
        <div class="text-sm font-bold text-neutral-500">原型页面 / 流程图</div>
        <div class="mt-1 text-4xl font-black">{{ prototypes.length }}<span class="text-lg"> / {{ flows.length }}</span></div>
      </button>
    </div>

    <!-- 通用内容区：目标用户 / 痛点价值 / 商业模式 / 竞争 / 指标 -->
    <div
      v-for="ex in n.extra"
      :key="ex.title"
      class="neo-card"
    >
      <h3 class="mb-3 flex items-center gap-2 text-lg font-black">
        <component
          :is="EXTRA_ICON[ex.title] || PhInfo"
          :size="18"
          weight="bold"
          class="shrink-0"
        />
        {{ ex.title }}
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                v-for="(k, i) in Object.keys(ex.rows[0] || {})"
                :key="i"
                class="border-b-2 border-black px-3 py-2 text-left text-xs font-black whitespace-nowrap"
              >
                {{ k }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, ri) in ex.rows"
              :key="ri"
              class="border-b border-dashed border-neutral-300 last:border-b-0"
            >
              <td
                v-for="(k, ki) in Object.keys(ex.rows[0] || {})"
                :key="ki"
                class="px-3 py-2.5 align-top leading-relaxed"
                :class="ki === 0 ? 'font-black whitespace-nowrap' : 'text-neutral-700'"
              >
                {{ row[k] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 怎么运作（核心流程） -->
    <div v-if="n.loop.length" class="neo-card">
      <h3 class="mb-3 flex items-center gap-2 text-lg font-black">
        <PhPath :size="18" weight="bold" class="shrink-0" />
        怎么运作（核心流程）
      </h3>
      <div class="flex flex-col gap-2">
        <div
          v-for="(s, i) in n.loop"
          :key="i"
          class="flex items-start gap-3 rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-black text-sm font-black text-white"
          >
            {{ s.step }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-black">{{ s.name }}</span>
              <PhArrowRight :size="13" weight="bold" class="shrink-0 text-neutral-400" />
              <span
                v-for="sp in s.where.split('·').map((x) => x.trim()).filter(Boolean)"
                :key="sp"
                class="neo-chip !px-1.5 !py-0 text-[10px]"
              >
                {{ sp }}
              </span>
            </div>
            <p class="mt-1 text-sm text-neutral-600">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 核心变化 -->
    <div v-if="n.changes.length" class="neo-card">
      <h3 class="mb-3 text-lg font-black">这版改了什么</h3>
      <div class="flex flex-col gap-1.5">
        <div
          v-for="(row, i) in n.changes"
          :key="i"
          class="grid grid-cols-[7rem_1fr_1.25rem_1fr] items-center gap-2 rounded-lg border-2 border-black bg-white p-2.5 text-sm shadow-neo-sm"
        >
          <span class="font-black">{{ row['维度'] }}</span>
          <span class="min-w-0 text-neutral-400 line-through">{{ row['旧版 v4.1'] }}</span>
          <PhArrowRight :size="14" weight="bold" class="shrink-0 text-neutral-400" />
          <span class="min-w-0 font-bold">{{ row['新版'] }}</span>
        </div>
      </div>
    </div>

    <!-- 待解决问题 -->
    <div v-if="n.risks.length" class="neo-card">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-black">
          <PhWarningOctagon :size="18" weight="bold" class="shrink-0" />
          已知问题（迭代的依据）
        </h3>
        <span class="neo-chip status-failed">{{ n.risks.length }} 项待解决</span>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="(r, i) in [...fatal, ...normal]"
          :key="i"
          class="flex items-start gap-3 rounded-lg border-2 border-black p-3 shadow-neo-sm"
          :class="r['严重程度'] === '致命' ? 'bg-neo-pink/40' : 'bg-white'"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-2 border-black text-black"
            :class="RISK_CLASS[r['严重程度']] || 'status-not-start'"
          >
            <component :is="RISK_ICON[r['严重程度']] || PhInfo" :size="15" weight="bold" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-black">{{ r['问题'] }}</span>
              <span class="neo-chip !px-1.5 !py-0 text-[10px]" :class="RISK_CLASS[r['严重程度']]">
                {{ r['严重程度'] }}
              </span>
            </div>
            <p class="mt-1 text-sm text-neutral-600">{{ r['说明'] }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
