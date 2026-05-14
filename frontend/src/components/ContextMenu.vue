<template>
  <Teleport to="body">
    <div
      v-if="state.open"
      class="fixed inset-0 z-40"
      @click="ctx.hide"
      @contextmenu.prevent="ctx.hide"
    >
      <ul
        class="absolute bg-white border border-gray-200 rounded-md shadow-lg py-1 text-sm min-w-44 z-50"
        :style="positionStyle"
        @click.stop
      >
        <template
          v-for="(item, i) in state.items"
          :key="i"
        >
          <li
            v-if="item.separator"
            class="my-1 border-t border-gray-100"
          />
          <li
            v-else
            class="px-3 py-1.5 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
            :class="item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-800'"
            @click="onPick(item)"
          >
            <component
              :is="item.icon"
              v-if="item.icon"
              :size="14"
            />
            <span>{{ item.label }}</span>
          </li>
        </template>
      </ul>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from "vue"
import { useContextMenu } from "@/composables/useContextMenu"

const ctx = useContextMenu()
const state = ctx.state

// Clamp menu within viewport so it never overflows the right/bottom edge.
const positionStyle = computed(() => {
  const menuW = 200
  const menuH = state.items.length * 32 + 8
  const x = Math.min(state.x, window.innerWidth - menuW - 8)
  const y = Math.min(state.y, window.innerHeight - menuH - 8)
  return { top: `${y}px`, left: `${x}px` }
})

function onPick(item) {
  ctx.hide()
  item.onClick?.()
}

function onEsc(e) {
  if (e.key === "Escape") ctx.hide()
}
onMounted(() => window.addEventListener("keydown", onEsc))
onBeforeUnmount(() => window.removeEventListener("keydown", onEsc))
</script>
