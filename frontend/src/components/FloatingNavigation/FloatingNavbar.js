import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, PanResponder } from 'react-native';
import { Home, BookOpen, FileText, Download, User, GraduationCap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 60;
const MARGIN_BOTTOM = 120;
const MARGIN_TOP = 80;

export default function FloatingNavigation({ navigation }) {
  const [isOpen, setIsOpen] = useState(false);
  const panY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.setOffset(panY._value);
        panY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isOpen) return;
        let newY = panY._offset + gestureState.dy;
        if (newY >= MARGIN_TOP && newY <= SCREEN_HEIGHT - MARGIN_BOTTOM) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: () => {
        panY.flattenOffset();
        const currentValue = panY._value;
        if (currentValue < MARGIN_TOP) {
          Animated.spring(panY, { toValue: MARGIN_TOP, useNativeDriver: true }).start();
        } else if (currentValue > SCREEN_HEIGHT - MARGIN_BOTTOM) {
          Animated.spring(panY, { toValue: SCREEN_HEIGHT - MARGIN_BOTTOM, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);
    Animated.spring(menuAnim, {
      toValue,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleNavigate = (screenName) => {
    toggleMenu();
    if (navigation && navigation.navigate) {
      navigation.navigate(screenName);
    }
  };

  const menuScale = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const menuOpacity = menuAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.8, 1] });

  return (
    <>
      {isOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={toggleMenu} 
        />
      )}

      <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [
              { translateY: panY },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Menu Radial / Flottant déployé proprement autour de la bulle */}
        {isOpen && (
          <Animated.View 
            style={[
              styles.radialMenu, 
              { transform: [{ scale: menuScale }], opacity: menuOpacity }
            ]}
          >
            <TouchableOpacity 
              style={[styles.menuItem, { top: -140, right: 75 }]} 
              onPress={() => handleNavigate('Home')}
              accessibilityLabel="Accueil"
            >
              <Text style={styles.menuText}>Accueil</Text>
              <View style={styles.iconCircle}><Home color="#38BDF8" size={18} /></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { top: -75, right: 90 }]} 
              onPress={() => handleNavigate('Library')}
              accessibilityLabel="Bibliothèque"
            >
              <Text style={styles.menuText}>Bibliothèque</Text>
              <View style={styles.iconCircle}><BookOpen color="#34D399" size={18} /></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { top: -10, right: 95 }]} 
              onPress={() => handleNavigate('Revision')}
              accessibilityLabel="Révisions"
            >
              <Text style={styles.menuText}>Révisions</Text>
              <View style={styles.iconCircle}><FileText color="#FBBF24" size={18} /></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { top: 55, right: 90 }]} 
              onPress={() => handleNavigate('Downloads')}
              accessibilityLabel="Téléchargements"
            >
              <Text style={styles.menuText}>Téléchargements</Text>
              <View style={styles.iconCircle}><Download color="#A78BFA" size={18} /></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { top: 120, right: 75 }]} 
              onPress={() => handleNavigate('Profile')}
              accessibilityLabel="Profil"
            >
              <Text style={styles.menuText}>Profil</Text>
              <View style={styles.iconCircle}><User color="#F472B6" size={18} /></View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bulle Principale EduKaya */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleMenu}
          accessibilityLabel="Menu de navigation EduKaya"
          style={styles.bubbleTouch}
        >
          <LinearGradient
            colors={['#0284C7', '#0D9488', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleGradient}
          >
            <GraduationCap color="#FFF" size={30} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 8, 22, 0.65)',
    zIndex: 998,
  },
  floatingContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 999,
  },
  bubbleTouch: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  radialMenu: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 0,
    height: 0,
    overflow: 'visible',
  },
  menuItem: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    whiteSpace: 'nowrap',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  menuText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});