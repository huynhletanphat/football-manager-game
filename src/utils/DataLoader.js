import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from './Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DataLoader {
  constructor() {
    this.dataPath = join(__dirname, '../data');
    this.cache = {};
  }

  // Load JSON file
  loadJSON(filepath) {
    try {
      const fullPath = join(this.dataPath, filepath);
      
      // Check cache first
      if (this.cache[fullPath]) {
        return this.cache[fullPath];
      }

      if (!existsSync(fullPath)) {
        logger.warning(`File not found: ${filepath}`);
        return null;
      }

      const data = JSON.parse(readFileSync(fullPath, 'utf-8'));
      this.cache[fullPath] = data;
      return data;
    } catch (error) {
      logger.error(`Error loading ${filepath}: ${error.message}`);
      return null;
    }
  }

  // Save JSON file
  saveJSON(filepath, data) {
    try {
      const fullPath = join(this.dataPath, filepath);
      const dir = dirname(fullPath);

      // Create directory if not exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
      
      // Update cache
      this.cache[fullPath] = data;
      
      logger.success(`Saved: ${filepath}`);
      return true;
    } catch (error) {
      logger.error(`Error saving ${filepath}: ${error.message}`);
      return false;
    }
  }

  // Load player intake for a specific year
  loadPlayerIntake(year) {
    return this.loadJSON(`players/${year}_intake.json`);
  }

  // Load all clubs from a league
  loadLeagueClubs(leagueId) {
    const league = this.loadJSON(`leagues/${leagueId}.json`);
    if (!league) return [];

    const clubs = [];
    for (const clubId of league.clubs) {
      const club = this.loadJSON(`clubs/${clubId}.json`);
      if (club) clubs.push(club);
    }
    
    return clubs;
  }

  // Load league data
  loadLeague(leagueId) {
    return this.loadJSON(`leagues/${leagueId}.json`);
  }

  // Load club data
  loadClub(clubId) {
    return this.loadJSON(`clubs/${clubId}.json`);
  }

  // Save club data
  saveClub(club) {
    return this.saveJSON(`clubs/${club.club_id}.json`, club);
  }

  // Load active players
  loadActivePlayers() {
    return this.loadJSON('players/active_players.json') || { players: [] };
  }

  // Save active players
  saveActivePlayers(players) {
    return this.saveJSON('players/active_players.json', { players });
  }

  // Load game save
  loadSave(slotNumber) {
    return this.loadJSON(`saves/save_slot_${slotNumber}.json`);
  }

  // Save game
  saveGame(slotNumber, saveData) {
    return this.saveJSON(`saves/save_slot_${slotNumber}.json`, saveData);
  }

  // Check if save exists
  saveExists(slotNumber) {
    const path = join(this.dataPath, `saves/save_slot_${slotNumber}.json`);
    return existsSync(path);
  }

  // Clear cache
  clearCache() {
    this.cache = {};
    logger.info('Cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      entries: Object.keys(this.cache).length,
      keys: Object.keys(this.cache)
    };
  }
}

// Singleton
const dataLoader = new DataLoader();

export default dataLoader;
export { DataLoader };
