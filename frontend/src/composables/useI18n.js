import { computed, ref } from "vue"
import ja from "@/i18n/ja.json"
import en from "@/i18n/en.json"

const messages = { ja, en }

function detectInitialLocale() {
  const stored = localStorage.getItem("drive:locale")
  if (stored && messages[stored]) return stored
  const fromFrappe = window.frappe?.boot?.lang
  if (fromFrappe && messages[fromFrappe]) return fromFrappe
  const browser = (navigator.language || "ja").slice(0, 2)
  return messages[browser] ? browser : "ja"
}

const locale = ref(detectInitialLocale())

export function useI18n() {
  const current = computed(() => messages[locale.value] || messages.ja)

  function t(key) {
    return current.value[key] ?? key
  }

  function setLocale(l) {
    if (!messages[l]) return
    locale.value = l
    localStorage.setItem("drive:locale", l)
  }

  return {
    t,
    locale,
    setLocale,
    availableLocales: Object.keys(messages),
  }
}
