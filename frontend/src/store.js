import { defineStore } from "pinia"
import { ref } from "vue"

export const useUserStore = defineStore("user", () => {
  const currentUser = ref(window.frappe?.boot?.user?.name || "Guest")
  return { currentUser }
})
