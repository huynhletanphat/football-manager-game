import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Translator {
  constructor() {
    this.currentLanguage = 'vi';
    this.translations = {};
    this.loadTranslations();
  }

  loadTranslations() {
    try {
      const enPath = join(__dirname, '../data/translations/en.json');
      const viPath = join(__dirname, '../data/translations/vi.json');
      
      this.translations.en = JSON.parse(readFileSync(enPath, 'utf-8'));
      this.translations.vi = JSON.parse(readFileSync(viPath, 'utf-8'));
    } catch (error) {
      console.error('Error loading translations:', error.message);
      // Fallback to English defaults
      this.translations = {
        en: { menu: { main_title: 'FOOTBALL MANAGER' } },
        vi: { menu: { main_title: 'QUẢN LÝ BÓNG ĐÁ' } }
      };
    }
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  }

  // Helper method for arrays
  tArray(keyPrefix, array) {
    return array.map(item => this.t(`${keyPrefix}.${item}`));
  }

  // Get all available languages
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
}

// Singleton instance
const translator = new Translator();

export default translator;
export { Translator };
