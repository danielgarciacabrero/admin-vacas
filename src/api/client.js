import axios from 'axios';

const client = axios.create({
  baseURL: 'https://efrw7l4wtj.execute-api.eu-south-2.amazonaws.com/dev/', // La que sale al hacer sls deploy
});

// Interceptor para inyectar el Token de Cognito en cada petición
client.interceptors.request.use((config) => {

  import axios from 'axios';

const client = axios.create({
  baseURL: 'https://efrw7l4wtj.execute-api.eu-south-2.amazonaws.com/dev/',
});

// Interceptor para inyectar el Token de Cognito en cada petición
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
  
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;