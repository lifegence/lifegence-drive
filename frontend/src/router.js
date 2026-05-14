import { createRouter, createWebHistory } from "vue-router"
import { useI18n } from "@/composables/useI18n"

const routes = [
  {
    path: "/",
    name: "MyFiles",
    component: () => import("@/views/MyFiles.vue"),
    meta: { titleKey: "view.myFiles" },
  },
  {
    path: "/folder/:id",
    name: "Folder",
    component: () => import("@/views/Folder.vue"),
    props: true,
    meta: { titleKey: "view.folder" },
  },
  {
    path: "/shared",
    name: "Shared",
    component: () => import("@/views/Shared.vue"),
    meta: { titleKey: "view.shared" },
  },
  {
    path: "/favorites",
    name: "Favorites",
    component: () => import("@/views/Favorites.vue"),
    meta: { titleKey: "view.favorites" },
  },
  {
    path: "/recents",
    name: "Recents",
    component: () => import("@/views/Recents.vue"),
    meta: { titleKey: "view.recents" },
  },
  {
    path: "/trash",
    name: "Trash",
    component: () => import("@/views/Trash.vue"),
    meta: { titleKey: "view.trash" },
  },
  {
    path: "/search",
    name: "Search",
    component: () => import("@/views/Search.vue"),
    meta: { titleKey: "view.search" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
    meta: { titleKey: "view.notFound" },
  },
]

const router = createRouter({
  history: createWebHistory("/drive_app/"),
  routes,
})

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  if (!m) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

function isGuest() {
  const userId = getCookie("user_id")
  return !userId || userId === "Guest"
}

router.beforeEach((to, _from, next) => {
  if (to.meta.allowGuest) {
    return next()
  }
  if (isGuest()) {
    const target = `/drive_app${to.fullPath === "/" ? "/" : to.fullPath}`
    window.location.href = `/login?redirect-to=${encodeURIComponent(target)}`
    return
  }
  next()
})

function refreshDocumentTitle(route) {
  const { t } = useI18n()
  const base = t("app.title")
  const key = route?.meta?.titleKey
  document.title = key ? `${t(key)} | ${base}` : base
}

router.afterEach((to) => refreshDocumentTitle(to))

export { refreshDocumentTitle }
export default router
