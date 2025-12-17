import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const LoadingOverlay = ({ visible, initialMessage = 'Création de la partie...' }) => {
  const [message, setMessage] = useState(initialMessage);
  const [showDelayMessage, setShowDelayMessage] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage(initialMessage);
      setShowDelayMessage(false);

      // Après 2 secondes, changer le message
      const timer = setTimeout(() => {
        setShowDelayMessage(true);
        setMessage('Désolé, la partie prend plus de temps que prévu à se créer, veuillez patienter...');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, initialMessage]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={90} style={styles.overlay} tint="dark">
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(79, 70, 229, 0.1)', 'rgba(16, 185, 129, 0.1)']}
            style={styles.card}
          >
            <ActivityIndicator size="large" color="#4F46E5" />
            
            <Text style={[styles.message, showDelayMessage && styles.delayMessage]}>
              {message}
            </Text>

            {showDelayMessage && (
              <View style={styles.dotsContainer}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            )}
          </LinearGradient>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  delayMessage: {
    color: '#F59E0B',
    fontSize: 15,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
});

export default LoadingOverlay;