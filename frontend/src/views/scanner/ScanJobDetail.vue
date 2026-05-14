<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-2">
      スキャンジョブ詳細
    </h1>
    <p class="text-sm text-gray-600">
      Job: {{ id }} (Phase 2-4 で実装) — get_job_progress ポーリング + WebSocket、アイテム一覧、結果プレビュー
    </p>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, required: true },
})
</script>
