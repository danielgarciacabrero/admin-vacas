import axios from 'axios';

const client = axios.create({
  baseURL: 'https://efrw7l4wtj.execute-api.eu-south-2.amazonaws.com/dev/', // La que sale al hacer sls deploy
});

// Interceptor para inyectar el Token de Cognito en cada petición
client.interceptors.request.use((config) => {

  config.headers['x-api-key'] = 'EO13oAwlg0aWd3b3M0HGU1gCyWshY5PH61DJTYkd';
  
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;