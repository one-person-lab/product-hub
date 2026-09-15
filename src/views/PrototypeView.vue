<script setup lang="ts">
import { computed, ref } from 'vue'
import { prototypes } from '../data/store'
import { PhDeviceMobile, PhWarning, PhArrowSquareOut, PhSelection } from '@phosphor-icons/vue'

const preview = ref<string | null>(null)
const filter = ref('all')

const groups = computed(() => {
  const order: string[] = []
  const map: Record<string, typeof prototypes> = {}
  for (const p of prototypes) {
    if (!(p.group in map)) {
      order.push(p.group)
      map[p.group] = []
    }
    map[p.group].push(p)
  }
  return order.map((k) => ({
    key: k,
    label: map[k][0].groupLabel,
    note: map[k][0].note,
    items: map[k],
  }))
})

const visible = computed(() =>
  filter.value === 'all' ? groups.value : groups.value.filter((g) => g.key === filter.value),
)

const active = computed(() => prototypes.find((p) => p.url === preview.value) || null)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhDeviceMobile :size="22" weight="bold" class="shrink-0" />
        原型库
      </h2>
      <p class="mt-1 text-sm text-neutral-500">
        直接内嵌 文档仓库 里的 HTML 原型，不复制文件、不另存副本——原型改完刷新即可看到。
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button class="neo-btn text-xs" :class="filter === 'all' ? 'neo-btn-primary' : ''" @click="filter = 'all'">
          全部 {{ prototypes.length }}
        </button>
        <button
          v-for="g in groups"
          :key="g.key"
          class="neo-btn text-xs"
          :class="filter === g.key ? 'neo-btn-primary' : ''"
          @click="filter = g.key"
        >
          {{ g.label }} {{ g.items.length }}
        </button>
        <span class="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-neutral-500">
          <PhWarning :size="13" weight="bold" />
          原型资源在 文档仓库，需与工作台放在同一工作区
        </span>
      </div>
    </div>

    <div v-for="g in visible" :key="g.key" class="neo-card">
      <div class="mb-3 flex items-center gap-2">
        <h3 class="text-lg font-black">{{ g.label }}</h3>
        <span class="neo-chip">{{ g.items.length }}</span>
      </div>
      <p
        v-if="g.note"
        class="mb-3 flex items-start gap-1.5 rounded-lg border-2 border-black px-3 py-2 text-xs font-bold"
        :class="g.key === 'challenge' ? 'bg-neo-pink/40' : 'bg-neo-green/40'"
      >
        <PhWarning :size="13" weight="bold" class="mt-0.5 shrink-0" />
        {{ g.note }}
      </p>

      <div class="grid grid-cols-4 gap-3">
        <button
          v-for="p in g.items"
          :key="p.url"
          class="flex flex-col rounded-lg border-2 border-black bg-white p-2.5 text-left shadow-neo-sm transition-transform hover:-translate-y-0.5"
          @click="preview = p.url"
        >
          <span class="line-clamp-2 text-sm font-black leading-tight">{{ p.title }}</span>
          <span class="mt-1 truncate text-[11px] text-neutral-400">{{ p.file }}</span>
          <span class="mt-2 flex items-center gap-1 border-t-2 border-dashed border-neutral-300 pt-1.5 text-[11px] font-bold">
            <PhArrowSquareOut :size="12" weight="bold" />
            预览
          </span>
        </button>
      </div>
    </div>

    <!-- 预览 -->
    <div v-if="active" class="neo-card">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <PhSelection :size="18" weight="bold" class="shrink-0" />
          <div class="min-w-0">
            <div class="truncate font-black">{{ active.title }}</div>
            <div class="truncate text-[11px] text-neutral-500">{{ active.url }}</div>
          </div>
        </div>
        <div class="flex shrink-0 gap-2">
          <a class="neo-btn text-xs" :href="active.url" target="_blank" rel="noreferrer">新窗口打开</a>
          <button class="neo-btn text-xs" @click="preview = null">关闭</button>
        </div>
      </div>
      <iframe
        :src="active.url"
        class="h-[46rem] w-full rounded-lg border-2 border-black bg-white"
        title="原型预览"
      />
    </div>
  </div>
</template>
