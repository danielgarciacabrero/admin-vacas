<script setup>
import { ref, computed, onMounted } from 'vue';
import client from '../api/client';
import * as XLSX from 'xlsx';

const empleados = ref([]);
const turnos = ref([]);
const fichajes = ref([]);
const turnoForm = ref({ employee_id: null, hora_inicio: '', hora_fin: '' });
const turnoMsg = ref('');
const turnoError = ref('');
const filtroEmpleado = ref('');
const filtroDesde = ref('');
const filtroHasta = ref('');

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

// resumen de horas extra agrupado por empleado
// se recalcula automaticamente cada vez que cambian los fichajes
const resumenHorasExtra = computed(() => {
  const resumen = {};
  fichajes.value.forEach(f => {
    if (f.horas_extra && parseFloat(f.horas_extra) > 0) {
      if (!resumen[f.employee_id]) {
        resumen[f.employee_id] = {
          nombre: f.employee_name,
          totalExtra: 0,
          dias: 0
        };
      }
      resumen[f.employee_id].totalExtra += parseFloat(f.horas_extra);
      resumen[f.employee_id].dias++;
    }
  });
  // convertimos el objeto a array y ordenamos por horas extra descendente
  return Object.values(resumen)
    .map(r => ({ ...r, totalExtra: r.totalExtra.toFixed(2) }))
    .sort((a, b) => b.totalExtra - a.totalExtra);
});

// total global de horas extra y retrasos
const totalHorasExtra = computed(() => {
  return fichajes.value
    .reduce((sum, f) => sum + (parseFloat(f.horas_extra) || 0), 0)
    .toFixed(2);
});

const totalRetrasos = computed(() => {
  return fichajes.value.filter(f => f.minutos_retraso && f.minutos_retraso > 30).length;
});

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

const exportarExcel = () => {
  if (fichajes.value.length === 0) {
    alert('No hay fichajes para exportar');
    return;
  }
  try {
    // hoja 1: detalle de fichajes
    const filas = fichajes.value.map(f => ({
      'Empleado': f.employee_name,
      'Fecha': f.fecha,
      'Entrada': f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString('es-ES') : '',
      'Salida': f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString('es-ES') : 'Sin fichar',
      'Horas': f.horas_trabajadas || 0,
      'Horas Extra': f.horas_extra || 0,
      'Min. Retraso': f.minutos_retraso || 0,
      'Fuera horario': f.fuera_de_horario ? 'Si' : 'No',
      'Comentario entrada': f.comentario_entrada || '',
      'Comentario salida': f.comentario_salida || ''
    }));

    // hoja 2: resumen de horas extra por empleado
    const filasResumen = resumenHorasExtra.value.map(r => ({
      'Empleado': r.nombre,
      'Horas Extra Totales': r.totalExtra,
      'Dias con Extra': r.dias
    }));

    const workbook = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(workbook, ws1, 'Fichajes');

    if (filasResumen.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(filasResumen);
      XLSX.utils.book_append_sheet(workbook, ws2, 'Horas Extra');
    }

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fichajes.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generando excel:', error);
    alert('Error al generar el Excel');
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

    <!-- Tarjetas resumen -->
    <div v-if="fichajes.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <p class="text-blue-600 text-sm font-medium">Total horas extra</p>
        <p class="text-3xl font-black text-blue-700">{{ totalHorasExtra }}h</p>
        <p class="text-blue-400 text-xs mt-1">En el periodo filtrado</p>
      </div>
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p class="text-amber-600 text-sm font-medium">Llegadas tarde (+30 min)</p>
        <p class="text-3xl font-black text-amber-700">{{ totalRetrasos }}</p>
        <p class="text-amber-400 text-xs mt-1">En el periodo filtrado</p>
      </div>
    </div>

    <!-- Resumen horas extra por empleado -->
    <div v-if="resumenHorasExtra.length > 0" class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-blue-200 overflow-hidden mb-8">
      <div class="p-5 border-b border-blue-100 bg-blue-50/50">
        <h4 class="font-bold text-blue-800">Horas extra por empleado</h4>
        <p class="text-blue-500 text-xs mt-1">Acumulado del periodo filtrado — para pago a final de mes</p>
      </div>
      <table class="w-full text-left border-collapse">
        <thead><tr class="bg-blue-50/30 border-b border-blue-100">
          <th class="p-4 font-bold text-blue-700 uppercase text-xs">Empleado</th>
          <th class="p-4 font-bold text-blue-700 uppercase text-xs">Horas extra acumuladas</th>
          <th class="p-4 font-bold text-blue-700 uppercase text-xs">Dias con extra</th>
        </tr></thead>
        <tbody class="divide-y divide-blue-50">
          <tr v-for="r in resumenHorasExtra" :key="r.nombre" class="hover:bg-blue-50/30 transition-colors">
            <td class="p-4 font-semibold text-gray-700 text-sm">{{ r.nombre }}</td>
            <td class="p-4">
              <span class="font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-lg text-sm">+{{ r.totalExtra }}h</span>
            </td>
            <td class="p-4 text-sm text-gray-600">{{ r.dias }} {{ r.dias === 1 ? 'dia' : 'dias' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Asignar turno -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-8">
      <h4 class="text-lg font-bold text-gray-700 mb-4">Asignar turno</h4>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Empleado</label>
          <select v-model="turnoForm.employee_id" class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm bg-white text-sm">
            <option :value="null" disabled>Selecciona empleado</option>
            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hora inicio</label>
          <input v-model="turnoForm.hora_inicio" type="time" class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hora fin</label>
          <input v-model="turnoForm.hora_fin" type="time" class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div class="flex items-end">
          <button @click="asignarTurno" class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Asignar</button>
        </div>
      </div>
      <div v-if="turnoMsg" class="mt-3 text-green-600 text-sm font-medium">{{ turnoMsg }}</div>
      <div v-if="turnoError" class="mt-3 text-red-600 text-sm font-medium">{{ turnoError }}</div>
    </div>

    <!-- Turnos actuales -->
    <div v-if="turnos.length > 0" class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
      <div class="p-5 border-b border-gray-100"><h4 class="font-bold text-gray-700">Turnos asignados</h4></div>
      <table class="w-full text-left border-collapse">
        <thead><tr class="bg-gray-50/50 border-b border-gray-100">
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Empleado</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Email</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Entrada</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Salida</th>
        </tr></thead>
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

    <!-- Filtros -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-8">
      <h4 class="text-lg font-bold text-gray-700 mb-4">Fichajes</h4>
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-600 mb-1 block">Empleado</label>
          <select v-model="filtroEmpleado" class="w-full border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm bg-white text-sm">
            <option value="">Todos</option>
            <option v-for="emp in empleados" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Desde</label>
          <input v-model="filtroDesde" type="date" class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 mb-1 block">Hasta</label>
          <input v-model="filtroHasta" type="date" class="border border-gray-300 p-3 rounded-xl outline-none focus:border-indigo-500 shadow-sm text-sm" />
        </div>
        <button @click="aplicarFiltros" class="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">Filtrar</button>
        <button @click="exportarExcel" class="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all">Exportar Excel</button>
      </div>
    </div>

    <!-- Tabla de fichajes -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead><tr class="bg-gray-50/50 border-b border-gray-100">
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Empleado</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Fecha</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Entrada</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Salida</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Horas</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Extra</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Retraso</th>
          <th class="p-4 font-bold text-gray-600 uppercase text-xs">Comentarios</th>
        </tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="f in fichajes" :key="f.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-4 font-semibold text-gray-700 text-sm">{{ f.employee_name }}</td>
            <td class="p-4 text-sm text-gray-700">{{ formatFecha(f.fecha) }}</td>
            <td class="p-4 text-sm text-gray-700">{{ formatHora(f.hora_entrada) }}</td>
            <td class="p-4 text-sm text-gray-700">{{ f.hora_salida ? formatHora(f.hora_salida) : 'En curso' }}</td>
            <td class="p-4 text-sm">
              <span v-if="f.horas_trabajadas" class="font-bold" :class="f.fuera_de_horario ? 'text-red-600' : 'text-green-600'">{{ f.horas_trabajadas }}h</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-sm">
              <span v-if="f.horas_extra && parseFloat(f.horas_extra) > 0" class="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">+{{ f.horas_extra }}h</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-sm">
              <span v-if="f.minutos_retraso && f.minutos_retraso > 30" class="font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{{ f.minutos_retraso }} min ⚠️</span>
              <span v-else-if="f.minutos_retraso && f.minutos_retraso > 0" class="text-gray-500">{{ f.minutos_retraso }} min</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-xs text-gray-400">
              <span v-if="f.comentario_entrada">{{ f.comentario_entrada }}</span>
              <span v-if="f.comentario_entrada && f.comentario_salida"> | </span>
              <span v-if="f.comentario_salida">{{ f.comentario_salida }}</span>
            </td>
          </tr>
          <tr v-if="fichajes.length === 0">
            <td colspan="8" class="p-12 text-center text-gray-400">No hay fichajes</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>