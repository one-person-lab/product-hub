<script setup lang="ts">
import { computed, ref } from 'vue'
import { docs, docStats, docAlerts, activeDocs } from '../data/store'
import {
  PhMapTrifold,
  PhWarningOctagon,
  PhWarning,
  PhInfo,
  PhMagnifyingGlass,
} from '@phosphor-icons/vue'

const q = ref('')
const dirFilter = ref('all')
const showArchived = ref(false)
const openAlert = ref<string | null>('duplicates')

const pool = computed(() => (showArchived.value ? docs : activeDocs()))

const list = computed(() =>
  pool.value
    .filter((d) => {
      const okDir = dirFilter.value === 'all' || d.dir === dirFilter.value
      const okQ = !q.value || [d.title, d.path, d.name].join(' ').toLowerCase().includes(q.value.toLowerCase())
      return okDir && okQ
    })
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || '')),
)

const dirs = computed(() => docStats.byDir.map((d) => d.dir))

const alerts = computed(() => [
  {
    key: 'duplicates',
    label: '同主题多副本',
    level: '致命',
    icon: PhWarningOctagon,
    cls: 'status-failed',
    items: docAlerts.duplicates.map((d) => ({
      title: d.docs.map((x) => x.title).join(' ／ '),
      sub: `${d.docs.length} 份 · ${d.docs.map((x) => x.path).join(' · ')}`,
    })),
    hint: '保留 1 份权威版，其余移入 99-归档/',
  },
  {
    key: 'stale',
    label: '长期未更新',
    level: '中',
    icon: PhWarning,
    cls: 'status-creating',
    items: docAlerts.stale.slice(0, 20).map((d) => ({ title: d.title, sub: `${d.path} · ${d.days} 天未动` })),
    hint: '高变更目录超 30 天、其他超 90 天会出现在这里',
  },
  {
    key: 'missingVersion',
    label: '缺版本头',
    level: '中',
    icon: PhWarning,
    cls: 'status-creating',
    items: docAlerts.missingVersion.map((d) => ({ title: d.title, sub: d.path })),
    hint: '只看 01-产品设计 的顶层权威稿。文档头需要 版本 / 最后更新 / 状态，模板在 _meta/templates/',
  },
  {
    key: 'orphans',
    label: '孤岛文档',
    level: '低',
    icon: PhInfo,
    cls: 'status-ready',
    items: docAlerts.orphans.map((d) => ({ title: d.title, sub: d.path })),
    hint: '没有任何入链，别人找不到它',
  },
  {
    key: 'chatish',
    label: '疑似 AI 对话原文',
    level: '低',
    icon: PhInfo,
    cls: 'status-ready',
    items: docAlerts.chatish.map((d) => ({ title: d.title, sub: d.path })),
    hint: '开头是对话口吻（"可以。"、"以下是"…）。产出应重写成陈述式文档再入库',
  },
])

const openCount = computed(() => alerts.value.filter((a) => a.items.length).length)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 概览 -->
    <div class="neo-card">
      <h2 class="flex items-center gap-2 text-2xl font-black">
        <PhMapTrifold :size="22" weight="bold" class="shrink-0" />
        文档地图
      </h2>
      <p class="mt-1 text-sm text-neutral-500">
        来自 <code>文档仓库/</code> 的 {{ docStats.total }} 篇 markdown，健康度算法与
        <code>scripts/docs/dashboard.py</code> 一致（git 提交时间 + 入链分析）。
      </p>

      <div class="mt-4 grid grid-cols-4 gap-3">
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">活跃文档</div>
          <div class="text-3xl font-black">{{ docStats.active }}</div>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">归档</div>
          <div class="text-3xl font-black text-neutral-400">{{ docStats.archived }}</div>
        </div>
        <div class="rounded-lg border-2 border-black bg-white p-3 shadow-neo-sm">
          <div class="text-xs font-bold text-neutral-500">正文字数</div>
          <div class="text-3xl font-black">{{ (docStats.chars / 10000).toFixed(1) }}w</div>
        </div>
        <div class="rounded-lg border-2 border-black p-3 shadow-neo-sm" :class="openCount ? 'bg-neo-pink/50' : 'bg-white'">
          <div class="text-xs font-bold text-neutral-500">告警类别</div>
          <div class="text-3xl font-black">{{ openCount }}<span class="text-lg"> / {{ alerts.length }}</span></div>
        </div>
      </div>

      <div class="mt-4 overflow-hidden rounded-lg border-2 border-black">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-neo-yellow text-left font-black">
              <th class="px-3 py-2">目录</th>
              <th class="px-3 py-2">篇数</th>
              <th class="px-3 py-2">最后变更</th>
              <th class="px-3 py-2">距今</th>
              <th class="px-3 py-2">频率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in docStats.byDir" :key="d.dir" class="border-t-2 border-black bg-white">
              <td class="px-3 py-1.5 font-bold">{{ d.dir }}</td>
              <td class="px-3 py-1.5">{{ d.count }}</td>
              <td class="px-3 py-1.5 text-neutral-500">{{ d.last || '—' }}</td>
              <td class="px-3 py-1.5 text-neutral-500">{{ d.days === null ? '—' : d.days + ' 天' }}</td>
              <td class="px-3 py-1.5">
                <span
                  class="neo-chip !px-1.5 !py-0 text-[10px]"
                  :class="d.level === '高' ? 'status-creating' : d.level === '低' ? '!bg-neutral-100 text-neutral-400' : 'status-ready'"
                  >{{ d.level }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 告警 -->
    <div class="neo-card">
      <h3 class="mb-3 text-lg font-black">健康告警</h3>
      <div class="flex flex-col gap-2">
        <div v-for="a in alerts" :key="a.key" class="rounded-lg border-2 border-black bg-white shadow-neo-sm">
          <button
            class="flex w-full items-center gap-3 p-3 text-left"
            @click="openAlert = openAlert === a.key ? null : a.key"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border-2 border-black"
              :class="a.cls"
            >
              <component :is="a.icon" :size="15" weight="bold" />
            </span>
            <span class="flex-1 font-black">{{ a.label }}</span>
            <span class="neo-chip !px-2 !py-0 text-[10px]" :class="a.items.length ? a.cls : '!bg-neutral-100 text-neutral-400'">
              {{ a.items.length || '正常' }}
            </span>
          </button>
          <div v-if="openAlert === a.key" class="border-t-2 border-dashed border-neutral-300 px-3 py-2.5">
            <p class="mb-2 text-[11px] text-neutral-500">{{ a.hint }}</p>
            <div v-if="a.items.length" class="flex flex-col gap-1.5">
              <div v-for="(it, i) in a.items" :key="i" class="rounded border-2 border-neutral-200 bg-neo-paper px-2.5 py-1.5">
                <div class="text-sm font-bold">{{ it.title }}</div>
                <div class="break-all text-[11px] text-neutral-500">{{ it.sub }}</div>
              </div>
            </div>
            <p v-else class="text-sm text-neutral-400">这一类没有告警。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="neo-card">
      <div class="flex flex-wrap items-center gap-2">
        <label class="neo-input flex min-w-56 flex-1 items-center gap-2 py-1.5!">
          <PhMagnifyingGlass :size="15" weight="bold" class="shrink-0 text-neutral-400" />
          <input v-model="q" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜标题或路径…" />
        </label>
        <button class="neo-btn text-xs" :class="dirFilter === 'all' ? 'neo-btn-primary' : ''" @click="dirFilter = 'all'">
          全部
        </button>
        <button
          v-for="d in dirs"
          :key="d"
          class="neo-btn text-xs"
          :class="dirFilter === d ? 'neo-btn-primary' : ''"
          @click="dirFilter = d"
        >
          {{ d }}
        </button>
        <button class="neo-btn text-xs" :class="showArchived ? 'neo-btn-primary' : ''" @click="showArchived = !showArchived">
          含归档
        </button>
      </div>

      <div class="mt-3 overflow-hidden rounded-lg border-2 border-black">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-neo-yellow text-left font-black">
              <th class="px-3 py-2">文档</th>
              <th class="w-20 px-3 py-2">版本</th>
              <th class="w-36 px-3 py-2">最后更新</th>
              <th class="w-16 px-3 py-2">入链</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in list"
              :key="d.path"
              class="border-t-2 border-black bg-white"
              :class="d.archived ? 'opacity-50' : ''"
            >
              <td class="px-3 py-1.5">
                <div class="font-bold">{{ d.title }}</div>
                <div class="break-all text-[11px] text-neutral-400">{{ d.path }}</div>
              </td>
              <td class="px-3 py-1.5">
                <span v-if="d.version" class="neo-chip !px-1.5 !py-0 text-[10px]">{{ d.version }}</span>
                <span v-else class="text-[11px] text-neutral-300">缺</span>
              </td>
              <td class="whitespace-nowrap px-3 py-1.5 text-neutral-500">
                <span>{{ d.updated || '—' }}</span>
                <span class="ml-1 text-[10px] text-neutral-400">
                  {{ d.declared ? '文档头' : d.gitDate ? 'git' : 'mtime' }}
                </span>
              </td>
              <td class="px-3 py-1.5">
                <span v-if="d.inbound" class="font-bold">{{ d.inbound }}</span>
                <span v-else class="text-[11px] text-neutral-300">孤岛</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-[11px] text-neutral-400">
        共 {{ list.length }} 篇。文档真源在 <code>文档仓库/</code>，本工作台只读不写。
      </p>
    </div>
  </div>
</template>
