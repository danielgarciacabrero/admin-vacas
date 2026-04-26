<script setup>
import { ref } from 'vue';
import client from '../api/client';

// estado de la subida
const uploading = ref(false);
const uploadResult = ref(null);
const uploadError = ref("");

// cuando el ceo selecciona el archivo excel
const onExcelSelected = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // comprobamos que sea un excel
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    alert("El archivo debe ser un Excel (.xlsx)");
    event.target.value = '';
    return;
  }

  uploading.value = true;
  uploadResult.value = null;
  uploadError.value = "";

  try {
    // leemos el archivo como ArrayBuffer para mandarlo en binario
    const arrayBuffer = await file.arrayBuffer();

    const res = await client.post('/auth/bulk-register', arrayBuffer, {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    });

    uploadResult.value = res.data;
  } catch (error) {
    uploadError.value = error.response?.data?.message || "Error al subir el Excel";
  } finally {
    uploading.value = false;
    event.target.value = '';
  }
};
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Cabecera -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div>
        <h3 class="text-3xl font-black text-gray-800 tracking-tight">Registro Masivo</h3>
        <p class="text-gray-500 font-medium">Sube un Excel para registrar empleados en Cognito y en la base de datos</p>
      </div>

      <!-- Boton para subir Excel -->
      <label
        class="px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 cursor-pointer">
        <span class="text-lg">📋</span>
        {{ uploading ? 'Registrando...' : 'Subir Excel' }}
        <input
          type="file"
          accept=".xlsx,.xls"
          @change="onExcelSelected"
          :disabled="uploading"
          class="hidden"
        />
      </label>
    </div>

    <!-- Info del formato -->
    <div class="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
      <p class="font-bold text-blue-800 text-sm">Formato del Excel</p>
      <p class="text-blue-600 text-xs mt-1">La primera fila debe tener las cabeceras: <span class="font-mono bg-blue-100 px-1 rounded">nombre</span>, <span class="font-mono bg-blue-100 px-1 rounded">email</span>, <span class="font-mono bg-blue-100 px-1 rounded">rol</span></p>
      <p class="text-blue-600 text-xs mt-0.5">Rol: <span class="font-mono bg-blue-100 px-1 rounded">1</span> = Empleado, <span class="font-mono bg-blue-100 px-1 rounded">2</span> = Supervisor</p>
      <p class="text-blue-600 text-xs mt-0.5">Todos los usuarios se crean con la contraseña temporal <span class="font-mono bg-blue-100 px-1 rounded">AppVacas2026!</span> que deben cambiar en su primer inicio de sesión.</p>
    </div>

    <!-- Ejemplo visual del excel -->
    <div class="mb-6 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div class="px-5 py-3 bg-gray-50 border-b border-gray-100">
        <p class="font-bold text-gray-600 text-xs uppercase tracking-wider">Ejemplo del Excel</p>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="p-4 font-bold text-gray-600 text-xs uppercase">nombre</th>
            <th class="p-4 font-bold text-gray-600 text-xs uppercase">email</th>
            <th class="p-4 font-bold text-gray-600 text-xs uppercase">rol</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr class="text-gray-500 text-sm">
            <td class="p-4">Juan García</td>
            <td class="p-4">juan@empresa.com</td>
            <td class="p-4">1</td>
          </tr>
          <tr class="text-gray-500 text-sm">
            <td class="p-4">María López</td>
            <td class="p-4">maria@empresa.com</td>
            <td class="p-4">2</td>
          </tr>
          <tr class="text-gray-500 text-sm">
            <td class="p-4">Pedro Ruiz</td>
            <td class="p-4">pedro@empresa.com</td>
            <td class="p-4">1</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Resultado de la subida -->
    <div v-if="uploadResult" class="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-bold text-green-800 text-sm">{{ uploadResult.message }}</p>
          <p class="text-green-600 text-xs mt-1">{{ uploadResult.creados }} de {{ uploadResult.total }} empleados registrados</p>
          <p class="text-green-600 text-xs mt-0.5">Contraseña temporal: <span class="font-mono bg-green-100 px-1 rounded">{{ uploadResult.password_temporal }}</span></p>
          <div v-if="uploadResult.errores && uploadResult.errores.length > 0" class="mt-3">
            <p class="text-red-600 text-xs font-bold">Errores:</p>
            <p v-for="(err, i) in uploadResult.errores" :key="i" class="text-red-500 text-xs mt-0.5">{{ err }}</p>
          </div>
        </div>
        <button @click="uploadResult = null" class="text-green-400 hover:text-green-600 text-lg cursor-pointer">&times;</button>
      </div>
    </div>

    <!-- Error general -->
    <div v-if="uploadError" class="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="font-bold text-red-800 text-sm">{{ uploadError }}</p>
        <button @click="uploadError = ''" class="text-red-400 hover:text-red-600 text-lg cursor-pointer">&times;</button>
      </div>
    </div>
  </div>
</template>