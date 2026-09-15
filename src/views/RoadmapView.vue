<script setup lang="ts">
import { computed } from 'vue'
import {
  PhFlag,
  PhCheckCircle,
  PhCaretRight,
  PhGitCommit,
  PhTrophy,
  PhGameController,
  PhHammer,
  PhArrowsClockwise,
} from '@phosphor-icons/vue'
import {
  attack,
  timeline,
  versions,
  TIER_META,
  TIMELINE_KIND_CLASS,
  type AttackItem,
} from '../data/store'

const emit = defineEmits<{ (e: 'go', view: string): void }>()

/** 版本三层：终态目标 / 当前版本 / 迭代版本 —— 图标与底色按层级固定 */
const TIER_STYLE: Record<string, { icon: unknown; cls: string; chip: string }> = {
  终态目标: { icon: PhTrophy, cls: 'bg-neo-purple/40', chip: 'status-published' },
  当前版本: { icon: PhGameController, cls: 'bg-neo-green/40', chip: 'status-ready' },
  迭代版本: { icon: PhHammer, cls: 'bg-neo-yellow/50', chip: 'status-creating' },
}
const tierStyle = (tier: string) =>
  TIER_STYLE[tier] || { icon: PhFlag, cls: 'bg-white', chip: 'status-not-start' }

const columns = computed(() => {
  const cols: { tier: string; label: string; items: AttackItem[] }[] = []
  for (const tier of ['P0', 'P1', 'P2']) {
    cols.push({
      tier,
      label: TIER_META[tier]?.col || tier,
      items: attack.items.filter((it) => it.tier === tier),
    })
  }
  return cols
})

const itemState = (it: AttackItem) =>
  it.total > 0 && it.done === it.total ? 'done' : it.done > 0 ? 'doing' : 'todo'

const STATE_META: Record<string, { label: string; chip: string }> = {
  done: { label: '已完成', chip: 'status-ready' },
  doing: { label: '进行中', chip: 'status-creating' },
  todo: { label: '待开始', chip: '!bg-neutral-100 !border-neutral-300 text-neutral-500' },
}

const nextAction = (it: AttackItem) => it.actions.find((a) => !a.done)?.text || ''
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 说明条 -->
    <div class="neo-card">
      <div class="flex flex-wrap items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-green text-black"
        >
          <PhFlag :size="20" weight="bold" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-black">推进路线</h2>
          <p class="mt-1 text-sm leading-relaxed text-neutral-600">
            版本只有三层：<b>终态目标 / 当前版本 / 迭代版本</b>（见
            <code>content/迭代流程/版本管理.md</code>，当前版本号自动读 App 的 manifest.json）。
            下方三列是需求攻坚的 P0 / P1 / P2——<b>改
            <code>content/需求攻坚/需求攻坚.md</code> 就是改计划</b>，勾选框即进度，不引入第二套任务系统。
          </p>
        </div>
        <button class="neo-btn text-xs" @click="emit('go', 'attack')">
          查看完整攻坚卡
          <PhCaretRight :size="13" weight="bold" />
        </button>
      </div>
    </div>

    <!-- 版本管理：终态目标 / 当前版本 / 迭代版本 -->
    <div v-if="versions.rows.length" class="flex flex-col gap-3">
      <div class="grid gap-3 lg:grid-cols-3">
        <div
          v-for="r in versions.rows"
          :key="r.tier"
          class="flex flex-col rounded-lg border-2 border-black p-3 shadow-neo-sm"
          :class="tierStyle(r.tier).cls"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 text-xs font-black tracking-widest">
              <component :is="tierStyle(r.tier).icon" :size="14" weight="bold" class="shrink-0" />
              {{ r.tier }}
            </span>
            <span class="neo-chip !px-1.5 !py-0 text-[10px]" :class="tierStyle(r.tier).chip">
              {{ r.live ? 'App 实况' : '规划' }}
            </span>
          </div>

          <div class="mt-2 flex items-baseline gap-2">
            <span class="font-mono text-2xl font-black leading-none">{{ r.version }}</span>
            <span class="text-sm font-black">{{ r.theme }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-neutral-700">{{ r.desc }}</p>

          <div class="mt-auto pt-2">
            <p class="text-[11px] text-neutral-600">
              <b class="font-black">出口：</b>{{ r.exit }}
            </p>
            <p
              v-if="r.live && versions.versionCode"
              class="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500"
            >
              <PhArrowsClockwise :size="11" weight="bold" class="shrink-0" />
              自动同步 客户端仓库/manifest.json · versionCode {{ versions.versionCode }}
            </p>
          </div>
        </div>
      </div>

      <!-- 版本卡：开工前必须填全的五项 -->
      <div v-if="versions.card.length" class="rounded-lg border-2 border-dashed border-black bg-white p-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="text-xs font-black tracking-widest">版本卡 · 下一版开工前必须填全</span>
          <span class="neo-chip !px-1.5 !py-0 text-[10px] !bg-neutral-100 text-neutral-500">
            填不全不许开工
          </span>
        </div>
        <div class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="c in versions.card"
            :key="c.key"
            class="rounded-md border-2 border-black bg-white p-2 text-xs"
          >
            <span class="font-black">{{ c.key }}</span>
            <p class="mt-0.5 leading-relaxed text-neutral-600">{{ c.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 三列路线图 -->
    <div class="grid gap-3 lg:grid-cols-3">
      <div v-for="col in columns" :key="col.tier" class="flex flex-col gap-2.5">
        <div
          class="flex items-center justify-between rounded-lg border-2 border-black px-3 py-2 shadow-neo-sm"
          :class="col.tier === 'P0' ? 'bg-neo-pink/70' : col.tier === 'P1' ? 'bg-neo-yellow/70' : 'bg-white'"
        >
          <span class="text-sm font-black tracking-widest">{{ col.label }}</span>
          <span class="text-xs font-bold text-neutral-600">{{ col.items.length }} 项</span>
        </div>

        <div
          v-for="it in col.items"
          :key="it.title"
          class="rounded-lg border-2 border-black bg-white p-3"
          :class="itemState(it) === 'done' ? 'opacity-60' : ''"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="text-sm font-black leading-snug">{{ it.title }}</span>
            <span class="neo-chip !shrink-0 !px-1.5 !py-0 text-[10px]" :class="STATE_META[itemState(it)].chip">
              {{ STATE_META[itemState(it)].label }}
            </span>
          </div>

          <!-- 进度条 -->
          <div v-if="it.total" class="mt-2 flex items-center gap-1">
            <div
              v-for="(a, ai) in it.actions"
              :key="ai"
              class="h-2 flex-1 rounded-[2px] border border-black"
              :class="a.done ? 'bg-neo-green' : 'bg-white'"
              :title="a.text"
            />
            <span class="ml-1 shrink-0 text-[10px] font-bold tabular-nums text-neutral-500">
              {{ it.done }}/{{ it.total }}
            </span>
          </div>

          <p v-if="itemState(it) !== 'done'" class="mt-2 flex items-start gap-1 text-xs leading-relaxed text-neutral-600">
            <PhCaretRight :size="12" weight="bold" class="mt-0.5 shrink-0" />
            {{ nextAction(it) || it.problem }}
          </p>
          <p v-else class="mt-2 flex items-center gap-1 text-xs font-bold text-neutral-500">
            <PhCheckCircle :size="12" weight="bold" /> 验收通过
          </p>
        </div>

        <div
          v-if="!col.items.length"
          class="rounded-lg border-2 border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-400"
        >
          空
        </div>
      </div>
    </div>

    <!-- 版本时间线 -->
    <div class="neo-card">
      <div class="flex items-center gap-2">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-purple text-black"
        >
          <PhGitCommit :size="16" weight="bold" />
        </span>
        <h3 class="text-lg font-black">版本时间线</h3>
        <span class="text-xs font-bold text-neutral-400">已发生的节点；未来在上方三列里</span>
      </div>

      <div class="mt-4 flex flex-col">
        <div
          v-for="(e, i) in timeline"
          :key="e.date + e.title"
          class="relative flex gap-3 pb-4 last:pb-0"
        >
          <!-- 竖线 -->
          <div
            v-if="i < timeline.length - 1"
            class="absolute left-[7px] top-4 h-full w-0.5 border-l-2 border-dashed border-neutral-300"
          />
          <!-- 节点 -->
          <span
            class="z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-black"
            :class="TIMELINE_KIND_CLASS[e.kind] || 'bg-white'"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline gap-2">
              <span class="font-mono text-xs font-bold text-neutral-500">{{ e.date }}</span>
              <span class="text-sm font-black">{{ e.title }}</span>
              <span
                class="neo-chip !px-1.5 !py-0 text-[10px]"
                :class="TIMELINE_KIND_CLASS[e.kind] ? '' : '!bg-neutral-100'"
              >
                {{ e.kind }}
              </span>
            </div>
            <p v-if="e.desc" class="mt-0.5 text-xs leading-relaxed text-neutral-600">{{ e.desc }}</p>
          </div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap gap-1.5 border-t-2 border-dashed border-neutral-300 pt-3">
        <span class="text-[11px] font-bold text-neutral-500">图例：</span>
        <span
          v-for="(cls, kind) in TIMELINE_KIND_CLASS"
          :key="kind"
          class="flex items-center gap-1 text-[11px] text-neutral-500"
        >
          <span class="h-2.5 w-2.5 rounded-full border-2 border-black" :class="cls" />
          {{ kind }}
        </span>
      </div>
    </div>
  </div>
</template>
