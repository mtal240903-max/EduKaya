import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenStorage from './tokenStorage';

const persistSession = async (data) => {
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
};

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur réseau.' };
  });

export const authService = {
  async register(userData) {
    const data = await unwrap(api.post('/auth/register', userData));
    await persistSession(data);
    return data;
  },

  async login(credentials) {
    const data = await unwrap(api.post('/auth/login', credentials));
    await persistSession(data);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // On déconnecte localement même si l'appel réseau échoue
    } finally {
      await tokenStorage.clearTokens();
      await AsyncStorage.removeItem('user');
    }
  },

  // Relit le profil depuis le serveur (source de vérité), et met à jour le cache local
  async fetchProfile() {
    const data = await unwrap(api.get('/auth/me'));
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  async getCurrentUser() {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  async isLoggedIn() {
    const token = await tokenStorage.getAccessToken();
    return !!token;
  },

  // Nom, niveau, filière — PAS l'email ni le rôle (voir backend/authController.js)
  async updateProfile(payload) {
    const data = await unwrap(api.patch('/auth/me', payload));
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  },

  async changePassword(currentPassword, newPassword) {
    const data = await unwrap(api.patch('/auth/me/password', { currentPassword, newPassword }));
    // Le serveur invalide le refreshToken existant par précaution : on nettoie
    // la session locale pour forcer une reconnexion propre avec le nouveau mot de passe.
    await tokenStorage.clearTokens();
    await AsyncStorage.removeItem('user');
    return data;
  },

  // `asset` : objet retourné par expo-image-picker ({ uri, mimeType, fileName })
  async updateAvatar(asset, onProgress) {
    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'avatar.jpg',
      type: asset.mimeType || 'image/jpeg',
    });
    const data = await unwrap(api.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    }));
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }
};

export default authService;
