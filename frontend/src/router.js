import { createRouter, createWebHistory } from "vue-router"

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
]

const router = createRouter({
  history: createWebHistory("/drive_app/"),
  routes,
})

export default router
