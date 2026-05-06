<script setup>
import { ref, onMounted } from 'vue';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';

// estado del fichaje
const fichajeAbierto = ref(null);
const loading = ref(true);
const comentario = ref('');
const fichando = ref(false);
const mensaje = ref('');
const mensajeError = ref('');

// historial de mis fichajes
const misFichajes = ref([]);

onMounted(async () => {
  await checkEstado();
  await cargarMisFichajes();
});

// comprobamos si tenemos fichaje abierto
const checkEstado = async () => {
  loading.value = true;
  try {
    const res = await client.get('/fichajes/abierto');
    fichajeAbierto.value = res.data.data;
  } catch (error) {
    console.error("Error comprobando estado", error);
  } finally {
    loading.value = false;
  }
};

// cargamos mis fichajes recientes
const cargarMisFichajes = async () => {
  try {
    // sacamos nuestro employee_id
    const token = localStorage.getItem('idToken');
    const decoded = jwtDecode(token);
    const resEmp = await client.get('/employees');
    const yo = resEmp.data.data.find(e => e.cognito_id === decoded.sub);
    if (yo) {
      const res = await client.get('/fichajes', {
        params: { employee_id: yo.id }
      });
      misFichajes.value = res.data.data;
    }
  } catch (error) {
    console.error("Error cargando fichajes", error);
  }
};

// fichamos entrada
const ficharEntrada = async () => {
  fichando.value = true;
  mensaje.value = '';
  mensajeError.value = '';
  try {
    const body = {};
    if (comentario.value.trim()) {
      body.comentario = comentario.value.trim();
    }
    const res = await client.post('/fichajes/entrada', body);
    mensaje.value = res.data.message;
    if (res.data.data.fuera_de_horario) {
      mensaje.value += ' (fuera de horario)';
    }
    comentario.value = '';
    await checkEstado();
    await cargarMisFichajes();
  } catch (error) {
    mensajeError.value = error.response?.data?.message || 'Error al fichar entrada';
  } finally {
    fichando.value = false;
  }
};

// fichamos salida
const ficharSalida = async () => {
  fichando.value = true;
  mensaje.value = '';
  mensajeError.value = '';
  try {
    const body = {};
    if (comentario.value.trim()) {
      body.comentario = comentario.value.trim();
    }
    const res = await client.put('/fichajes/salida', body);
    mensaje.value = res.data.message + ' (' + res.data.data.horas_trabajadas + 'h)';
    comentario.value = '';
    await checkEstado();
    await cargarMisFichajes();
  } catch (error) {
    mensajeError.value = error.response?.data?.message || 'Error al fichar salida';
  } finally {
    fichando.value = false;
  }
};

// formateamos hora
const formatHora = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const formatFecha = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-ES');
};
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="mb-8">
      <h3 class="text-3xl font-black text-gray-800 tracking-tight">Fichaje</h3>
      <p class="text-gray-500 font-medium">Registra tu entrada y salida</p>
    </div>

    <!-- Cargando -->
    <div v-if="loading" class="text-center text-gray-400 py-20">Cargando...</div>

    <!-- Panel de fichaje -->
    <div v-else class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">

      <!-- Si NO tiene fichaje abierto: mostrar boton de ENTRADA -->
      <div v-if="!fichajeAbierto" class="text-center">
        <div class="text-6xl mb-4">🟢</div>
        <h4 class="text-xl font-bold text-gray-800 mb-2">¿Empiezas tu jornada?</h4>
        <p class="text-gray-500 text-sm mb-6">Pulsa para fichar tu entrada</p>

        <div class="max-w-md mx-auto mb-4">
          <input
            v-model="comentario"
            type="text"
            placeholder="Comentario opcional (ej: entro tarde por consulta médica)"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm"
          />
        </div>

        <button
          @click="ficharEntrada"
          :disabled="fichando"
          class="px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-2xl hover:bg-green-700 transition-all shadow-lg disabled:opacity-50"
        >
          {{ fichando ? 'Fichando...' : 'Fichar Entrada' }}
        </button>
      </div>

      <!-- Si TIENE fichaje abierto: mostrar boton de SALIDA -->
      <div v-else class="text-center">
        <div class="text-6xl mb-4">🔴</div>
        <h4 class="text-xl font-bold text-gray-800 mb-2">Jornada en curso</h4>
        <p class="text-gray-500 text-sm mb-2">
          Entrada fichada a las <span class="font-bold text-indigo-600">{{ formatHora(fichajeAbierto.hora_entrada) }}</span>
        </p>
        <p v-if="fichajeAbierto.comentario_entrada" class="text-gray-400 text-xs mb-6 italic">
          "{{ fichajeAbierto.comentario_entrada }}"
        </p>

        <div class="max-w-md mx-auto mb-4">
          <input
            v-model="comentario"
            type="text"
            placeholder="Comentario de salida (ej: salgo antes por cita médica)"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-red-500 shadow-sm text-sm"
          />
        </div>

        <button
          @click="ficharSalida"
          :disabled="fichando"
          class="px-8 py-4 bg-red-600 text-white font-bold text-lg rounded-2xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50"
        >
          {{ fichando ? 'Fichando...' : 'Fichar Salida' }}
        </button>
      </div>

      <!-- Mensajes -->
      <div v-if="mensaje" class="mt-6 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm text-center">
        {{ mensaje }}
      </div>
      <div v-if="mensajeError" class="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm text-center">
        {{ mensajeError }}
      </div>
    </div>

    <!-- Historial de mis fichajes -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div class="p-5 border-b border-gray-100">
        <h4 class="font-bold text-gray-700">Mi historial de fichajes</h4>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Fecha</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Entrada</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Salida</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Horas</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Comentarios</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="f in misFichajes" :key="f.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-4 text-sm text-gray-700">{{ formatFecha(f.fecha) }}</td>
            <td class="p-4 text-sm text-gray-700">{{ formatHora(f.hora_entrada) }}</td>
            <td class="p-4 text-sm text-gray-700">{{ f.hora_salida ? formatHora(f.hora_salida) : 'En curso' }}</td>
            <td class="p-4 text-sm">
              <span v-if="f.horas_trabajadas" class="font-bold" :class="f.fuera_de_horario ? 'text-red-600' : 'text-green-600'">
                {{ f.horas_trabajadas }}h
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-xs text-gray-400">
              <span v-if="f.comentario_entrada">E: {{ f.comentario_entrada }}</span>
              <span v-if="f.comentario_entrada && f.comentario_salida"> | </span>
              <span v-if="f.comentario_salida">S: {{ f.comentario_salida }}</span>
            </td>
          </tr>
          <tr v-if="misFichajes.length === 0">
            <td colspan="5" class="p-12 text-center text-gray-400">No tienes fichajes todavía</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>