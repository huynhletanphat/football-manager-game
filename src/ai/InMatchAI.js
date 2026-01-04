import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';

class InMatchAI {
  constructor(aiCoach, matchSimulator) {
    this.aiCoach = aiCoach;
    this.match = matchSimulator;
    this.decisions = [];
    this.lastEvaluationMinute = 0;
  }

  async evaluateSituation() {
    const minute = this.match.minute;
    
    // Evaluate every 15 minutes
    if (minute - this.lastEvaluationMinute < 15) {
      return;
    }
    
    this.lastEvaluationMinute = minute;
    
    const score = this.match.score;
    const performance = this.analyzePerformance();
    
    // Decision triggers
    
    // TRIGGER 1: Losing after 60 minutes
    if (score.home < score.away && minute >= 60) {
      await this.reactToLosingPosition(minute);
    }
    
    // TRIGGER 2: Winning and protect lead after 75 minutes
    else if (score.home > score.away && minute >= 75) {
      await this.protectLead(minute);
    }
    
    // TRIGGER 3: Poor performance
    else if (performance.rating < 5.5 && minute >= 30) {
      await this.improvePoorPerformance(minute);
    }
    
    // TRIGGER 4: Tired players need substitution
    const tiredPlayers = this.findTiredPlayers();
    if (tiredPlayers.length > 0 && minute >= 60 && this.match.substitutionsLeft.home > 0) {
      await this.substituteTiredPlayers(tiredPlayers, minute);
    }
    
    // TRIGGER 5: Players on yellow cards
    const riskyPlayers = this.findPlayersOnYellowCard();
    if (riskyPlayers.length > 0 && minute >= 70 && this.match.substitutionsLeft.home > 0) {
      await this.substituteRiskyPlayers(riskyPlayers, minute);
    }
  }

  analyzePerformance() {
    const possession = this.match.stats.possession.home;
    const shots = this.match.stats.shots.home;
    const shotsOnTarget = this.match.stats.shotsOnTarget.home;
    const minute = this.match.minute;
    
    // Calculate performance rating (0-10)
    let rating = 5.0;
    
    // Possession factor
    if (possession > 60) rating += 1.0;
    else if (possession < 40) rating -= 1.0;
    
    // Shots factor (expect ~15-20 shots per 90 minutes)
    const expectedShots = (minute / 90) * 17;
    if (shots > expectedShots) rating += 0.5;
    else if (shots < expectedShots * 0.6) rating -= 0.5;
    
    // Shot accuracy
    const accuracy = shots > 0 ? shotsOnTarget / shots : 0;
    if (accuracy > 0.5) rating += 0.5;
    else if (accuracy < 0.3) rating -= 0.5;
    
    // Score impact
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
    logger.aiDecision(`"We're losing! Time to push forward!" [${minute}']`);
    
    // Change to ultra attacking
    this.match.preparation.strategy.mentality = 'ultra_attacking';
    this.match.preparation.strategy.tempo = 'fast';
    this.match.preparation.strategy.pressing = 'high';
    
    this.addDecision(minute, 'tactical_change', {
      change: 'Ultra Attacking Mentality',
      reason: 'Losing position - need goals'
    });
    
    // Make attacking substitution if possible
    if (this.match.substitutionsLeft.home > 0) {
      const defensivePlayer = this.findMostDefensivePlayer();
      const attacker = this.findBestAvailableAttacker();
      
      if (defensivePlayer && attacker) {
        await this.makeSubstitution(defensivePlayer, attacker, minute, 'Need more attacking threat');
      }
    }
    
    // Consider formation change
    if (this.match.preparation.formation === '4-5-1') {
      this.changeFormation('4-3-3', minute);
    } else if (this.match.preparation.formation === '4-4-2') {
      this.changeFormation('4-2-4', minute);
    }
  }

  async protectLead(minute) {
    logger.aiDecision(`"Protecting our lead!" [${minute}']`);
    
    // Change to defensive
    this.match.preparation.strategy.mentality = 'defensive';
    this.match.preparation.strategy.tempo = 'slow';
    this.match.preparation.strategy.pressing = 'low';
    this.match.preparation.strategy.defensiveLine = 'low';
    
    this.addDecision(minute, 'tactical_change', {
      change: 'Defensive Mentality',
      reason: 'Protecting lead'
    });
    
    // Bring on defensive midfielder
    if (this.match.substitutionsLeft.home > 0) {
      const attacker = this.findMostOffensivePlayer();
      const defensiveMid = this.findBestAvailableDM();
      
      if (attacker && defensiveMid) {
        await this.makeSubstitution(attacker, defensiveMid, minute, 'Defensive reinforcement');
      }
    }
  }

  async improvePoorPerformance(minute) {
    logger.aiDecision(`"We need to improve! Making changes..." [${minute}']`);
    
    const worstPlayers = this.findWorstPerformers(2);
    
    if (worstPlayers.length > 0 && this.match.substitutionsLeft.home > 0) {
      const playerOut = worstPlayers[0];
      const playerIn = this.findBestReplacementFor(playerOut);
      
      if (playerIn) {
        await this.makeSubstitution(playerOut, playerIn, minute, 'Poor performance');
      }
    }
    
    // Tactical adjustment
    if (this.match.stats.possession.home < 40) {
      this.match.preparation.strategy.tempo = 'medium';
      this.addDecision(minute, 'tactical_adjustment', {
        change: 'Slowing tempo to improve control'
      });
    }
  }

  async substituteTiredPlayers(tiredPlayers, minute) {
    if (this.match.substitutionsLeft.home === 0) return;
    
    const playerOut = tiredPlayers[0];
    const playerIn = this.findBestReplacementFor(playerOut);
    
    if (playerIn) {
      await this.makeSubstitution(playerOut, playerIn, minute, 'Low fitness');
    }
  }

  async substituteRiskyPlayers(riskyPlayers, minute) {
    if (this.match.substitutionsLeft.home === 0) return;
    
    const playerOut = riskyPlayers[0];
    const playerIn = this.findBestReplacementFor(playerOut);
    
    if (playerIn) {
      await this.makeSubstitution(playerOut, playerIn, minute, 'Risk of red card');
    }
  }

  async makeSubstitution(playerOut, playerIn, minute, reason) {
    logger.substitution(playerOut.name, playerIn.name, minute);
    logger.info(`   Reason: ${reason}\n`);
    
    this.match.substitutionsLeft.home--;
    
    // Find position and replace in lineup
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

  changeFormation(newFormation, minute) {
    logger.aiDecision(`Formation change: ${this.match.preparation.formation} → ${newFormation}`);
    
    this.match.preparation.formation = newFormation;
    
    this.addDecision(minute, 'formation_change', {
      from: this.match.preparation.formation,
      to: newFormation
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
    const club = this.match.home.club_id === this.aiCoach.club.club_id 
      ? this.match.home 
      : this.match.away;
    
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      return !inLineup && ['ST', 'LW', 'RW', 'CAM'].some(pos => p.positions.includes(pos));
    });
    
    return bench.sort((a, b) => 
      b.attributes.currentRating - a.attributes.currentRating
    )[0] || null;
  }

  findBestAvailableDM() {
    const club = this.match.home.club_id === this.aiCoach.club.club_id 
      ? this.match.home 
      : this.match.away;
    
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      return !inLineup && ['CDM', 'CM'].some(pos => p.positions.includes(pos));
    });
    
    return bench.sort((a, b) => 
      b.attributes.currentRating - a.attributes.currentRating
    )[0] || null;
  }

  findBestReplacementFor(player) {
    const club = this.match.home.club_id === this.aiCoach.club.club_id 
      ? this.match.home 
      : this.match.away;
    
    const bench = club.squad.current_players.filter(p => {
      const inLineup = Object.values(this.match.currentLineup.home).some(lp => lp.id === p.id);
      const canPlayPosition = p.positions.some(pos => player.positions.includes(pos));
      return !inLineup && canPlayPosition;
    });
    
    return bench.sort((a, b) => 
      b.attributes.currentRating - a.attributes.currentRating
    )[0] || null;
  }

  findTiredPlayers() {
    const lineup = Object.values(this.match.currentLineup.home);
    const tired = [];
    
    for (const player of lineup) {
      const fitness = player.fitness || 100;
      const stamina = player.physical?.stamina || 70;
      
      // Calculate fatigue based on minute and stamina
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
    
    // Simple performance calculation based on events
    const performances = lineup.map(player => {
      let score = 6.0;
      
      // Penalty for yellow cards
      const yellows = this.match.events.filter(e => 
        e.type === 'yellow_card' && e.data.player === player.name
      ).length;
      score -= yellows * 1.0;
      
      // Bonus for goals
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
