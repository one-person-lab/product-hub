<script setup lang="ts">
import { computed } from 'vue'
import {
  PhTrophy,
  PhCrosshair,
  PhArrowRight,
  PhWarning,
  PhHeart,
  PhCaretRight,
} from '@phosphor-icons/vue'
import { goal, versions, narrative } from '../data/store'

const emit = defineEmits<{ (e: 'go', view: string): void }>()

const g = goal
const v = goal?.vision

const finalRow = computed(() => versions.rows.find((r) => r.tier === '终态目标') || null)
const liveRow = computed(() => versions.rows.find((r) => r.tier === '当前版本') || null)
const iterRow = computed(() => versions.rows.find((r) => r.tier === '迭代版本') || null)

const answered = computed(() => (g?.keyQuestions || []).filter((q) => q['状态']?.includes('✅')).length)
const total = computed(() => (g?.keyQuestions || []).length)

const fmt = (s: string) => (s || '').replaceAll('**', '')

/** 终态与当前之间的差距：直接引用概览的已知问题，不另立一份 */
const gaps = computed(() =>
  (narrative?.risks || []).filter((r) => r['严重程度'] === '高' || r['严重程度'] === '致命')
)
</script>

<template>
  <div v-if="!g || !v" class="neo-card">
    <h2 class="text-2xl font-black">未找到终态目标</h2>
    <p class="mt-2 text-sm text-neutral-500">
      数据来自 <code>content/灵感库/</code> 的愿景稿与关键问题稿。
    </p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <!-- 北极星 -->
    <div class="neo-card bg-neo-purple/25">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <span class="flex items-center gap-1.5 text-xs font-black tracking-widest text-neutral-600">
            <PhTrophy :size="14" weight="bold" class="shrink-0" />
            终态目标 · 北极星
          </span>
          <div class="mt-1.5 flex flex-wrap items-baseline gap-2">
            <span class="font-mono text-3xl font-black leading-none">{{ finalRow?.version || 'v3.0' }}</span>
            <span class="text-2xl font-black">{{ finalRow?.theme || '人生系统' }}</span>
          </div>
          <p class="mt-2 max-w-3xl border-l-4 border-black pl-4 text-base font-black leading-snug">
            {{ v.positioning }}
          </p>
          <p class="mt-2 text-sm leading-relaxed text-neutral-700">{{ finalRow?.desc }}</p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <span class="neo-chip status-creating">距离：关键问题 {{ answered }} / {{ total }} 已答</span>
          <span class="neo-chip !bg-white">出口：{{ finalRow?.exit }}</span>
        </div>
      </div>

      <!-- 使命 / 愿景 / 核心目标 -->
      <div class="mt-4 grid gap-2 border-t-2 border-dashed border-neutral-400 pt-4">
        <div
          v-for="(row, i) in v.mission"
          :key="i"
          class="flex items-start gap-3 rounded-lg border-2 border-black bg-white p-3 text-sm shadow-neo-sm"
        >
          <span class="w-20 shrink-0 font-black">{{ row['项'] }}</span>
          <span class="min-w-0 font-bold leading-relaxed">{{ fmt(row['内容']) }}</span>
        </div>
      </div>

      <p class="mt-3 text-[11px] text-neutral-500">
        来源：<code>{{ g.file }}</code>（{{ g.visionVersion }} · {{ v.status }}）
      </p>
    </div>

    <!-- 从当前走到终态 -->
    <div class="neo-card">
      <h3 class="mb-3 flex items-center gap-2 text-lg font-black">
        <PhCaretRight :size="18" weight="bold" class="shrink-0" />
        从当前走到终态
      </h3>
      <div class="grid gap-3 lg:grid-cols-3">
        <!-- 现在 -->
        <div class="rounded-lg border-2 border-black bg-neo-green/30 p-3 shadow-neo-sm">
          <span class="text-xs font-black tracking-widest">现在 · 有什么</span>
          <div class="mt-1.5 flex items-baseline gap-2">
            <span class="font-mono text-xl font-black">{{ liveRow?.version }}</span>
            <span class="text-sm font-black">{{ liveRow?.theme }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-700">{{ liveRow?.desc }}</p>
          <button class="neo-btn mt-2 text-xs" @click="emit('go', 'overview')">
            看产品概览
            <PhArrowRight :size="12" weight="bold" />
          </button>
        </div>

        <!-- 差什么 -->
        <div class="rounded-lg border-2 border-black bg-neo-pink/30 p-3 shadow-neo-sm">
          <span class="text-xs font-black tracking-widest">差距 · 缺什么</span>
          <div class="mt-1.5 flex flex-col gap-1.5">
            <div v-for="(r, i) in gaps" :key="i" class="flex items-start gap-1.5 text-xs">
              <PhWarning :size="12" weight="bold" class="mt-0.5 shrink-0" />
              <span class="leading-relaxed"><b class="font-black">{{ r['问题'] }}</b>：{{ r['说明'] }}</span>
            </div>
            <span v-if="!gaps.length" class="text-xs text-neutral-500">概览里暂无高优先级问题</span>
          </div>
        </div>

        <!-- 下一步 -->
        <div class="rounded-lg border-2 border-black bg-neo-yellow/50 p-3 shadow-neo-sm">
          <span class="text-xs font-black tracking-widest">下一步 · 做什么</span>
          <div class="mt-1.5 flex items-baseline gap-2">
            <span class="font-mono text-xl font-black">{{ iterRow?.version }}</span>
            <span class="text-sm font-black">{{ iterRow?.theme }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-700">{{ iterRow?.desc }}</p>
          <button class="neo-btn mt-2 text-xs" @click="emit('go', 'roadmap')">
            看版本卡
            <PhArrowRight :size="12" weight="bold" />
          </button>
        </div>
      </div>
    </div>

    <!-- 关键问题 -->
    <div v-if="g.keyQuestions.length" class="neo-card">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-lg font-black">
          <PhCrosshair :size="18" weight="bold" class="shrink-0" />
          关键问题：答不出就不开工
        </h3>
        <span class="neo-chip status-creating">{{ answered }} / {{ total }} 已答</span>
      </div>
      <div class="flex flex-col gap-2">
        <div
          v-for="(q, i) in g.keyQuestions"
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
      <p class="mt-3 text-[11px] text-neutral-500">来源：<code>{{ g.kqFile }}</code></p>
    </div>

    <!-- 定位结论 -->
    <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div v-if="g.decisions.length" class="neo-card">
        <h3 class="mb-3 flex items-center gap-2 text-lg font-black">
          <PhHeart :size="18" weight="bold" class="shrink-0" />
          定位结论（竞品选项问答收口）
        </h3>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="(d, i) in g.decisions"
            :key="i"
            class="flex items-start gap-3 rounded-lg border-2 border-black bg-white p-2.5 text-sm shadow-neo-sm"
          >
            <span class="w-24 shrink-0 font-black">{{ d['题'] }}</span>
            <span class="min-w-0 leading-relaxed text-neutral-700">{{ d['答案'] }}</span>
          </div>
        </div>
      </div>

      <div v-if="g.tensions.length" class="neo-card">
        <h3 class="mb-3 flex items-center gap-2 text-lg font-black">
          <PhWarning :size="18" weight="bold" class="shrink-0" />
          遗留张力
        </h3>
        <div class="flex flex-col gap-2">
          <div
            v-for="(t, i) in g.tensions"
            :key="i"
            class="rounded-lg border-2 border-dashed border-black p-2.5 text-xs leading-relaxed"
          >
            {{ t }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
