<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{ code: string; id: string }>()

const el = ref<HTMLElement | null>(null)
const error = ref('')
const rendering = ref(false)

// mermaid 体积很大（内部带 cytoscape/katex），改成动态 import：
// 只有用户真的展开流程图时才下载对应 chunk，主包不受影响。
type MermaidApi = {
  initialize: (cfg: Record<string, unknown>) => void
  render: (id: string, code: string) => Promise<{ svg: string }>
}
let mermaid: MermaidApi | null = null

async function load(): Promise<MermaidApi> {
  if (mermaid) return mermaid
  const mod = (await import('mermaid')) as unknown as { default: MermaidApi }
  mermaid = mod.default
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: "'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    themeVariables: {
      background: '#fffcf5',
      primaryColor: '#ffe89b',
      primaryTextColor: '#111111',
      primaryBorderColor: '#111111',
      lineColor: '#111111',
      secondaryColor: '#bfe0ff',
      tertiaryColor: '#e3d1ff',
      fontSize: '13px',
    },
  })
  return mermaid
}

async function render() {
  if (!el.value) return
  error.value = ''
  rendering.value = true
  try {
    const api = await load()
    const { svg } = await api.render(`m-${props.id}-${Date.now()}`, props.code)
    el.value.innerHTML = svg
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    el.value.innerHTML = ''
  } finally {
    rendering.value = false
  }
}

onMounted(render)
watch(() => props.code, render)
</script>

<template>
  <div class="overflow-x-auto rounded-lg border-2 border-black bg-neo-paper p-3">
    <p v-if="rendering" class="py-6 text-center text-xs font-bold text-neutral-400">正在渲染流程图…</p>
    <div ref="el" class="md-body flex justify-center" />
    <p v-if="error" class="mt-2 text-xs font-bold text-neutral-500">该 mermaid 图无法渲染：{{ error }}</p>
  </div>
</template>
