import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';
import chalk from 'chalk';

class InMatchAI {
  constructor(aiCoach, matchSimulator) {
    this.aiCoach = aiCoach;
    this.match = matchSimulator;
    this.decisions = [];
    this.lastEvaluationMinute = 0;
  }

  async evaluateSituation() {
    const minute = this.match.minute;
    
    // Only evaluate at 15, 30, 60, 75 minutes
    if (![15, 30, 60, 75].includes(minute)) {
      return;
    }
    
    // Avoid double evaluation
    if (minute === this.lastEvaluationMinute) {
      return;
    }
    
    this.lastEvaluationMinute = minute;
    
    console.log('\n');
    console.log(chalk.bgMagenta.white.bold(` 🧠 AI COACH ANALYSIS [${minute}'] `));
    console.log('\n');
    
    const score = this.match.score;
    const performance = this.analyzePerformance();
    
    // Display current situation
    this.displaySituation(score, performance);
    
    // Decision making
    let actionTaken = false;
    
    // TRIGGER 1: Losing after 60 minutes
    if (score.home < score.away && minute >= 60) {
      await this.reactToLosingPosition(minute);
      actionTaken = true;
    }
    
    // TRIGGER 2: Winning and protect lead after 75 minutes
    else if (score.home > score.away && minute >= 75) {
      await this.protectLead(minute);
      actionTaken = true;
    }
    
    // TRIGGER 3: Poor performance
    else if (performance.rating < 5.5 && minute >= 30) {
      await this.improvePoorPerformance(minute);
      actionTaken = true;
    }
    
    // TRIGGER 4: Tired players
    else {
      const tiredPlayers = this.findTiredPlayers();
      if (tiredPlayers.length > 0 && minute >= 60 && this.match.substitutionsLeft.home > 0) {
        await this.substituteTiredPlayers(tiredPlayers, minute);
        actionTaken = true;
      }
    }
    
    // TRIGGER 5: Players on yellow cards
    if (!actionTaken) {
      const riskyPlayers = this.findPlayersOnYellowCard();
      if (riskyPlayers.length > 0 && minute >= 70 && this.match.substitutionsLeft.home > 0) {
        await this.substituteRiskyPlayers(riskyPlayers, minute);
        actionTaken = true;
      }
    }
    
    if (!actionTaken) {
      console.log(chalk.green('   ✅ No changes needed - team performing well\n'));
    }
  }

  displaySituation(score, performance) {
    const scoreDiff = score.home - score.away;
    let statusIcon = '⚖️';
    let statusText = 'Drawing';
    let statusColor = chalk.yellow;
    
    if (scoreDiff > 0) {
      statusIcon = '✅';
      statusText = `Winning ${scoreDiff}-${0}`;
      statusColor = chalk.green;
    } else if (scoreDiff < 0) {
      statusIcon = '⚠️';
      statusText = `Losing ${0}-${Math.abs(scoreDiff)}`;
      statusColor = chalk.red;
    }
    
    console.log(chalk.cyan('┌─ 📊 SITUATION ') + chalk.cyan('─'.repeat(62) + '┐'));
    console.log(chalk.cyan('│ ') + statusColor(`${statusIcon} Status: ${statusText}`) + ' '.repeat(50) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.white(`📈 Performance Rating: ${this.getPerformanceColor(performance.rating)}`) + ' '.repeat(38) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.white(`⚽ Shots: ${this.match.stats.shots.home} (${this.match.stats.shotsOnTarget.home} on target)`) + ' '.repeat(35) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.white(`🎯 Possession: ${this.match.stats.possession.home}%`) + ' '.repeat(48) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
  }

  getPerformanceColor(rating) {
    const ratingStr = rating.toFixed(1);
    if (rating >= 7.5) return chalk.green.bold(ratingStr + '/10');
    if (rating >= 6.0) return chalk.yellow(ratingStr + '/10');
    return chalk.red(ratingStr + '/10');
  }

  analyzePerformance() {
    const possession = this.match.stats.possession.home;
    const shots = this.match.stats.shots.home;
    const shotsOnTarget = this.match.stats.shotsOnTarget.home;
    const minute = this.match.minute;
    
    let rating = 5.0;
    
    if (possession > 60) rating += 1.0;
    else if (possession < 40) rating -= 1.0;
    
    const expectedShots = (minute / 90) * 17;
    if (shots > expectedShots) rating += 0.5;
    else if (shots < expectedShots * 0.6) rating -= 0.5;
    
    const accuracy = shots > 0 ? shotsOnTarget / shots : 0;
    if (accuracy > 0.5) rating += 0.5;
    else if (accuracy < 0.3) rating -= 0.5;
    
    const scoreDiff = this.match.score.home - this.match.score.away;
    rating += scoreDiff * 0.5;
    
    return {
      rating: Math.max(1, Math.min(10, rating)),
      possession,
      shots,
      shotsOnTarget
    };
  }

  async reactToLosingPosition(minute) {
    console.log(chalk.red.bold('   ⚠️  DECISION: We\'re losing - switching to attacking mode!\n'));
    
    console.log(chalk.cyan('┌─ 🔧 TACTICAL CHANGES ') + chalk.cyan('─'.repeat(54) + '┐'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Mentality: Ultra Attacking') + ' '.repeat(37) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Tempo: Fast') + ' '.repeat(52) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Pressing: High') + ' '.repeat(49) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
    
    this.match.preparation.strategy.mentality = 'ultra_attacking';
    this.match.preparation.strategy.tempo = 'fast';
    this.match.preparation.strategy.pressing = 'high';
    
    this.addDecision(minute, 'tactical_change', {
      change: 'Ultra Attacking Mentality',
      reason: 'Losing position - need goals'
    });
    
    if (this.match.substitutionsLeft.home > 0) {
      const defensivePlayer = this.findMostDefensivePlayer();
      const attacker = this.findBestAvailableAttacker();
      
      if (defensivePlayer && attacker) {
        console.log(chalk.blue('   🔄 Preparing attacking substitution...'));
        await this.makeSubstitution(defensivePlayer, attacker, minute, 'Need more attacking threat');
      }
    }
  }

  async protectLead(minute) {
    console.log(chalk.green.bold('   ✅ DECISION: Protecting our lead!\n'));
    
    console.log(chalk.cyan('┌─ 🔧 TACTICAL CHANGES ') + chalk.cyan('─'.repeat(54) + '┐'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Mentality: Defensive') + ' '.repeat(43) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Tempo: Slow') + ' '.repeat(52) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.yellow('➜ Pressing: Low') + ' '.repeat(50) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
    
    this.match.preparation.strategy.mentality = 'defensive';
    this.match.preparation.strategy.tempo = 'slow';
    this.match.preparation.strategy.pressing = 'low';
    
    this.addDecision(minute, 'tactical_change', {
      change: 'Defensive Mentality',
      reason: 'Protecting lead'
    });
    
    if (this.match.substitutionsLeft.home > 0) {
      const attacker = this.findMostOffensivePlayer();
      const defensiveMid = this.findBestAvailableDM();
      
      if (attacker && defensiveMid) {
        console.log(chalk.blue('   🔄 Bringing on defensive midfielder...'));
        await this.makeSubstitution(attacker, defensiveMid, minute, 'Defensive reinforcement');
      }
    }
  }

  async improvePoorPerformance(minute) {
    console.log(chalk.yellow.bold('   ⚠️  DECISION: Poor performance - making changes!\n'));
    
    const worstPlayers = this.findWorstPerformers(2);
    
    if (worstPlayers.length > 0 && this.match.substitutionsLeft.home > 0) {
      const playerOut = worstPlayers[0];
      const playerIn = this.findBestReplacementFor(playerOut);
      
      if (playerIn) {
        await this.makeSubstitution(playerOut, playerIn, minute, 'Poor performance');
      }
    }
    
    if (this.match.stats.possession.home < 40) {
      console.log(chalk.cyan('┌─ 🔧 TACTICAL ADJUSTMENT ') + chalk.cyan('─'.repeat(51) + '┐'));
      console.log(chalk.cyan('│ ') + chalk.yellow('➜ Slowing tempo to improve ball control') + ' '.repeat(26) + chalk.cyan('│'));
      console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
      console.log('\n');
      
      this.match.preparation.strategy.tempo = 'medium';
      this.addDecision(minute, 'tactical_adjustment', {
        change: 'Slowing tempo to improve control'
      });
    }
  }

  async substituteTiredPlayers(tiredPlayers, minute) {
    if (this.match.substitutionsLeft.home === 0) return;
    
    console.log(chalk.yellow.bold('   💪 DECISION: Refreshing tired players\n'));
    
    const playerOut = tiredPlayers[0];
    const playerIn = this.findBestReplacementFor(playerOut);
    
    if (playerIn) {
      await this.makeSubstitution(playerOut, playerIn, minute, 'Low fitness');
    }
  }

  async substituteRiskyPlayers(riskyPlayers, minute) {
    if (this.match.substitutionsLeft.home === 0) return;
    
    console.log(chalk.red.bold('   🟨 DECISION: Preventing red card risk\n'));
    
    const playerOut = riskyPlayers[0];
    const playerIn = this.findBestReplacementFor(playerOut);
    
    if (playerIn) {
      await this.makeSubstitution(playerOut, playerIn, minute, 'Risk of red card');
    }
  }

  async makeSubstitution(playerOut, playerIn, minute, reason) {
    console.log(chalk.cyan('┌─ 🔄 SUBSTITUTION ') + chalk.cyan('─'.repeat(59) + '┐'));
    console.log(chalk.cyan('│ ') + chalk.red(`⬇️  OUT: ${playerOut.name}`) + ' '.repeat(50) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.green(`⬆️  IN:  ${playerIn.name}`) + ' '.repeat(50) + chalk.cyan('│'));
    console.log(chalk.cyan('│ ') + chalk.gray(`💡 Reason: ${reason}`) + ' '.repeat(45) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(78) + '┘'));
    console.log('\n');
    
    this.match.substitutionsLeft.home--;
    
    for (const [position, player] of Object.entries(this.match.currentLineup.home)) {
      if (player.id === playerOut.id) {
        this.match.currentLineup.home[position] = playerIn;
        break;
      }
    }
    
    this.addDecision(minute, 'substitution', {
      playerOut: playerOut.name,
      playerIn: playerIn.name,
      reason
    });
    
    this.match.addEvent('substitution', minute, {
      team: 'home',
      playerOut: playerOut.name,
      playerIn: playerIn.name
    });
  }

  findMostDefensivePlayer() {
    const lineup = this.match.currentLineup.home;
    const defensivePlayers = Object.values(lineup).filter(p => 
      ['CDM', 'CM', 'LM', 'RM'].some(pos => p.positions.includes(pos))
    );
    return defensivePlayers.length > 0 ? defensivePlayers[0] : null;
  }

  findMostOffensivePlayer() {
    const lineup = this.match.currentLineup.home;
    const offensivePlayers = Object.values(lineup).filter(p => 
      ['LW', 'RW', 'CAM'].some(pos => p.positions.includes(pos))
    );
    return offensivePlayers.length > 0 ? offensivePlayers[0] : null;
  }

  findBestAvailableAttacker() {
    const club = this.match.home;
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      return !inLineup && ['ST', 'LW', 'RW', 'CAM'].some(pos => p.positions.includes(pos));
    });
    return bench.sort((a, b) => b.attributes.currentRating - a.attributes.currentRating)[0] || null;
  }

  findBestAvailableDM() {
    const club = this.match.home;
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      return !inLineup && ['CDM', 'CM'].some(pos => p.positions.includes(pos));
    });
    return bench.sort((a, b) => b.attributes.currentRating - a.attributes.currentRating)[0] || null;
  }

  findBestReplacementFor(player) {
    const club = this.match.home;
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      const canPlayPosition = p.positions.some(pos => player.positions.includes(pos));
      return !inLineup && canPlayPosition;
    });
    return bench.sort((a, b) => b.attributes.currentRating - a.attributes.currentRating)[0] || null;
  }

  findTiredPlayers() {
    const lineup = Object.values(this.match.currentLineup.home);
    const tired = [];
    
    for (const player of lineup) {
      const fitness = player.fitness || 100;
      const stamina = player.physical?.stamina || 70;
      const fatigueRate = (100 - stamina) / 100;
      const currentFitness = fitness - (this.match.minute * fatigueRate * 0.5);
      
      if (currentFitness < 50) {
        tired.push(player);
      }
    }
    
    return tired.sort((a, b) => (a.fitness || 100) - (b.fitness || 100));
  }

  findPlayersOnYellowCard() {
    const yellowCards = this.match.events.filter(e => 
      e.type === 'yellow_card' && e.data.team === 'home'
    );
    const playersWithYellow = yellowCards.map(e => e.data.player);
    const lineup = Object.values(this.match.currentLineup.home);
    return lineup.filter(p => playersWithYellow.includes(p.name));
  }

  findWorstPerformers(count) {
    const lineup = Object.values(this.match.currentLineup.home);
    const performances = lineup.map(player => {
      let score = 6.0;
      const yellows = this.match.events.filter(e => 
        e.type === 'yellow_card' && e.data.player === player.name
      ).length;
      score -= yellows * 1.0;
      
      const goals = this.match.events.filter(e => 
        e.type === 'goal' && e.data.scorer === player.name
      ).length;
      score += goals * 1.5;
      
      return { player, score };
    });
    
    return performances
      .sort((a, b) => a.score - b.score)
      .slice(0, count)
      .map(p => p.player);
  }

  addDecision(minute, type, data) {
    this.decisions.push({
      minute,
      type,
      data,
      timestamp: new Date()
    });
  }

  getDecisions() {
    return this.decisions;
  }
}

export default InMatchAI;
