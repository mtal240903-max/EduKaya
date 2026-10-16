import * as SecureStore from 'expo-secure-store';

// 🔒 Avant : accessToken/refreshToken vivaient dans AsyncStorage, qui écrit en
// clair sur le disque (un fichier texte lisible par quiconque a accès au
// stockage de l'app — appareil rooté/jailbreaké, backup non chiffré, autre
// app avec les bonnes permissions sur un vieux Android...). Un refreshToken
// volé donne un accès prolongé (7 jours) au compte.
//
// Maintenant : les deux tokens passent par expo-secure-store, qui utilise le
// Keystore Android / Keychain iOS — stockage chiffré au niveau matériel/OS,
// jamais un fichier en clair. Le profil utilisateur (`user`) reste dans
// AsyncStorage : ce n'est pas un secret (juste nom/email/rôle déjà renvoyés
// par l'API à qui a le token), et SecureStore a une limite de taille (~2 Ko)
// plus contraignante qu'AsyncStorage.
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken, refreshToken) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },
  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};

export default tokenStorage;
