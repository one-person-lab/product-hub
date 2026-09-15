<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PhListChecks,
  PhCaretRight,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'
import {
  backlog,
  BACKLOG_STATUS_META,
  BACKLOG_PRIORITY_META,
  type BacklogItem,
} from '../data/store'

const emit = defineEmits<{ (e: 'go', view: string): void }>()

/** 流程顺序：需求在池子里的推进路径 */
const FLOW = ['待评估', '已规划', '开发中', '已上线']
const PARKED = '已搁置'

const statusFilter = ref('')
const scopeFilter = ref('')
const keyword = ref('')
const expanded = ref('')

const items = computed<BacklogItem[]>(() => backlog.items)
const total = computed(() => items.value.length)
const countByStatus = (s: string) => items.value.filter((i) => i.status === s).length
const launched = computed(() => countByStatus('已上线'))
const pending = computed(() => countByStatus('待评估') + countByStatus('已规划') + countByStatus('开发中'))
const percent = computed(() => (total.value ? Math.round((launched.value / total.value) * 100) : 0))

const filtered = computed(() =>
  items.value.filter((it) => {
    if (statusFilter.value && it.status !== statusFilter.value) return false
    if (scopeFilter.value && it.domain !== scopeFilter.value && it.module !== scopeFilter.value) return false
    const k = keyword.value.trim().toLowerCase()
    if (k && !`${it.id} ${it.title} ${it.domain} ${it.module} ${it.desc}`.toLowerCase().includes(k)) return false
    return true
  })
)

const toggle = (id: string) => (expanded.value = expanded.value === id ? '' : id)
const chipOf = (s: string) => BACKLOG_STATUS_META[s]?.chip || 'status-not-start'
const prioOf = (p: string) => BACKLOG_PRIORITY_META[p] || 'status-not-start'
</script>

<template>
  <div v-if="!total" class="neo-card">
    <h2 class="text-2xl font-black">需求池是空的</h2>
    <p class="mt-2 text-sm text-neutral-500">
      在 <code>content/需求池/</code> 下新建 md，用 <code>## REQ-101 · 标题</code> 开一个小节即可。
    </p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <!-- 概览 + 状态流程 -->
    <div class="neo-card">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 class="flex items-center gap-2 text-xl font-black">
            <PhListChecks :size="20" weight="bold" class="shrink-0" />
            需求池
          </h2>
          <p class="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-600">
            产品全部功能与需求的唯一清单。状态写在
            <code>content/需求池/需求池.md</code> 的字段里，<b>改 md 就是改这里</b>；
            上线的不删除，所以这份清单同时是产品的功能地图。
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <span class="neo-chip status-published">已上线 {{ launched }} / {{ total }}（{{ percent }}%）</span>
          <span class="neo-chip !bg-white">待推进 {{ pending }}</span>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-neutral-300 pt-4">
        <template v-for="(s, i) in FLOW" :key="s">
          <button
            class="flex min-w-[104px] flex-col items-start gap-1 rounded-lg border-2 px-3 py-2 text-left transition-colors"
            :class="
              statusFilter === s
                ? 'border-black bg-white shadow-neo-sm'
                : 'border-black/20 hover:border-black hover:bg-white/60'
            "
            @click="statusFilter = statusFilter === s ? '' : s"
          >
            <span class="neo-chip !px-1.5 !py-0 text-[10px]" :class="chipOf(s)">{{ s }}</span>
            <span class="text-2xl font-black leading-none">{{ countByStatus(s) }}</span>
            <span class="text-[11px] text-neutral-500">{{ BACKLOG_STATUS_META[s].hint }}</span>
          </button>
          <PhCaretRight v-if="i < FLOW.length - 1" :size="14" weight="bold" class="shrink-0 text-neutral-400" />
        </template>

        <span class="mx-1 h-10 w-0.5 shrink-0 bg-neutral-300" />

        <button
          class="flex min-w-[104px] flex-col items-start gap-1 rounded-lg border-2 border-dashed px-3 py-2 text-left transition-colors"
          :class="
            statusFilter === PARKED
              ? 'border-black bg-white shadow-neo-sm'
              : 'border-neutral-400 hover:border-black hover:bg-white/60'
          "
          @click="statusFilter = statusFilter === PARKED ? '' : PARKED"
        >
          <span class="neo-chip !px-1.5 !py-0 text-[10px]" :class="chipOf(PARKED)">{{ PARKED }}</span>
          <span class="text-2xl font-black leading-none text-neutral-500">{{ countByStatus(PARKED) }}</span>
          <span class="text-[11px] text-neutral-500">{{ BACKLOG_STATUS_META[PARKED].hint }}</span>
        </button>
      </div>
    </div>

    <!-- 左树 + 右表 -->
    <div class="grid gap-4 lg:grid-cols-[236px_1fr]">
      <div class="neo-card !p-3">
        <div class="mb-2 flex items-center justify-between px-1">
          <span class="text-xs font-black tracking-widest text-neutral-500">产品域</span>
          <span class="text-[11px] text-neutral-400">{{ backlog.tree.length }} 个域</span>
        </div>

        <button
          class="flex w-full items-center justify-between rounded-[6px] border-2 px-2 py-1.5 text-left text-sm transition-colors"
          :class="
            !scopeFilter
              ? 'border-black bg-white font-black shadow-neo-sm'
              : 'border-transparent font-bold hover:bg-neo-purple/40'
          "
          @click="scopeFilter = ''"
        >
          <span>全部需求</span>
          <span class="text-xs text-neutral-500">{{ total }}</span>
        </button>

        <div v-for="d in backlog.tree" :key="d.name" class="mt-0.5">
          <button
            class="flex w-full items-center justify-between rounded-[6px] border-2 px-2 py-1.5 text-left text-sm transition-colors"
            :class="
              scopeFilter === d.name
                ? 'border-black bg-white font-black shadow-neo-sm'
                : 'border-transparent font-bold hover:bg-neo-purple/40'
            "
            @click="scopeFilter = scopeFilter === d.name ? '' : d.name"
          >
            <span class="truncate">{{ d.name }}</span>
            <span class="shrink-0 text-xs text-neutral-500">{{ d.count }}</span>
          </button>
          <div class="ml-3 border-l-2 border-dashed border-neutral-300 pl-1.5">
            <button
              v-for="m in d.modules"
              :key="m.name"
              class="flex w-full items-center justify-between rounded-[6px] border-2 px-2 py-1 text-left text-[13px] transition-colors"
              :class="
                scopeFilter === m.name
                  ? 'border-black bg-neo-yellow/60 font-black shadow-neo-sm'
                  : 'border-transparent font-bold text-neutral-600 hover:bg-neo-yellow/40'
              "
              @click="scopeFilter = scopeFilter === m.name ? '' : m.name"
            >
              <span class="truncate">{{ m.name }}</span>
              <span class="shrink-0 text-[11px] text-neutral-400">{{ m.count }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="neo-card flex flex-col !p-0">
        <div class="flex items-center gap-2 border-b-2 border-black px-3 py-2">
          <PhMagnifyingGlass :size="14" weight="bold" class="shrink-0" />
          <input
            v-model="keyword"
            class="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="搜索编号 / 标题 / 描述…"
          />
          <button
            v-if="statusFilter || scopeFilter || keyword"
            class="shrink-0 text-[11px] font-bold underline"
            @click="((statusFilter = ''), (scopeFilter = ''), (keyword = ''))"
          >
            清除筛选
          </button>
          <span class="shrink-0 text-xs text-neutral-500">{{ filtered.length }} 条</span>
        </div>

        <div class="grid grid-cols-[68px_1fr_84px_52px_74px] gap-2 border-b-2 border-black bg-neo-purple/30 px-3 py-2 text-xs font-black">
          <span>编号</span>
          <span>需求</span>
          <span>状态</span>
          <span>优先级</span>
          <span>版本</span>
        </div>

        <div class="max-h-[760px] overflow-auto">
          <div v-for="it in filtered" :key="it.id">
            <button
              class="grid w-full grid-cols-[68px_1fr_84px_52px_74px] items-center gap-2 border-b border-dashed border-neutral-300 px-3 py-2 text-left transition-colors hover:bg-neo-purple/20"
              :class="expanded === it.id ? 'bg-neo-purple/25' : ''"
              @click="toggle(it.id)"
            >
              <span class="font-mono text-xs font-bold text-neutral-500">{{ it.id }}</span>
              <span class="min-w-0 truncate text-sm font-bold">{{ it.title }}</span>
              <span class="neo-chip !px-1.5 !py-0 justify-center text-[10px]" :class="chipOf(it.status)">
                {{ it.status }}
              </span>
              <span class="neo-chip !px-1.5 !py-0 justify-center text-[10px]" :class="prioOf(it.priority)">
                {{ it.priority }}
              </span>
              <span class="truncate font-mono text-[11px] text-neutral-500">{{ it.version }}</span>
            </button>

            <div v-if="expanded === it.id" class="border-b-2 border-black bg-white px-3 py-3">
              <div class="grid gap-2 lg:grid-cols-2">
                <div class="rounded-lg border-2 border-black p-2.5">
                  <span class="text-[11px] font-black tracking-widest text-neutral-500">描述</span>
                  <p class="mt-1 text-sm leading-relaxed">{{ it.desc || '—' }}</p>
                </div>
                <div class="rounded-lg border-2 border-black p-2.5">
                  <span class="text-[11px] font-black tracking-widest text-neutral-500">验收</span>
                  <p class="mt-1 text-sm leading-relaxed">{{ it.acceptance || '—' }}</p>
                </div>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="neo-chip !bg-neo-purple/40">{{ it.domain }}</span>
                <span class="neo-chip !bg-white">{{ it.module }}</span>
                <span class="text-[11px] text-neutral-500">来源：{{ it.source }}</span>
                <span v-if="it.source.includes('需求攻坚')" class="ml-auto">
                  <button class="neo-btn !py-0.5 text-[11px]" @click="emit('go', 'attack')">
                    看问题原文
                  </button>
                </span>
                <span v-else-if="it.source.includes('竞品')" class="ml-auto">
                  <button class="neo-btn !py-0.5 text-[11px]" @click="emit('go', 'competitors')">
                    看竞品证据
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div v-if="!filtered.length" class="px-3 py-8 text-center text-sm text-neutral-500">
            没有符合条件的需求
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
