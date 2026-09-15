<script setup lang="ts">
import { computed, ref } from 'vue'
import { identities, identityTypeLabel } from '../data/store'
import { PhSparkle, PhMagnifyingGlass, PhInfo, PhWarning } from '@phosphor-icons/vue'

const q = ref('')
const typeFilter = ref('all')
const detail = ref<number | null>(null)

const types = computed(() => {
  const set = new Set(identities.map((i) => identityTypeLabel(i.type)))
  return ['all', ...set]
})

const list = computed(() =>
  identities.filter((i) => {
    const okType = typeFilter.value === 'all' || identityTypeLabel(i.type) === typeFilter.value
    const okQ =
      !q.value ||
      [i.name, i.subtitle, i.goal, i.shortName].join(' ').toLowerCase().includes(q.value.toLowerCase())
    return okType && okQ
  }),
)

const active = computed(() => (detail.value === null ? null : identities[detail.value] || null))

const stats = computed(() => ({
  total: identities.length,
  withDeposit: identities.filter((i) => i.deposit !== null).length,
  pains: identities.reduce((s, i) => s + i.painCount, 0),
  chars: identities.reduce((s, i) => s + i.chars, 0),
  legacy: identities.filter((i) => i.legacy),
}))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhSparkle :size="22" weight="bold" class="shrink-0" />
        身份资产
      </h2>
      <p class="mt-1 text-sm text-neutral-500">
        来自 <code>文档仓库/03-产品内容/身份挑战/</code>。
        新叙事 里"21 天挑战"退场了，但这 {{ stats.total }} 个身份是现成的内容资产——可以整体迁进「探索」空间当发现流的内容。
      </p>

      <div class="mt-4 grid grid-cols-4 gap-3">
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">身份数</div>
          <div class="text-3xl font-black">{{ stats.total }}</div>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">含承诺金设置</div>
          <div class="text-3xl font-black">{{ stats.withDeposit }}</div>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">痛点条目</div>
          <div class="text-3xl font-black">{{ stats.pains }}</div>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">内容体量</div>
          <div class="text-3xl font-black">{{ (stats.chars / 1000).toFixed(1) }}k</div>
        </div>
      </div>

      <p
        v-if="stats.legacy.length"
        class="mt-3 flex items-start gap-2 rounded-lg border-2 border-black bg-neo-pink/40 px-3 py-2 text-xs font-bold"
      >
        <PhWarning :size="14" weight="bold" class="mt-0.5 shrink-0" />
        <span>
          {{ stats.legacy.length }} 份是老格式（只有 Day 任务表，没有挑战概览/副标题/痛点）：
          {{ stats.legacy.map((i) => i.name).join('、') }}。
          新叙事 要把它们迁进「探索」空间前，得先补齐内容结构。
        </span>
      </p>
    </div>

    <div class="neo-card">
      <div class="flex flex-wrap items-center gap-2">
        <label class="neo-input flex flex-1 items-center gap-2 py-1.5!">
          <PhMagnifyingGlass :size="15" weight="bold" class="shrink-0 text-neutral-400" />
          <input v-model="q" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜身份、目标、副标题…" />
        </label>
        <button
          v-for="t in types"
          :key="t"
          class="neo-btn text-xs"
          :class="typeFilter === t ? 'neo-btn-primary' : ''"
          @click="typeFilter = t"
        >
          {{ t === 'all' ? '全部' : t }}
        </button>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-3">
        <button
          v-for="i in list"
          :key="i.id"
          class="rounded-lg border-2 border-black bg-white p-3 text-left shadow-neo-sm transition-transform hover:-translate-y-0.5"
          @click="detail = identities.indexOf(i)"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="font-black leading-tight">{{ i.name }}</span>
            <span
              class="neo-chip !shrink-0 !px-1.5 !py-0 text-[10px]"
              :class="i.legacy ? '!bg-neutral-100 text-neutral-400' : 'status-ready'"
            >
              {{ i.legacy ? '老格式' : identityTypeLabel(i.type) }}
            </span>
          </div>
          <p class="mt-1 line-clamp-1 text-xs text-neutral-500">{{ i.subtitle || '（无副标题）' }}</p>
          <p class="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">{{ i.goal || '（无身份目标）' }}</p>
          <div class="mt-2 flex items-center gap-1.5 border-t-2 border-dashed border-neutral-300 pt-2">
            <span class="neo-chip !px-1.5 !py-0 text-[10px]">{{ i.cycle || '未设周期' }}</span>
            <span v-if="i.legacy && i.taskRows" class="neo-chip !px-1.5 !py-0 text-[10px]">
              {{ i.taskRows }} 天任务
            </span>
            <span v-if="i.deposit !== null" class="neo-chip !px-1.5 !py-0 text-[10px] status-creating">
              ¥{{ i.deposit }}
            </span>
            <span v-else class="neo-chip !px-1.5 !py-0 text-[10px] !bg-neutral-100 text-neutral-400">
              无承诺金
            </span>
          </div>
        </button>
      </div>
      <p v-if="!list.length" class="py-8 text-center text-sm text-neutral-400">没有匹配的身份。</p>
    </div>

    <!-- 详情抽屉 -->
    <div v-if="active" class="neo-card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-black">{{ active.name }}</h3>
          <p class="mt-0.5 text-sm text-neutral-500">{{ active.subtitle || '（无副标题）' }}</p>
        </div>
        <button class="neo-btn text-xs" @click="detail = null">关闭</button>
      </div>

      <p
        v-if="active.legacy"
        class="mt-3 flex items-start gap-2 rounded-lg border-2 border-black bg-neutral-100 px-3 py-2 text-xs font-bold"
      >
        <PhInfo :size="14" weight="bold" class="mt-0.5 shrink-0" />
        老格式文档：只有 {{ active.taskRows }} 天的任务表，没有挑战概览、副标题、痛点与承诺金设置。
      </p>

      <div class="mt-3 flex flex-wrap gap-1.5">
        <span v-if="active.shortName" class="neo-chip">首页短名：{{ active.shortName }}</span>
        <span class="neo-chip">{{ identityTypeLabel(active.type) }}</span>
        <span v-if="active.cycle" class="neo-chip">{{ active.cycle }}</span>
        <span v-if="active.deposit !== null" class="neo-chip status-creating">{{ active.depositRaw }}</span>
      </div>

      <p v-if="active.goal" class="mt-3 border-l-4 border-black pl-3 text-sm font-bold">{{ active.goal }}</p>

      <div v-if="active.intro.length" class="mt-3 rounded-lg border-2 border-black bg-neo-paper p-3">
        <div class="mb-1 text-xs font-black text-neutral-500">开场文案</div>
        <p v-for="(l, i) in active.intro" :key="i" class="text-sm leading-relaxed">{{ l }}</p>
      </div>

      <div v-if="active.pains.length" class="mt-3">
        <div class="mb-1.5 text-xs font-black text-neutral-500">痛点共鸣（前 {{ active.pains.length }} 条）</div>
        <ul class="flex flex-col gap-1">
          <li v-for="(p, i) in active.pains" :key="i" class="flex gap-2 text-sm">
            <span class="font-black text-neutral-400">{{ i + 1 }}</span>
            <span>{{ p }}</span>
          </li>
        </ul>
      </div>

      <p class="mt-3 flex items-start gap-1.5 border-t-2 border-dashed border-neutral-300 pt-3 text-[11px] text-neutral-500">
        <PhInfo :size="13" weight="bold" class="mt-0.5 shrink-0" />
        完整内容（收获、案例、21 天行动链路）见 <code>{{ active.file }}</code>。
      </p>
    </div>
  </div>
</template>
