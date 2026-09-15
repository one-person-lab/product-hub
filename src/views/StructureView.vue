<script setup lang="ts">
import { computed, ref } from 'vue'
import { narrative, flows, LAYER_DESC, type Space } from '../data/store'
import MermaidBlock from '../components/MermaidBlock.vue'
import { PhGraph, PhArrowRight, PhRobot, PhProhibit, PhRows } from '@phosphor-icons/vue'

const n = narrative
const hoverStep = ref<number | null>(null)
const activeFlow = ref(0)
const showFlows = ref(false)

/** 按 layer 分组，保持原文出现顺序 */
const layers = computed(() => {
  if (!n) return []
  const order: string[] = []
  const map: Record<string, Space[]> = {}
  for (const s of n.spaces) {
    if (!(s.layer in map)) {
      order.push(s.layer)
      map[s.layer] = []
    }
    map[s.layer].push(s)
  }
  return order.map((l) => ({ layer: l, spaces: map[l] }))
})

const highlightedSpaces = computed(() => {
  if (hoverStep.value === null || !n) return new Set<string>()
  const step = n.loop[hoverStep.value]
  if (!step) return new Set<string>()
  return new Set(n.spaces.filter((s) => step.where.includes(s.name)).map((s) => s.name))
})

const AI_CLASS: Record<string, string> = {
  理解: 'status-creating',
  连接: 'status-ready',
  反馈: 'status-published',
}

function spaceCardClass(layer: string) {
  return layer.includes('理解') ? 'layer-kernel' : 'layer-action'
}

const currentFlow = computed(() => flows[activeFlow.value] || null)
</script>

<template>
  <div v-if="!n" class="neo-card">
    <h2 class="text-2xl font-black">未找到产品叙事</h2>
    <p class="mt-2 text-sm text-neutral-500">请先在 content/产品叙事/ 下放置产品叙事 md。</p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <!-- 空间结构 -->
    <div class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhRows :size="22" weight="bold" class="shrink-0" />
        产品结构
      </h2>
      <p class="mt-1 text-sm text-neutral-500">
        按「层级」分组的产品模块——解析自产品概览的「产品结构」表，在文档里改，这里跟着变。
      </p>

      <div class="mt-4 flex flex-col gap-3">
        <div v-for="g in layers" :key="g.layer" class="rounded-xl border-2 border-neutral-400 bg-white p-3">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-black">{{ g.layer }}</span>
            <span class="text-[11px] text-neutral-500">{{ LAYER_DESC[g.layer] || '' }}</span>
          </div>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="s in g.spaces"
              :key="s.name"
              class="min-w-[11rem] flex-1 rounded-lg border-2 border-black p-3 shadow-neo-sm transition-transform"
              :class="[
                spaceCardClass(s.layer),
                highlightedSpaces.size && highlightedSpaces.has(s.name) ? '-translate-y-1 ring-4 ring-black/20' : '',
                highlightedSpaces.size && !highlightedSpaces.has(s.name) ? 'opacity-35' : '',
              ]"
            >
              <div class="text-base font-black">{{ s.name }}</div>
              <div class="mt-0.5 text-xs font-bold text-neutral-600">{{ s.question }}</div>
              <p class="mt-1.5 text-xs leading-relaxed text-neutral-600">{{ s.desc }}</p>
            </div>
          </div>
        </div>

        <!-- 底座 -->
        <div
          v-if="n.model.length"
          class="rounded-xl border-2 border-dashed border-black bg-white p-3"
          :class="highlightedSpaces.size ? 'opacity-35' : ''"
        >
          <div class="mb-1.5 text-xs font-black">个人长期模型 · 所有空间的共同底座</div>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="m in n.model" :key="m" class="neo-chip !bg-neo-blue">{{ m }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 核心闭环 -->
    <div class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhGraph :size="22" weight="bold" class="shrink-0" />
        核心闭环
      </h2>
      <p class="mt-1 text-sm text-neutral-500">
        闭环的每一步落在哪个模块——鼠标移到某一步，上方对应模块会高亮。
      </p>

      <div class="mt-4 flex flex-col gap-2">
        <div
          v-for="(s, i) in n.loop"
          :key="i"
          class="flex items-start gap-3 rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm transition-colors"
          :class="hoverStep === i ? 'bg-neo-yellow/60' : ''"
          @mouseenter="hoverStep = i"
          @mouseleave="hoverStep = null"
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
              <span v-for="sp in s.where.split('·').map((x) => x.trim())" :key="sp" class="neo-chip !px-1.5 !py-0 text-[10px]">
                {{ sp }}
              </span>
            </div>
            <p class="mt-1 text-sm text-neutral-600">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- AI 边界 -->
    <div v-if="n.aiBoundary.length" class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhRobot :size="22" weight="bold" class="shrink-0" />
        AI 的介入边界
      </h2>
      <p class="mt-1 text-sm text-neutral-500">AI 只出现在三个位置，且每处都明确"不做什么"。</p>
      <div class="mt-3 grid grid-cols-3 gap-3">
        <div
          v-for="(row, i) in n.aiBoundary"
          :key="i"
          class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm"
        >
          <span class="neo-chip" :class="AI_CLASS[row['位置']] || 'status-not-start'">{{ row['位置'] }}</span>
          <p class="mt-2 text-sm font-bold">{{ row['AI 做什么'] }}</p>
          <p class="mt-2 border-t-2 border-dashed border-neutral-300 pt-2 text-xs text-neutral-500">
            不做：{{ row['AI 不做什么'] }}
          </p>
        </div>
      </div>
    </div>

    <!-- 产品边界 -->
    <div v-if="n.boundaries.length" class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhProhibit :size="22" weight="bold" class="shrink-0" />
        明确不做
      </h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <span v-for="b in n.boundaries" :key="b" class="neo-chip !bg-neo-pink/50 line-through">{{ b }}</span>
      </div>
      <p v-if="n.boundaryReason" class="mt-3 text-sm text-neutral-500">{{ n.boundaryReason }}</p>
    </div>

    <!-- 文档中已有的流程图 -->
    <div class="neo-card">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-2xl font-black">
          <PhGraph :size="22" weight="bold" class="shrink-0" />
          文档里的流程图
        </h2>
        <button class="neo-btn" @click="showFlows = !showFlows">
          {{ showFlows ? '收起' : `展开 ${flows.length} 张` }}
        </button>
      </div>
      <p class="mt-1 text-sm text-neutral-500">
        直接解析 文档仓库 里已写好的 mermaid 代码块——在文档里改图，这里跟着变。
      </p>

      <template v-if="showFlows && flows.length">
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="(f, i) in flows"
            :key="f.id"
            class="neo-btn text-xs"
            :class="activeFlow === i ? 'neo-btn-primary' : ''"
            @click="activeFlow = i"
          >
            {{ f.name }}
          </button>
        </div>
        <div v-if="currentFlow" class="mt-3">
          <p class="mb-2 text-[11px] text-neutral-500">来源：{{ currentFlow.file }}</p>
          <MermaidBlock :id="currentFlow.id" :code="currentFlow.code" />
        </div>
      </template>
      <p v-else-if="showFlows" class="mt-3 text-sm text-neutral-400">文档仓库 里还没有 mermaid 流程块。</p>
    </div>
  </div>
</template>
