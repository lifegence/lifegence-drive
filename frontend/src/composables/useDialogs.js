import { reactive, readonly } from "vue"

const state = reactive({
  share: { open: false, item: null, onAfter: null },
  move: { open: false, item: null, onAfter: null },
  preview: { open: false, item: null },
})

export function useDialogs() {
  function openShare(item, onAfter) {
    state.share.item = item
    state.share.onAfter = onAfter || null
    state.share.open = true
  }
  function closeShare() {
    state.share.open = false
    state.share.item = null
    const cb = state.share.onAfter
    state.share.onAfter = null
    cb?.()
  }
  function openMove(item, onAfter) {
    state.move.item = item
    state.move.onAfter = onAfter || null
    state.move.open = true
  }
  function closeMove() {
    state.move.open = false
    state.move.item = null
    const cb = state.move.onAfter
    state.move.onAfter = null
    cb?.()
  }
  function openPreview(item) {
    state.preview.item = item
    state.preview.open = true
  }
  function closePreview() {
    state.preview.open = false
    state.preview.item = null
  }
  return {
    state: readonly(state),
    openShare,
    closeShare,
    openMove,
    closeMove,
    openPreview,
    closePreview,
  }
}
