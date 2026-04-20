import { createRouter, createWebHistory } from 'vue-router'
import { jwtDecode } from 'jwt-decode'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Supervisors from '../views/Supervisors.vue'
import Employees from '../views/Employees.vue'
import Vacations from '../views/Vacations.vue'
import ForgotPassword from '../views/ForgotPassword.vue'

const routes = [
  { 
    path: '/', 
    name: 'Login',
    component: Login 
  },
  { 
    path: '/forgot-password', 
    name: 'ForgotPassword',
    component: ForgotPassword 
  },
  { 
    path: '/dashboard', 
    component: Dashboard,
    children: [
      { 
        path: 'employees', 
        name: 'Employees',
        component: Employees 
      },
      { 
        path: 'supervisors', 
        name: 'Supervisors',
        component: Supervisors,
        meta: { requiredRole: 'supervisor_or_ceo' }
      },
      { 
        path: 'vacations', 
        name: 'Vacations',
        component: Vacations 
      },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Guard de seguridad
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('idToken');
  const isAuthenticated = !!token;
  
  // Si intenta ir al dashboard sin estar logueado, lo mandamos al login
  if (to.path.startsWith('/dashboard') && !isAuthenticated) {
    return next('/');
  }
  
  // Si ya está logueado e intenta ir al login, lo mandamos al dashboard
  if (to.path === '/' && isAuthenticated) {
    return next('/dashboard/employees');
  }

  // Protección de rutas por rol
  if (to.meta.requiredRole && token) {
    try {
      const decoded = jwtDecode(token);
      const role = decoded['custom:role'];
      const admin = decoded['custom:admin'];

      if (to.meta.requiredRole === 'supervisor_or_ceo') {
        // Solo supervisor (role 2) o CEO (admin = "true") pueden entrar
        if (role !== '2' && admin !== 'true') {
          return next('/dashboard/employees');
        }
      }
    } catch (e) {
      return next('/');
    }
  }

  next();
});

export default router