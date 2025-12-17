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
import { 
  ArrowLeft,
  Users,
  Trophy,
  Play,
  Wifi,
  CircleAlert,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import ApiService from '../services/ApiService';
import { useLanguage } from '../contexts/LanguageContext';
import { formatTime } from '../utils/helpers';

const PartyStatsScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const { sessionId } = route.params;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();

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
           <CircleAlert size={60} color={colors.danger} strokeWidth={2} />
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
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Statistiques</Text>
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
          <Timer size={32} color="#fff" strokeWidth={2} />
            <Text style={styles.globalTimeLabel}>Temps Total</Text>
            <Text style={styles.globalTime}>{stats.globalTimeFormatted}</Text>
            <View style={styles.averageContainer}>
              <Text style={styles.averageLabel}>Moyenne</Text>
              <Text style={styles.averageTime}>{stats.averageTimeFormatted}</Text>
            </View>
          </LinearGradient>

          {/* Compteurs - ✅ SUR UNE LIGNE + SANS bouton partage */}
          <View style={[styles.countersCard, { backgroundColor: colors.card }]}>
            <View style={styles.countersRow}>
              <View style={styles.counterItem}>
                <Users size={32} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.counterValue, { color: colors.text }]}>{stats.totalPlayers}</Text>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Joueurs</Text>
              </View>
              <View style={styles.counterItem}>
                <Wifi size={32} color={colors.success} strokeWidth={2} />
                <Text style={[styles.counterValue, { color: colors.text }]}>{stats.connectedPlayers}</Text>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Connectés</Text>
              </View>
              <View style={styles.counterItem}>
                <Play size={32} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.counterValue, { color: colors.text }]}>{stats.activePlayers}</Text>
                <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>Actifs</Text>
              </View>
            </View>
          </View>

          {/* Classement */}
          <View style={[styles.rankingCard, { backgroundColor: colors.card }]}>
            <View style={styles.rankingHeader}>
              <Trophy size={24} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.rankingTitle, { color: colors.text }]}>Classement</Text>
            </View>

            {stats.ranking.map((player, index) => (
              <View
                key={index}
                style={[
                  styles.rankingItem,
                  {
                    backgroundColor: index === 0
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'transparent',
                    borderColor: index === 0 ? colors.warning : colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.rankingLeft}>
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor:
                          index === 0
                            ? colors.warning
                            : index === 1
                            ? '#9CA3AF'
                            : index === 2
                            ? '#D97706'
                            : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.rankNumber, index < 3 && { color: '#fff' }]}>
                      {player.rank}
                    </Text>
                  </View>
                  <Text style={[styles.rankingName, { color: colors.text }]}>
                    {player.name}
                  </Text>
                </View>
                <View style={styles.rankingRight}>
                  <Text style={[styles.rankingTime, { color: colors.text }]}>
                    {player.timeFormatted}
                  </Text>
                  <Text style={[styles.rankingPercentage, { color: colors.textSecondary }]}>
                    {player.percentageOfTotal}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

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
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    zIndex: 0,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  globalTimeCard: {
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginTop: 12,
  },
  globalTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
    marginVertical: 8,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  averageLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  averageTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'monospace',
  },
  countersCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  counterItem: {
    alignItems: 'center',
    gap: 8,
  },
  counterValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 13,
  },
  rankingCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankingName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  rankingPercentage: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 14,
    gap: 8,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PartyStatsScreen;