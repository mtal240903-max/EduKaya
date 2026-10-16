import AsyncStorage from '@react-native-async-storage/async-storage';

// 🟢 Préférences de notifications LOCALES (pas de serveur de notifications push
// branché pour l'instant). Honnête sur le périmètre : ces interrupteurs
// contrôlent ce que l'app affichera comme rappels/badges une fois ce système
// construit, et sont déjà sauvegardés pour de vrai — mais aucune notification
// push n'est encore envoyée depuis le serveur.
const PREFS_KEY = 'notificationPrefs';

const DEFAULT_PREFS = {
  revisionReminders: true,
  newDocuments: true,
  subscriptionAlerts: true,
};

export const notificationPrefs = {
  async get() {
    try {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch (e) {
      return DEFAULT_PREFS;
    }
  },
  async set(prefs) {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return prefs;
  },
};

export default notificationPrefs;
