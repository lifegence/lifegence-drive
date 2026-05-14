<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <RouterLink
          to="/scan-templates"
          class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
        >
          <ChevronLeft :size="14" />
          テンプレ一覧
        </RouterLink>
        <h1 class="text-2xl font-semibold mt-1">
          {{ template?.template_name || id }}
        </h1>
        <div
          v-if="template"
          class="mt-1 text-sm text-gray-600 flex items-center gap-2"
        >
          <span class="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{{ template.category }}</span>
          <span class="text-xs">{{ template.language }}</span>
          <span
            class="px-1.5 py-0.5 rounded text-[11px] font-medium border"
            :class="template.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'"
          >
            {{ template.is_active ? "有効" : "無効" }}
          </span>
          <span class="text-[11px] font-mono text-gray-400">{{ template.name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a
          :href="`/app/scan-template/${encodeURIComponent(id)}`"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 px-3 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
        >
          <ExternalLink :size="14" />
          Desk で編集
        </a>
        <button
          type="button"
          class="px-2 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
          @click="resource.reload()"
        >
          <RefreshCw :size="14" />
        </button>
      </div>
    </div>

    <ErrorMessage
      v-if="resource.error"
      :message="resource.error.message"
    />

    <div
      v-if="template"
      class="space-y-4"
    >
      <section class="bg-white border border-gray-200 rounded-md p-4">
        <h2 class="text-sm font-medium mb-2">
          システムプロンプト
        </h2>
        <pre class="text-xs whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded p-2 max-h-60 overflow-auto">{{ template.system_prompt || "—" }}</pre>
      </section>

      <section class="bg-white border border-gray-200 rounded-md p-4">
        <h2 class="text-sm font-medium mb-2">
          抽出フィールド ({{ template.fields?.length || 0 }})
        </h2>
        <table
          v-if="template.fields && template.fields.length > 0"
          class="w-full text-xs"
        >
          <thead class="text-[11px] text-gray-500 border-b border-gray-100">
            <tr>
              <th class="text-left font-medium px-2 py-1">
                フィールド名
              </th>
              <th class="text-left font-medium px-2 py-1">
                ラベル
              </th>
              <th class="text-left font-medium px-2 py-1 w-20">
                型
              </th>
              <th class="text-left font-medium px-2 py-1 w-16">
                必須
              </th>
              <th class="text-left font-medium px-2 py-1">
                説明
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in template.fields"
              :key="f.name"
              class="border-b border-gray-50 last:border-0"
            >
              <td class="px-2 py-1 font-mono">
                {{ f.field_name }}
              </td>
              <td class="px-2 py-1">
                {{ f.field_label }}
              </td>
              <td class="px-2 py-1">
                {{ f.field_type }}
              </td>
              <td class="px-2 py-1">
                {{ f.is_required ? "✓" : "" }}
              </td>
              <td class="px-2 py-1 text-gray-600">
                {{ f.description }}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-else
          class="text-xs text-gray-500"
        >
          フィールド未定義
        </div>
      </section>

      <section
        v-if="template.output_schema"
        class="bg-white border border-gray-200 rounded-md p-4"
      >
        <h2 class="text-sm font-medium mb-2">
          出力スキーマ
        </h2>
        <pre class="text-xs whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded p-2 max-h-60 overflow-auto">{{ template.output_schema }}</pre>
      </section>

      <section
        v-if="template.sample_output"
        class="bg-white border border-gray-200 rounded-md p-4"
      >
        <h2 class="text-sm font-medium mb-2">
          サンプル出力
        </h2>
        <pre class="text-xs whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded p-2 max-h-60 overflow-auto">{{ template.sample_output }}</pre>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue"
import { RouterLink } from "vue-router"
import { ChevronLeft, ExternalLink, RefreshCw } from "lucide-vue-next"
import { ErrorMessage, createResource } from "frappe-ui"
import { useBreadcrumbStore } from "@/store"

const props = defineProps({
  id: { type: String, required: true },
})

const breadcrumbStore = useBreadcrumbStore()
onMounted(() => breadcrumbStore.reset())

const resource = createResource({
  url: "frappe.client.get_doc",
  makeParams: () => ({ doctype: "Scan Template", name: props.id }),
  auto: true,
})

watch(() => props.id, () => resource.reload())

const template = computed(() => resource.data)
</script>
