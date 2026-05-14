<template>
  <nav
    v-if="crumbs.length > 0"
    class="px-6 py-2 border-b border-gray-100 bg-gray-50 text-sm text-gray-600 flex items-center gap-1"
  >
    <RouterLink
      to="/"
      class="hover:text-blue-600"
    >
      マイファイル
    </RouterLink>
    <template
      v-for="(crumb, idx) in crumbs"
      :key="crumb.id"
    >
      <ChevronRight
        :size="14"
        class="text-gray-400"
      />
      <RouterLink
        v-if="idx < crumbs.length - 1"
        :to="`/folder/${crumb.id}`"
        class="hover:text-blue-600"
      >
        {{ crumb.name }}
      </RouterLink>
      <span
        v-else
        class="text-gray-900 font-medium"
      >
        {{ crumb.name }}
      </span>
    </template>
  </nav>
</template>

<script setup>
import { RouterLink } from "vue-router"
import { ChevronRight } from "lucide-vue-next"

defineProps({
  crumbs: {
    type: Array,
    default: () => [],
    // crumbs: [{ id, name }, ...]  Phase 1-3 で folder.get_breadcrumb API から取得
  },
})
</script>
