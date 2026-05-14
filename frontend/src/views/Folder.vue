<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-2">
      フォルダ
    </h1>
    <p class="text-sm text-gray-600">
      ID: {{ id }} (Phase 1-3 でフォルダ内容を表示)
    </p>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, required: true },
})
</script>
