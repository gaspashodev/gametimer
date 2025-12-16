import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <LinearGradient
      colors={colors.background}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Theme toggle button */}
          <View style={styles.themeToggleContainer}>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: colors.card }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Icon 
                name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'} 
                size={24} 
                color={colors.text} 
              />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Icon name="timer-sand" size={64} color="#fff" />
              </LinearGradient>
              <View style={[styles.glowEffect, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Timer Multi-Joueurs</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Gérez le temps de jeu en temps réel
            </Text>
          </View>

          {/* Cartes */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.cardWrapper}
              onPress={() => navigation.navigate('Config')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.15)']
                  : ['rgba(102, 126, 234, 0.12)', 'rgba(118, 75, 162, 0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { 
                  borderColor: isDark ? colors.cardBorder : 'rgba(102, 126, 234, 0.2)',
                  backgroundColor: isDark ? 'transparent' : '#fff',
                }]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIconWrapper}>
                    <LinearGradient
                      colors={colors.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardIconCircle}
                    >
                      <Icon name="plus-circle" size={28} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Nouvelle Partie</Text>
                    <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>Créer une session</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textTertiary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardWrapper}
              onPress={() => navigation.navigate('Join')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={isDark 
                  ? ['rgba(17, 153, 142, 0.15)', 'rgba(56, 239, 125, 0.15)']
                  : ['rgba(17, 153, 142, 0.12)', 'rgba(56, 239, 125, 0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { 
                  borderColor: isDark ? colors.cardBorder : 'rgba(17, 153, 142, 0.2)',
                  backgroundColor: isDark ? 'transparent' : '#fff',
                }]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIconWrapper}>
                    <LinearGradient
                      colors={colors.secondaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cardIconCircle}
                    >
                      <Icon name="login-variant" size={28} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Rejoindre</Text>
                    <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>Entrer avec un code</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textTertiary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textHint }]}>Version 1.0.0</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 32,
  },
  themeToggleContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  themeToggle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  glowEffect: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.2,
    transform: [{ scale: 1.3 }],
    zIndex: -1,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 20,
  },
  cardWrapper: {
    position: 'relative',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  cardIconWrapper: {
    position: 'relative',
  },
  cardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
});

export default HomeScreen;