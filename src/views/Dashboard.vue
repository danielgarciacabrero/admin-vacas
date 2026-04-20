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
            <!-- Avatar: imagen si existe, letra si no -->
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
 
      <button @click="logout" 
        class="m-4 p-4 rounded-xl bg-indigo-800/50 hover:bg-red-600 transition-all duration-300 flex items-center gap-3 font-bold text-sm">
        <span>🚪</span> Cerrar Sesión
      </button>
    </aside>
 
    <main class="flex-1 overflow-y-auto p-8 bg-gray-50">
      <router-view></router-view>
    </main>
  </div>
</template>
 
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';
 
const router = useRouter();
const userEmail = ref("");
const userRole = ref("");
const userAdmin = ref("");
const userAvatar = ref("");
 
onMounted(async () => {
  const token = localStorage.getItem('idToken');
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userEmail.value = decoded.email;
      userRole.value = decoded['custom:role'];
      userAdmin.value = decoded['custom:admin'] || "";
    } catch (e) {
      console.error("Error al decodificar token");
    }
  }
 
  // Obtenemos nuestro avatar_url desde el endpoint de empleados
  try {
    const res = await client.get('/employees', { params: { limit: 1 } });
    if (res.data.data && res.data.data.length > 0) {
      userAvatar.value = res.data.data[0].avatar_url || "";
    }
  } catch (e) {
    console.error("Error obteniendo avatar", e);
  }
});
 
// --- Helpers de rol ---
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