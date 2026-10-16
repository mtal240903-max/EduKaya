import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const loggedIn = await authService.isLoggedIn();
      if (loggedIn) {
        // On tente de resynchroniser avec le serveur ; à défaut on garde le cache local.
        try {
          const freshUser = await authService.fetchProfile();
          setUser(freshUser);
        } catch (e) {
          const cached = await authService.getCurrentUser();
          setUser(cached);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  // Met à jour l'utilisateur en mémoire sans refaire un aller-retour serveur —
  // utilisé après une édition de profil / changement d'avatar qui renvoie déjà
  // l'utilisateur à jour dans sa réponse.
  const updateLocalUser = (nextUser) => setUser(nextUser);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super-admin',
    isSuperAdmin: user?.role === 'super-admin',
    adminScopes: user?.adminScopes || [],
    // 🟢 super-admin passe toujours ; un 'admin' doit avoir ce scope précis.
    // Mémoïsé avec useCallback : une référence stable est indispensable ici,
    // car des écrans l'utilisent comme dépendance de useCallback/useEffect
    // (une nouvelle fonction à chaque rendu provoquerait une boucle de rechargement infinie).
    hasScope: useCallback(
      (scope) => user?.role === 'super-admin' || (user?.adminScopes || []).includes(scope),
      [user]
    ),
    login,
    register,
    logout,
    updateLocalUser,
    refreshUser: bootstrap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>');
  return ctx;
};

export default AuthContext;
