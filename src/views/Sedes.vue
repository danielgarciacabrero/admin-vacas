<script setup>
import { ref, onMounted } from 'vue';
import client from '../api/client';

// lista de sedes
const sedes = ref([]);
const loading = ref(false);

// formulario para crear sede nueva
const nuevaSede = ref({ nombre: '', ciudad: '' });
const creando = ref(false);
const createError = ref('');
const createSuccess = ref('');

// cargamos las sedes al montar
onMounted(() => {
  fetchSedes();
});

// obtenemos todas las sedes del backend
const fetchSedes = async () => {
  loading.value = true;
  try {
    const res = await client.get('/sedes');
    sedes.value = res.data.data;
  } catch (error) {
    console.error("Error al cargar sedes", error);
  } finally {
    loading.value = false;
  }
};

// creamos una sede nueva
const handleCreateSede = async () => {
  createError.value = '';
  createSuccess.value = '';

  // validamos que el nombre no este vacio
  if (!nuevaSede.value.nombre.trim()) {
    createError.value = 'El nombre de la sede es obligatorio';
    return;
  }

  creando.value = true;
  try {
    await client.post('/sedes', {
      nombre: nuevaSede.value.nombre.trim(),
      ciudad: nuevaSede.value.ciudad.trim() || null
    });

    createSuccess.value = 'Sede creada correctamente';
    // limpiamos el formulario
    nuevaSede.value = { nombre: '', ciudad: '' };
    // recargamos la lista
    fetchSedes();

    // quitamos el mensaje de exito despues de 3 segundos
    setTimeout(() => { createSuccess.value = ''; }, 3000);
  } catch (error) {
    createError.value = error.response?.data?.message || 'Error al crear la sede';
  } finally {
    creando.value = false;
  }
};
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Cabecera -->
    <div class="mb-8">
      <h3 class="text-3xl font-black text-gray-800 tracking-tight">Sedes</h3>
      <p class="text-gray-500 font-medium">Gestiona las sedes de la empresa</p>
    </div>

    <!-- Formulario para crear sede -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-8">
      <h4 class="text-lg font-bold text-gray-700 mb-4">Crear nueva sede</h4>

      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Nombre *</label>
          <input
            v-model="nuevaSede.nombre"
            type="text"
            placeholder="Ej: Sede Valladolid"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Ciudad</label>
          <input
            v-model="nuevaSede.ciudad"
            type="text"
            placeholder="Ej: Valladolid"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="handleCreateSede"
            :disabled="creando"
            class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {{ creando ? 'Creando...' : 'Crear sede' }}
          </button>
        </div>
      </div>

      <!-- Mensajes de feedback -->
      <div v-if="createSuccess" class="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
        {{ createSuccess }}
      </div>
      <div v-if="createError" class="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
        {{ createError }}
      </div>
    </div>

    <!-- Tabla de sedes -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">ID</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">Nombre</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">Ciudad</th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider">Creada</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="sede in sedes" :key="sede.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-5 font-semibold text-gray-700">{{ sede.id }}</td>
            <td class="p-5">
              <span class="px-3 py-1 rounded-lg text-sm font-bold bg-indigo-100 text-indigo-700">
                {{ sede.nombre }}
              </span>
            </td>
            <td class="p-5 text-gray-500 font-medium">{{ sede.ciudad || '-' }}</td>
            <td class="p-5 text-gray-400 text-sm">{{ new Date(sede.created_at).toLocaleDateString('es-ES') }}</td>
          </tr>
          <tr v-if="sedes.length === 0 && !loading">
            <td colspan="4" class="p-20 text-center text-gray-400 font-medium">
              No hay sedes registradas.
            </td>
          </tr>
          <tr v-if="loading">
            <td colspan="4" class="p-20 text-center text-gray-400 font-medium">
              Cargando sedes...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>