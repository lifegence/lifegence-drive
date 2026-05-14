<template>
  <div class="bg-white border border-gray-200 rounded-md p-4">
    <div class="text-xs text-gray-500">
      {{ label }}
    </div>
    <div class="text-2xl font-semibold mt-1">
      {{ primary }}
    </div>
    <div
      v-if="secondary"
      class="text-[11px] text-gray-400 mt-0.5"
    >
      {{ secondary }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  primary: { type: [String, Number], required: true },
  secondary: { type: String, default: "" },
})
</script>
