import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';
import chalk from 'chalk';
import InMatchAI from '../ai/InMatchAI.js';

class MatchSimulator {
  constructor(homeClub, awayClub, preparation) {
    this.home = homeClub;
    this.away = awayClub;
    this.preparation = preparation;
    this.minute = 0;
    this.score = { home: 0, away: 0 };
    this.events = [];
    this.stats = {
      possession: { home: 50, away: 50 },
      shots: { home: 0, away: 0 },
      shotsOnTarget: { home: 0, away: 0 },
      corners: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 },
      passAccuracy: { home: 85, away: 85 },
      tackles: { home: 0, away: 0 },
      dangerousAttacks: { home: 0, away: 0 }
    };
    this.playerRatings = {};
    this.substitutionsLeft = { home: 5, away: 5 };
    this.currentLineup = {
      home: preparation?.lineup || {},
      away: awayClub.lineup || {}
    };
    this.inMatchAI = null;
  }

  async simulate() {
    logger.clear();
    this.displayMatchHeader();
    
    // Initialize AI Coach for in-match decisions
    if (this.preparation?.aiCoach) {
      this.inMatchAI = new InMatchAI(this.preparation.aiCoach, this);
    }
    
    // Pre-match calculations
    this.calculateTeamStrengths();
    this.calculatePossession();
    this.calculateExpectedGoals();
    
    this.displayPreMatch();
    await this.delay(2000);

    // First Half
    logger.clear();
    this.displayMatchStatus('FIRST HALF');
    await this.simulateHalfWithIntervals(0, 45);
    
    this.addEvent('half_time', 45);
    this.displayHalfTimeStats();
    await this.delay(3000);

    // Second Half
    logger.clear();
    this.displayMatchStatus('SECOND HALF');
    await this.simulateHalfWithIntervals(45, 90);
    
    // Injury time
    const injuryTime = Math.floor(Math.random() * 4) + 2;
    if (injuryTime > 0) {
      logger.info(`\n⏱️  +${injuryTime}' Injury Time\n`);
      await this.simulateHalfWithIntervals(90, 90 + injuryTime);
    }
    
    this.addEvent('full_time', 90 + injuryTime);
    
    // Calculate player ratings
    this.calculatePlayerRatings();
    
    // Display full time
    this.displayFullTimeStats();
    
    return this.getMatchResult();
  }

  async simulateHalfWithIntervals(startMin, endMin) {
    const intervals = Math.ceil((endMin - startMin) / 15);
    
    for (let i = 0; i < intervals; i++) {
      const intervalStart = startMin + (i * 15);
      const intervalEnd = Math.min(intervalStart + 15, endMin);
      
      // Simulate 15 minutes
      await this.simulateInterval(intervalStart, intervalEnd);
      
      // AI Analysis every 15 minutes
      if (this.inMatchAI && intervalEnd < endMin) {
        await this.delay(500);
        logger.divider('─', 80);
        await this.inMatchAI.evaluateSituation();
        logger.divider('─', 80);
        await this.delay(3000); // 3 second delay after AI analysis
      }
      
      // Update display
      if (intervalEnd % 15 === 0 && intervalEnd < endMin) {
        this.displayLiveStats();
        await this.delay(1000);
      }
    }
  }

  async simulateInterval(startMin, endMin) {
    for (let min = startMin; min < endMin; min++) {
      this.minute = min;
      
      // Goal chance
      if (Math.random() < 0.03) {
        await this.processGoalChance();
      }
      
      // Other events
      if (Math.random() < 0.02) {
        this.processRandomEvent();
      }
      
      // Show minute marker
      if (min % 5 === 0 && min > startMin) {
        process.stdout.write(chalk.gray(` [${min}']`));
      }
    }
    console.log(); // New line after interval
  }

  displayMatchHeader() {
    console.log('\n');
    console.log(chalk.cyan('╔' + '═'.repeat(78) + '╗'));
    console.log(chalk.cyan('║') + chalk.bold.white(this.centerText('⚽ LIVE MATCH ⚽', 78)) + chalk.cyan('║'));
    console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));
    
    const homeText = this.home.name.padEnd(30);
    const vsText = 'VS'.padStart(8).padEnd(18);
    const awayText = this.away.name.padStart(30);
    
    console.log(chalk.cyan('║') + '  ' + 
      chalk.yellow.bold(homeText) + 
      chalk.white.bold(vsText) + 
      chalk.blue.bold(awayText) + 
      '  ' + chalk.cyan('║'));
    
    console.log(chalk.cyan('╚' + '═'.repeat(78) + '╝'));
    console.log('\n');
  }

  displayPreMatch() {
    console.log(chalk.cyan('┌─ 📋 MATCH INFO ') + chalk.cyan('─'.repeat(61) + '┐'));
    console.log(chalk.cyan('│') + '  ' + chalk.white(`Formation: ${chalk.yellow(this.preparation.formation)}`) + ' '.repeat(50) + chalk.cyan('│'));
    console.log(chalk.cyan('│') + '  ' + chalk.white(`Strategy: ${chalk.yellow(this.preparation.strategy.approach)}`) + ' '.repeat(51) + chalk.cyan('│'));
    console.log(chalk.cyan('│') + '  ' + chalk.white(`Mentality: ${chalk.yellow(this.preparation.strategy.mentality)}`) + ' '.repeat(49) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
  }

  displayMatchStatus(halfText) {
    console.log('\n');
    console.log(chalk.bgCyan.black.bold(` ${halfText} `.padEnd(80)));
    console.log('\n');
    
    // Score display
    const scoreDisplay = this.createScoreDisplay();
    console.log(scoreDisplay);
    console.log('\n');
  }

  createScoreDisplay() {
    const homeScore = this.score.home.toString().padStart(2);
    const awayScore = this.score.away.toString().padEnd(2);
    
    let homeColor = chalk.white;
    let awayColor = chalk.white;
    
    if (this.score.home > this.score.away) {
      homeColor = chalk.green.bold;
      awayColor = chalk.gray;
    } else if (this.score.away > this.score.home) {
      awayColor = chalk.green.bold;
      homeColor = chalk.gray;
    }
    
    const homeName = this.home.name.substring(0, 20).padEnd(20);
    const awayName = this.away.name.substring(0, 20).padStart(20);
    
    return '     ' + 
      homeColor(homeName) + '  ' +
      chalk.bgWhite.black.bold(` ${homeScore} `) + 
      chalk.gray(' - ') + 
      chalk.bgWhite.black.bold(` ${awayScore} `) + '  ' +
      awayColor(awayName);
  }

  displayLiveStats() {
    console.log('\n');
    console.log(chalk.cyan('┌─ 📊 LIVE STATS ') + chalk.cyan('─'.repeat(62) + '┐'));
    
    // Possession bar
    this.displayStatBar('Possession', this.stats.possession.home, this.stats.possession.away, '%');
    
    // Shots
    this.displayStatBar('Shots', this.stats.shots.home, this.stats.shots.away);
    
    // Shots on Target
    this.displayStatBar('On Target', this.stats.shotsOnTarget.home, this.stats.shotsOnTarget.away);
    
    // Dangerous Attacks
    this.displayStatBar('Attacks', this.stats.dangerousAttacks.home, this.stats.dangerousAttacks.away);
    
    // Corners
    this.displayStatBar('Corners', this.stats.corners.home, this.stats.corners.away);
    
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
  }

  displayStatBar(label, homeValue, awayValue, suffix = '') {
    const total = homeValue + awayValue || 1;
    const homePercent = (homeValue / total) * 100;
    const awayPercent = (awayValue / total) * 100;
    
    const barWidth = 40;
    const homeBars = Math.round((homePercent / 100) * barWidth);
    const awayBars = barWidth - homeBars;
    
    const homeBar = '█'.repeat(homeBars);
    const awayBar = '█'.repeat(awayBars);
    
    const homeStr = `${homeValue}${suffix}`.padStart(6);
    const awayStr = `${awayValue}${suffix}`.padEnd(6);
    const labelStr = label.padEnd(12);
    
    console.log(chalk.cyan('│ ') + 
      chalk.white(labelStr) + 
      chalk.yellow(homeStr) + ' ' +
      chalk.yellow(homeBar) + 
      chalk.blue(awayBar) + ' ' +
      chalk.blue(awayStr) + 
      ' '.repeat(3) +
      chalk.cyan('│'));
  }

  displayHalfTimeStats() {
    logger.clear();
    console.log('\n');
    console.log(chalk.bgYellow.black.bold(' ⏸️  HALF TIME '.padEnd(80)));
    console.log('\n');
    
    const scoreDisplay = this.createScoreDisplay();
    console.log(scoreDisplay);
    console.log('\n');
    
    this.displayLiveStats();
    
    // Show goals
    const goals = this.events.filter(e => e.type === 'goal');
    if (goals.length > 0) {
      console.log(chalk.cyan('┌─ ⚽ GOALS ') + chalk.cyan('─'.repeat(66) + '┐'));
      goals.forEach(goal => {
        const teamName = goal.data.team === 'home' ? this.home.name : this.away.name;
        const icon = goal.data.team === 'home' ? '🏠' : '✈️';
        console.log(chalk.cyan('│ ') + 
          chalk.white(`${icon} ${goal.minute}' - ${chalk.bold(goal.data.scorer)} (${teamName})`) +
          ' '.repeat(50) +
          chalk.cyan('│'));
      });
      console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
      console.log('\n');
    }
  }

  displayFullTimeStats() {
    logger.clear();
    console.log('\n');
    console.log(chalk.bgGreen.black.bold(' 🏁 FULL TIME '.padEnd(80)));
    console.log('\n');
    
    const scoreDisplay = this.createScoreDisplay();
    console.log(scoreDisplay);
    console.log('\n');
    
    this.displayLiveStats();
    
    // Show all goals
    const goals = this.events.filter(e => e.type === 'goal');
    if (goals.length > 0) {
      console.log(chalk.cyan('┌─ ⚽ GOALS ') + chalk.cyan('─'.repeat(66) + '┐'));
      goals.forEach(goal => {
        const teamName = goal.data.team === 'home' ? this.home.name : this.away.name;
        const icon = goal.data.team === 'home' ? '🏠' : '✈️';
        console.log(chalk.cyan('│ ') + 
          chalk.white(`${icon} ${goal.minute}' - ${chalk.bold.yellow(goal.data.scorer)} (${teamName})`) +
          ' '.repeat(40) +
          chalk.cyan('│'));
      });
      console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
      console.log('\n');
    }
    
    // Match summary
    this.displayMatchSummary();
  }

  displayMatchSummary() {
    console.log(chalk.cyan('┌─ 📝 MATCH SUMMARY ') + chalk.cyan('─'.repeat(58) + '┐'));
    
    const homeShots = this.stats.shots.home;
    const awayShots = this.stats.away;
    const homeOnTarget = this.stats.shotsOnTarget.home;
    const awayOnTarget = this.stats.shotsOnTarget.away;
    
    const homeAccuracy = homeShots > 0 ? Math.round((homeOnTarget / homeShots) * 100) : 0;
    const awayAccuracy = awayShots > 0 ? Math.round((awayOnTarget / awayShots) * 100) : 0;
    
    console.log(chalk.cyan('│ ') + chalk.white(`Shot Accuracy: ${chalk.yellow(homeAccuracy + '%')} vs ${chalk.blue(awayAccuracy + '%')}`) + ' '.repeat(40) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.white(`Total Shots: ${chalk.yellow(homeShots)} vs ${chalk.blue(awayShots)}`) + ' '.repeat(45) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.white(`Yellow Cards: ${chalk.yellow(this.stats.yellowCards.home)} vs ${chalk.blue(this.stats.yellowCards.away)}`) + ' '.repeat(42) + chalk.cyan('│'));
    
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
  }

  calculateTeamStrengths() {
    const homeRating = this.home.squad.average_rating;
    const homeTacticsBonus = this.getTacticsBonus(this.preparation.strategy);
    const homeAdvantage = 3;
    const homeForm = this.home.currentForm || 7;
    
    this.homeStrength = homeRating + homeTacticsBonus + homeAdvantage + homeForm;

    const awayRating = this.away.squad.average_rating;
    const awayTacticsBonus = this.getTacticsBonus(this.away.tactics);
    const awayForm = this.away.currentForm || 7;
    
    this.awayStrength = awayRating + awayTacticsBonus + awayForm;
  }

  getTacticsBonus(tactics) {
    let bonus = 0;
    if (tactics.mentality === 'attacking') bonus += 2;
    if (tactics.pressing === 'high') bonus += 1;
    return bonus;
  }

  calculatePossession() {
    const strengthDiff = this.homeStrength - this.awayStrength;
    let homePossession = 50 + (strengthDiff * 0.5);
    
    if (this.preparation.strategy.approach === 'possession') {
      homePossession += 5;
    }
    if (this.away.tactics.play_style?.possession > 70) {
      homePossession -= 5;
    }
    
    homePossession = Math.max(30, Math.min(70, homePossession));
    
    this.stats.possession.home = Math.round(homePossession);
    this.stats.possession.away = 100 - this.stats.possession.home;
  }

  calculateExpectedGoals() {
    const homePossessionFactor = this.stats.possession.home / 100;
    const homeAttackStrength = this.homeStrength / 80;
    
    this.xG = {
      home: homePossessionFactor * homeAttackStrength * 1.5,
      away: (1 - homePossessionFactor) * (this.awayStrength / 80) * 1.3
    };
  }

  async processGoalChance() {
    const homeChanceProbability = this.xG.home / (this.xG.home + this.xG.away);
    const isHomeAttacking = Math.random() < homeChanceProbability;
    
    const attackingTeam = isHomeAttacking ? 'home' : 'away';
    const scorer = this.chooseScorer(attackingTeam);
    if (!scorer) return;
    
    const finishing = scorer.technical?.finishing || 70;
    const goalProbability = 0.15 + (finishing / 100) * 0.25;
    
    this.stats.shots[attackingTeam]++;
    this.stats.dangerousAttacks[attackingTeam]++;
    
    if (Math.random() < goalProbability) {
      this.score[attackingTeam]++;
      this.stats.shotsOnTarget[attackingTeam]++;
      
      this.addEvent('goal', this.minute, {
        team: attackingTeam,
        scorer: scorer.name,
        score: `${this.score.home}-${this.score.away}`
      });
      
      const teamName = attackingTeam === 'home' ? this.home.name : this.away.name;
      console.log('\n');
      console.log(chalk.bgGreen.white.bold(` ⚽ GOOOAL! ${this.minute}' `));
      console.log(chalk.green.bold(`   ${scorer.name} (${teamName})`));
      console.log(chalk.white(`   Score: ${chalk.bold(this.score.home + ' - ' + this.score.away)}`));
      console.log('\n');
      await this.delay(2000);
      
    } else {
      const outcome = Math.random() < 0.6 ? 'saved' : 'wide';
      if (outcome === 'saved') {
        this.stats.shotsOnTarget[attackingTeam]++;
      }
      this.addEvent('chance', this.minute, {
        team: attackingTeam,
        player: scorer.name,
        outcome: outcome
      });
    }
  }

  chooseScorer(team) {
    const lineup = this.currentLineup[team];
    const players = Object.values(lineup);
    if (players.length === 0) return null;
    
    const weights = players.map(p => {
      let weight = 1;
      if (p.positions.includes('ST') || p.positions.includes('CF')) weight = 5;
      else if (p.positions.includes('LW') || p.positions.includes('RW')) weight = 3;
      else if (p.positions.includes('CAM')) weight = 2;
      else if (p.positions.includes('CM')) weight = 1;
      else weight = 0.5;
      
      weight *= (p.technical?.finishing || 50) / 70;
      return weight;
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < players.length; i++) {
      random -= weights[i];
      if (random <= 0) return players[i];
    }
    
    return players[0];
  }

  processRandomEvent() {
    const eventTypes = ['corner', 'foul', 'yellow_card'];
    const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const team = Math.random() < 0.5 ? 'home' : 'away';
    
    switch (event) {
      case 'corner':
        this.stats.corners[team]++;
        this.addEvent('corner', this.minute, { team });
        break;
      case 'foul':
        this.stats.fouls[team]++;
        this.addEvent('foul', this.minute, { team });
        break;
      case 'yellow_card':
        if (Math.random() < 0.3) {
          this.stats.yellowCards[team]++;
          const player = this.chooseRandomPlayer(team);
          if (player) {
            this.addEvent('yellow_card', this.minute, { team, player: player.name });
            console.log(chalk.yellow(`\n   🟨 ${this.minute}' - Yellow Card: ${player.name}\n`));
          }
        }
        break;
    }
  }

  chooseRandomPlayer(team) {
    const players = Object.values(this.currentLineup[team]);
    if (players.length === 0) return null;
    return players[Math.floor(Math.random() * players.length)];
  }

  calculatePlayerRatings() {
    for (const team of ['home', 'away']) {
      const lineup = this.currentLineup[team];
      for (const [position, player] of Object.entries(lineup)) {
        let rating = 6.0;
        const goals = this.events.filter(e => e.type === 'goal' && e.data.scorer === player.name).length;
        rating += goals * 1.5;
        
        const teamScore = this.score[team];
        const opponentScore = this.score[team === 'home' ? 'away' : 'home'];
        
        if (teamScore > opponentScore) rating += 0.5;
        else if (teamScore < opponentScore) rating -= 0.3;
        
        if (position === 'GK') {
          const cleanSheet = opponentScore === 0;
          rating += cleanSheet ? 1.0 : 0;
          rating -= opponentScore * 0.3;
        }
        
        rating += (Math.random() * 1.0 - 0.5);
        this.playerRatings[player.name] = Math.max(1, Math.min(10, rating)).toFixed(1);
      }
    }
  }

  addEvent(type, minute, data = {}) {
    this.events.push({ type, minute, data, timestamp: new Date() });
  }

  getMatchResult() {
    return {
      home: {
        club: this.home,
        score: this.score.home,
        stats: {
          possession: this.stats.possession.home,
          shots: this.stats.shots.home,
          shotsOnTarget: this.stats.shotsOnTarget.home,
          corners: this.stats.corners.home,
          fouls: this.stats.fouls.home,
          yellowCards: this.stats.yellowCards.home,
          redCards: this.stats.redCards.home
        }
      },
      away: {
        club: this.away,
        score: this.score.away,
        stats: {
          possession: this.stats.possession.away,
          shots: this.stats.shots.away,
          shotsOnTarget: this.stats.shotsOnTarget.away,
          corners: this.stats.corners.away,
          fouls: this.stats.fouls.away,
          yellowCards: this.stats.yellowCards.away,
          redCards: this.stats.redCards.away
        }
      },
      events: this.events,
      playerRatings: this.playerRatings,
      date: new Date().toISOString()
    };
  }

  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text + ' '.repeat(padding);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MatchSimulator;
