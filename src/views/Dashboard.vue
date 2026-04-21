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

      <!-- Menu de navegacion con control de roles -->
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
          <!-- badge con el numero de pendientes -->
          <span v-if="pendingCount > 0" 
            class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
            {{ pendingCount }}
          </span>
        </router-link>
       <router-link 
         to="/dashboard/holidays" 
         class="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-800 transition-all duration-200 group"
         active-class="bg-indigo-700 shadow-inner">
         <span class="group-hover:scale-110 transition-transform">📅</span> 
         <span class="font-medium">Festivos</span>
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

      <!-- Banner de solicitudes pendientes para el supervisor -->
      <div v-if="pendingCount > 0" 
        class="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            ⚠️
          </div>
          <div>
            <p class="font-bold text-amber-800 text-sm">
              Tienes {{ pendingCount }} solicitud{{ pendingCount > 1 ? 'es' : '' }} pendiente{{ pendingCount > 1 ? 's' : '' }} de revisar
            </p>
            <p class="text-amber-600 text-xs mt-0.5">Aprueba o rechaza las solicitudes de vacaciones de tus empleados</p>
          </div>
        </div>
        <router-link to="/dashboard/vacations"
          class="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-all flex-shrink-0">
          Revisar
        </router-link>
      </div>

      <!-- Toast de notificacion push en primer plano, solo se cierra con la X -->
      <div v-if="toast.visible" 
        class="fixed top-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm animate-slide-in">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            🔔
          </div>
          <div class="flex-1">
            <p class="font-bold text-gray-800 text-sm">{{ toast.title }}</p>
            <p class="text-gray-500 text-xs mt-1">{{ toast.body }}</p>
          </div>
          <button @click="closeToast" class="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer">&times;</button>
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

// solicitudes pendientes para el supervisor
const pendingCount = ref(0);

// toast para notificaciones push en primer plano
const toast = ref({ visible: false, title: "", body: "" });

const showToast = (title, body) => {
  toast.value = { visible: true, title, body };
};

const closeToast = () => {
  toast.value.visible = false;
  // al cerrar el toast recargamos las pendientes por si ya gestionó algo
  checkPendingRequests();
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

  // obtenemos nuestro avatar buscando por cognito_id
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

  // si es supervisor o ceo, comprobar solicitudes pendientes
  if (isSupervisor.value || isCeo.value) {
    await checkPendingRequests();
  }
});

// comprobamos cuantas solicitudes pendientes tiene el supervisor
const checkPendingRequests = async () => {
  try {
    const res = await client.get('/vacations', {
      params: { page: 1, limit: 100, sort: 'id', order: 'ASC' }
    });
    if (res.data.data) {
      // contamos las que tienen status 0 (pendiente)
      const pending = res.data.data.filter(v => v.status === 0);
      pendingCount.value = pending.length;
    }
  } catch (e) {
    console.error("Error comprobando solicitudes pendientes", e);
  }
};

const setupNotifications = async () => {
  try {
    // 1. pedir permiso y obtener token FCM
    const fcmToken = await requestNotificationPermission();
    
    if (!fcmToken) {
      notifStatus.value = "desactivadas";
      return;
    }

    // 2. registrar el token en nuestro backend
    await client.put('/employees/fcm-token', { fcm_token: fcmToken });
    notifStatus.value = "activas";
    console.log("Token FCM registrado en el backend");

    // 3. escuchar notificaciones cuando la app esta en primer plano
    onForegroundMessage((payload) => {
      showToast(
        payload.notification?.title || "Nueva notificación",
        payload.notification?.body || ""
      );
      // actualizamos el contador de pendientes al recibir push
      if (isSupervisor.value || isCeo.value) {
        checkPendingRequests();
      }
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