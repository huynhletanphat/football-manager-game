import dataLoader from '../utils/DataLoader.js';
import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';
import PlayerDistributor from './PlayerDistributor.js';
import ScheduleGenerator from './ScheduleGenerator.js';
import MatchSimulator from './MatchSimulator.js';
import AICoach from '../ai/AICoach.js';
import InMatchAI from '../ai/InMatchAI.js';

class GameEngine {
  constructor() {
    this.currentSeason = 2026;
    this.currentMatchday = 1;
    this.selectedClub = null;
    this.aiCoach = null;
    this.leagues = ['premier_league', 'la_liga', 'serie_a', 'bundesliga', 'ligue_1'];
    this.schedules = {};
    this.leagueTables = {};
    this.matchHistory = [];
  }

  async initialize() {
    logger.header('INITIALIZING GAME ENGINE');
    
    // Load configuration
    const config = dataLoader.loadJSON('../config.json');
    if (config) {
      this.currentSeason = config.season.start_year;
      this.leagues = config.season.leagues;
    }
    
    logger.success('Game Engine initialized');
  }

  async startNewGame(clubId) {
    logger.header('STARTING NEW GAME');
    
    // Load selected club
    this.selectedClub = dataLoader.loadClub(clubId);
    if (!this.selectedClub) {
      logger.error('Failed to load club');
      return false;
    }
    
    logger.success(`Selected: ${this.selectedClub.name}`);
    
    // Initialize AI Coach
    this.aiCoach = new AICoach(this.selectedClub);
    logger.success('AI Coach initialized');
    
    // Check if player distribution is needed
    const activePlayers = dataLoader.loadActivePlayers();
    if (!activePlayers.players || activePlayers.players.length === 0) {
      logger.info('No active players found. Distributing players...');
      await this.distributePlayersForSeason();
    } else {
      logger.success(`Loaded ${activePlayers.players.length} active players`);
    }
    
    // Generate schedules for all leagues
    await this.generateAllSchedules();
    
    // Initialize league tables
    this.initializeLeagueTables();
    
    logger.success('Game setup complete!');
    return true;
  }

  async distributePlayersForSeason() {
    const distributor = new PlayerDistributor(this.currentSeason);
    const success = await distributor.distribute();
    
    if (success) {
      // Reload club data with distributed players
      this.selectedClub = dataLoader.loadClub(this.selectedClub.club_id);
    }
    
    return success;
  }

  async generateAllSchedules() {
    logger.info('Generating schedules for all leagues...');
    
    for (const leagueId of this.leagues) {
      const generator = new ScheduleGenerator(leagueId, this.currentSeason);
      const fixtures = await generator.generate();
      
      if (fixtures) {
        this.schedules[leagueId] = fixtures;
      }
    }
    
    logger.success(`Generated schedules for ${Object.keys(this.schedules).length} leagues`);
  }

  initializeLeagueTables() {
    for (const leagueId of this.leagues) {
      const league = dataLoader.loadLeague(leagueId);
      if (!league) continue;
      
      const clubs = dataLoader.loadLeagueClubs(leagueId);
      
      this.leagueTables[leagueId] = {
        league: league.name,
        standings: clubs.map(club => ({
          clubId: club.club_id,
          name: club.name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: []
        }))
      };
    }
  }

  async playNextMatchday() {
    logger.header(`MATCHDAY ${this.currentMatchday}`);
    
    // Get player club's match for this matchday
    const playerMatch = this.getPlayerMatch(this.currentMatchday);
    
    if (!playerMatch) {
      logger.warning('No match scheduled for your club');
      return null;
    }
    
    // Load opponent
    const opponentId = playerMatch.home === this.selectedClub.club_id 
      ? playerMatch.away 
      : playerMatch.home;
    const opponent = dataLoader.loadClub(opponentId);
    
    if (!opponent) {
      logger.error('Failed to load opponent');
      return null;
    }
    
    const isHome = playerMatch.home === this.selectedClub.club_id;
    
    logger.info(`\n${isHome ? '🏠' : '✈️'} ${this.selectedClub.name} vs ${opponent.name}\n`);
    
    // AI Coach prepares for match
    const preparation = await this.aiCoach.prepareForMatch(opponent, {
      isHome,
      matchday: this.currentMatchday,
      competition: 'league',
      leaguePosition: this.getClubLeaguePosition()
    });
    
    // Display AI Coach preparation
    this.displayPreparation(preparation);
    
    // Wait for user input
    await this.delay(2000);
    
    // Simulate match (pass AI Coach to preparation)
    preparation.aiCoach = this.aiCoach;
    const simulator = new MatchSimulator(
      isHome ? this.selectedClub : opponent,
      isHome ? opponent : this.selectedClub,
      preparation
    );
    
    const matchResult = await simulator.simulate();
    
    // AI Coach learns from match
    this.aiCoach.learnFromMatch(matchResult);
    
    // Update league table
    this.updateLeagueTable(matchResult);
    
    // Simulate other matches in this matchday
    await this.simulateOtherMatches(this.currentMatchday);
    
    // Store match history
    this.matchHistory.push(matchResult);
    
    // Move to next matchday
    this.currentMatchday++;
    
    return matchResult;
  }

  getPlayerMatch(matchday) {
    const leagueId = this.getClubLeague();
    if (!this.schedules[leagueId]) return null;
    
    const matchdayFixtures = this.schedules[leagueId].find(
      md => md.matchday === matchday
    );
    
    if (!matchdayFixtures) return null;
    
    return matchdayFixtures.matches.find(
      m => m.home === this.selectedClub.club_id || 
           m.away === this.selectedClub.club_id
    );
  }

  getClubLeague() {
    return this.selectedClub.league;
  }

  getClubLeaguePosition() {
    const leagueId = this.getClubLeague();
    const table = this.leagueTables[leagueId];
    
    if (!table) return 10;
    
    const sorted = this.sortLeagueTable(table.standings);
    const position = sorted.findIndex(
      club => club.clubId === this.selectedClub.club_id
    );
    
    return position + 1;
  }

  displayPreparation(preparation) {
    logger.divider();
    logger.info(`\n🧠 ${translator.t('ai_coach.preparation')}\n`);
    logger.info(`${translator.t('ai_coach.strategy')}: ${preparation.strategy.approach}`);
    logger.info(`${translator.t('ai_coach.formation')}: ${preparation.formation}`);
    
    if (preparation.strategy.reasoning && preparation.strategy.reasoning.length > 0) {
      logger.info(`\n💭 Reasoning:`);
      preparation.strategy.reasoning.forEach(reason => {
        logger.aiAnalysis(reason);
      });
    }
    
    // Display key opponent insights
    if (preparation.analysis) {
      logger.info(`\n🔍 Opponent Analysis:`);
      if (preparation.analysis.weaknesses.vulnerableAreas.length > 0) {
        logger.aiAnalysis(`Weaknesses: ${preparation.analysis.weaknesses.vulnerableAreas.join(', ')}`);
      }
      if (preparation.analysis.strengths.keyPlayers.length > 0) {
        logger.aiAnalysis(`Key Players: ${preparation.analysis.strengths.keyPlayers.map(p => p.name).join(', ')}`);
      }
    }
    
    logger.divider();
  }

  updateLeagueTable(matchResult) {
    const leagueId = this.getClubLeague();
    const table = this.leagueTables[leagueId];
    
    if (!table) return;
    
    const homeClub = table.standings.find(c => c.clubId === matchResult.home.club.club_id);
    const awayClub = table.standings.find(c => c.clubId === matchResult.away.club.club_id);
    
    if (!homeClub || !awayClub) return;
    
    const homeScore = matchResult.home.score;
    const awayScore = matchResult.away.score;
    
    // Update stats
    homeClub.played++;
    awayClub.played++;
    
    homeClub.goalsFor += homeScore;
    homeClub.goalsAgainst += awayScore;
    awayClub.goalsFor += awayScore;
    awayClub.goalsAgainst += homeScore;
    
    // Determine result
    if (homeScore > awayScore) {
      homeClub.won++;
      homeClub.points += 3;
      homeClub.form.push('W');
      awayClub.lost++;
      awayClub.form.push('L');
    } else if (homeScore < awayScore) {
      awayClub.won++;
      awayClub.points += 3;
      awayClub.form.push('W');
      homeClub.lost++;
      homeClub.form.push('L');
    } else {
      homeClub.drawn++;
      homeClub.points++;
      homeClub.form.push('D');
      awayClub.drawn++;
      awayClub.points++;
      awayClub.form.push('D');
    }
    
    // Calculate goal difference
    homeClub.goalDifference = homeClub.goalsFor - homeClub.goalsAgainst;
    awayClub.goalDifference = awayClub.goalsFor - awayClub.goalsAgainst;
    
    // Keep only last 5 form results
    if (homeClub.form.length > 5) homeClub.form.shift();
    if (awayClub.form.length > 5) awayClub.form.shift();
  }

  async simulateOtherMatches(matchday) {
    logger.info('\nSimulating other matches...');
    
    for (const leagueId of this.leagues) {
      const fixtures = this.schedules[leagueId];
      if (!fixtures) continue;
      
      const matchdayFixtures = fixtures.find(md => md.matchday === matchday);
      if (!matchdayFixtures) continue;
      
      for (const match of matchdayFixtures.matches) {
        // Skip player's match (already played)
        if (match.home === this.selectedClub.club_id || 
            match.away === this.selectedClub.club_id) {
          continue;
        }
        
        // Quick simulate
        const result = this.quickSimulate(match);
        
        // Update league table
        this.updateLeagueTableQuick(leagueId, match, result);
      }
    }
    
    logger.success('All matches simulated');
  }

  quickSimulate(match) {
    // Simplified simulation for AI matches
    const homeStrength = Math.random() * 100;
    const awayStrength = Math.random() * 100;
    
    const homeGoals = Math.floor(Math.random() * 4);
    const awayGoals = Math.floor(Math.random() * 4);
    
    return { home: homeGoals, away: awayGoals };
  }

  updateLeagueTableQuick(leagueId, match, result) {
    const table = this.leagueTables[leagueId];
    if (!table) return;
    
    const homeClub = table.standings.find(c => c.clubId === match.home);
    const awayClub = table.standings.find(c => c.clubId === match.away);
    
    if (!homeClub || !awayClub) return;
    
    homeClub.played++;
    awayClub.played++;
    
    homeClub.goalsFor += result.home;
    homeClub.goalsAgainst += result.away;
    awayClub.goalsFor += result.away;
    awayClub.goalsAgainst += result.home;
    
    if (result.home > result.away) {
      homeClub.won++;
      homeClub.points += 3;
      homeClub.form.push('W');
      awayClub.lost++;
      awayClub.form.push('L');
    } else if (result.home < result.away) {
      awayClub.won++;
      awayClub.points += 3;
      awayClub.form.push('W');
      homeClub.lost++;
      homeClub.form.push('L');
    } else {
      homeClub.drawn++;
      homeClub.points++;
      homeClub.form.push('D');
      awayClub.drawn++;
      awayClub.points++;
      awayClub.form.push('D');
    }
    
    homeClub.goalDifference = homeClub.goalsFor - homeClub.goalsAgainst;
    awayClub.goalDifference = awayClub.goalsFor - awayClub.goalsAgainst;
    
    if (homeClub.form.length > 5) homeClub.form.shift();
    if (awayClub.form.length > 5) awayClub.form.shift();
  }

  sortLeagueTable(standings) {
    return [...standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
  }

  getLeagueTable(leagueId) {
    const table = this.leagueTables[leagueId];
    if (!table) return null;
    
    return {
      league: table.league,
      standings: this.sortLeagueTable(table.standings)
    };
  }

  saveGame(slotNumber) {
    const saveData = {
      season: this.currentSeason,
      matchday: this.currentMatchday,
      clubId: this.selectedClub.club_id,
      leagueTables: this.leagueTables,
      matchHistory: this.matchHistory,
      aiCoachMemory: this.aiCoach.memory,
      savedAt: new Date().toISOString()
    };
    
    return dataLoader.saveGame(slotNumber, saveData);
  }

  loadGame(slotNumber) {
    const saveData = dataLoader.loadSave(slotNumber);
    if (!saveData) return false;
    
    this.currentSeason = saveData.season;
    this.currentMatchday = saveData.matchday;
    this.leagueTables = saveData.leagueTables;
    this.matchHistory = saveData.matchHistory;
    
    this.selectedClub = dataLoader.loadClub(saveData.clubId);
    this.aiCoach = new AICoach(this.selectedClub);
    this.aiCoach.memory = saveData.aiCoachMemory;
    
    return true;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GameEngine;
