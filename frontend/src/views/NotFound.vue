<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-2">
      {{ t("view.notFound") }}
    </h1>
    <p class="text-sm text-gray-600">
      <RouterLink
        to="/"
        class="text-blue-600 hover:underline"
      >
        {{ t("view.myFiles") }}
      </RouterLink>
    </p>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router"
import { useI18n } from "@/composables/useI18n"

const { t } = useI18n()
</script>
