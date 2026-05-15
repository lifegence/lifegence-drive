<template>
  <nav
    v-if="crumbs.length > 0"
    class="px-6 py-2 border-b border-gray-100 bg-gray-50 text-sm text-gray-600 flex items-center gap-1"
  >
    <RouterLink
      to="/" @contextmenu.prevent="onContext($event, -1)"
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
        :to="`/folder/${crumb.id}`" @contextmenu.prevent="onContext($event, idx)"
        class="hover:text-blue-600"
      >
        {{ crumb.name }}
      </RouterLink>
      <span
        v-else
        class="text-gray-900 font-medium" @contextmenu.prevent="onContext($event, idx)"
      >
        {{ crumb.name }}
      </span>
    </template>
    
    <button
      type="button"
      class="ml-2 text-gray-400 hover:text-gray-700 focus:outline-none transition-colors duration-150"
      :title="t('action.copyPath')"
      @click="copyCurrentPath"
    >
      <Clipboard :size="14" />
    </button>
  </nav>
</template>
<script setup>

import { RouterLink } from "vue-router"
import { ChevronRight, Clipboard } from "lucide-vue-next"
import { useContextMenu } from "@/composables/useContextMenu"
import { useI18n } from "@/composables/useI18n"

const props = defineProps({
  crumbs: {
    type: Array,
    default: () => [],
  },
})

const ctx = useContextMenu()
const { t } = useI18n()

function copyCurrentPath() {
  const pathParts = props.crumbs.map((c) => c.name)
  let fullPath = "マイファイル"
  if (pathParts.length > 0) {
    fullPath += "/" + pathParts.join("/")
  }
  navigator.clipboard.writeText(fullPath)
}

function onContext(event, index) {
  let fullPath = "マイファイル"
  if (index >= 0) {
    const pathParts = props.crumbs.slice(0, index + 1).map((c) => c.name)
    fullPath = "マイファイル/" + pathParts.join("/")
  }

  ctx.show(event, [
    {
      label: t("action.copyPath"),
      icon: Clipboard,
      onClick: () => {
        navigator.clipboard.writeText(fullPath)
      },
    },
  ])
}
</script>