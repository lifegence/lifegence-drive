<template>
  <header class="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
    <form
      class="flex-1 max-w-md"
      @submit.prevent="submit"
    >
      <div class="relative">
        <Search
          :size="16"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="query"
          type="text"
          :placeholder="t('search.placeholder')"
          class="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
          @input="onInput"
        >
        <button
          v-if="query"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          @click="clear"
        >
          <X :size="14" />
        </button>
      </div>
    </form>

    <div class="ml-auto flex items-center gap-3">
      <LocaleToggle />
      <div class="text-sm text-gray-600 flex items-center gap-2">
        <UserCircle :size="20" />
        <span>{{ user.currentUser }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Search, UserCircle, X } from "lucide-vue-next"
import { useUserStore } from "@/store"
import { useI18n } from "@/composables/useI18n"
import LocaleToggle from "@/components/LocaleToggle.vue"

const { t } = useI18n()

const user = useUserStore()
const router = useRouter()
const route = useRoute()
const query = ref(typeof route.query.q === "string" ? route.query.q : "")

let debounceTimer = null

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (query.value.trim().length === 0) {
      if (route.name === "Search") router.push("/")
      return
    }
    router.push({ name: "Search", query: { q: query.value.trim() } })
  }, 300)
}

function submit() {
  clearTimeout(debounceTimer)
  if (query.value.trim().length === 0) return
  router.push({ name: "Search", query: { q: query.value.trim() } })
}

function clear() {
  query.value = ""
  if (route.name === "Search") router.push("/")
}

// Keep input in sync when user navigates via Sidebar / back button.
watch(
  () => route.query.q,
  (q) => {
    if (typeof q === "string" && q !== query.value) query.value = q
  },
)
</script>
