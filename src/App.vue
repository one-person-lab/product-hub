<script setup lang="ts">
import { ref, computed } from 'vue'
import SideNav from './components/SideNav.vue'
import OverviewView from './views/OverviewView.vue'
import StructureView from './views/StructureView.vue'
import IdentityView from './views/IdentityView.vue'
import PrototypeView from './views/PrototypeView.vue'
import DocsMapView from './views/DocsMapView.vue'
import AppStatusView from './views/AppStatusView.vue'
import HomeView from './views/HomeView.vue'
import RoadmapView from './views/RoadmapView.vue'
import GoalView from './views/GoalView.vue'
import BacklogView from './views/BacklogView.vue'
import DocView from './views/DocView.vue'

const current = ref('home')

/** 内置视图；不在这张表里的 id 一律交给通用板块渲染器 DocView */
const BUILTIN: Record<string, unknown> = {
  home: HomeView,
  goal: GoalView,
  roadmap: RoadmapView,
  overview: OverviewView,
  structure: StructureView,
  identities: IdentityView,
  prototypes: PrototypeView,
  docs: DocsMapView,
  appStatus: AppStatusView,
  backlog: BacklogView,
}

const activeView = computed(() => BUILTIN[current.value] || DocView)
const isDocView = computed(() => activeView.value === DocView)

/** 只有 DocView 需要 id；内置视图传了会落到根元素上，避免这个副作用 */
const extraProps = computed(() => (isDocView.value ? { id: current.value } : {}))
</script>

<template>
  <div class="flex min-h-screen gap-6 p-6">
    <SideNav :current="current" @select="current = $event" />
    <main class="min-w-0 flex-1">
      <component :is="activeView" :key="current" v-bind="extraProps" @go="current = $event" />
    </main>
  </div>
</template>
