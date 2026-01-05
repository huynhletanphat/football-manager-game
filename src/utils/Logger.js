import chalk from 'chalk';

class Logger {
  constructor() {
    this.debugMode = false; // Bật true khi cần debug lỗi sâu
    this.terminalWidth = 80; // Độ rộng chuẩn của khung hiển thị
  }

  // --- SYSTEM OPERATIONS ---

  clear() {
    console.clear();
  }

  toggleDebug(status) {
    this.debugMode = status;
  }

  // --- UI COMPONENTS ---

  header(text) {
    const padding = Math.max(0, Math.floor((this.terminalWidth - text.length - 4) / 2));
    const padStr = ' '.repeat(padding);
    
    console.log('\n');
    console.log(chalk.gray('═'.repeat(this.terminalWidth)));
    console.log(chalk.bgBlue.white.bold(padStr + '  ' + text.toUpperCase() + '  ' + padStr));
    console.log(chalk.gray('═'.repeat(this.terminalWidth)));
    console.log('\n');
  }

  divider(char = '─') {
    console.log(chalk.gray(char.repeat(this.terminalWidth)));
  }

  subHeader(text) {
    console.log(chalk.cyan.bold(`\n━━━ ${text.toUpperCase()} ━━━\n`));
  }

  // --- NOTIFICATIONS ---

  success(text) {
    console.log(chalk.green('✔ SUCCESS: ') + chalk.white(text));
  }

  info(text) {
    console.log(chalk.blue('ℹ INFO: ') + chalk.white(text));
  }

  warning(text) {
    console.log(chalk.yellow('⚠ WARNING: ') + chalk.yellow(text));
  }

  error(text) {
    console.log(chalk.red.bold('✘ ERROR: ') + chalk.red(text));
  }

  debug(text, data = null) {
    if (!this.debugMode) return;
    console.log(chalk.gray(`[DEBUG] ${text}`));
    if (data) {
      console.dir(data, { depth: null, colors: true });
    }
  }

  // --- GAMEPLAY SPECIFIC ---

  // Dùng cho lời bình luận trận đấu
  commentary(minute, text, type = 'normal') {
    const timeStr = chalk.gray(`[${minute.toString().padStart(2, '0') + "'"}]`);
    let content = text;

    switch (type) {
      case 'goal':
        content = chalk.green.bold(`⚽ GOAL!!! ${text}`);
        break;
      case 'chance':
        content = chalk.yellow(`⚡ ${text}`);
        break;
      case 'foul':
        content = chalk.red(`🛑 ${text}`);
        break;
      case 'card':
        content = chalk.bgYellow.black(` █ ${text} `);
        break;
      default:
        content = chalk.white(text);
    }

    console.log(`${timeStr} ${content}`);
  }

  // Dùng cho hiển thị suy nghĩ của AI (InMatchAI & AICoach)
  aiThinking(coachName, thought) {
    console.log(chalk.magenta(`\n🧠 ${coachName}: `) + chalk.italic.magentaBright(thought));
  }

  // Dùng cho hiển thị quyết định chiến thuật
  tacticalChange(teamName, change) {
    console.log(chalk.cyan(`\n📋 TACTICS (${teamName}): `) + chalk.bold.white(change) + '\n');
  }

  // Dùng cho hiển thị tỷ số to
  scoreBoard(homeName, homeScore, awayScore, awayName) {
    const pad = (str, len) => str.padEnd(len);
    const center = (str, len) => {
      const left = Math.floor((len - str.length) / 2);
      return ' '.repeat(left) + str + ' '.repeat(len - str.length - left);
    };

    console.log('\n');
    console.log(chalk.bgWhite.black.bold(
      center(`${homeName}  ${homeScore} - ${awayScore}  ${awayName}`, this.terminalWidth)
    ));
    console.log('\n');
  }
}

// Export singleton instance
export default new Logger();
