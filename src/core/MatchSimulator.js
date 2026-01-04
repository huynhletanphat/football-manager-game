import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';

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
      tackles: { home: 0, away: 0 }
    };
    this.playerRatings = {};
    this.substitutionsLeft = { home: 5, away: 5 };
    this.currentLineup = {
      home: preparation?.lineup || {},
      away: awayClub.lineup || {}
    };
  }

  async simulate() {
    logger.header(`${this.home.name} vs ${this.away.name}`);
    
    // Pre-match calculations
    this.calculateTeamStrengths();
    this.calculatePossession();
    this.calculateExpectedGoals();
    
    this.logMatchInfo();

    // First Half
    await this.simulateHalf(0, 45);
    this.addEvent('half_time', 45);
    
    logger.info(`\n⏸️  ${translator.t('match.half_time')}: ${this.score.home}-${this.score.away}\n`);
    await this.delay(1000);

    // Second Half
    await this.simulateHalf(45, 90);
    
    // Injury time
    const injuryTime = Math.floor(Math.random() * 4) + 2;
    await this.simulateHalf(90, 90 + injuryTime);
    
    this.addEvent('full_time', 90 + injuryTime);
    
    // Calculate player ratings
    this.calculatePlayerRatings();
    
    return this.getMatchResult();
  }

  calculateTeamStrengths() {
    // Home team strength
    const homeRating = this.home.squad.average_rating;
    const homeTacticsBonus = this.getTacticsBonus(this.preparation.strategy);
    const homeAdvantage = 3;
    const homeForm = this.home.currentForm || 7;
    
    this.homeStrength = homeRating + homeTacticsBonus + homeAdvantage + homeForm;

    // Away team strength
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

  async simulateHalf(startMin, endMin) {
    for (let min = startMin; min < endMin; min++) {
      this.minute = min;
      
      if (Math.random() < 0.03) {
        await this.processGoalChance();
        await this.delay(500);
      }
      
      if (Math.random() < 0.02) {
        this.processRandomEvent();
        await this.delay(300);
      }
      
      if (min % 5 === 0 && min > startMin) {
        logger.info(`[${min}'] Score: ${this.score.home}-${this.score.away}`);
      }
    }
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
    
    if (Math.random() < goalProbability) {
      this.score[attackingTeam]++;
      this.stats.shotsOnTarget[attackingTeam]++;
      
      this.addEvent('goal', this.minute, {
        team: attackingTeam,
        scorer: scorer.name,
        score: `${this.score.home}-${this.score.away}`
      });
      
      const teamName = attackingTeam === 'home' ? this.home.name : this.away.name;
      logger.goal(teamName, scorer.name, this.minute);
      
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
      
      logger.debug(`[${this.minute}'] ${scorer.name} - shot ${outcome}`);
    }
  }

  chooseScorer(team) {
    const lineup = this.currentLineup[team];
    const players = Object.values(lineup);
    
    if (players.length === 0) return null;
    
    const weights = players.map(p => {
      let weight = 1;
      
      if (p.positions.includes('ST') || p.positions.includes('CF')) {
        weight = 5;
      } else if (p.positions.includes('LW') || p.positions.includes('RW')) {
        weight = 3;
      } else if (p.positions.includes('CAM')) {
        weight = 2;
      } else if (p.positions.includes('CM')) {
        weight = 1;
      } else {
        weight = 0.5;
      }
      
      weight *= (p.technical?.finishing || 50) / 70;
      
      return weight;
    });
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < players.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return players[i];
      }
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
            logger.yellowCard(player.name, this.minute);
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
        
        const goals = this.events.filter(e => 
          e.type === 'goal' && e.data.scorer === player.name
        ).length;
        rating += goals * 1.5;
        
        const teamScore = this.score[team];
        const opponentScore = this.score[team === 'home' ? 'away' : 'home'];
        
        if (teamScore > opponentScore) {
          rating += 0.5;
        } else if (teamScore < opponentScore) {
          rating -= 0.3;
        }
        
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
    this.events.push({
      type,
      minute,
      data,
      timestamp: new Date()
    });
  }

  logMatchInfo() {
    logger.info(`Formation: ${this.preparation.formation}`);
    logger.info(`Strategy: ${this.preparation.strategy.approach}`);
    logger.info(`Mentality: ${this.preparation.strategy.mentality}`);
    logger.divider();
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MatchSimulator;
