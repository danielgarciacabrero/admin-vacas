<script setup>
import { ref, onMounted } from 'vue';
import { jwtDecode } from 'jwt-decode';
import client from '../api/client';

// --- Estado de la tabla ---
const vacations = ref([]);

// --- Estado de paginación y ordenación ---
const page = ref(1);
const limit = ref(10);
const sortKey = ref("id");
const sortOrder = ref("ASC");
const hasMore = ref(true);
const loading = ref(false);

// --- Rol del usuario, cognito_id y employee_id ---
const userRole = ref("");
const myCognitoId = ref("");
const myEmployeeId = ref(null);

// --- Estado del panel de acción (aprobar/rechazar) ---
const actionPanel = ref({
  visible: false,
  vacationId: null,
  status: null,
  comment: "",
  processing: false
});

// --- Estado del formulario de solicitar vacaciones ---
const requestForm = ref({
  visible: false,
  start_date: "",
  end_date: "",
  comment: "",
  pdfFile: null,
  processing: false
});

// --- Estado del modal de cancelar ---
const cancelPanel = ref({
  visible: false,
  vacationId: null,
  processing: false
});

// --- Subida de PDF para solicitudes existentes ---
const uploadingPdfId = ref(null);

// --- Leer el rol del token y obtener el employee_id al montar ---
onMounted(async () => {
  const token = localStorage.getItem('idToken');
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userRole.value = decoded['custom:role'];
      myCognitoId.value = decoded.sub;
    } catch (e) {
      console.error("Error al decodificar token", e);
    }
  }

  // Obtenemos nuestro employee_id buscando por cognito_id
  try {
    const res = await client.get('/employees', { params: { limit: 100 } });
    if (res.data.data) {
      const me = res.data.data.find(emp => emp.cognito_id === myCognitoId.value);
      if (me) {
        myEmployeeId.value = me.id;
      }
    }
  } catch (e) {
    console.error("Error obteniendo employee_id", e);
  }

  fetchVacations();
});

// --- Llamada al backend con los parámetros ---
const fetchVacations = async () => {
  loading.value = true;
  try {
    const res = await client.get('/vacations', {
      params: {
        page: page.value,
        limit: limit.value,
        sort: sortKey.value,
        order: sortOrder.value
      }
    });
    vacations.value = res.data.data;
    hasMore.value = res.data.data.length >= limit.value;
  } catch (error) {
    console.error("Error al cargar vacaciones", error);
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
  fetchVacations();
};

// --- Paginación ---
const prevPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchVacations();
  }
};

const nextPage = () => {
  if (hasMore.value) {
    page.value++;
    fetchVacations();
  }
};

// ========================================
// APROBAR / RECHAZAR (supervisor)
// ========================================
const openAction = (vacationId, status) => {
  actionPanel.value = {
    visible: true,
    vacationId,
    status,
    comment: "",
    processing: false
  };
};

const closeAction = () => {
  actionPanel.value.visible = false;
};

const confirmAction = async () => {
  actionPanel.value.processing = true;
  try {
    await client.put(`/vacations/${actionPanel.value.vacationId}`, {
      status: actionPanel.value.status,
      supervisor_comment: actionPanel.value.comment || null
    });
    closeAction();
    fetchVacations();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al procesar la solicitud";
    alert(msg);
  } finally {
    actionPanel.value.processing = false;
  }
};

// ========================================
// SOLICITAR VACACIONES (empleado)
// ========================================
const openRequestForm = () => {
  requestForm.value = {
    visible: true,
    start_date: "",
    end_date: "",
    comment: "",
    pdfFile: null,
    processing: false
  };
};

const closeRequestForm = () => {
  requestForm.value.visible = false;
};

const onPdfSelected = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    alert("El archivo debe ser un PDF");
    event.target.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("El PDF no puede superar los 5MB");
    event.target.value = '';
    return;
  }
  requestForm.value.pdfFile = file;
};

const submitRequest = async () => {
  if (!requestForm.value.start_date || !requestForm.value.end_date) {
    return alert("Debes seleccionar fecha de inicio y fin");
  }
  if (requestForm.value.start_date > requestForm.value.end_date) {
    return alert("La fecha de inicio no puede ser posterior a la de fin");
  }
  if (!myEmployeeId.value) {
    return alert("No se ha podido obtener tu ID de empleado. Recarga la página.");
  }

  requestForm.value.processing = true;
  try {
    // 1. Crear la solicitud
    const res = await client.post('/vacations', {
      employee_id: myEmployeeId.value,
      start_date: requestForm.value.start_date,
      end_date: requestForm.value.end_date,
      employee_comment: requestForm.value.comment || null
    });

    // 2. Si hay PDF adjunto, subirlo a la solicitud recién creada
    if (requestForm.value.pdfFile) {
      const vacationId = res.data.VacationRequest;
      const arrayBuffer = await requestForm.value.pdfFile.arrayBuffer();
      await client.put(`/vacations/${vacationId}/pdf`, arrayBuffer, {
        headers: { 'Content-Type': 'application/pdf' }
      });
    }

    closeRequestForm();
    fetchVacations();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al crear la solicitud";
    alert(msg);
  } finally {
    requestForm.value.processing = false;
  }
};

// ========================================
// SUBIR PDF a solicitud existente
// ========================================
const triggerPdfUpload = (vacationId) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf';
  input.onchange = (e) => handlePdfUpload(e, vacationId);
  input.click();
};

const handlePdfUpload = async (event, vacationId) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') return alert("El archivo debe ser un PDF");
  if (file.size > 5 * 1024 * 1024) return alert("El PDF no puede superar los 5MB");

  uploadingPdfId.value = vacationId;
  try {
    const arrayBuffer = await file.arrayBuffer();
    await client.put(`/vacations/${vacationId}/pdf`, arrayBuffer, {
      headers: { 'Content-Type': 'application/pdf' }
    });
    fetchVacations();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al subir el PDF";
    alert(msg);
  } finally {
    uploadingPdfId.value = null;
  }
};

// ========================================
// CANCELAR SOLICITUD (empleado)
// ========================================
const openCancelPanel = (vacationId) => {
  cancelPanel.value = {
    visible: true,
    vacationId,
    processing: false
  };
};

const closeCancelPanel = () => {
  cancelPanel.value.visible = false;
};

const confirmCancel = async () => {
  cancelPanel.value.processing = true;
  try {
    await client.put(`/vacations/${cancelPanel.value.vacationId}/cancel`);
    closeCancelPanel();
    fetchVacations();
  } catch (error) {
    const msg = error.response?.data?.message || "Error al cancelar la solicitud";
    alert(msg);
  } finally {
    cancelPanel.value.processing = false;
  }
};

// --- Helpers ---
const isSupervisor = () => userRole.value === "2";

const canCancel = (req) => {
  return req.employee_id === myEmployeeId.value && (req.status === 0 || req.status === 1);
};

// ¿Es mi solicitud? Para mostrar botón de subir PDF
const isMyVacation = (req) => req.employee_id === myEmployeeId.value;

const formatStatus = (status) => {
  const map = { 0: 'Pendiente', 1: 'Aprobado', 2: 'Rechazado', 3: 'Cancelado' };
  return map[status] || 'Desconocido';
};

const statusClass = (status) => {
  const map = {
    0: 'bg-yellow-100 text-yellow-700',
    1: 'bg-green-100 text-green-700',
    2: 'bg-red-100 text-red-700',
    3: 'bg-gray-100 text-gray-700'
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Cabecera con botón de solicitar -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h3 class="text-3xl font-black text-gray-800 tracking-tight">Solicitudes de Vacaciones</h3>
        <p class="text-gray-500 font-medium">Consulta y gestiona las solicitudes</p>
      </div>
      <button 
        @click="openRequestForm"
        class="px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
      >
        <span class="text-lg">+</span> Solicitar vacaciones
      </button>
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50/50 border-b border-gray-100">
            <th @click="sortBy('id')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              ID <span v-if="sortKey === 'id'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('employee_id')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Empleado <span v-if="sortKey === 'employee_id'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('start_date')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Inicio <span v-if="sortKey === 'start_date'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('end_date')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Fin <span v-if="sortKey === 'end_date'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th @click="sortBy('status')" class="p-5 font-bold text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">
              Estado <span v-if="sortKey === 'status'">{{ sortOrder === 'ASC' ? '↑' : '↓' }}</span>
            </th>
            <th class="p-5 font-bold text-gray-600 uppercase text-xs tracking-wider text-center">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="req in vacations" :key="req.id" class="hover:bg-indigo-50/30 transition-colors">
            <td class="p-5 font-semibold text-gray-700">{{ req.id }}</td>
            <td class="p-5 text-gray-500 font-medium">{{ req.employee_id }}</td>
            <td class="p-5 text-gray-500 font-medium">{{ formatDate(req.start_date) }}</td>
            <td class="p-5 text-gray-500 font-medium">{{ formatDate(req.end_date) }}</td>
            <td class="p-5">
              <span class="px-3 py-1 rounded-lg font-bold text-xs" :class="statusClass(req.status)">
                {{ formatStatus(req.status) }}
              </span>
            </td>
            <td class="p-5 text-center">
              <div class="flex gap-2 justify-center flex-wrap">
                <!-- Aprobar/Rechazar: supervisor + pendientes -->
                <template v-if="isSupervisor() && req.status === 0">
                  <button 
                    @click="openAction(req.id, 1)"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                  >
                    Aprobar
                  </button>
                  <button 
                    @click="openAction(req.id, 2)"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                  >
                    Rechazar
                  </button>
                </template>

                <!-- Cancelar: mi solicitud + pendiente o aprobada -->
                <button 
                  v-if="canCancel(req)"
                  @click="openCancelPanel(req.id)"
                  class="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>

                <!-- Subir PDF: mi solicitud -->
                <button 
                  v-if="isMyVacation(req) && (req.status === 0 || req.status === 1)"
                  @click="triggerPdfUpload(req.id)"
                  :disabled="uploadingPdfId === req.id"
                  class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all"
                >
                  {{ uploadingPdfId === req.id ? 'Subiendo...' : (req.pdf_url ? 'Cambiar PDF' : 'Subir PDF') }}
                </button>

                <!-- Ver PDF si existe -->
                <a 
                  v-if="req.pdf_url"
                  :href="req.pdf_url"
                  target="_blank"
                  class="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all"
                >
                  Ver PDF
                </a>

                <!-- Guion si no hay acciones -->
                <span 
                  v-if="!canCancel(req) && !(isSupervisor() && req.status === 0) && !isMyVacation(req) && !req.pdf_url" 
                  class="text-xs text-gray-400"
                >—</span>
              </div>
            </td>
          </tr>
          <tr v-if="vacations.length === 0">
            <td colspan="6" class="p-20 text-center text-gray-400 font-medium">
              No hay solicitudes de vacaciones.
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

    <!-- ====== MODAL: Aprobar / Rechazar ====== -->
    <div v-if="actionPanel.visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-2">
          {{ actionPanel.status === 1 ? '¿Aprobar solicitud?' : '¿Rechazar solicitud?' }}
        </h3>
        <p class="text-sm text-gray-500 mb-4">
          Solicitud #{{ actionPanel.vacationId }} · 
          {{ actionPanel.status === 1 ? 'Se descontarán los días al empleado.' : 'El empleado será notificado del rechazo.' }}
        </p>
        <label class="block text-sm font-medium text-gray-700 mb-1">Comentario (opcional)</label>
        <textarea 
          v-model="actionPanel.comment" rows="3"
          placeholder="Ej: Aprobado, disfruta las vacaciones..."
          class="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none mb-4"
        ></textarea>
        <div class="flex gap-3 justify-end">
          <button @click="closeAction" class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Volver</button>
          <button @click="confirmAction" :disabled="actionPanel.processing"
            class="px-4 py-2 text-sm font-bold text-white rounded-xl transition-all"
            :class="actionPanel.status === 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'">
            {{ actionPanel.processing ? 'Procesando...' : (actionPanel.status === 1 ? 'Confirmar aprobación' : 'Confirmar rechazo') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL: Solicitar vacaciones + PDF opcional ====== -->
    <div v-if="requestForm.visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Solicitar vacaciones</h3>
        <p class="text-sm text-gray-500 mb-5">Selecciona las fechas y adjunta un documento si quieres.</p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
        <input v-model="requestForm.start_date" type="date"
          class="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 mb-4" />

        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de fin</label>
        <input v-model="requestForm.end_date" type="date"
          class="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 mb-4" />

        <label class="block text-sm font-medium text-gray-700 mb-1">Comentario (opcional)</label>
        <textarea v-model="requestForm.comment" rows="2"
          placeholder="Ej: Viaje familiar, cita médica..."
          class="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none mb-4"
        ></textarea>

        <!-- Campo PDF opcional -->
        <label class="block text-sm font-medium text-gray-700 mb-1">Documento PDF (opcional)</label>
        <div class="flex items-center gap-3 mb-4">
          <input type="file" accept="application/pdf" @change="onPdfSelected"
            class="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
          <span v-if="requestForm.pdfFile" class="text-xs text-green-600 font-medium">
            {{ requestForm.pdfFile.name }}
          </span>
        </div>

        <div class="flex gap-3 justify-end">
          <button @click="closeRequestForm"
            class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            Cancelar
          </button>
          <button @click="submitRequest" :disabled="requestForm.processing"
            class="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all">
            {{ requestForm.processing ? 'Enviando...' : 'Enviar solicitud' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ====== MODAL: Cancelar solicitud ====== -->
    <div v-if="cancelPanel.visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-bold text-gray-800 mb-2">¿Cancelar solicitud?</h3>
        <p class="text-sm text-gray-500 mb-5">
          Solicitud #{{ cancelPanel.vacationId }} · Si estaba aprobada, se te devolverán los días de vacaciones.
        </p>
        <div class="flex gap-3 justify-end">
          <button @click="closeCancelPanel" class="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Volver</button>
          <button @click="confirmCancel" :disabled="cancelPanel.processing"
            class="px-4 py-2 text-sm font-bold text-white bg-gray-600 rounded-xl hover:bg-gray-700 transition-all">
            {{ cancelPanel.processing ? 'Cancelando...' : 'Confirmar cancelación' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>