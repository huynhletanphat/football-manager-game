
import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';

class AICoach {
  constructor(club) {
    this.club = club;
    this.memory = {
      previousMatches: [],
      opponentProfiles: new Map(),
      playerPerformance: new Map(),
      successfulTactics: []
    };
    this.tacticalKnowledge = this.initializeTacticalKnowledge();
  }

  initializeTacticalKnowledge() {
    return {
      formations: {
        '4-3-3': { 
          attacking: 9, defensive: 6, 
          goodAgainst: ['4-4-2', '3-5-2'],
          weakAgainst: ['5-4-1', '4-5-1'],
          strengths: ['wide_play', 'high_press', 'wing_dominance']
        },
        '4-2-3-1': { 
          attacking: 8, defensive: 7,
          goodAgainst: ['4-3-3', '4-5-1'],
          weakAgainst: ['3-5-2', '4-4-2'],
          strengths: ['central_control', 'counter_attack', 'flexibility']
        },
        '4-4-2': { 
          attacking: 7, defensive: 7,
          goodAgainst: ['4-3-3', '3-4-3'],
          weakAgainst: ['4-2-3-1', '3-5-2'],
          strengths: ['balance', 'compactness', 'simplicity']
        },
        '4-1-4-1': { 
          attacking: 7, defensive: 8,
          goodAgainst: ['4-2-3-1', '4-3-3'],
          weakAgainst: ['4-4-2'],
          strengths: ['defensive_stability', 'midfield_numbers']
        },
        '5-4-1': { 
          attacking: 5, defensive: 9,
          goodAgainst: ['4-3-3', '3-5-2'],
          weakAgainst: ['4-4-2'],
          strengths: ['defensive_solidity', 'wide_coverage']
        },
        '4-5-1': { 
          attacking: 6, defensive: 8,
          goodAgainst: ['4-4-2', '4-2-3-1'],
          weakAgainst: ['3-5-2'],
          strengths: ['midfield_control', 'counter', 'compactness']
        },
        '3-5-2': { 
          attacking: 8, defensive: 7,
          goodAgainst: ['4-4-2', '4-5-1'],
          weakAgainst: ['4-3-3'],
          strengths: ['wing_backs', 'central_overload', 'width']
        },
        '3-4-3': {
          attacking: 9, defensive: 5,
          goodAgainst: ['4-4-2', '5-4-1'],
          weakAgainst: ['4-3-3', '3-5-2'],
          strengths: ['attacking_width', 'pressing', 'forward_numbers']
        }
      }
    };
  }

  async prepareForMatch(opponent, matchContext) {
    logger.aiDecision(translator.t('ai_coach.analyzing'));
    
    // Step 1: Analyze opponent
    const analysis = await this.analyzeOpponent(opponent);
    
    // Step 2: Assess our squad
    const squadStatus = this.assessSquadCondition();
    
    // Step 3: Evaluate match importance
    const matchImportance = this.evaluateMatchImportance(matchContext);
    
    // Step 4: Determine strategy
    const strategy = this.determineStrategy({
      analysis,
      squadStatus,
      matchImportance,
      homeAdvantage: matchContext.isHome
    });
    
    // Step 5: Select formation
    const formation = this.selectFormation(strategy, analysis);
    
    // Step 6: Select starting XI
    const lineup = this.selectStartingXI(formation, strategy);
    
    // Step 7: Assign player roles
    const playerRoles = this.assignPlayerRoles(lineup, formation, strategy);
    
    // Step 8: Prepare instructions
    const instructions = this.prepareMatchInstructions(strategy);
    
    return {
      strategy,
      formation,
      lineup,
      playerRoles,
      instructions,
      analysis
    };
  }

  analyzeOpponent(opponent) {
    logger.aiAnalysis(`Analyzing ${opponent.name}...`);
    
    const recentForm = this.calculateRecentForm(opponent);
    const tacticalProfile = this.buildTacticalProfile(opponent);
    const keyPlayers = this.identifyKeyPlayers(opponent);
    
    return {
      strengths: {
        attackingThreat: this.calculateAttackThreat(opponent),
        defensiveSolidity: this.calculateDefensiveSolidity(opponent),
        keyPlayers: keyPlayers,
        dangerousSetPieces: this.analyzeSetPieces(opponent)
      },
      weaknesses: {
        vulnerableAreas: this.findVulnerableAreas(opponent),
        poorPositions: this.findWeakPositions(opponent),
        tacticalFlaws: this.identifyTacticalFlaws(opponent)
      },
      playStyle: {
        formation: opponent.tactics.default_formation,
        mentality: opponent.tactics.mentality,
        possession: tacticalProfile.avgPossession,
        pressingIntensity: tacticalProfile.pressingIntensity,
        attackingWidth: tacticalProfile.attackingWidth,
        buildUpStyle: tacticalProfile.buildUpStyle
      },
      form: recentForm
    };
  }

  calculateAttackThreat(opponent) {
    const squad = opponent.squad.current_players || [];
    const attackers = squad.filter(p => 
      ['ST', 'CF', 'LW', 'RW', 'CAM'].some(pos => p.positions.includes(pos))
    );
    
    if (attackers.length === 0) return 50;
    
    const avgAttacking = attackers.reduce((sum, p) => {
      const finishing = p.technical?.finishing || 50;
      const pace = p.physical?.pace || 50;
      return sum + (finishing + pace) / 2;
    }, 0) / attackers.length;
    
    return Math.round(avgAttacking);
  }

  calculateDefensiveSolidity(opponent) {
    const squad = opponent.squad.current_players || [];
    const defenders = squad.filter(p => 
      ['GK', 'CB', 'LB', 'RB', 'CDM'].some(pos => p.positions.includes(pos))
    );
    
    if (defenders.length === 0) return 50;
    
    const avgDefensive = defenders.reduce((sum, p) => {
      const marking = p.mental?.marking || 50;
      const tackling = p.technical?.tackling || 50;
      return sum + (marking + tackling) / 2;
    }, 0) / defenders.length;
    
    return Math.round(avgDefensive);
  }

  identifyKeyPlayers(opponent) {
    const squad = opponent.squad.current_players || [];
    return squad
      .sort((a, b) => b.attributes.currentRating - a.attributes.currentRating)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        rating: p.attributes.currentRating,
        positions: p.positions,
        threat: 'high'
      }));
  }

  findVulnerableAreas(opponent) {
    const vulnerableAreas = [];
    const squad = opponent.squad.current_players || [];
    
    // Check flanks
    const fullBacks = squad.filter(p => 
      p.positions.includes('LB') || p.positions.includes('RB')
    );
    const avgFBRating = fullBacks.reduce((sum, p) => 
      sum + p.attributes.currentRating, 0
    ) / (fullBacks.length || 1);
    
    if (avgFBRating < 70) {
      vulnerableAreas.push('flanks');
    }
    
    // Check aerial ability
    const defenders = squad.filter(p => 
      p.positions.includes('CB')
    );
    const avgHeight = defenders.reduce((sum, p) => 
      sum + (p.physical?.height || 180), 0
    ) / (defenders.length || 1);
    
    if (avgHeight < 185) {
      vulnerableAreas.push('aerial_duels');
    }
    
    // Check pace
    const avgPace = defenders.reduce((sum, p) => 
      sum + (p.physical?.pace || 70), 0
    ) / (defenders.length || 1);
    
    if (avgPace < 70) {
      vulnerableAreas.push('pace_behind_defense');
    }
    
    return vulnerableAreas;
  }

  findWeakPositions(opponent) {
    const squad = opponent.squad.current_players || [];
    const positions = ['GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const weakPositions = [];
    
    for (const pos of positions) {
      const players = squad.filter(p => p.positions.includes(pos));
      if (players.length === 0) {
        weakPositions.push(pos);
        continue;
      }
      
      const avgRating = players.reduce((sum, p) => 
        sum + p.attributes.currentRating, 0
      ) / players.length;
      
      if (avgRating < 68) {
        weakPositions.push(pos);
      }
    }
    
    return weakPositions;
  }

  identifyTacticalFlaws(opponent) {
    const flaws = [];
    const tactics = opponent.tactics;
    
    // High line with slow defenders
    if (tactics.play_style?.defensive_line > 70) {
      const squad = opponent.squad.current_players || [];
      const defenders = squad.filter(p => p.positions.includes('CB'));
      const avgPace = defenders.reduce((sum, p) => 
        sum + (p.physical?.pace || 70), 0
      ) / (defenders.length || 1);
      
      if (avgPace < 70) {
        flaws.push('high_line_slow_defenders');
      }
    }
    
    // High pressing with low stamina
    if (tactics.play_style?.pressing > 75) {
      flaws.push('vulnerable_to_long_balls');
    }
    
    return flaws;
  }

  buildTacticalProfile(opponent) {
    return {
      avgPossession: opponent.tactics.play_style?.possession || 50,
      pressingIntensity: opponent.tactics.play_style?.pressing || 50,
      attackingWidth: opponent.tactics.play_style?.width || 50,
      buildUpStyle: opponent.tactics.play_style?.tempo > 70 ? 'direct' : 'short_passing'
    };
  }

  calculateRecentForm(opponent) {
    // Simplified - in real game would check match history
    const baseForm = opponent.squad.average_rating / 10;
    const variance = Math.random() * 2 - 1;
    return Math.max(1, Math.min(10, baseForm + variance));
  }

  analyzeSetPieces(opponent) {
    const squad = opponent.squad.current_players || [];
    const tallPlayers = squad.filter(p => (p.physical?.height || 180) > 185);
    return tallPlayers.length >= 4 ? 'high' : 'medium';
  }

  assessSquadCondition() {
    const squad = this.club.squad.current_players || [];
    
    return {
      totalPlayers: squad.length,
      averageRating: this.club.squad.average_rating,
      averageFitness: squad.reduce((sum, p) => sum + (p.fitness || 100), 0) / squad.length,
      injuries: squad.filter(p => p.injured).length,
      suspensions: squad.filter(p => p.suspended).length,
      form: squad.reduce((sum, p) => sum + (p.currentForm || 7), 0) / squad.length
    };
  }

  evaluateMatchImportance(context) {
    if (context.competition === 'champions_league' && context.round === 'final') {
      return 'crucial';
    }
    if (context.matchday > 30 && context.leaguePosition <= 4) {
      return 'important';
    }
    if (context.derby) {
      return 'important';
    }
    return 'normal';
  }

  determineStrategy(context) {
    const { analysis, squadStatus, matchImportance, homeAdvantage } = context;
    
    const ourStrength = squadStatus.averageRating;
    const theirStrength = (analysis.strengths.attackingThreat + 
                          analysis.strengths.defensiveSolidity) / 2;
    const strengthDiff = ourStrength - theirStrength;
    
    let strategy = {
      approach: 'balanced',
      mentality: 'standard',
      tempo: 'medium',
      width: 'balanced',
      defensiveLine: 'medium',
      pressing: 'medium',
      reasoning: []
    };
    
    // Opponent much stronger
    if (strengthDiff < -10) {
      strategy.approach = 'counter';
      strategy.mentality = 'defensive';
      strategy.defensiveLine = 'low';
      strategy.pressing = 'low';
      strategy.reasoning.push('Opponent significantly stronger - counter-attack');
    }
    // Equal strength
    else if (Math.abs(strengthDiff) <= 10) {
      if (homeAdvantage) {
        strategy.approach = 'attacking';
        strategy.mentality = 'attacking';
        strategy.pressing = 'high';
        strategy.reasoning.push('Home advantage - press high');
      } else {
        strategy.reasoning.push('Equal teams - balanced approach');
      }
    }
    // We are stronger
    else {
      strategy.approach = 'attacking';
      strategy.mentality = 'attacking';
      strategy.tempo = 'fast';
      strategy.pressing = 'high';
      strategy.defensiveLine = 'high';
      strategy.width = 'wide';
      strategy.reasoning.push('We are stronger - dominate possession');
    }
    
    // Exploit weaknesses
    if (analysis.weaknesses.vulnerableAreas.includes('flanks')) {
      strategy.width = 'wide';
      strategy.reasoning.push('Exploit weak flanks');
    }
    
    if (analysis.weaknesses.vulnerableAreas.includes('pace_behind_defense')) {
      strategy.tempo = 'fast';
      strategy.reasoning.push('Exploit pace in behind');
    }
    
    if (analysis.playStyle.pressingIntensity > 75) {
      strategy.buildUp = 'direct';
      strategy.reasoning.push('Bypass their press with direct play');
    }
    
    return strategy;
  }

  selectFormation(strategy, analysis) {
    const opponentFormation = analysis.playStyle.formation;
    let candidates = [];
    
    // Select based on approach
    if (strategy.approach === 'attacking') {
      candidates = ['4-3-3', '4-2-3-1', '3-4-3'];
    } else if (strategy.approach === 'counter') {
      candidates = ['4-5-1', '5-4-1', '4-4-2'];
    } else if (strategy.approach === 'defensive') {
      candidates = ['5-4-1', '4-5-1', '4-1-4-1'];
    } else {
      candidates = ['4-2-3-1', '4-4-2', '4-1-4-1'];
    }
    
    // Filter by counter-formations
    const goodChoices = candidates.filter(f => 
      this.tacticalKnowledge.formations[f]?.goodAgainst.includes(opponentFormation)
    );
    
    const formation = goodChoices.length > 0 ? goodChoices[0] : candidates[0];
    
    logger.aiAnalysis(`Selected formation: ${formation} (counters ${opponentFormation})`);
    
    return formation;
  }

  selectStartingXI(formation, strategy) {
    const positions = this.getFormationPositions(formation);
    const availablePlayers = (this.club.squad.current_players || [])
      .filter(p => !p.injured && !p.suspended);
    
    const lineup = {};
    const usedPlayers = new Set();
    
    for (const position of positions) {
      const candidates = availablePlayers.filter(p => 
        p.positions.includes(position) && !usedPlayers.has(p.id)
      );
      
      const ranked = this.rankPlayersForPosition(candidates, position, strategy);
      
      if (ranked.length > 0) {
        const selected = ranked[0];
        lineup[position] = selected;
        usedPlayers.add(selected.id);
      }
    }
    
    return lineup;
  }

  getFormationPositions(formation) {
    const formationMap = {
      '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
      '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LW', 'CAM', 'RW', 'ST'],
      '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
      '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CDM', 'CM', 'CM', 'RM', 'ST'],
      '5-4-1': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'CM', 'ST'],
      '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LWB', 'CDM', 'CM', 'CM', 'RWB', 'ST', 'ST'],
      '3-4-3': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW']
    };
    
    return formationMap[formation] || formationMap['4-4-2'];
  }

  rankPlayersForPosition(candidates, position, strategy) {
    return candidates.map(player => {
      let score = player.attributes.currentRating;
      
      // Form bonus
      score += (player.currentForm || 7) * 2;
      
      // Fitness
      score += (player.fitness || 100) / 10;
      
      // Tactical fit
      if (strategy.approach === 'attacking') {
        if (['ST', 'LW', 'RW', 'CAM'].includes(position)) {
          score += (player.technical?.finishing || 50) * 0.1;
          score += (player.physical?.pace || 50) * 0.1;
        }
      }
      
      if (strategy.pressing === 'high') {
        score += (player.physical?.stamina || 50) * 0.1;
        score += (player.mental?.workRate || 50) * 0.1;
      }
      
      return { player, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.player);
  }

  assignPlayerRoles(lineup, formation, strategy) {
    const roles = {};
    
    // Simplified role assignment
    for (const [pos, player] of Object.entries(lineup)) {
      roles[pos] = {
        role: this.getDefaultRole(pos),
        instructions: this.getRoleInstructions(pos, strategy)
      };
    }
    
    return roles;
  }

  getDefaultRole(position) {
    const roleMap = {
      GK: 'goalkeeper',
      LB: 'full_back', RB: 'full_back',
      CB: 'central_defender',
      LWB: 'wing_back', RWB: 'wing_back',
      CDM: 'defensive_midfielder',
      CM: 'central_midfielder',
      CAM: 'attacking_midfielder',
      LM: 'wide_midfielder', RM: 'wide_midfielder',
      LW: 'winger', RW: 'winger',
      ST: 'striker', CF: 'striker'
    };
    
    return roleMap[position] || 'midfielder';
  }

  getRoleInstructions(position, strategy) {
    const instructions = [];
    
    if (strategy.pressing === 'high') {
      instructions.push('press_more');
    }
    
    if (strategy.width === 'wide' && ['LW', 'RW', 'LM', 'RM'].includes(position)) {
      instructions.push('stay_wide');
    }
    
    if (strategy.mentality === 'attacking' && ['ST', 'CAM'].includes(position)) {
      instructions.push('shoot_more');
    }
    
    return instructions;
  }

  prepareMatchInstructions(strategy) {
    return {
      general: {
        tempo: strategy.tempo,
        width: strategy.width,
        passingStyle: strategy.buildUp || 'short',
        creativity: strategy.mentality === 'attacking' ? 'high' : 'medium'
      },
      attacking: {
        runType: strategy.approach === 'attacking' ? 'run_at_defense' : 'mixed',
        crossing: strategy.width === 'wide' ? 'cross_often' : 'mixed',
        shooting: strategy.mentality === 'attacking' ? 'shoot_more' : 'work_into_box'
      },
      defending: {
        defensiveLine: strategy.defensiveLine,
        pressingIntensity: strategy.pressing,
        tackling: 'normal'
      }
    };
  }

  // Learn from match results
  learnFromMatch(matchResult) {
    this.memory.previousMatches.push(matchResult);
    
    // Keep only last 10 matches
    if (this.memory.previousMatches.length > 10) {
      this.memory.previousMatches.shift();
    }
    
    // Update opponent profile
    if (matchResult.opponent) {
      this.memory.opponentProfiles.set(matchResult.opponent.club_id, {
        lastPlayed: new Date(),
        results: matchResult,
        tacticsUsed: matchResult.opponentTactics
      });
    }
    
    logger.debug('AI Coach learned from match');
  }
}

export default AICoach;
