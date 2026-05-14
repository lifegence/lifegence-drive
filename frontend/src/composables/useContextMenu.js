import { reactive, readonly } from "vue"

const state = reactive({
  open: false,
  x: 0,
  y: 0,
  items: [], // [{ label, icon, onClick, danger?, separator? }]
})

export function useContextMenu() {
  function show(event, items) {
    event.preventDefault()
    state.x = event.clientX
    state.y = event.clientY
    state.items = items
    state.open = true
  }
  function hide() {
    state.open = false
    state.items = []
  }
  return { state: readonly(state), show, hide }
}
