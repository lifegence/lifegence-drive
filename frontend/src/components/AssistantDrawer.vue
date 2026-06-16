<!--
  AI assistant panel for the Drive SPA — matches the desk assistant panel
  (assistant_panel.bundle): a floating ✦ tab on the right edge that DOCKS a
  panel on the right (content shrinks, panel inserts beside it — not an
  overlay). The chat itself can't run in this Vue SPA (no window.frappe /
  frappe.call / frappe.require), so the panel body embeds /app/assistant?embed=1
  via iframe, reusing the exact same AssistantThreadView.
  Docking padding lives on the AppLayout root. Design:
  company-os docs/assistant-on-drive-design.md (TASK-2026-00021)
-->
<template>
  <div>
    <!-- Floating ✦ tab toggle (right edge) — mirrors
         .assistant-panel-floating-toggle. Hidden while open; the panel header
         X closes it. -->
    <button
      v-show="!ui.assistantOpen"
      type="button"
      class="lgd-assistant-fab"
      :title="t('assistant.title')"
      :aria-label="t('assistant.title')"
      @click="ui.toggleAssistant"
    >
      <svg
        class="lgd-assistant-sparkle"
        viewBox="0 0 16 16"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M8 0l1.9 6.1L16 8l-6.1 1.9L8 16l-1.9-6.1L0 8l6.1-1.9z"
        />
      </svg>
    </button>

    <!-- Docked panel (fixed on the right; AppLayout adds matching padding so
         content shrinks instead of being covered). -->
    <aside
      class="lgd-assistant-panel"
      :class="{ open: ui.assistantOpen }"
      :aria-hidden="ui.assistantOpen ? 'false' : 'true'"
    >
      <header class="lgd-assistant-header">
        <span class="lgd-assistant-title">
          <svg
            class="lgd-assistant-sparkle"
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M8 0l1.9 6.1L16 8l-6.1 1.9L8 16l-1.9-6.1L0 8l6.1-1.9z"
            />
          </svg>
          {{ t('assistant.title') }}
        </span>
        <button
          type="button"
          class="lgd-assistant-close"
          :aria-label="t('assistant.close')"
          @click="ui.closeAssistant"
        >
          <X :size="18" />
        </button>
      </header>

      <iframe
        v-if="loaded"
        src="/app/assistant?embed=1"
        :title="t('assistant.title')"
        class="lgd-assistant-iframe"
      />
    </aside>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import { X } from "lucide-vue-next"
import { useUiStore } from "@/store"
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
const ui = useUiStore()

// Lazy-mount the iframe on first open, then keep it.
const loaded = ref(ui.assistantOpen)
watch(
  () => ui.assistantOpen,
  (open) => {
    if (open) loaded.value = true
  },
)
</script>

<style scoped>
/* Width mirrors the desk panel's default (400px). */
.lgd-assistant-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 100vw;
  z-index: 50;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s ease;
}
.lgd-assistant-panel.open {
  transform: none;
}

.lgd-assistant-header {
  height: 3.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 1px solid #e5e7eb;
}
.lgd-assistant-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #111827;
}
.lgd-assistant-sparkle {
  color: #2490ef;
  flex-shrink: 0;
}
.lgd-assistant-close {
  color: #9ca3af;
  padding: 0.5rem;
  margin-right: -0.5rem;
}
.lgd-assistant-close:hover {
  color: #374151;
}
.lgd-assistant-iframe {
  flex: 1;
  width: 100%;
  border: 0;
}

/* Floating ✦ tab on the right edge — mirrors .assistant-panel-floating-toggle. */
.lgd-assistant-fab {
  position: fixed;
  right: 0;
  top: 40%;
  z-index: 49;
  display: flex;
  align-items: center;
  padding: 10px 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-radius: 8px 0 0 8px;
  box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
  color: #2490ef;
}
.lgd-assistant-fab:hover {
  background: #f9fafb;
}

/* On narrow screens the panel is a full-width overlay (no docking), matching
   the desk panel's responsive behaviour. */
@media (max-width: 767px) {
  .lgd-assistant-panel {
    width: 100vw;
  }
}
</style>
