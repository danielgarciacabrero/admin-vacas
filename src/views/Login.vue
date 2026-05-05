<template>
  <div class="flex items-center justify-center min-h-screen w-full">
    
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
      
      <h2 class="text-2xl font-bold text-center text-indigo-600 mb-6">
        {{ isRegister ? 'Registrar Empleado' : 'Acceso CMS Vacaciones' }}
      </h2>

      <!-- ====== FORMULARIO DE LOGIN ====== -->
      <div v-if="!isRegister" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Email</label>
          <input 
            v-model="loginForm.email" 
            type="email" 
            placeholder="ejemplo@correo.com"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Contraseña</label>
          <input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="••••••••"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <button 
          @click="handleLogin"
          :disabled="loginLoading"
          class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors mt-2 disabled:opacity-50"
        >
          {{ loginLoading ? 'Entrando...' : 'Entrar al Panel' }}
        </button>

        <router-link 
          to="/forgot-password" 
          class="text-center text-sm text-indigo-500 hover:underline"
        >
          ¿Has olvidado tu contraseña?
        </router-link>

        <div class="border-t border-gray-100 pt-4 mt-2">
          <button 
            @click="showRegister"
            class="w-full text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
          >
            ¿Nuevo empleado? Regístrate aquí
          </button>
        </div>
      </div>

      <!-- ====== FORMULARIO DE REGISTRO ====== -->
      <div v-else class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Nombre completo</label>
          <input 
            v-model="registerForm.name" 
            type="text" 
            placeholder="Daniel García"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Email</label>
          <input 
            v-model="registerForm.email" 
            type="email" 
            placeholder="ejemplo@correo.com"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Contraseña</label>
          <input 
            v-model="registerForm.password" 
            type="password" 
            placeholder="Mínimo 8 caracteres"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Rol</label>
          <select 
            v-model="registerForm.role"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm bg-white"
          >
            <option :value="null" disabled>Selecciona un rol</option>
            <option :value="1">Empleado</option>
            <option :value="2">Supervisor</option>
          </select>
        </div>

        <!-- Selector de sede -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Sede</label>
          <select 
            v-model="registerForm.sede_id"
            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:border-indigo-500 shadow-sm bg-white"
          >
            <option :value="null" disabled>Selecciona tu sede</option>
            <option v-for="sede in sedes" :key="sede.id" :value="sede.id">
              {{ sede.nombre }}
            </option>
          </select>
          <p v-if="sedes.length === 0" class="text-xs text-gray-400 mt-1">Cargando sedes...</p>
        </div>

        <!-- Mensaje de éxito -->
        <div v-if="registerSuccess" class="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
          Empleado registrado correctamente. Ya puedes iniciar sesión.
        </div>

        <!-- Mensaje de error -->
        <div v-if="registerError" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {{ registerError }}
        </div>

        <button 
          @click="handleRegister"
          :disabled="registerLoading"
          class="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors mt-2 disabled:opacity-50"
        >
          {{ registerLoading ? 'Registrando...' : 'Registrar empleado' }}
        </button>

        <div class="border-t border-gray-100 pt-4 mt-2">
          <button 
            @click="isRegister = false; registerSuccess = false; registerError = ''"
            class="w-full text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import client from '../api/client';
import { useRouter } from 'vue-router';

const router = useRouter();

// --- Control de qué formulario se muestra ---
const isRegister = ref(false);

// --- Lista de sedes para el selector ---
const sedes = ref([]);

// --- Estado del login ---
const loginForm = ref({ email: '', password: '' });
const loginLoading = ref(false);

// --- Estado del registro (ahora con sede_id) ---
const registerForm = ref({ name: '', email: '', password: '', role: null, sede_id: null });
const registerLoading = ref(false);
const registerSuccess = ref(false);
const registerError = ref('');

// cuando el usuario pulsa "registrarse" cargamos las sedes del backend
// asi el select ya tiene las opciones disponibles
const showRegister = async () => {
  isRegister.value = true;
  try {
    const res = await client.get('/sedes');
    sedes.value = res.data.data;
  } catch (error) {
    console.error("Error cargando sedes", error);
  }
};

// --- Lógica de login ---
const handleLogin = async () => {
  loginLoading.value = true;
  try {
    const res = await client.post('/auth/login', { 
      email: loginForm.value.email, 
      password: loginForm.value.password 
    });
    
    localStorage.setItem('idToken', res.data.data.idToken);
    router.push('/dashboard/employees');
  } catch (error) {
    alert("Error de login: " + (error.response?.data?.message || "Credenciales incorrectas"));
  } finally {
    loginLoading.value = false;
  }
};

// --- Lógica de registro (ahora incluye sede_id) ---
const handleRegister = async () => {
  registerError.value = '';
  registerSuccess.value = false;

  if (!registerForm.value.name || !registerForm.value.email || !registerForm.value.password) {
    registerError.value = 'Nombre, email y contraseña son obligatorios';
    return;
  }
  if (registerForm.value.role === null) {
    registerError.value = 'Selecciona un rol';
    return;
  }
  if (registerForm.value.sede_id === null) {
    registerError.value = 'Selecciona una sede';
    return;
  }
  if (registerForm.value.password.length < 8) {
    registerError.value = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }

  registerLoading.value = true;
  try {
    await client.post('/auth/register', {
      name: registerForm.value.name,
      email: registerForm.value.email,
      password: registerForm.value.password,
      role: registerForm.value.role,
      sede_id: registerForm.value.sede_id
    });

    registerSuccess.value = true;
    registerForm.value = { name: '', email: '', password: '', role: null, sede_id: null };
  } catch (error) {
    registerError.value = error.response?.data?.message || 'Error al registrar el usuario';
  } finally {
    registerLoading.value = false;
  }
};
</script>