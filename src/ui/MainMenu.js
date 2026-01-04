import inquirer from 'inquirer';
import figlet from 'figlet';
import chalk from 'chalk';
import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';
import dataLoader from '../utils/DataLoader.js';

class MainMenu {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  async show() {
    logger.clear();
    this.displayLogo();
    
    const choice = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: translator.t('menu.main_title'),
        choices: [
          { name: translator.t('menu.new_game'), value: 'new' },
          { name: translator.t('menu.load_game'), value: 'load' },
          { name: translator.t('menu.settings'), value: 'settings' },
          { name: translator.t('menu.exit'), value: 'exit' }
        ]
      }
    ]);

    switch (choice.action) {
      case 'new':
        await this.startNewGame();
        break;
      case 'load':
        await this.loadGame();
        break;
      case 'settings':
        await this.showSettings();
        break;
      case 'exit':
        logger.info('Thanks for playing!');
        process.exit(0);
    }
  }

  displayLogo() {
    console.log(chalk.cyan(
      figlet.textSync('FOOTBALL', { 
        font: 'Standard',
        horizontalLayout: 'fitted' 
      })
    ));
    console.log(chalk.yellow(
      figlet.textSync('MANAGER', { 
        font: 'Standard',
        horizontalLayout: 'fitted' 
      })
    ));
    console.log(chalk.gray('════════════════════════════════════════════════\n'));
  }

  async startNewGame() {
    logger.clear();
    logger.header('NEW GAME SETUP');

    // Select club
    const club = await this.selectClub();
    if (!club) {
      return this.show();
    }

    // Confirm
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'start',
        message: `Start with ${club.name}?`,
        default: true
      }
    ]);

    if (!confirm.start) {
      return this.startNewGame();
    }

    // Initialize game
    await this.gameEngine.initialize();
    const success = await this.gameEngine.startNewGame(club.club_id);

    if (success) {
      logger.success('\nGame started successfully!');
      await this.delay(2000);
      return true;
    } else {
      logger.error('Failed to start game');
      await this.delay(2000);
      return this.show();
    }
  }

  async selectClub() {
    // Load Premier League clubs as example
    const clubs = dataLoader.loadLeagueClubs('premier_league');
    
    if (clubs.length === 0) {
      logger.error('No clubs found!');
      await this.delay(2000);
      return null;
    }

    const { clubId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'clubId',
        message: translator.t('menu.select_club'),
        choices: clubs
          .sort((a, b) => b.reputation.global - a.reputation.global)
          .map(club => ({
            name: `${club.name} (Rating: ${club.squad.average_rating})`,
            value: club.club_id
          })),
        pageSize: 15
      }
    ]);

    return clubs.find(c => c.club_id === clubId);
  }

  async loadGame() {
    logger.clear();
    logger.header('LOAD GAME');

    const saves = [];
    for (let i = 1; i <= 3; i++) {
      if (dataLoader.saveExists(i)) {
        const saveData = dataLoader.loadSave(i);
        saves.push({
          name: `Slot ${i}: ${saveData.clubId} - Season ${saveData.season}, Matchday ${saveData.matchday}`,
          value: i
        });
      } else {
        saves.push({
          name: `Slot ${i}: Empty`,
          value: i,
          disabled: true
        });
      }
    }

    saves.push({ name: translator.t('menu.back'), value: 'back' });

    const { slot } = await inquirer.prompt([
      {
        type: 'list',
        name: 'slot',
        message: 'Select save slot:',
        choices: saves
      }
    ]);

    if (slot === 'back') {
      return this.show();
    }

    const success = this.gameEngine.loadGame(slot);
    if (success) {
      logger.success('Game loaded successfully!');
      await this.delay(2000);
      return true;
    } else {
      logger.error('Failed to load game');
      await this.delay(2000);
      return this.show();
    }
  }

  async showSettings() {
    logger.clear();
    logger.header('SETTINGS');

    const { setting } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setting',
        message: 'Settings:',
        choices: [
          { name: translator.t('menu.select_language'), value: 'language' },
          { name: translator.t('menu.back'), value: 'back' }
        ]
      }
    ]);

    if (setting === 'language') {
      await this.changeLanguage();
    }

    return this.show();
  }

  async changeLanguage() {
    const { lang } = await inquirer.prompt([
      {
        type: 'list',
        name: 'lang',
        message: 'Select language:',
        choices: [
          { name: 'English', value: 'en' },
          { name: 'Tiếng Việt', value: 'vi' }
        ]
      }
    ]);

    translator.setLanguage(lang);
    logger.success(`Language changed to ${lang === 'en' ? 'English' : 'Tiếng Việt'}`);
    await this.delay(1000);
  }

  async showGameMenu() {
    logger.clear();
    
    const clubName = this.gameEngine.selectedClub.name;
    const season = this.gameEngine.currentSeason;
    const matchday = this.gameEngine.currentMatchday;
    
    logger.header(`${clubName} - ${translator.t('game.season')} ${season}`);
    logger.info(`${translator.t('game.matchday')}: ${matchday}/38\n`);

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: `⚽ ${translator.t('game.continue')} (Play Next Match)`, value: 'continue' },
          { name: `📊 ${translator.t('game.league_table')}`, value: 'table' },
          { name: `👥 ${translator.t('game.squad')}`, value: 'squad' },
          { name: `💾 ${translator.t('game.save_game')}`, value: 'save' },
          { name: `🏠 Main Menu`, value: 'menu' }
        ]
      }
    ]);

    return action;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MainMenu;
