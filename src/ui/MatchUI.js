import chalk from 'chalk';
import logger from '../utils/Logger.js';
import InMatchAI from '../ai/InMatchAI.js';
import tacticsUI from './TacticsUI.js'; // IMPORT MỚI

class MatchUI {
  constructor() {
    this.animationSpeed = 4000; 
  }

  async startMatch(simulator) {
    const aiCoach = new InMatchAI(simulator);
    logger.clear();

    // --- NEW: GIỚI THIỆU ĐỘI HÌNH NHƯ TV ---
    await tacticsUI.presentLineups(
        simulator.home, 
        simulator.away, 
        simulator.lineups.home, 
        simulator.lineups.away
    );

    // Lấy tên sân chuẩn
    let stadiumName = "Sân vận động CLB";
    if (simulator.home.stadium && typeof simulator.home.stadium === 'string') {
        stadiumName = simulator.home.stadium;
    } else {
        stadiumName = `${simulator.home.name} Stadium`;
    }

    // Hiển thị lại header nhỏ để người chơi theo dõi sau màn giới thiệu
    console.clear();
    this.renderIntro(simulator.home, simulator.away, stadiumName);
    await this.sleep(1000);

    // VÒNG LẶP TRẬN ĐẤU
    for await (const data of simulator.playMatch()) {
      if (data.minute) await aiCoach.update(data.minute);

      switch (data.type) {
        case 'KICK_OFF':
          console.log(chalk.green.bold(`\n⌚ [00'] ${data.message}`));
          break;

        case 'STATS_UPDATE':
          this.renderStatsBoard(data.score, data.stats, data.minute);
          await this.sleep(2000);
          break;

        case 'FULL_TIME':
          await this.renderFullTime(data, simulator);
          break;

        default:
          await this.renderGameEvent(data);
          await this.sleep(this.animationSpeed);
          break;
      }
    }
  }

  // ... (Giữ nguyên các hàm renderIntro, renderGameEvent, renderStatsBoard cũ) ...
  // Để tiết kiệm không gian, tôi chỉ liệt kê phần thay đổi chính ở trên.
  // Các hàm dưới đây là bản cũ, bạn đã có ở prompt trước. 
  // Tôi sẽ paste lại đầy đủ để bạn copy-paste cho an toàn.

  renderIntro(home, away, stadium) {
    console.log(chalk.gray('═'.repeat(60)));
    console.log(`      ${chalk.bold.cyan(home.name)}  vs  ${chalk.bold.red(away.name)}`);
    console.log(`      Sân: ${chalk.yellow(stadium)}`);
    console.log(chalk.gray('═'.repeat(60)));
  }

  async renderGameEvent(data) {
    const { minute, message, type, score } = data;
    const timeStr = chalk.gray(`[${minute.toString().padStart(2, '0') + "'"}]`);
    console.log(''); 

    switch (type) {
      case 'GOAL':
        console.log(chalk.bgGreen.black.bold(` ⚽ VÀOOOO!!! `) + ` ${timeStr}`);
        console.log(chalk.green.bold(`  ${message}`));
        if (score) console.log(chalk.yellow(`  TỶ SỐ: ${score.home} - ${score.away}`));
        break;
      case 'SAVE': console.log(chalk.blue.bold(` 🧤 CỨU THUA `) + ` ${timeStr} ${message}`); break;
      case 'MISS': console.log(chalk.gray(` ❌ KHÔNG VÀO `) + ` ${timeStr} ${message}`); break;
      case 'PASS': console.log(chalk.cyan(` 👟 KIẾN TẠO `) + ` ${timeStr} ${message}`); break;
      case 'CROSS': console.log(chalk.cyan(` 🎯 TẠT BÓNG `) + ` ${timeStr} ${message}`); break;
      case 'DRIBBLE': console.log(chalk.cyan(` 💨 ĐỘT PHÁ `) + ` ${timeStr} ${message}`); break;
      case 'DEFENSE': console.log(chalk.white(` 🛡️ PHÒNG NGỰ `) + ` ${timeStr} ${message}`); break;
      case 'INTERCEPT': console.log(chalk.magenta(` ⚡ CẮT BÓNG `) + ` ${timeStr} ${message}`); break;
      case 'FOUL': console.log(chalk.red(` 🛑 PHẠM LỖI `) + ` ${timeStr} ${message}`); break;
      case 'YELLOW_CARD': console.log(chalk.bgYellow.black.bold(` 🟨 THẺ VÀNG `) + ` ${timeStr} ${message}`); break;
      case 'RED_CARD': console.log(chalk.bgRed.white.bold(` 🟥 THẺ ĐỎ `) + ` ${timeStr} ${message}`); break;
      case 'COMMENTARY': console.log(chalk.dim(` 💬 ${timeStr} ${message}`)); break;
      default: console.log(`${timeStr} ${message}`);
    }
  }

  renderStatsBoard(score, stats, minute) {
    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.bgWhite.black(` ⏱️  PHÚT ${minute} | TỶ SỐ: ${score.home} - ${score.away} `));
    const total = stats.home.possession + stats.away.possession || 1;
    const hP = Math.round((stats.home.possession / total) * 100);
    const filled = Math.round(hP / 100 * 20);
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, 20 - filled));
    console.log(chalk.cyan(`${hP}% `) + bar + chalk.red(` ${100-hP}%`));
    console.log(chalk.gray(`xG: ${stats.home.xG.toFixed(2)} - ${stats.away.xG.toFixed(2)} | Sút: ${stats.home.shots}-${stats.away.shots}`));
    console.log(chalk.gray('─'.repeat(50)));
  }

  async renderFullTime(data, simulator) {
    const { score, stats, lineups } = data;
    console.log(chalk.bgBlue.white.bold('\n       FULL TIME       \n'));
    console.log(chalk.bold.yellow(`  ${simulator.home.name}  ${score.home} - ${score.away}  ${simulator.away.name}  `));
    const all = [...lineups.home, ...lineups.away];
    const motm = all.sort((a,b) => b.matchRating - a.matchRating)[0];
    console.log(chalk.yellow(`\n⭐ CẦU THỦ XUẤT SẮC NHẤT: ${motm.name} (${motm.matchRating.toFixed(1)})`));
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

export default new MatchUI();
