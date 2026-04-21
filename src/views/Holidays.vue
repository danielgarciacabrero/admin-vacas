<script setup>
import { ref, onMounted } from 'vue';
import client from '../api/client';

// lista de festivos
const holidays = ref([]);
const loading = ref(false);

// estado de la subida del csv
const uploading = ref(false);
const uploadResult = ref(null);

// cargamos los festivos al montar el componente
onMounted(() => {
  fetchHolidays();
});

// obtenemos todos los festivos del backend
const fetchHolidays = async () => {
  loading.value = true;
  try {
    const res = await client.get('/holidays');
    holidays.value = res.data.data;
  } catch (error) {
    console.error("Error al cargar festivos", error);
  } finally {
    loading.value = false;
  }
};

// cuando el usuario selecciona un archivo csv
const onCsvSelected = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // comprobamos que sea un csv
  if (!file.name.endsWith('.csv')) {
    alert("El archivo debe ser un CSV");
    event.target.value = '';
    return;
  }

  uploading.value = true;
  uploadResult.value = null;

  try {
    // leemos el contenido del csv como texto
    const text = await file.text();

    // lo mandamos al backend como texto plano
    const res = await client.post('/holidays/upload', text, {
      headers: { 'Content-Type': 'text/plain' }
    });

    uploadResult.value = res.data;
    // recargamos la lista de festivos
    fetchHolidays();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al subir el CSV";
    alert(msg);
  } finally {
    uploading.value = false;
    event.target.value = '';
  }
};

// borramos un festivo
const deleteHoliday = async (id) => {
  if (!confirm("¿Seguro que quieres eliminar este festivo?")) return;

  try {
    await client.delete('/holidays/' + id);
    fetchHolidays();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al eliminar el festivo";
    alert(msg);
  }
};

// formateamos la fecha para mostrarla bonita
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Cabecera -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h3 class="text-3xl font-black text-gray-800 tracking-tight">Días Festivos</h3>
        <p class="text-gray-500 font-medium">Gestiona los días festivos que no cuentan como vacaciones</p>
      </div>

      <!-- Boton para subir CSV -->
      <label
        class="px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 cursor-pointer">
        <span class="text-lg">📄</span>
        {{ uploading ? 'Subiendo...' : 'Subir CSV' }}
        <input
          type="file"
          accept=".csv"
          @change="onCsvSelected"
          :disabled="uploading"
          class="hidden"
        />
      </label>
    </div>

    <!-- Resultado de la subida -->
    <div v-if="uploadResult" class="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-bold text-green-800 text-sm">{{ uploadResult.message }}</p>
          <p class="text-green-600 text-xs mt-1">{{ uploadResult.insertados }} festivos insertados</p>
          <div v-if="uploadResult.errores && uploadResult.errores.length > 0" class="mt-2">
            <p class="text-red-600 text-xs font-bold">Errores:</p>
            <p v-for="(err, i) in uploadResult.errores" :key="i" class="text-red-500 text-xs">{{ err }}</p>
          </div>
        </div>
        <button @click="uploadResult = null" class="text-green-400 hover:text-green-600 text-lg cursor-pointer">&times;</button>
      </div>
    </div>

    <!-- Info del formato -->
    <div class="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
      <p class="font-bold text-blue-800 text-sm">Formato del CSV</p>
      <p class="text-blue-600 text-xs mt-1">Cada línea con formato: <span class="font-mono bg-blue-100 px-1 rounded">2026-01-01;Año Nuevo</span></p>
      <p class="text-blue-600 text-xs mt-0.5">Separador: punto y coma (;). Sin cabecera.</p>
    </div>

    <!-- Tabla de festivos -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">ID</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">Fecha</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">Descripción</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider text-center">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="holiday in holidays" :key="holiday.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-5 font-semibold text-gray-700">{{ holiday.id }}</td>
            <td class="p-5 text-gray-500 font-medium">{{ formatDate(holiday.holiday_date) }}</td>
            <td class="p-5 text-gray-500 font-medium">{{ holiday.description || '-' }}</td>
            <td class="p-5 text-center">
              <button
                @click="deleteHoliday(holiday.id)"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-all">
                Eliminar
              </button>
            </td>
          </tr>
          <tr v-if="holidays.length === 0 && !loading">
            <td colspan="4" class="p-20 text-center text-gray-400 font-medium">
              No hay días festivos registrados. Sube un CSV para añadirlos.
            </td>
          </tr>
          <tr v-if="loading">
            <td colspan="4" class="p-20 text-center text-gray-400 font-medium">
              Cargando festivos...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>