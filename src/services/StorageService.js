import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@timer_user_pseudo';

class StorageService {
  /**
   * Sauvegarder le pseudo de l'utilisateur
   */
  async savePseudo(pseudo) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pseudo.trim());
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde pseudo:', error);
      return false;
    }
  }

  /**
   * Récupérer le pseudo sauvegardé
   */
  async getPseudo() {
    try {
      const pseudo = await AsyncStorage.getItem(STORAGE_KEY);
      return pseudo || '';
    } catch (error) {
      console.error('Erreur récupération pseudo:', error);
      return '';
    }
  }

  /**
   * Supprimer le pseudo sauvegardé
   */
  async clearPseudo() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Erreur suppression pseudo:', error);
      return false;
    }
  }
}

export default new StorageService();