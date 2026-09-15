<script setup lang="ts">
import { computed } from 'vue'
import {
  PhHouse,
  PhLightning,
  PhArrowRight,
  PhCheckCircle,
  PhWarningCircle,
  PhClockCounterClockwise,
  PhFlag,
  PhMonitor,
  PhTarget,
  PhMapTrifold,
} from '@phosphor-icons/vue'
import {
  narrative,
  attack,
  identities,
  prototypes,
  docs,
  docAlerts,
  alertCount,
  timeline,
  appStatus,
  generatedAt,
} from '../data/store'

const emit = defineEmits<{ (e: 'go', view: string): void }>()

/* ---- 「下一步」是推导的，不是写死的（与 media-dashboard 同一哲学） ---- */
interface NextStep {
  label: string
  why: string
  go: string
  hot: boolean
}

const nextSteps = computed<NextStep[]>(() => {
  const steps: NextStep[] = []
  // ① 推进中档位最高的未完成攻坚项
  const open = attack.items
    .filter((it) => it.done < it.total)
    .sort((a, b) => a.tier.localeCompare(b.tier))[0]
  if (open) {
    const next = open.actions.find((a) => !a.done)
    steps.push({
      label: `推进「${open.title}」`,
      why: next ? next.text : 'P0 攻坚项待推进',
      go: 'attack',
      hot: open.tier === 'P0',
    })
  }
  // ② 叙事未定稿 → 定稿并回写文档库
  if (narrative && narrative.status !== '定稿') {
    steps.push({
      label: '叙事定稿并回写 文档仓库',
      why: '当前为草案；v4.1 仍是文档库「权威版」但已不代表产品想法',
      go: 'overview',
      hot: false,
    })
  }
  // ③ 老格式身份补齐
  const legacy = identities.filter((i) => i.legacy).length
  if (legacy > 0) {
    steps.push({
      label: `补齐 ${legacy} 份老格式身份`,
      why: '迁入「探索」空间前必须先过内容规范',
      go: 'identities',
      hot: false,
    })
  }
  // ④ 文档健康告警
  const alerts = alertCount()
  if (alerts > 0) {
    steps.push({
      label: `处理 ${alerts} 处文档健康告警`,
      why: '版本头缺失 / 孤岛文档，量小但拖着会烂',
      go: 'docs',
      hot: false,
    })
  }
  return steps.slice(0, 3)
})

/* ---- 阶段横幅 ---- */
const stage = computed(() => ({
  name: '重大重构期',
  desc:
    '叙事与客户端实现存在偏差。当前重心：先收口决策（旧机制留改弃、商业模型），再收口设计（信息架构），开发等设计定了再动。',
}))

/* ---- 顶部统计 ---- */
const legacyCount = computed(() => identities.filter((i) => i.legacy).length)
const stats = computed(() => [
  {
    label: '攻坚进度',
    value: `${attack.stats.done}/${attack.stats.total}`,
    sub: 'P0 优先',
    go: 'attack',
    icon: PhTarget,
    tone: 'bg-neo-pink',
  },
  {
    label: '文档告警',
    value: String(alertCount()),
    sub: docAlerts.stale.length + ' 篇过期 · ' + docAlerts.missingVersion.length + ' 缺版本头',
    go: 'docs',
    icon: PhWarningCircle,
    tone: 'bg-neo-yellow',
  },
  {
    label: '身份资产',
    value: `${identities.length - legacyCount.value}/${identities.length}`,
    sub: legacyCount.value ? `${legacyCount.value} 份老格式待补` : '全部合规',
    go: 'identities',
    icon: PhCheckCircle,
    tone: 'bg-neo-green',
  },
  {
    label: '原型库',
    value: String(prototypes.length),
    sub: '多数为旧范式',
    go: 'prototypes',
    icon: PhMonitor,
    tone: 'bg-neo-purple',
  },
])

/* ---- 最近变更（非归档文档按更新时间倒序） ---- */
const recentDocs = computed(() =>
  [...docs]
    .filter((d) => !d.archived && d.updated)
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, 6),
)

const recentEvents = computed(() => [...timeline].reverse().slice(0, 3))

const quickLinks = [
  { id: 'roadmap', label: '推进路线', desc: 'Now / Next / Later', icon: PhFlag, tone: 'bg-neo-green' },
  { id: 'appStatus', label: '产品现状', desc: '客户端代码实时解析', icon: PhMonitor, tone: 'bg-neo-blue' },
  { id: 'iteration', label: '迭代流程', desc: '想法 → 上线的固定走法', icon: PhLightning, tone: 'bg-neo-yellow' },
  { id: 'docs', label: '文档地图', desc: '55 篇文档健康度', icon: PhMapTrifold, tone: 'bg-neo-purple' },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 阶段横幅 -->
    <div class="neo-card border-2! border-black! bg-neo-yellow/70">
      <div class="flex flex-wrap items-start gap-3">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-white text-black shadow-neo-sm"
        >
          <PhHouse :size="22" weight="bold" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-xl font-black">{{ stage.name }}</h2>
            <span v-if="narrative" class="neo-chip !border-2 !border-black !bg-white text-[11px]">
              叙事 {{ narrative.version }} · {{ narrative.status }}
            </span>
            <span v-if="appStatus" class="neo-chip !border-2 !border-black !bg-white text-[11px]">
              客户端 v{{ appStatus.info.versionName }}
            </span>
          </div>
          <p class="mt-1.5 max-w-3xl text-sm leading-relaxed text-neutral-700">{{ stage.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 下一步（推导） -->
    <div class="neo-card">
      <div class="flex items-center gap-2">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-green text-black"
        >
          <PhLightning :size="16" weight="bold" />
        </span>
        <h3 class="text-lg font-black">下一步</h3>
        <span class="text-xs font-bold text-neutral-400">从各板块数据推导，不是拍脑袋排的</span>
      </div>

      <div class="mt-3 grid gap-2.5 md:grid-cols-3">
        <button
          v-for="(s, i) in nextSteps"
          :key="s.label"
          class="rounded-lg border-2 p-3 text-left transition-transform hover:-translate-y-0.5"
          :class="i === 0 && s.hot ? 'border-black bg-neo-pink/60 shadow-neo' : 'border-black bg-white shadow-neo-sm'"
          @click="emit('go', s.go)"
        >
          <div class="flex items-center justify-between gap-2">
            <span
              class="neo-chip !px-1.5 !py-0 text-[10px]"
              :class="i === 0 && s.hot ? 'status-failed' : '!bg-neutral-100 !border-neutral-300 text-neutral-500'"
            >
              {{ i === 0 ? '现在' : `第 ${i + 1} 步` }}
            </span>
            <PhArrowRight :size="14" weight="bold" class="text-neutral-400" />
          </div>
          <p class="mt-1.5 text-sm font-black leading-snug">{{ s.label }}</p>
          <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600">{{ s.why }}</p>
        </button>
      </div>
    </div>

    <!-- 统计 -->
    <div class="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <button
        v-for="s in stats"
        :key="s.label"
        class="rounded-lg border-2 border-black bg-white p-3 text-left shadow-neo-sm transition-transform hover:-translate-y-0.5"
        @click="emit('go', s.go!)"
      >
        <div class="flex items-center gap-1.5">
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 border-black text-black"
            :class="s.tone"
          >
            <component :is="s.icon" :size="12" weight="bold" />
          </span>
          <span class="text-xs font-bold text-neutral-500">{{ s.label }}</span>
        </div>
        <div class="mt-1 text-3xl font-black tabular-nums">{{ s.value }}</div>
        <div class="mt-0.5 text-[11px] text-neutral-400">{{ s.sub }}</div>
      </button>
    </div>

    <!-- 快捷入口 + 最近变更 -->
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="neo-card">
        <h3 class="text-lg font-black">快捷入口</h3>
        <div class="mt-3 grid grid-cols-2 gap-2.5">
          <button
            v-for="l in quickLinks"
            :key="l.id"
            class="flex items-center gap-2.5 rounded-lg border-2 border-black bg-white p-3 text-left shadow-neo-sm transition-transform hover:-translate-y-0.5"
            @click="emit('go', l.id)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border-2 border-black text-black"
              :class="l.tone"
            >
              <component :is="l.icon" :size="16" weight="bold" />
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-black leading-tight">{{ l.label }}</span>
              <span class="block truncate text-[11px] text-neutral-500">{{ l.desc }}</span>
            </span>
          </button>
        </div>
      </div>

      <div class="neo-card">
        <div class="flex items-center gap-2">
          <PhClockCounterClockwise :size="18" weight="bold" />
          <h3 class="text-lg font-black">最近变更</h3>
        </div>
        <ul class="mt-2.5 flex flex-col">
          <li
            v-for="d in recentDocs"
            :key="d.path"
            class="flex items-baseline justify-between gap-3 border-b border-dashed border-neutral-200 py-1.5 last:border-0"
          >
            <span class="min-w-0 truncate text-sm font-bold">{{ d.title || d.name }}</span>
            <span class="shrink-0 font-mono text-[11px] text-neutral-400">
              {{ d.dir }} · {{ d.updated }}
            </span>
          </li>
        </ul>
        <p v-if="recentEvents.length" class="mt-2 border-t-2 border-dashed border-neutral-300 pt-2 text-[11px] leading-relaxed text-neutral-500">
          最近节点：{{ recentEvents.map((e) => `${e.date} ${e.title}`).join(' · ') }}
        </p>
        <p class="mt-1.5 text-[10px] text-neutral-400">数据生成于 {{ generatedAt.slice(0, 16).replace('T', ' ') }}</p>
      </div>
    </div>
  </div>
</template>
