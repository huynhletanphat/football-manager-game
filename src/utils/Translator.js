import dataLoader from './DataLoader.js';

class Translator {
  constructor() {
    this.currentLanguage = 'vi'; // Mặc định là Tiếng Việt
    this.fallbackLanguage = 'en'; // Ngôn ngữ dự phòng
    this.translations = {};
    this.loaded = false;
  }

  /**
   * Khởi tạo và nạp dữ liệu ngôn ngữ từ file JSON.
   * Được gọi ngay khi game bắt đầu.
   */
  initialize() {
    if (this.loaded) return;

    // Nạp các file ngôn ngữ đã tạo trong thư mục data
    const enData = dataLoader.loadJSON('translations/en.json');
    const viData = dataLoader.loadJSON('translations/vi.json');

    this.translations = {
      en: enData || {},
      vi: viData || {}
    };

    // Kiểm tra cấu hình trong config.json (nếu có) để set ngôn ngữ mặc định
    const config = dataLoader.loadJSON('../config.json');
    if (config && config.defaultLanguage && this.translations[config.defaultLanguage]) {
      this.currentLanguage = config.defaultLanguage;
    }

    this.loaded = true;
    console.log(`[Translator] Initialized. Current language: ${this.currentLanguage.toUpperCase()}`);
  }

  /**
   * Đổi ngôn ngữ hiển thị (Dùng trong menu Settings).
   */
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      return true;
    }
    console.warn(`[Translator] Language '${lang}' not found.`);
    return false;
  }

  getAvailableLanguages() {
    return Object.keys(this.translations);
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Hàm dịch chính.
   * @param {string} key - Key truy cập (VD: "menu.new_game")
   * @param {object} params - Các biến cần thay thế (VD: {name: "Pep"})
   */
  t(key, params = {}) {
    if (!this.loaded) this.initialize();

    // 1. Thử tìm trong ngôn ngữ hiện tại
    let text = this.lookup(this.currentLanguage, key);

    // 2. Nếu không thấy, tìm trong ngôn ngữ fallback (Tiếng Anh)
    if (!text) {
      text = this.lookup(this.fallbackLanguage, key);
    }

    // 3. Nếu vẫn không thấy, trả về key gốc để dễ debug
    if (!text) {
      return key;
    }

    // 4. Thay thế các biến động (Interpolation)
    // Ví dụ: "Score: {home} - {away}" -> "Score: 2 - 1"
    return this.interpolate(text, params);
  }

  /**
   * Tìm kiếm giá trị trong object lồng nhau (Nested Lookup).
   */
  lookup(lang, keyString) {
    const keys = keyString.split('.');
    let result = this.translations[lang];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return null;
      }
    }

    return result;
  }

  /**
   * Thay thế placeholder {variable} bằng giá trị thực.
   */
  interpolate(text, params) {
    if (typeof text !== 'string' || Object.keys(params).length === 0) {
      return text;
    }

    return text.replace(/{(\w+)}/g, (match, variable) => {
      return params[variable] !== undefined ? params[variable] : match;
    });
  }
}

// Export singleton instance để dùng chung toàn bộ app
export default new Translator();
