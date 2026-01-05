import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../data/clubs');
const SAVE_PATH = path.join(process.cwd(), 'saves');

class DataLoader {
  constructor() {
    if (!fs.existsSync(SAVE_PATH)) fs.mkdirSync(SAVE_PATH, { recursive: true });
  }

  loadAllClubs() {
    try {
      if (!fs.existsSync(DATA_PATH)) return [];
      
      const files = fs.readdirSync(DATA_PATH);
      const clubs = [];

      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(path.join(DATA_PATH, file), 'utf-8');
            const club = JSON.parse(raw);
            // Chuẩn hóa ID
            club.id = club.id || club.club_id; 
            clubs.push(club);
          } catch (err) {
            // Chỉ log lỗi màu đỏ, KHÔNG throw error làm sập game
            console.error(`❌ BỎ QUA FILE LỖI: ${file}`); 
            // console.error(err.message); // Bỏ comment nếu muốn xem chi tiết
          }
        }
      });
      return clubs;
    } catch (error) {
      console.error("Lỗi đọc thư mục data:", error);
      return [];
    }
  }

  saveGame(slot, data) {
    try {
      const filePath = path.join(SAVE_PATH, `save_${slot}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Lỗi save game:", error);
      return false;
    }
  }

  loadSave(slot) {
    try {
      const filePath = path.join(SAVE_PATH, `save_${slot}.json`);
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.error("Lỗi load game:", error);
      return null;
    }
  }

  saveExists(slot) {
    return fs.existsSync(path.join(SAVE_PATH, `save_${slot}.json`));
  }
}

export default new DataLoader();
