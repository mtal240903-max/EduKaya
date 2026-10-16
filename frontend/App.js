import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import RevisionScreen from './src/screens/RevisionScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import NotificationsSettingsScreen from './src/screens/NotificationsSettingsScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AcademicStructureScreen from './src/screens/admin/AcademicStructureScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import DocumentViewerScreen from './src/screens/DocumentViewerScreen';
import FloatingNavigation from './src/components/FloatingNavigation/FloatingNavbar';

const Stack = createNativeStackNavigator();

function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isReady: themeReady } = useTheme();
  const [currentRoute, setCurrentRoute] = useState('Home');
  const navigationRef = useNavigationContainerRef();

  // La bulle de navigation flottante ne doit apparaître que dans l'app connectée
  const showNavbar = isAuthenticated && !['Login', 'Register'].includes(currentRoute);

  if (isLoading || !themeReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const routeName = navigationRef.getCurrentRoute()?.name;
        if (routeName) setCurrentRoute(routeName);
      }}
      onStateChange={() => {
        const routeName = navigationRef.getCurrentRoute()?.name;
        if (routeName) setCurrentRoute(routeName);
      }}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* 🟢 Deux "stacks" distinctes : tant qu'il n'y a pas de session valide,
            seuls Login/Register sont accessibles. On ne mélange jamais les deux. */}
        <Stack.Navigator
          initialRouteName={isAuthenticated ? 'Home' : 'Login'}
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
        >
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Library" component={LibraryScreen} />
              <Stack.Screen name="Revision" component={RevisionScreen} />
              <Stack.Screen name="Downloads" component={DownloadsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
              <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="AcademicStructure" component={AcademicStructureScreen} />
              <Stack.Screen name="Subscription" component={SubscriptionScreen} />
              <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>

        {showNavbar && (
          <FloatingNavigation
            currentRoute={currentRoute}
            navigation={{
              navigate: (screenName) => {
                if (navigationRef.isReady()) {
                  navigationRef.navigate(screenName);
                }
              },
            }}
          />
        )}
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
