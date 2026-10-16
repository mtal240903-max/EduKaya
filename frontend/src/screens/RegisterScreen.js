import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [filiere, setFiliere] = useState('Sélectionnez votre filière');
  const [niveau, setNiveau] = useState('Sélectionnez votre niveau');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nom || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Erreur', 'Veuillez accepter les conditions d\'utilisation.');
      return;
    }

    try {
      setLoading(true);
      // 🟢 Passe par le AuthContext : stocke le token, l'utilisateur, et connecte
      // immédiatement la personne (plus besoin de se reconnecter après l'inscription).
      await register({
        nom,
        email: email.trim().toLowerCase(),
        password,
        filiere: filiere !== 'Sélectionnez votre filière' ? filiere : undefined,
        niveau: niveau !== 'Sélectionnez votre niveau' ? niveau : undefined,
      });
      // La navigation vers l'app principale se fait automatiquement via App.js
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Effets lumineux d'arrière-plan */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Bouton Retour & Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation && navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContainer}>
            <View style={styles.logoRow}>
              <View style={styles.logoIconPlaceholder}>
                <Ionicons name="school" size={24} color="#00f2fe" />
              </View>
              <Text style={styles.logoText}>Edukaya</Text>
            </View>
            <Text style={styles.tagline}>APPRENDRE • COMPRENDRE • RÉUSSIR</Text>
          </View>

          {/* Titles */}
          <View style={styles.titleContainer}>
            <Text style={styles.actionText}>Créer votre compte</Text>
            <Text style={styles.subtitleText}>
              Rejoignez la communauté Edukaya et commencez votre parcours vers la réussite.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            
            {/* Nom complet */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                placeholderTextColor="#64748b"
                value={nom}
                onChangeText={setNom}
              />
            </View>

            {/* Adresse e-mail */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Adresse e-mail"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            {/* Mot de passe */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Confirmer mot de passe */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Filière */}
            <Text style={styles.label}>Filière</Text>
            <TouchableOpacity style={styles.dropdownWrapper}>
              <Text style={styles.dropdownText}>{filiere}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Niveau */}
            <Text style={styles.label}>Niveau</Text>
            <TouchableOpacity style={styles.dropdownWrapper}>
              <Text style={styles.dropdownText}>{niveau}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Conditions d'utilisation */}
            <View style={styles.termsRow}>
              <TouchableOpacity 
                style={[styles.checkbox, acceptTerms && styles.checkboxChecked]} 
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                {acceptTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                J'accepte les <Text style={styles.linkText}>Conditions d'utilisation</Text> et la <Text style={styles.linkText}>Politique de confidentialité</Text>
              </Text>
            </View>

            {/* Bouton Inscription */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Création en cours…' : 'Créer mon compte →'}
              </Text>
            </TouchableOpacity>

          </View>

          {/* Footer - Lien Connexion */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation && navigation.goBack()}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b14',
  },
  glowTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    transform: [{ scaleX: 1.5 }],
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  scrollContainer: {
    padding: 24,
    flexGrow: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#10172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerContainer: {
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00f2fe',
  },
  tagline: {
    fontSize: 9,
    color: '#64748b',
    letterSpacing: 1.2,
    fontWeight: '600',
    marginLeft: 46,
  },
  titleContainer: {
    marginBottom: 20,
  },
  actionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00f2fe',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  formContainer: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 4,
  },
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#10172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 14,
  },
  dropdownText: {
    color: '#64748b',
    fontSize: 14,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#00f2fe',
    borderColor: '#00f2fe',
  },
  termsText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  linkText: {
    color: '#00f2fe',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#00f2fe',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#070b14',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  footerLink: {
    color: '#00f2fe',
    fontSize: 13,
    fontWeight: 'bold',
  },
});