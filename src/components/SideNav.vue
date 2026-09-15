<script setup lang="ts">
import { PhBlueprint, PhPresentation, PhWarningCircle } from '@phosphor-icons/vue'
import { narrative, sectionGroups, sectionIcon, alertCount } from '../data/store'

defineProps<{ current: string }>()
defineEmits<{ (e: 'select', id: string): void }>()

/**
 * 导航完全由 build-data 输出的 sections 驱动。
 * 加一个 content/<目录>/ 就在侧栏多一项，这个文件不需要改。
 */
const groups = sectionGroups.map((g) => ({
  title: g.group,
  items: g.items.map((s) => ({
    id: s.id,
    label: s.label,
    icon: sectionIcon(s.icon),
    tone: s.tone,
  })),
}))

const risks = narrative ? narrative.risks.length : 0
const alerts = alertCount()
const badge: Record<string, { n: number; cls: string }> = {
  overview: { n: risks, cls: 'status-creating' },
  docs: { n: alerts, cls: 'status-failed' },
}

const hasBadge = (id: string): boolean => (badge[id]?.n || 0) > 0
</script>

<template>
  <aside class="neo-card flex w-60 shrink-0 flex-col self-start p-4">
    <div class="mb-4 flex items-center gap-2 px-1">
      <span
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-black text-white"
      >
        <PhBlueprint :size="16" weight="bold" />
      </span>
      <div class="text-xl font-black leading-none tracking-tight">产品工作台</div>
    </div>

    <nav class="flex flex-col gap-1.5">
      <template v-for="group in groups" :key="group.title || '__pinned__'">
        <div v-if="group.title" class="mt-3 px-2 text-xs font-bold text-neutral-500">
          {{ group.title }}
        </div>
        <button
          v-for="item in group.items"
          :key="item.id"
          class="flex items-center gap-2.5 rounded-[6px] border-2 px-2.5 py-2 text-left text-sm transition-colors"
          :class="[
            current === item.id
              ? 'border-black bg-white font-black text-black shadow-neo-sm'
              : 'border-transparent font-bold hover:bg-neo-yellow/60',
            group.title ? '' : 'mb-1',
          ]"
          @click="$emit('select', item.id)"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border-2 border-black text-black"
            :class="item.tone"
          >
            <component :is="item.icon" :size="14" weight="bold" />
          </span>
          <span class="min-w-0 flex-1">{{ item.label }}</span>
          <span
            v-if="hasBadge(item.id)"
            class="neo-chip !border-2 !px-1.5 !py-0 text-[10px]"
            :class="badge[item.id].cls"
            >{{ badge[item.id].n }}</span
          >
        </button>
      </template>
    </nav>

    <div class="mt-6 border-t-2 border-dashed border-neutral-300 pt-4">
      <button class="neo-btn w-full px-2!" disabled title="待产品定稿后接入分步导览">
        <PhPresentation :size="15" weight="bold" />
        演示模式
      </button>
      <p v-if="narrative" class="mt-2 flex items-start gap-1 px-1 text-[11px] leading-tight text-neutral-500">
        <PhWarningCircle :size="12" weight="bold" class="mt-0.5 shrink-0" />
        当前叙事为 {{ narrative.version }} {{ narrative.status }}
      </p>
    </div>
  </aside>
</template>
