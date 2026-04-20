<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Gestión de Supervisores</h1>
 
    <div class="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
      <h2 class="text-lg font-semibold mb-4">Asignar Nuevo Subordinado</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Supervisor</label>
          <select v-model="form.supervisor_id" class="mt-1 block w-full border rounded-md p-2">
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.name }} ({{ emp.role === 2 ? 'Admin/Sup' : 'Empleado' }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Empleado a Cargo</label>
          <select v-model="form.employee_id" class="mt-1 block w-full border rounded-md p-2">
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.name }}
            </option>
          </select>
        </div>
      </div>
      <button 
        @click="assignSupervisor" 
        class="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
      >
        Guardar Relación
      </button>
    </div>
 
    <div class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor Asignado</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="rel in relations" :key="rel.employee_id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ rel.employee_name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              <span v-if="rel.supervisor_name" class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                {{ rel.supervisor_name }}
              </span>
              <span v-else class="text-gray-400 italic">Sin supervisor</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
 
<script setup>
import { ref, onMounted } from 'vue';
import client from '../api/client';
 
// Estado
const employees = ref([]);
const relations = ref([]);
const form = ref({
  supervisor_id: null,
  employee_id: null
});
 
// Cargar empleados para los selectores (Usa employee.service.js)
const fetchEmployees = async () => {
  try {
    const res = await client.get('/employees', { params: { limit: 100 } });
    employees.value = res.data.data;
  } catch (error) {
    console.error("Error cargando empleados", error);
  }
};
 
// Cargar relaciones actuales (Usa supervisor.service.js -> getEmployeesWhithSupervisor)
const fetchRelations = async () => {
  try {
    const res = await client.get('/supervisor-employees');
    relations.value = res.data;
  } catch (error) {
    console.error("Error cargando relaciones", error);
  }
};
 
// Ejecutar asignación (Usa supervisor.service.js -> assignEmployeeToSupervisor)
const assignSupervisor = async () => {
  if (!form.value.supervisor_id || !form.value.employee_id) {
    return alert("Selecciona ambos campos");
  }
 
  try {
    await client.post('/supervisor-employees', form.value);
    alert("Empleado asignado correctamente");
    fetchRelations(); // Refrescar tabla
    form.value.employee_id = null; // Limpiar selección
  } catch (error) {
    alert("Error: " + (error.response?.data?.message || "No se pudo realizar la asignación"));
  }
};
 
onMounted(() => {
  fetchEmployees();
  fetchRelations();
});
</script>