import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Importamos la configuración que hicimos arriba
import './style.css' // Si estás usando Tailwind o CSS base

const app = createApp(App)

app.use(router) // ESTA LINEA es la que registra <router-view />

app.mount('#app')