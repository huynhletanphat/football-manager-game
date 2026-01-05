import inquirer from 'inquirer';
import chalk from 'chalk';
import logger from '../utils/Logger.js';
import dataLoader from '../utils/DataLoader.js';
import scheduleGenerator from './ScheduleGenerator.js';
import MatchSimulator from './MatchSimulator.js';

class GameEngine {
  constructor() {
    this.currentClub = null;
    this.leagueClubs = [];
    this.clubMap = {};
    this.currentSeason = 2026;
    this.currentMatchday = 1;
    this.leagueTable = {};
    this.schedule = {};
    this.isPlaying = false;
    this.playMatchUIHandler = null;
  }

  // --- START MENU (QUAN TRỌNG) ---
  async start() {
    logger.clear();
    logger.header("CONSOLE FOOTBALL MANAGER 2026");

    const choices = [
      { name: '⭐ New Game (Chơi mới)', value: 'new' },
      { name: '🚪 Exit (Thoát)', value: 'exit' }
    ];

    // Chỉ hiện nút Load Game nếu có file save
    if (dataLoader.saveExists(1)) {
      choices.splice(1, 0, { name: '📂 Load Game (Tiếp tục)', value: 'load' });
    }

    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'Chào mừng HLV! Bạn muốn làm gì?',
      choices: choices
    }]);

    if (choice === 'new') await this.startNewGameFlow();
    else if (choice === 'load') await this.loadGameFlow(1);
    else process.exit(0);
  }

  // --- NEW GAME FLOW ---
  async startNewGameFlow() {
    // 1. Load Data gốc
    this.loadBaseData();

    if (this.leagueClubs.length === 0) {
      logger.error("Không tìm thấy dữ liệu data/clubs. Vui lòng kiểm tra lại.");
      process.exit(1);
    }

    // 2. Chọn đội
    const choices = this.leagueClubs.map(c => ({ 
      name: `${c.name} (OVR: ${c.squad ? c.squad.average_rating : 'N/A'})`, 
      value: c.id 
    }));

    const { clubId } = await inquirer.prompt([{
      type: 'list',
      name: 'clubId',
      message: 'Chọn CLB bạn muốn dẫn dắt:',
      choices: choices,
      pageSize: 10
    }]);
    
    this.currentClub = this.clubMap[clubId];
    logger.success(`Bạn đã chọn: ${this.currentClub.name}`);
    
    // 3. Tạo mới lịch và BXH
    this.schedule = scheduleGenerator.generate(this.leagueClubs); 
    this.initTable();

    // 4. Lưu ngay lập tức để giữ slot
    this.saveGame(1);

    await this.gameMenu();
  }

  // --- LOAD GAME FLOW ---
  async loadGameFlow(slot) {
    logger.info("Đang tải dữ liệu save...");
    const saveData = dataLoader.loadSave(slot);

    if (!saveData) {
      logger.error("File save bị lỗi hoặc không tồn tại.");
      await this.sleep(2000);
      return this.start();
    }

    // 1. Load Data gốc trước (Cầu thủ, chỉ số...)
    this.loadBaseData();

    // 2. Khôi phục trạng thái từ Save
    this.currentSeason = saveData.season;
    this.currentMatchday = saveData.matchday;
    this.schedule = saveData.schedule;
    this.leagueTable = saveData.table; // Lưu ý key là 'table' trong hàm save

    // 3. Tìm lại CLB người chơi
    this.currentClub = this.clubMap[saveData.userClubId];

    if (!this.currentClub) {
      logger.error("Lỗi: Không tìm thấy ID đội bóng trong dữ liệu gốc.");
      await this.sleep(2000);
      return this.start();
    }

    logger.success(`Chào mừng trở lại HLV của ${this.currentClub.name}!`);
    await this.sleep(1000);
    await this.gameMenu();
  }

  // Helper: Load dữ liệu tĩnh từ JSON
  loadBaseData() {
    const rawClubs = dataLoader.loadAllClubs();
    this.leagueClubs = rawClubs.map(c => ({ ...c, id: c.id || c.club_id }));
    this.clubMap = {};
    this.leagueClubs.forEach(c => {
      if (c.id) this.clubMap[c.id] = c;
    });
  }

  initTable() {
    this.leagueClubs.forEach(c => {
      this.leagueTable[c.id] = { id: c.id, name: c.name, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
    });
  }

  // --- GAME MENU LOOP ---
  async gameMenu() {
    this.isPlaying = true;
    while (this.isPlaying) {
      logger.clear();
      logger.header(`${this.currentClub.name} | Mùa ${this.currentSeason} | Vòng ${this.currentMatchday}`);
      
      const nextMatch = this.getNextOpponent();
      if (nextMatch) console.log(chalk.yellow(`📅 Trận tiếp theo: vs ${nextMatch.name}`));
      else console.log(chalk.yellow(`📅 Mùa giải đã kết thúc.`));

      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Menu Quản Lý:',
        choices: [
          { name: '⚽ VÀO TRẬN ĐẤU', value: 'play' },
          { name: '📊 Bảng Xếp Hạng', value: 'table' },
          { name: '💾 Lưu Game', value: 'save' },
          { name: '🚪 Thoát ra Menu', value: 'quit' }
        ]
      }]);

      if (action === 'play') await this.playNextMatchday();
      else if (action === 'table') { this.displayTable(); await this.pause(); }
      else if (action === 'save') { this.saveGame(1); await this.pause(); }
      else if (action === 'quit') {
        this.isPlaying = false;
        this.start(); // Quay lại màn hình chính
      }
    }
  }

  getNextOpponent() {
    if (this.currentMatchday > 38) return null;
    const fixtures = this.schedule[this.currentMatchday];
    if (!fixtures) return null;
    const myMatch = fixtures.find(f => f.home === this.currentClub.id || f.away === this.currentClub.id);
    if (!myMatch) return null;
    const opId = myMatch.home === this.currentClub.id ? myMatch.away : myMatch.home;
    return this.clubMap[opId];
  }

  async playNextMatchday() {
    if (this.currentMatchday > 38) {
      logger.success("Mùa giải đã kết thúc!");
      return;
    }

    const fixtures = this.schedule[this.currentMatchday];
    let userMatchSim = null;
    const cpuResults = [];

    // Duyệt 10 trận đấu
    for (const match of fixtures) {
      const home = this.clubMap[match.home];
      const away = this.clubMap[match.away];

      // Quan trọng: Tạo Simulator mới
      const sim = new MatchSimulator(home, away);

      if (home.id === this.currentClub.id || away.id === this.currentClub.id) {
        userMatchSim = sim;
      } else {
        cpuResults.push(sim.simulateFast());
      }
    }

    // Chạy trận người chơi
    if (userMatchSim && this.playMatchUIHandler) {
      await this.playMatchUIHandler(userMatchSim);
    } else if (userMatchSim) {
      userMatchSim.simulateFast(); 
    }

    // Tổng hợp kết quả
    const allResults = [...cpuResults];
    if (userMatchSim && userMatchSim.score) {
      allResults.push({
        homeId: userMatchSim.home.id,
        awayId: userMatchSim.away.id,
        score: userMatchSim.score,
        lineups: userMatchSim.lineups
      });
    }

    // Cập nhật BXH
    allResults.forEach(res => {
      this.updateTable(res.homeId, res.score.home, res.score.away);
      this.updateTable(res.awayId, res.score.away, res.score.home);
    });

    this.currentMatchday++;
    
    // Auto-Save sau mỗi trận
    this.saveGame(1);
    
    await this.pause('Vòng đấu kết thúc. Game đã được tự động lưu.');
  }

  updateTable(id, gf, ga) {
    if (!this.leagueTable[id]) return;
    const row = this.leagueTable[id];
    row.p++; row.gf+=gf; row.ga+=ga; row.gd = row.gf-row.ga;
    if(gf>ga){row.w++; row.pts+=3;} else if(gf===ga){row.d++; row.pts+=1;} else row.l++;
  }

  displayTable() {
    logger.clear();
    const table = Object.values(this.leagueTable).sort((a,b) => b.pts - a.pts || b.gd - a.gd);
    console.table(table.map((t,i) => ({Pos: i+1, Club: t.name, P: t.p, PTS: t.pts, GD: t.gd})));
  }

  saveGame(slot) {
    const data = {
      userClubId: this.currentClub.id,
      season: this.currentSeason,
      matchday: this.currentMatchday,
      schedule: this.schedule,
      table: this.leagueTable // Lưu ý key
    };
    if (dataLoader.saveGame(slot, data)) {
      logger.success("Đã lưu game!");
    } else {
      logger.error("Lỗi khi lưu game!");
    }
  }

  async pause(msg='Ấn Enter để tiếp tục...') { await inquirer.prompt([{type:'input', name:'x', message:msg}]); }
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

export default new GameEngine();
