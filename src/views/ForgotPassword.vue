<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 p-6">
    <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
      <h2 class="text-2xl font-bold text-indigo-600 mb-6 text-center">Recuperar Contraseña</h2>
      
      <div v-if="step === 1" class="space-y-4">
        <input v-model="email" type="email" placeholder="Tu email" class="w-full border p-3 rounded-lg" />
        <button @click="handleForgot" class="w-full bg-indigo-600 text-white p-3 rounded-lg">Enviar código</button>
      </div>

      <div v-else class="space-y-4">
        <p class="text-sm text-gray-500">Introduce el código que enviamos a tu email</p>
        <input v-model="code" type="text" placeholder="Código de 6 dígitos" class="w-full border p-3 rounded-lg" />
        <input v-model="newPassword" type="password" placeholder="Nueva contraseña" class="w-full border p-3 rounded-lg" />
        <button @click="handleConfirm" class="w-full bg-green-600 text-white p-3 rounded-lg">Cambiar contraseña</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import client from '../api/client';
import { useRouter } from 'vue-router';

const email = ref('');
const code = ref('');
const newPassword = ref('');
const step = ref(1);
const router = useRouter();

const handleForgot = async () => {
  try {
    await client.post('/auth/forgot-password', { email: email.value });
    step.value = 2;
  } catch (e) { alert("Error al enviar el mail"); }
};

const handleConfirm = async () => {
  try {
    await client.post('/auth/confirm-forgot-password', { 
      email: email.value, code: code.value, newPassword: newPassword.value 
    });
    alert("¡Contraseña cambiada!");
    router.push('/');
  } catch (e) { alert("Error al confirmar el cambio"); }
};
</script>