import chalk from 'chalk';

class Logger {
  constructor() {
    this.logLevel = 'info';
    this.showTimestamp = false;
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  enableTimestamp() {
    this.showTimestamp = true;
  }

  getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  log(message, color = 'white') {
    const timestamp = this.showTimestamp ? `[${this.getTimestamp()}] ` : '';
    console.log(chalk[color](`${timestamp}${message}`));
  }

  info(message) {
    this.log(`ℹ ${message}`, 'cyan');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  debug(message) {
    if (this.logLevel === 'debug') {
      this.log(`🐛 ${message}`, 'gray');
    }
  }

  // Match events
  goal(team, player, minute) {
    console.log(chalk.green.bold(`\n⚽ GOAL! ${minute}' - ${team}`));
    console.log(chalk.white(`   Scorer: ${player}\n`));
  }

  yellowCard(player, minute) {
    console.log(chalk.yellow(`🟨 ${minute}' - Yellow Card for ${player}`));
  }

  redCard(player, minute) {
    console.log(chalk.red(`🟥 ${minute}' - Red Card for ${player}`));
  }

  substitution(playerOut, playerIn, minute) {
    console.log(chalk.blue(`🔄 ${minute}' - Substitution`));
    console.log(chalk.gray(`   OUT: ${playerOut}`));
    console.log(chalk.white(`   IN:  ${playerIn}`));
  }

  // AI Coach logs
  aiDecision(message) {
    console.log(chalk.magenta.bold(`\n🧠 AI Coach: ${message}\n`));
  }

  aiAnalysis(message) {
    console.log(chalk.cyan(`   💡 ${message}`));
  }

  // Dividers
  divider(char = '═', length = 60) {
    console.log(chalk.gray(char.repeat(length)));
  }

  header(text) {
    console.log('\n');
    this.divider();
    console.log(chalk.bold.cyan(`  ${text}`));
    this.divider();
  }

  // Clear console
  clear() {
    console.clear();
  }

  // Progress
  progress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const bars = Math.round(percentage / 5);
    const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
    
    process.stdout.write(`\r${progressBar} ${percentage}% ${message}`);
    
    if (current === total) {
      console.log('\n');
    }
  }

  // Table separator
  tableLine() {
    console.log(chalk.gray('─'.repeat(80)));
  }
}

// Singleton
const logger = new Logger();

export default logger;
export { Logger };

