<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded-md bg-white hover:bg-gray-50 uppercase"
    @click="cycle"
  >
    <Globe :size="14" />
    {{ locale }}
  </button>
</template>

<script setup>
import { Globe } from "lucide-vue-next"
import { useRoute } from "vue-router"
import { useI18n } from "@/composables/useI18n"
import { refreshDocumentTitle } from "@/router"

const { locale, setLocale, availableLocales } = useI18n()
const route = useRoute()

function cycle() {
  const idx = availableLocales.indexOf(locale.value)
  const next = availableLocales[(idx + 1) % availableLocales.length]
  setLocale(next)
  // Keep <title> in sync with the new locale (router.afterEach won't
  // fire on a pure locale change).
  refreshDocumentTitle(route)
}
</script>
