<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="absolute inset-0 bg-black/40" />
      <div
        class="relative bg-white rounded-md shadow-xl w-full overflow-hidden flex flex-col"
        :class="widthClass"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 class="text-base font-semibold">
            {{ title }}
          </h2>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-800"
            @click="$emit('close')"
          >
            <X :size="18" />
          </button>
        </div>
        <div class="px-4 py-3 overflow-auto">
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from "vue"
import { X } from "lucide-vue-next"

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: "" },
  width: { type: String, default: "lg" }, // sm | md | lg | xl
})

const emit = defineEmits(["close"])

const widthClass = computed(() => {
  return {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  }[props.width] || "max-w-lg"
})

function onKey(e) {
  if (e.key === "Escape" && props.open) emit("close")
}
onMounted(() => window.addEventListener("keydown", onKey))
onBeforeUnmount(() => window.removeEventListener("keydown", onKey))
</script>
