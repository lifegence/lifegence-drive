<template>
  <div>
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h1 class="text-xl font-semibold">
        スキャンテンプレート
      </h1>
      <div class="flex items-center gap-2">
        <a
          href="/app/scan-template/new?new=1"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus :size="14" />
          新規作成
        </a>
        <button
          type="button"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="templates.reload()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <div
      v-if="templates.loading && (!templates.data || templates.data.length === 0)"
      class="p-6 text-sm text-gray-500"
    >
      読み込み中…
    </div>
    <ErrorMessage
      v-else-if="templates.error"
      :message="templates.error.message"
      class="m-4"
    />
    <div
      v-else-if="!templates.data || templates.data.length === 0"
      class="p-12 text-center text-sm text-gray-500"
    >
      テンプレートはありません。
      <a
        href="/app/scan-template/new?new=1"
        target="_blank"
        rel="noopener"
        class="text-blue-600 hover:underline"
      >新規作成</a>
    </div>
    <table
      v-else
      class="w-full text-sm"
    >
      <thead class="text-xs text-gray-500 border-b border-gray-200">
        <tr>
          <th class="text-left font-medium px-3 py-2">
            名前
          </th>
          <th class="text-left font-medium px-3 py-2 w-32">
            カテゴリ
          </th>
          <th class="text-left font-medium px-3 py-2 w-24 hidden md:table-cell">
            言語
          </th>
          <th class="text-left font-medium px-3 py-2 w-20">
            状態
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="t in templates.data"
          :key="t.name"
          class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          @click="open(t.name)"
        >
          <td class="px-3 py-2">
            <div class="font-medium truncate">
              {{ t.template_name }}
            </div>
            <div class="text-[11px] text-gray-500 font-mono">
              {{ t.name }}
            </div>
          </td>
          <td class="px-3 py-2">
            <span class="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{{ t.category }}</span>
          </td>
          <td class="px-3 py-2 hidden md:table-cell text-gray-600">
            {{ t.language }}
          </td>
          <td class="px-3 py-2">
            <span
              class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border"
              :class="t.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'"
            >
              {{ t.is_active ? "有効" : "無効" }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { ErrorMessage, createResource } from "frappe-ui"
import { RefreshCw, Plus } from "lucide-vue-next"
import { useBreadcrumbStore } from "@/store"

const router = useRouter()
const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const templates = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "Scan Template",
    fields: ["name", "template_name", "category", "language", "is_active"],
    order_by: "modified desc",
    limit_page_length: 100,
  },
  auto: true,
})

function open(name) {
  router.push(`/scan-templates/${encodeURIComponent(name)}`)
}
</script>
