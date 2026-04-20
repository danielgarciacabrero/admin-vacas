<script setup>
import { ref, onMounted } from 'vue';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';

// --- Estado de la tabla ---
const employees = ref([]);
const searchQuery = ref("");

// --- Estado de paginación y ordenación ---
const page = ref(1);
const limit = ref(10);
const sortKey = ref("id");
const sortOrder = ref("ASC");
const hasMore = ref(true);
const loading = ref(false);

// --- Mi employee_id (para saber cuál es mi fila) ---
const myEmployeeId = ref(null);

// --- Estado de subida de avatar ---
const uploading = ref(false);

onMounted(async () => {
  // Obtener mi employee_id
  try {
    const res = await client.get('/employees', { params: { limit: 1 } });
    if (res.data.data && res.data.data.length > 0) {
      myEmployeeId.value = res.data.data[0].id;
    }
  } catch (e) {
    console.error("Error obteniendo employee_id", e);
  }

  fetchEmployees();
});

// --- Llamada al backend ---
const fetchEmployees = async () => {
  loading.value = true;
  try {
    const res = await client.get('/employees', {
      params: {
        page: page.value,
        limit: limit.value,
        sort: sortKey.value,
        order: sortOrder.value
      }
    });
    employees.value = res.data.data;
    hasMore.value = res.data.data.length >= limit.value;
  } catch (error) {
    console.error("Error al cargar empleados", error);
  } finally {
    loading.value = false;
  }
};

// --- Ordenación ---
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "ASC" ? "DESC" : "ASC";
  } else {
    sortKey.value = key;
    sortOrder.value = "ASC";
  }
  page.value = 1;
  fetchEmployees();
};

// --- Paginación ---
const prevPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchEmployees();
  }
};

const nextPage = () => {
  if (hasMore.value) {
    page.value++;
    fetchEmployees();
  }
};

// --- Filtro de búsqueda ---
const filteredEmployees = () => {
  if (!searchQuery.value) return employees.value;
  const query = searchQuery.value.toLowerCase();
  return employees.value.filter(emp =>
    emp.name.toLowerCase().includes(query) ||
    emp.email.toLowerCase().includes(query)
  );
};

// --- Subida de avatar ---
const triggerUpload = (empId) => {
  // Solo puedo subir mi propio avatar (el backend también lo valida)
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => handleAvatarUpload(e, empId);
  input.click();
};

const handleAvatarUpload = async (event, empId) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tamaño (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return alert("La imagen no puede superar los 2MB");
  }

  // Validar que sea imagen
  if (!file.type.startsWith('image/')) {
    return alert("El archivo debe ser una imagen");
  }

  uploading.value = true;
  try {
    // Leer el archivo como base64
    const base64 = await fileToBase64(file);

    // Enviar al backend: PUT /employees/{id}/avatar
    // El backend espera el body en base64 y el content-type en el header
    await client.put(`/employees/${empId}/avatar`, base64, {
      headers: {
        'Content-Type': file.type
      }
    });

    // Refrescar la tabla para ver el nuevo avatar
    fetchEmployees();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al subir el avatar";
    alert(msg);
  } finally {
    uploading.value = false;
  }
};

// Convierte un File a string base64 (sin el prefijo data:...)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result es "data:image/jpeg;base64,/9j/4AAQ..."
      // Quitamos el prefijo y nos quedamos solo con el base64 puro
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ¿Es mi propia fila? (para mostrar el botón de subir)
const isMyRow = (emp) => emp.id === myEmployeeId.value;
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Cabecera -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h3 class="text-3xl font-black text-gray-800 tracking-tight">Panel de Empleados</h3>
        <p class="text-gray-500 font-medium">Gestiona y visualiza el cupo de vacaciones</p>
      </div>
      
      <div class="relative w-full md:w-80">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Buscar por nombre o email..." 
          class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all shadow-sm bg-white"
        />
      </div>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th @click="sortBy('name')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Nombre 
              <span v-if="sortKey === 'name'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('email')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Email 
              <span v-if="sortKey === 'email'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('days_used')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Días Disponibles
              <span v-if="sortKey === 'days_used'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider text-center">
              Avatar
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="emp in filteredEmployees()" :key="emp.id" class="hover:bg-indigo-50/30 transition-colors group">
            <td class="p-5">
              <div class="flex items-center gap-3">
                <!-- Avatar: imagen si existe, letra si no -->
                <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    v-if="emp.avatar_url" 
                    :src="emp.avatar_url" 
                    :alt="emp.name"
                    class="w-full h-full object-cover"
                  />
                  <div 
                    v-else 
                    class="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold"
                  >
                    {{ emp.name.charAt(0) }}
                  </div>
                </div>
                <span class="font-semibold text-gray-700">{{ emp.name }}</span>
              </div>
            </td>
            <td class="p-5 text-gray-500 font-medium">{{ emp.email }}</td>
            <td class="p-5">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-lg font-bold" :class="(emp.days_per_year - emp.days_used) > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                  {{ emp.days_per_year - emp.days_used }} días
                </span>
              </div>
            </td>
            <td class="p-5 text-center">
              <!-- Botón subir avatar: solo en mi propia fila -->
              <button 
                v-if="isMyRow(emp)"
                @click="triggerUpload(emp.id)"
                :disabled="uploading"
                class="text-indigo-600 hover:text-indigo-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-indigo-100 transition-all"
              >
                {{ uploading ? 'Subiendo...' : (emp.avatar_url ? 'Cambiar foto' : 'Subir foto') }}
              </button>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
          </tr>
          <tr v-if="filteredEmployees().length === 0">
            <td colspan="4" class="p-20 text-center text-gray-400 font-medium">
              No se han encontrado empleados con ese criterio.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Controles de paginación -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
        <p class="text-sm text-gray-500">
          Página <span class="font-bold text-gray-700">{{ page }}</span>
          · {{ limit }} resultados por página
        </p>
        <div class="flex gap-2">
          <button 
            @click="prevPage" 
            :disabled="page === 1"
            class="px-4 py-2 text-sm font-semibold rounded-xl border transition-all"
            :class="page === 1 
              ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
              : 'border-gray-300 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'"
          >
            ← Anterior
          </button>
          <button 
            @click="nextPage" 
            :disabled="!hasMore"
            class="px-4 py-2 text-sm font-semibold rounded-xl border transition-all"
            :class="!hasMore 
              ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
              : 'border-gray-300 text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>