<template>
  <div class="flex h-screen bg-gray-100">
    <aside class="w-64 bg-indigo-900 text-white flex flex-col shadow-xl">
      <div class="p-6 text-2xl font-black tracking-tighter border-b border-indigo-800 flex items-center gap-2">
        <span class="text-3xl">🌴</span> CMS Vacas
      </div>

      <!-- Info del usuario con avatar -->
      <div class="p-6 border-b border-indigo-800 bg-indigo-950/50">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img 
                v-if="userAvatar" 
                :src="userAvatar" 
                alt="Avatar"
                class="w-full h-full object-cover"
              />
              <div 
                v-else 
                class="w-full h-full bg-indigo-500 flex items-center justify-center text-xs font-bold"
              >
                {{ userEmail?.charAt(0).toUpperCase() }}
              </div>
            </div>
            <span class="text-xs font-medium text-indigo-200 truncate w-40" :title="userEmail">
              {{ userEmail }}
            </span>
          </div>
          
          <div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
              {{ displayRole }}
            </span>
          </div>
        </div>
      </div>

      <!-- Menú de navegación con control de roles -->
      <nav class="flex-1 p-4 space-y-2 mt-2">
        <router-link to="/dashboard/employees" 
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-800 transition-all duration-200 group"
          active-class="bg-indigo-700 shadow-inner">
          <span class="group-hover:scale-110 transition-transform">👥</span> 
          <span class="font-medium">Empleados</span>
        </router-link>

        <router-link 
          v-if="isSupervisor || isCeo"
          to="/dashboard/supervisors" 
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-800 transition-all duration-200 group"
          active-class="bg-indigo-700 shadow-inner">
          <span class="group-hover:scale-110 transition-transform">🛡️</span> 
          <span class="font-medium">Supervisores</span>
        </router-link>

        <router-link to="/dashboard/vacations" 
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-800 transition-all duration-200 group"
          active-class="bg-indigo-700 shadow-inner">
          <span class="group-hover:scale-110 transition-transform">✈️</span> 
          <span class="font-medium">Vacaciones</span>
        </router-link>
      </nav>

      <!-- Estado de notificaciones -->
      <div v-if="notifStatus" class="mx-4 mb-2 px-3 py-2 rounded-lg text-xs font-medium"
        :class="notifStatus === 'activas' 
          ? 'bg-green-500/20 text-green-300' 
          : 'bg-yellow-500/20 text-yellow-300'">
        {{ notifStatus === 'activas' ? '🔔 Notificaciones activas' : '🔕 Notificaciones desactivadas' }}
      </div>

      <button @click="logout" 
        class="m-4 p-4 rounded-xl bg-indigo-800/50 hover:bg-red-600 transition-all duration-300 flex items-center gap-3 font-bold text-sm">
        <span>🚪</span> Cerrar Sesión
      </button>
    </aside>

    <main class="flex-1 overflow-y-auto p-8 bg-gray-50">
      <!-- Toast de notificación en primer plano -->
      <div v-if="toast.visible" 
        class="fixed top-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm animate-slide-in"
        style="pointer-events: auto;">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            🔔
          </div>
          <div class="flex-1">
            <p class="font-bold text-gray-800 text-sm">{{ toast.title }}</p>
            <p class="text-gray-500 text-xs mt-1">{{ toast.body }}</p>
          </div>
          <button @click="toast.visible = false" class="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">&times;</button>
        </div>
      </div>

      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';
import { requestNotificationPermission, onForegroundMessage } from '../firebase';

const router = useRouter();
const userEmail = ref("");
const userRole = ref("");
const userAdmin = ref("");
const userAvatar = ref("");
const myCognitoId = ref("");
const notifStatus = ref("");

// toast para notificaciones en primer plano, solo se cierra con la X
const toast = ref({ visible: false, title: "", body: "" });

const showToast = (title, body) => {
  toast.value = { visible: true, title, body };
  
};

onMounted(async () => {
  const token = localStorage.getItem('idToken');
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userEmail.value = decoded.email;
      userRole.value = decoded['custom:role'];
      userAdmin.value = decoded['custom:admin'] || "";
      myCognitoId.value = decoded.sub;
    } catch (e) {
      console.error("Error al decodificar token");
    }
  }

  // Obtenemos nuestro avatar buscando por cognito_id
  try {
    const res = await client.get('/employees', { params: { limit: 100 } });
    if (res.data.data) {
      const me = res.data.data.find(emp => emp.cognito_id === myCognitoId.value);
      if (me && me.avatar_url) {
        userAvatar.value = me.avatar_url;
      }
    }
  } catch (e) {
    console.error("Error obteniendo avatar", e);
  }

  // configurar notificaciones push
  await setupNotifications();
});

const setupNotifications = async () => {
  try {
    // 1. Pedir permiso y obtener token FCM
    const fcmToken = await requestNotificationPermission();
    
    if (!fcmToken) {
      notifStatus.value = "desactivadas";
      return;
    }

    // 2. Registrar el token en nuestro backend
    await client.put('/employees/fcm-token', { fcm_token: fcmToken });
    notifStatus.value = "activas";
    console.log("Token FCM registrado en el backend");

    // 3. Escuchar notificaciones cuando la app está en primer plano
    onForegroundMessage((payload) => {
      showToast(
        payload.notification?.title || "Nueva notificación",
        payload.notification?.body || ""
      );
    });

  } catch (error) {
    console.error("Error configurando notificaciones:", error);
    notifStatus.value = "desactivadas";
  }
};

// helpers de rol
const isCeo = computed(() => userAdmin.value === "true");
const isSupervisor = computed(() => userRole.value === "2");

const displayRole = computed(() => {
  if (isCeo.value) return "CEO";
  if (isSupervisor.value) return "Supervisor";
  return "Empleado";
});

const logout = () => {
  localStorage.removeItem('idToken');
  router.push('/');
};
</script>

<style>
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}
</style>