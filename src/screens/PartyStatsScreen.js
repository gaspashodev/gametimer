import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import { formatTime } from '../utils/helpers';

const PartyStatsScreen = ({ route, navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { sessionId } = route.params;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await ApiService.getPartyStats(sessionId);
      setStats(data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
    }
  };

  useEffect(() => {
    loadStats();
  }, [sessionId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement des statistiques...
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!stats) {
    return (
      <LinearGradient colors={colors.background} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={60} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.text }]}>
              Impossible de charger les stats
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadStats}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={colors.primaryGradient}
                style={styles.retryButtonGradient}
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={colors.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Statistiques</Text>
          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: colors.card }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Icon
              name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Info partie */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Code</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{stats.joinCode}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Mode</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {stats.mode === 'sequential' ? 'Séquentiel' : 'Indépendant'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Affichage</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {stats.displayMode === 'shared' ? 'Partagé' : 'Distribué'}
                </Text>
              </View>
            </View>
          </View>

          {/* Temps global */}
          <LinearGradient
            colors={colors.primaryGradient}
            style={styles.globalTimeCard}
          >
            <Icon name="clock-outline" size={32} color="#fff" style={{ opacity: 0.9 }} />
            <Text style={styles.globalTimeLabel}>Temps Total</Text>
            <Text style={styles.globalTime}>{stats.globalTimeFormatted}</Text>
            <View style={styles.averageContainer}>
              <Text style={styles.averageLabel}>Moyenne</Text>
              <Text style={styles.averageTime}>{stats.averageTimeFormatted}</Text>
            </View>
          </LinearGradient>

          {/* Compteurs */}
          <View style={[styles.countersCard, { backgroundColor: colors.card }]}>
            <View style={styles.counterItem}>
              <LinearGradient
                colors={['rgba(102, 126, 234, 0.15)', 'rgba(118, 75, 162, 0.15)']}
                style={styles.counterIcon}
              >
                <Icon name="account-group" size={28} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.counterValue, { color: colors.text }]}>{stats.totalPlayers}</Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Joueurs</Text>
            </View>
            <View style={styles.counterItem}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                style={styles.counterIcon}
              >
                <Icon name="wifi" size={28} color={colors.success} />
              </LinearGradient>
              <Text style={[styles.counterValue, { color: colors.text }]}>{stats.connectedPlayers}</Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Connectés</Text>
            </View>
            <View style={styles.counterItem}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.15)']}
                style={styles.counterIcon}
              >
                <Icon name="play-circle" size={28} color={colors.warning} />
              </LinearGradient>
              <Text style={[styles.counterValue, { color: colors.text }]}>{stats.activePlayers}</Text>
              <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Actifs</Text>
            </View>
          </View>

          {/* Classement */}
          <View style={[styles.rankingCard, { backgroundColor: colors.card }]}>
            <View style={styles.rankingHeader}>
              <Icon name="trophy" size={24} color={colors.warning} />
              <Text style={[styles.rankingTitle, { color: colors.text }]}>Classement</Text>
            </View>

            {stats.ranking.map((player, index) => (
              <LinearGradient
                key={index}
                colors={
                  index === 0
                    ? ['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.15)']
                    : isDark
                      ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.05)']
                      : ['rgba(102, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.05)']
                }
                style={[
                  styles.rankingItem,
                  {
                    borderColor: index === 0 ? colors.warning : colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.rankingLeft}>
                  <LinearGradient
                    colors={
                      index === 0
                        ? ['#F59E0B', '#D97706']
                        : index === 1
                          ? ['#9CA3AF', '#6B7280']
                          : index === 2
                            ? ['#D97706', '#92400E']
                            : isDark
                              ? ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.15)']
                              : ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']
                    }
                    style={styles.rankBadge}
                  >
                    <Text style={[
                      styles.rankNumber,
                      { color: index < 3 ? '#fff' : colors.text }
                    ]}>
                      {player.rank}
                    </Text>
                  </LinearGradient>
                  <View>
                    <Text style={[styles.rankingName, { color: colors.text }]}>
                      {player.name}
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <LinearGradient
                        colors={index === 0 ? ['#F59E0B', '#D97706'] : colors.primaryGradient}
                        style={[styles.progressBar, { width: `${player.percentageOfTotal}%` }]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.rankingRight}>
                  <Text style={[styles.rankingTime, { color: colors.text }]}>
                    {player.timeFormatted}
                  </Text>
                  <Text style={[styles.rankingPercentage, { color: colors.textSecondary }]}>
                    {player.percentageOfTotal}%
                  </Text>
                </View>
              </LinearGradient>
            ))}
          </View>

          {/* Bouton retour */}
          <TouchableOpacity
            style={styles.backToGameButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              style={styles.backToGameGradient}
            >
              <Icon name="arrow-left" size={24} color="#fff" />
              <Text style={styles.backToGameText}>Retour à la partie</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  themeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  globalTimeCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  globalTimeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 8,
  },
  globalTime: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  averageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
  },
  averageTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  countersCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  counterItem: {
    alignItems: 'center',
    gap: 10,
  },
  counterIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rankingCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  rankingTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rankingName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBarContainer: {
    width: 120,
    height: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankingTime: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  rankingPercentage: {
    fontSize: 13,
    fontWeight: '600',
  },
  backToGameButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  backToGameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  backToGameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PartyStatsScreen;