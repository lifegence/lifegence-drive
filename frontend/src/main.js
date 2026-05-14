import { createApp } from "vue"
import { createPinia } from "pinia"
import { FrappeUI, Button, ErrorMessage, frappeRequest, setConfig } from "frappe-ui"
import App from "./App.vue"
import router from "./router"
import "./style.css"

setConfig("resourceFetcher", frappeRequest)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(FrappeUI)
app.component("Button", Button)
app.component("ErrorMessage", ErrorMessage)
app.mount("#app")
