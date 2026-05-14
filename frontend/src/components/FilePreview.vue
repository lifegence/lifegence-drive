<template>
  <Modal
    :open="state.preview.open"
    :title="item?.label || ''"
    width="2xl"
    @close="dialogs.closePreview"
  >
    <div class="min-h-[60vh] flex items-center justify-center bg-gray-50 -mx-4 -my-3 p-4">
      <template v-if="!item">
        <span class="text-gray-500">読み込み中…</span>
      </template>

      <img
        v-else-if="kind === 'image'"
        :src="item.file_url"
        :alt="item.label"
        class="max-w-full max-h-[70vh] object-contain"
      >

      <iframe
        v-else-if="kind === 'pdf'"
        :src="item.file_url"
        class="w-full h-[70vh] border-0 bg-white"
        :title="item.label"
      />

      <video
        v-else-if="kind === 'video'"
        :src="item.file_url"
        controls
        class="max-w-full max-h-[70vh]"
      />

      <audio
        v-else-if="kind === 'audio'"
        :src="item.file_url"
        controls
      />

      <div
        v-else-if="kind === 'text'"
        class="w-full"
      >
        <div
          v-if="textLoading"
          class="text-gray-500"
        >
          読み込み中…
        </div>
        <ErrorMessage
          v-else-if="textError"
          :message="textError"
        />
        <pre
          v-else
          class="bg-white border border-gray-200 rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-[70vh] overflow-auto"
        >{{ textContent }}</pre>
      </div>

      <div
        v-else
        class="text-sm text-gray-600 flex flex-col items-center gap-3"
      >
        <FileX :size="36" />
        <div>この形式はプレビューできません。</div>
      </div>
    </div>

    <template #footer>
      <a
        v-if="item?.file_url"
        :href="item.file_url"
        target="_blank"
        rel="noopener"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
      >
        新しいタブで開く
      </a>
      <button
        type="button"
        class="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white hover:bg-gray-50"
        @click="dialogs.closePreview"
      >
        閉じる
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { FileX } from "lucide-vue-next"
import { ErrorMessage } from "frappe-ui"
import Modal from "@/components/Modal.vue"
import { useDialogs } from "@/composables/useDialogs"
import { previewKind } from "@/composables/previewKind"

const dialogs = useDialogs()
const { state } = dialogs

const item = computed(() => state.preview.item)
const kind = computed(() => previewKind(item.value))

const textContent = ref("")
const textLoading = ref(false)
const textError = ref(null)

watch(
  () => state.preview.open,
  async (isOpen) => {
    if (!isOpen) {
      textContent.value = ""
      textError.value = null
      return
    }
    if (kind.value !== "text" || !item.value?.file_url) return
    textLoading.value = true
    textError.value = null
    textContent.value = ""
    try {
      const res = await fetch(item.value.file_url, { credentials: "include" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = await res.arrayBuffer()
      // Cap displayed text at 256 KB to avoid choking the renderer.
      const slice = new Uint8Array(buf.slice(0, 256 * 1024))
      textContent.value = new TextDecoder("utf-8").decode(slice)
      if (buf.byteLength > slice.byteLength) {
        textContent.value += "\n\n…(以降は省略)"
      }
    } catch (e) {
      textError.value = e.message || String(e)
    } finally {
      textLoading.value = false
    }
  },
)
</script>
