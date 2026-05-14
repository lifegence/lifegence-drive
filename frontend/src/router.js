import { createRouter, createWebHistory } from "vue-router"

const routes = [
  {
    path: "/",
    name: "MyFiles",
    component: () => import("@/views/MyFiles.vue"),
    meta: { title: "マイファイル" },
  },
  {
    path: "/folder/:id",
    name: "Folder",
    component: () => import("@/views/Folder.vue"),
    props: true,
    meta: { title: "フォルダ" },
  },
  {
    path: "/shared",
    name: "Shared",
    component: () => import("@/views/Shared.vue"),
    meta: { title: "共有" },
  },
  {
    path: "/favorites",
    name: "Favorites",
    component: () => import("@/views/Favorites.vue"),
    meta: { title: "お気に入り" },
  },
  {
    path: "/recents",
    name: "Recents",
    component: () => import("@/views/Recents.vue"),
    meta: { title: "最近" },
  },
  {
    path: "/trash",
    name: "Trash",
    component: () => import("@/views/Trash.vue"),
    meta: { title: "ゴミ箱" },
  },
  {
    path: "/search",
    name: "Search",
    component: () => import("@/views/Search.vue"),
    meta: { title: "検索" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: { title: "404" },
  },
]

const router = createRouter({
  history: createWebHistory("/drive_app/"),
  routes,
})

router.afterEach((to) => {
  const base = "Lifegence Drive"
  document.title = to.meta.title ? `${to.meta.title} | ${base}` : base
})

export default router
