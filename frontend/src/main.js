import { createApp } from "vue"
import { createPinia } from "pinia"
import { FrappeUI, frappeRequest, setConfig } from "frappe-ui"
import App from "./App.vue"
import router from "./router"
import "./style.css"

setConfig("resourceFetcher", frappeRequest)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(FrappeUI)
app.mount("#app")
