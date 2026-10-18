import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenStorage from './tokenStorage';

// 🌐 CHOISISSEZ VOTRE ENVIRONNEMENT ICI :
// --------------------------------------------------
// 1. Pour tester avec le backend en LOCAL (sur ton PC) :
//    - Sur émulateur Android : 'http://10.0.2.2:5000/api'
//    - Sur téléphone physique (mets l'IP IPv4 de ton PC via ipconfig) : 'http://192.168.X.X:5000/api'
const LOCAL_URL = 'http://10.0.2.2:5000/api';

// 2. Pour utiliser le backend de PRODUCTION (Render) :
const PROD_URL = 'https://edukaya-backend.onrender.com/api';

// 🟢 Active l'URL de ton choix en modifiant la variable ci-dessous :
export const API_URL = PROD_URL; // Remplace par LOCAL_URL si tu veux travailler en local !
// --------------------------------------------------

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // Augmenté à 30s pour tolérer le délai de réveil de Render (cold start)
});

// Injecte le token JWT sur chaque requête sortante. Lu depuis SecureStore
// (chiffré) et non plus AsyncStorage (texte en clair) — voir tokenStorage.js.
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Si le token a expiré (15 min), on tente un refresh silencieux une seule fois,
// puis on rejoue la requête d'origine.
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error('Pas de refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        await tokenStorage.setTokens(data.accessToken, data.refreshToken);

        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clearTokens();
        await AsyncStorage.removeItem('user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;