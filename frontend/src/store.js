import { defineStore } from "pinia"
import { ref, watch } from "vue"

function readUserCookie() {
  // Mirror of router.js#getCookie. Frappe sets `user_id` and `full_name`
  // cookies on every response (non-HttpOnly), so they're a stable
  // client-side source of the current identity.
  const m = document.cookie.match(/(?:^|;\s*)user_id=([^;]+)/)
  if (!m) return "Guest"
  try {
    return decodeURIComponent(m[1]) || "Guest"
  } catch {
    return m[1] || "Guest"
  }
}

export const useUserStore = defineStore("user", () => {
  const currentUser = ref(readUserCookie())
  return { currentUser }
})

export const useViewStore = defineStore("view", () => {
  const mode = ref(localStorage.getItem("drive:view") || "grid")
  watch(mode, (v) => localStorage.setItem("drive:view", v))
  function setMode(v) {
    mode.value = v
  }
  return { mode, setMode }
})

export const useBreadcrumbStore = defineStore("breadcrumb", () => {
  const crumbs = ref([])
  function set(list) {
    crumbs.value = list
  }
  function reset() {
    crumbs.value = []
  }
  return { crumbs, set, reset }
})

export const useUiStore = defineStore("ui", () => {
  const sidebarOpen = ref(false)
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }
  function openSidebar() {
    sidebarOpen.value = true
  }
  function closeSidebar() {
    sidebarOpen.value = false
  }

  // AI assistant drawer (embeds /app/assistant via iframe)
  const assistantOpen = ref(localStorage.getItem("drive:assistant") === "1")
  watch(assistantOpen, (v) => localStorage.setItem("drive:assistant", v ? "1" : "0"))
  function toggleAssistant() {
    assistantOpen.value = !assistantOpen.value
  }
  function closeAssistant() {
    assistantOpen.value = false
  }

  return {
    sidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    assistantOpen,
    toggleAssistant,
    closeAssistant,
  }
})
