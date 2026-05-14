import { defineStore } from "pinia"
import { ref, watch } from "vue"

export const useUserStore = defineStore("user", () => {
  const currentUser = ref(window.frappe?.boot?.user?.name || "Guest")
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
