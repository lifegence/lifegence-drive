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
  // --- Scanner (Phase 2) ---
  {
    path: "/scans",
    name: "ScanJobs",
    component: () => import("@/views/scanner/ScanJobs.vue"),
    meta: { title: "スキャン" },
  },
  {
    path: "/scans/:id",
    name: "ScanJobDetail",
    component: () => import("@/views/scanner/ScanJobDetail.vue"),
    props: true,
    meta: { title: "スキャンジョブ" },
  },
  {
    path: "/scan-templates",
    name: "ScanTemplates",
    component: () => import("@/views/scanner/ScanTemplates.vue"),
    meta: { title: "スキャンテンプレート" },
  },
  {
    path: "/scan-templates/:id",
    name: "ScanTemplateDetail",
    component: () => import("@/views/scanner/ScanTemplateDetail.vue"),
    props: true,
    meta: { title: "スキャンテンプレート" },
  },
  {
    path: "/scan-usage",
    name: "ScanUsage",
    component: () => import("@/views/scanner/ScanUsage.vue"),
    meta: { title: "スキャン使用状況" },
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
  // Frappe sets a non-HttpOnly `user_id` cookie on every response, equal
  // to the email of the logged-in user or "Guest" for anonymous sessions.
  // jinjaBootData does not inject window.frappe.boot.user, so the cookie
  // is the reliable client-side source of truth.
  const userId = getCookie("user_id")
  return !userId || userId === "Guest"
}

router.beforeEach((to, _from, next) => {
  // Routes with meta.allowGuest are reachable without a Frappe session
  // (e.g. future shared-link landing pages backed by allow_guest=True APIs).
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

router.afterEach((to) => {
  const base = "Lifegence Drive"
  document.title = to.meta.title ? `${to.meta.title} | ${base}` : base
})

export default router
