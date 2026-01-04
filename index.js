#!/usr/bin/env node

import GameEngine from './src/core/GameEngine.js';
import MainMenu from './src/ui/MainMenu.js';
import LeagueTable from './src/ui/LeagueTable.js';
import logger from './src/utils/Logger.js';
import translator from './src/utils/Translator.js';

class Game {
  constructor() {
    this.engine = new GameEngine();
    this.mainMenu = new MainMenu(this.engine);
    this.leagueTable = new LeagueTable(this.engine);
    this.running = false;
  }

  async start() {
    this.running = true;
    
    try {
      // Show main menu
      await this.mainMenu.show();
      
      // Start game loop
      await this.gameLoop();
      
    } catch (error) {
      logger.error(`Game error: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  async gameLoop() {
    while (this.running) {
      try {
        // Show game menu
        const action = await this.mainMenu.showGameMenu();

        switch (action) {
          case 'continue':
            await this.playNextMatch();
            break;
            
          case 'table':
            await this.showLeagueTable();
            break;
            
          case 'squad':
            await this.showSquad();
            break;
            
          case 'save':
            await this.saveGame();
            break;
            
          case 'menu':
            this.running = false;
            await this.mainMenu.show();
            break;
        }

      } catch (error) {
        logger.error(`Game loop error: ${error.message}`);
        await this.delay(2000);
      }
    }
  }

  async playNextMatch() {
    if (this.engine.currentMatchday > 38) {
      logger.warning('Season completed!');
      await this.showSeasonSummary();
      await this.delay(3000);
      return;
    }

    const result = await this.engine.playNextMatchday();
    
    if (result) {
      // Show match summary
      this.displayMatchSummary(result);
      
      // Wait for user
      await this.waitForEnter();
    }
  }

  displayMatchSummary(result) {
    logger.clear();
    logger.header('MATCH RESULT');
    
    console.log('\n');
    console.log(`  ${result.home.club.name}  ${result.home.score} - ${result.away.score}  ${result.away.club.name}`);
    console.log('\n');
    
    logger.tableLine();
    console.log(`  ${translator.t('stats.possession')}: ${result.home.stats.possession}% - ${result.away.stats.possession}%`);
    console.log(`  ${translator.t('stats.shots')}: ${result.home.stats.shots} - ${result.away.stats.shots}`);
    console.log(`  ${translator.t('stats.on_target')}: ${result.home.stats.shotsOnTarget} - ${result.away.stats.shotsOnTarget}`);
    console.log(`  ${translator.t('stats.corners')}: ${result.home.stats.corners} - ${result.away.stats.corners}`);
    logger.tableLine();
    
    // Show goals
    const goals = result.events.filter(e => e.type === 'goal');
    if (goals.length > 0) {
      console.log('\n' + logger.info('Goals:'));
      goals.forEach(goal => {
        const teamName = goal.data.team === 'home' ? result.home.club.name : result.away.club.name;
        console.log(`  ${goal.minute}' - ${goal.data.scorer} (${teamName})`);
      });
    }
    
    console.log('\n');
  }

  async showLeagueTable() {
    const leagueId = this.engine.getClubLeague();
    this.leagueTable.display(leagueId);
    
    await this.waitForEnter();
  }

  async showSquad() {
    logger.clear();
    logger.header('SQUAD');
    
    const squad = this.engine.selectedClub.squad.current_players;
    
    if (!squad || squad.length === 0) {
      logger.warning('No players in squad');
      await this.delay(2000);
      return;
    }

    // Group by position
    const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    
    for (const pos of positions) {
      const players = squad.filter(p => p.positions.includes(pos));
      
      if (players.length > 0) {
        console.log(`\n${translator.t(`positions.${pos}`)}:`);
        players.forEach(p => {
          const rating = p.attributes.currentRating;
          const potential = p.attributes.potentialMax;
          console.log(`  ${p.name} - ${rating} (Potential: ${potential})`);
        });
      }
    }
    
    console.log('\n');
    logger.info(`Total: ${squad.length} players`);
    logger.info(`Average Rating: ${this.engine.selectedClub.squad.average_rating}`);
    
    await this.waitForEnter();
  }

  async saveGame() {
    logger.info('Saving game...');
    
    const success = this.engine.saveGame(1);
    
    if (success) {
      logger.success('Game saved successfully!');
    } else {
      logger.error('Failed to save game');
    }
    
    await this.delay(1500);
  }

  async showSeasonSummary() {
    logger.clear();
    logger.header(`SEASON ${this.engine.currentSeason} SUMMARY`);
    
    const leagueId = this.engine.getClubLeague();
    const table = this.engine.getLeagueTable(leagueId);
    
    if (table) {
      const playerPosition = table.standings.findIndex(
        club => club.clubId === this.engine.selectedClub.club_id
      ) + 1;
      
      logger.info(`Final Position: ${playerPosition}`);
      
      if (playerPosition <= 4) {
        logger.success('🏆 Champions League Qualified!');
      } else if (playerPosition === 5) {
        logger.success('🥈 Europa League Qualified!');
      } else if (playerPosition === 6) {
        logger.success('🥉 Conference League Qualified!');
      } else if (playerPosition >= 18) {
        logger.error('😢 Relegated...');
      }
    }
    
    console.log('\n');
    await this.waitForEnter();
  }

  async waitForEnter() {
    console.log('\n');
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question('Press Enter to continue...', () => {
        rl.close();
        resolve();
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the game
const game = new Game();
game.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
