<script setup>
import { ref, onMounted } from 'vue';
import client from '../api/client';

// lista de empleados para el selector
const empleados = ref([]);
// lista de turnos asignados
const turnos = ref([]);
// lista de fichajes
const fichajes = ref([]);

// formulario de asignar turno
const turnoForm = ref({ employee_id: null, hora_inicio: '', hora_fin: '' });
const turnoMsg = ref('');
const turnoError = ref('');

// filtros para fichajes
const filtroEmpleado = ref('');
const filtroDesde = ref('');
const filtroHasta = ref('');

// estado de carga
const exportando = ref(false);

onMounted(async () => {
  await cargarEmpleados();
  await cargarTurnos();
  await cargarFichajes();
});

const cargarEmpleados = async () => {
  try {
    const res = await client.get('/employees', { params: { limit: 100 } });
    empleados.value = res.data.data;
  } catch (error) {
    console.error("Error cargando empleados", error);
  }
};

const cargarTurnos = async () => {
  try {
    const res = await client.get('/turnos');
    turnos.value = res.data.data;
  } catch (error) {
    console.error("Error cargando turnos", error);
  }
};

const cargarFichajes = async () => {
  try {
    const params = {};
    if (filtroEmpleado.value) params.employee_id = filtroEmpleado.value;
    if (filtroDesde.value) params.fecha_desde = filtroDesde.value;
    if (filtroHasta.value) params.fecha_hasta = filtroHasta.value;
    const res = await client.get('/fichajes', { params });
    fichajes.value = res.data.data;
  } catch (error) {
    console.error("Error cargando fichajes", error);
  }
};

const asignarTurno = async () => {
  turnoMsg.value = '';
  turnoError.value = '';
  if (!turnoForm.value.employee_id || !turnoForm.value.hora_inicio || !turnoForm.value.hora_fin) {
    turnoError.value = 'Todos los campos son obligatorios';
    return;
  }
  try {
    await client.post('/turnos', {
      employee_id: turnoForm.value.employee_id,
      hora_inicio: turnoForm.value.hora_inicio,
      hora_fin: turnoForm.value.hora_fin
    });
    turnoMsg.value = 'Turno asignado correctamente';
    turnoForm.value = { employee_id: null, hora_inicio: '', hora_fin: '' };
    await cargarTurnos();
    setTimeout(() => { turnoMsg.value = ''; }, 3000);
  } catch (error) {
    turnoError.value = error.response?.data?.message || 'Error asignando turno';
  }
};

const aplicarFiltros = () => {
  cargarFichajes();
};

const exportarExcel = async () => {
  exportando.value = true;
  try {
    const params = {};
    if (filtroEmpleado.value) params.employee_id = filtroEmpleado.value;
    if (filtroDesde.value) params.fecha_desde = filtroDesde.value;
    if (filtroHasta.value) params.fecha_hasta = filtroHasta.value;

    const res = await client.get('/fichajes/export', {
      params,
      responseType: 'blob'
    });

    // descargamos el excel
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fichajes.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert('Error exportando fichajes');
  } finally {
    exportando.value = false;
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
  <div class="p-6 max-w-6xl mx-auto">
    <div class="mb-8">
      <h3 class="text-3xl font-black text-gray-800 tracking-tight">Registro Horario</h3>
      <p class="text-gray-500 font-medium">Gestiona turnos y consulta fichajes</p>
    </div>

    <!-- Asignar turno -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-8">
      <h4 class="text-lg font-bold text-gray-700 mb-4">Asignar turno</h4>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Empleado</label>
          <select v-model="turnoForm.employee_id"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm bg-white text-sm">
            <option :value="null" disabled>Selecciona empleado</option>
            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hora inicio</label>
          <input v-model="turnoForm.hora_inicio" type="time"
            class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hora fin</label>
          <input v-model="turnoForm.hora_fin" type="time"
            class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div class="flex items-end">
          <button @click="asignarTurno"
            class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            Asignar
          </button>
        </div>
      </div>
      <div v-if="turnoMsg" class="mt-3 text-green-600 text-sm font-medium">{{ turnoMsg }}</div>
      <div v-if="turnoError" class="mt-3 text-red-600 text-sm font-medium">{{ turnoError }}</div>
    </div>

    <!-- Turnos actuales -->
    <div v-if="turnos.length > 0" class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
      <div class="p-5 border-b border-gray-100">
        <h4 class="font-bold text-gray-700">Turnos asignados</h4>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Empleado</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Email</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Entrada</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Salida</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="t in turnos" :key="t.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-4 font-semibold text-gray-700 text-sm">{{ t.employee_name }}</td>
            <td class="p-4 text-gray-500 text-sm">{{ t.employee_email }}</td>
            <td class="p-4 text-sm text-gray-700">{{ t.hora_inicio }}</td>
            <td class="p-4 text-sm text-gray-700">{{ t.hora_fin }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Filtros de fichajes -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-8">
      <h4 class="text-lg font-bold text-gray-700 mb-4">Fichajes</h4>
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Empleado</label>
          <select v-model="filtroEmpleado"
            class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm bg-white text-sm">
            <option value="">Todos</option>
            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Desde</label>
          <input v-model="filtroDesde" type="date"
            class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hasta</label>
          <input v-model="filtroHasta" type="date"
            class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <button @click="aplicarFiltros"
          class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">
          Filtrar
        </button>
        <button @click="exportarExcel" :disabled="exportando"
          class="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50">
          {{ exportando ? 'Exportando...' : 'Exportar Excel' }}
        </button>
      </div>
    </div>

    <!-- Tabla de fichajes -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Empleado</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Fecha</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Entrada</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Salida</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Horas</th>
            <th class="p-4 font-bold text-gray-600 uppercase text-xs">Comentarios</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="f in fichajes" :key="f.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-4 font-semibold text-gray-700 text-sm">{{ f.employee_name }}</td>
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
              <span v-if="f.comentario_entrada">{{ f.comentario_entrada }}</span>
              <span v-if="f.comentario_entrada && f.comentario_salida"> | </span>
              <span v-if="f.comentario_salida">{{ f.comentario_salida }}</span>
            </td>
          </tr>
          <tr v-if="fichajes.length === 0">
            <td colspan="6" class="p-12 text-center text-gray-400">No hay fichajes</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>