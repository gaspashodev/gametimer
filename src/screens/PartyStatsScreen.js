import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import ApiService from '../services/ApiService';
import { formatTime } from '../utils/helpers';

const PartyStatsScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les stats
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

  // Rafraîchir les stats
  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Chargement des statistiques...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorText}>Impossible de charger les stats</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header avec infos générales */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerItem}>
              <Text style={styles.headerLabel}>Code</Text>
              <Text style={styles.headerValue}>{stats.joinCode}</Text>
            </View>
            <View style={styles.headerItem}>
              <Text style={styles.headerLabel}>Mode</Text>
              <Text style={styles.headerValue}>
                {stats.mode === 'sequential' ? 'Séquentiel' : 'Indépendant'}
              </Text>
            </View>
            <View style={styles.headerItem}>
              <Text style={styles.headerLabel}>Affichage</Text>
              <Text style={styles.headerValue}>
                {stats.displayMode === 'shared' ? 'Partagé' : 'Distribué'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Icon
              name="refresh"
              size={20}
              color="#4F46E5"
              style={refreshing && { opacity: 0.5 }}
            />
            <Text style={[styles.refreshText, refreshing && { opacity: 0.5 }]}>
              Actualiser
            </Text>
          </TouchableOpacity>
        </View>

        {/* Temps global */}
        <View style={styles.globalTimeCard}>
          <Text style={styles.sectionTitle}>Temps Total</Text>
          <Text style={styles.globalTime}>{stats.globalTimeFormatted}</Text>
          <Text style={styles.averageTime}>
            Moyenne : {stats.averageTimeFormatted}
          </Text>
        </View>

        {/* Statut */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Icon name="account-group" size={24} color="#6B7280" />
              <Text style={styles.statusValue}>{stats.totalPlayers}</Text>
              <Text style={styles.statusLabel}>Joueurs</Text>
            </View>
            <View style={styles.statusItem}>
              <Icon name="wifi" size={24} color="#10B981" />
              <Text style={styles.statusValue}>{stats.connectedPlayers}</Text>
              <Text style={styles.statusLabel}>Connectés</Text>
            </View>
            <View style={styles.statusItem}>
              <Icon name="play-circle" size={24} color="#F59E0B" />
              <Text style={styles.statusValue}>{stats.activePlayers}</Text>
              <Text style={styles.statusLabel}>Actifs</Text>
            </View>
          </View>
        </View>

        {/* Classement */}
        <View style={styles.rankingCard}>
          <Text style={styles.sectionTitle}>Classement</Text>
          {stats.ranking.map((player, index) => (
            <View
              key={index}
              style={[
                styles.rankingItem,
                index === 0 && styles.rankingItemFirst,
              ]}
            >
              <View style={styles.rankingLeft}>
                <View
                  style={[
                    styles.rankBadge,
                    index === 0 && styles.rankBadgeGold,
                    index === 1 && styles.rankBadgeSilver,
                    index === 2 && styles.rankBadgeBronze,
                  ]}
                >
                  <Text
                    style={[
                      styles.rankNumber,
                      index < 3 && styles.rankNumberMedal,
                    ]}
                  >
                    {player.rank}
                  </Text>
                </View>
                <Text style={styles.rankingName}>{player.name}</Text>
              </View>
              <View style={styles.rankingRight}>
                <Text style={styles.rankingTime}>{player.timeFormatted}</Text>
                <Text style={styles.rankingPercentage}>
                  {player.percentageOfTotal}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Retour à la partie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => {
              // TODO: Implémenter l'export des stats (PDF, image, etc.)
              Alert.alert('Bientôt disponible', 'Export des stats à venir !');
            }}
          >
            <Icon name="share-variant" size={20} color="#4F46E5" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              Partager
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  headerItem: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  headerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  globalTimeCard: {
    backgroundColor: '#4F46E5',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  globalTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
  },
  averageTime: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  rankingCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  rankingItemFirst: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
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
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeGold: {
    backgroundColor: '#F59E0B',
  },
  rankBadgeSilver: {
    backgroundColor: '#9CA3AF',
  },
  rankBadgeBronze: {
    backgroundColor: '#D97706',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  rankNumberMedal: {
    color: '#fff',
  },
  rankingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  rankingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  rankingPercentage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  playersCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  playerDetailItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  playerDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerDetailName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  playerDetailRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  playerDetailStats: {
    gap: 8,
  },
  playerDetailTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  playerDetailPercentage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  actionsCard: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#4F46E5',
  },
});

export default PartyStatsScreen;