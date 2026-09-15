<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PhInfo } from '@phosphor-icons/vue'
import { sectionById, sectionIcon, inline, type SectionDoc } from '../data/store'
import MermaidBlock from '../components/MermaidBlock.vue'

const props = defineProps<{ id: string }>()

const section = computed(() => sectionById(props.id))
const docs = computed<SectionDoc[]>(() => section.value?.docs || [])
const activeName = ref('')

watch(
  () => [props.id, docs.value.length],
  () => {
    if (!docs.value.some((d) => d.name === activeName.value)) activeName.value = docs.value[0]?.name || ''
  },
  { immediate: true },
)

const doc = computed<SectionDoc | undefined>(
  () => docs.value.find((d) => d.name === activeName.value) || docs.value[0],
)
const Icon = computed(() => sectionIcon(section.value?.icon || 'doc'))

/** mermaid 渲染需要全页唯一的 id */
const mid = (ci: number, bi: number): string => `${props.id}-${doc.value?.name || 'd'}-${ci}-${bi}`
</script>

<template>
  <div v-if="!section" class="neo-card">
    <h2 class="text-2xl font-black">未找到板块</h2>
    <p class="mt-2 text-sm text-neutral-500">id：{{ id }}</p>
  </div>

  <div v-else class="flex flex-col gap-4">
    <div class="neo-card">
      <div class="flex items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border-2 border-black bg-neo-blue text-black"
        >
          <component :is="Icon" :size="18" weight="bold" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-2xl font-black leading-tight">{{ section.label }}</h2>
          <p class="mt-0.5 text-xs font-bold text-neutral-500">
            来自 <code class="rounded bg-black/10 px-1">content/{{ section.dir }}/</code> ·
            {{ docs.length }} 篇
          </p>
        </div>
      </div>

      <div
        v-if="docs.length > 1"
        class="mt-3 flex flex-wrap gap-2 border-t-2 border-dashed border-neutral-300 pt-3"
      >
        <button
          v-for="d in docs"
          :key="d.name"
          class="neo-chip border-2 transition-colors"
          :class="
            d.name === doc?.name
              ? 'border-black bg-white font-black shadow-neo-sm'
              : 'border-transparent hover:bg-neo-yellow/60'
          "
          @click="activeName = d.name"
        >
          {{ d.title }}
        </button>
      </div>
    </div>

    <div v-if="!docs.length" class="neo-card">
      <p class="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-500">
        <PhInfo :size="15" weight="bold" class="shrink-0" />
        这个板块还没有内容。往
        <code class="rounded bg-black/10 px-1">content/{{ section.dir }}/</code>
        放一个 .md 文件，重新生成数据即可。
      </p>
    </div>

    <template v-else-if="doc">
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="doc.version" class="neo-chip status-ready">{{ doc.version }}</span>
        <span v-if="doc.status" class="neo-chip status-creating">{{ doc.status }}</span>
        <span v-if="doc.updated" class="neo-chip">更新 {{ doc.updated }}</span>
        <span v-if="doc.flowCount" class="neo-chip">{{ doc.flowCount }} 张流程图</span>
        <span class="ml-auto text-[11px] text-neutral-400">{{ doc.path }}</span>
      </div>

      <div v-if="doc.intro.length" class="rounded-lg border-2 border-black bg-neo-yellow/50 p-3 shadow-neo-sm">
        <p v-for="(l, i) in doc.intro" :key="i" class="text-sm font-bold leading-relaxed" v-html="inline(l)" />
      </div>

      <section v-for="(c, ci) in doc.chunks" :key="ci" class="neo-card">
        <h3 class="text-lg font-black">{{ c.name }}</h3>
        <div class="mt-3 flex flex-col gap-3">
          <template v-for="(b, bi) in c.blocks" :key="bi">
            <p
              v-if="b.type === 'para'"
              class="text-sm leading-relaxed text-neutral-800"
              v-html="inline(b.text)"
            />

            <h4
              v-else-if="b.type === 'h'"
              class="font-black"
              :class="b.level === 3 ? 'text-base' : 'text-sm'"
            >
              {{ b.text }}
            </h4>

            <div v-else-if="b.type === 'quote'" class="border-l-4 border-black bg-neutral-100/70 px-3 py-2">
              <p v-for="(l, i) in b.lines" :key="i" class="text-sm font-bold leading-relaxed" v-html="inline(l)" />
            </div>

            <ul v-else-if="b.type === 'list' && !b.ordered" class="flex flex-col gap-1.5">
              <li v-for="(it, i) in b.items" :key="i" class="flex gap-2 text-sm leading-relaxed">
                <span class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span class="min-w-0" v-html="inline(it)" />
              </li>
            </ul>

            <ol v-else-if="b.type === 'list'" class="flex flex-col gap-1.5">
              <li v-for="(it, i) in b.items" :key="i" class="flex gap-2 text-sm leading-relaxed">
                <span class="shrink-0 font-black">{{ i + 1 }}.</span>
                <span class="min-w-0" v-html="inline(it)" />
              </li>
            </ol>

            <div v-else-if="b.type === 'table'" class="overflow-x-auto rounded-lg border-2 border-black shadow-neo-sm">
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="bg-black text-white">
                    <th v-for="h in b.head" :key="h" class="whitespace-nowrap px-3 py-2 text-left font-black">
                      {{ h }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(r, i) in b.rows"
                    :key="i"
                    class="border-t border-black/15"
                    :class="i % 2 ? 'bg-neo-yellow/15' : ''"
                  >
                    <td
                      v-for="h in b.head"
                      :key="h"
                      class="px-3 py-2 align-top leading-relaxed"
                      v-html="inline(r[h] || '')"
                    />
                  </tr>
                </tbody>
              </table>
            </div>

            <MermaidBlock v-else-if="b.type === 'mermaid'" :id="mid(ci, bi)" :code="b.text" />

            <pre
              v-else-if="b.type === 'code'"
              class="overflow-x-auto rounded-lg border-2 border-black bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-100"
            ><code>{{ b.text }}</code></pre>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
