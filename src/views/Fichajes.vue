<script setup>
import { ref, onMounted } from 'vue';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';

const fichajeAbierto = ref(null);
const loading = ref(true);
const comentario = ref('');
const fichando = ref(false);
const mensaje = ref('');
const mensajeError = ref('');
const advertenciaRetraso = ref('');
const misFichajes = ref([]);

onMounted(async () => {
  await checkEstado();
  await cargarMisFichajes();
});

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

const cargarMisFichajes = async () => {
  try {
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

const ficharEntrada = async () => {
  fichando.value = true;
  mensaje.value = '';
  mensajeError.value = '';
  advertenciaRetraso.value = '';
  try {
    const body = {};
    if (comentario.value.trim()) {
      body.comentario = comentario.value.trim();
    }
    const res = await client.post('/fichajes/entrada', body);
    mensaje.value = res.data.message;

    // si llega tarde mostramos advertencia
    if (res.data.data.llegada_tarde) {
      advertenciaRetraso.value = 'Has fichado con ' + res.data.data.minutos_retraso + ' minutos de retraso. Tu supervisor ha sido notificado.';
    } else if (res.data.data.fuera_de_horario) {
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

const ficharSalida = async () => {
  fichando.value = true;
  mensaje.value = '';
  mensajeError.value = '';
  advertenciaRetraso.value = '';
  try {
    const body = {};
    if (comentario.value.trim()) {
      body.comentario = comentario.value.trim();
    }
    const res = await client.put('/fichajes/salida', body);
    mensaje.value = res.data.message + ' (' + res.data.data.horas_trabajadas + 'h)';

    // si tiene horas extra lo mostramos
    if (res.data.data.horas_extra > 0) {
      mensaje.value += ' - Has hecho ' + res.data.data.horas_extra + 'h extra';
    }

    comentario.value = '';
    await checkEstado();
    await cargarMisFichajes();
  } catch (error) {
    mensajeError.value = error.response?.data?.message || 'Error al fichar salida';
  } finally {
    fichando.value = false;
  }
};

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

    <div v-if="loading" class="text-center text-gray-400 py-20">Cargando...</div>

    <div v-else class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 mb-8">

      <!-- Boton de ENTRADA -->
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

      <!-- Boton de SALIDA -->
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

      <!-- Advertencia de retraso -->
      <div v-if="advertenciaRetraso" class="mt-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm text-center">
        <span class="text-lg mr-2">⚠️</span>{{ advertenciaRetraso }}
      </div>

      <!-- Mensaje de exito -->
      <div v-if="mensaje" class="mt-6 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm text-center">
        {{ mensaje }}
      </div>
      <div v-if="mensajeError" class="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm text-center">
        {{ mensajeError }}
      </div>
    </div>

    <!-- Historial -->
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
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Extra</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Retraso</th>
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
            <td class="p-4 text-sm">
              <span v-if="f.horas_extra && f.horas_extra > 0" class="font-bold text-blue-600">+{{ f.horas_extra }}h</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-sm">
              <span v-if="f.minutos_retraso && f.minutos_retraso > 30" class="font-bold text-amber-600">{{ f.minutos_retraso }} min</span>
              <span v-else-if="f.minutos_retraso && f.minutos_retraso > 0" class="text-gray-500">{{ f.minutos_retraso }} min</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-xs text-gray-400">
              <span v-if="f.comentario_entrada">E: {{ f.comentario_entrada }}</span>
              <span v-if="f.comentario_entrada && f.comentario_salida"> | </span>
              <span v-if="f.comentario_salida">S: {{ f.comentario_salida }}</span>
            </td>
          </tr>
          <tr v-if="misFichajes.length === 0">
            <td colspan="7" class="p-12 text-center text-gray-400">No tienes fichajes todavía</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>