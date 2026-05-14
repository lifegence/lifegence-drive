<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-2">
      404 — ページが見つかりません
    </h1>
    <p class="text-sm text-gray-600">
      <RouterLink
        to="/"
        class="text-blue-600 hover:underline"
      >
        マイファイルに戻る
      </RouterLink>
    </p>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router"
</script>
