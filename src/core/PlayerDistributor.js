import dataLoader from '../utils/DataLoader.js';
import logger from '../utils/Logger.js';

class PlayerDistributor {
  constructor(year) {
    this.year = year;
    this.intake = null;
    this.clubs = [];
    this.distributedPlayers = [];
  }

  async distribute() {
    logger.header(`DISTRIBUTING PLAYERS - YEAR ${this.year}`);
    
    // Step 1: Load intake data
    logger.info('Loading player intake data...');
    this.intake = dataLoader.loadPlayerIntake(this.year);
    
    if (!this.intake) {
      logger.error('Failed to load player intake');
      return false;
    }

    logger.success(`Loaded ${this.getTotalPlayers()} players`);

    // Step 2: Distribute by league
    for (const [leagueName, leagueData] of Object.entries(this.intake.leagues)) {
      logger.info(`\nProcessing ${leagueName}...`);
      await this.distributeLeague(leagueName, leagueData);
    }

    // Step 3: Save results
    logger.info('\nSaving distribution results...');
    this.saveResults();

    logger.success('\n✅ Player distribution completed!');
    return true;
  }

  async distributeLeague(leagueName, leagueData) {
    // Load clubs for this league
    const clubs = dataLoader.loadLeagueClubs(leagueName);
    
    if (clubs.length === 0) {
      logger.warning(`No clubs found for ${leagueName}`);
      return;
    }

    // Sort players by potential
    const players = [...leagueData.players].sort((a, b) => 
      b.attributes.potentialMax - a.attributes.potentialMax
    );

    // Categorize clubs by reputation
    const clubTiers = this.categorizeClubs(clubs);

    // Distribute world class players (85-90 potential)
    const worldClass = players.filter(p => p.attributes.potentialMax >= 85);
    this.assignToTier(worldClass, clubTiers.tier1, 'World Class');

    // Distribute elite players (80-84 potential)
    const elite = players.filter(p => 
      p.attributes.potentialMax >= 80 && p.attributes.potentialMax < 85
    );
    this.assignToTier(elite, [...clubTiers.tier1, ...clubTiers.tier2], 'Elite');

    // Distribute good players (75-79 potential)
    const good = players.filter(p => 
      p.attributes.potentialMax >= 75 && p.attributes.potentialMax < 80
    );
    this.assignToAllClubs(good, clubs, 'Good');

    // Fill remaining spots with average players
    const average = players.filter(p => p.attributes.potentialMax < 75);
    this.fillRemainingSpots(average, clubs, 'Average');

    // Balance positions for all clubs
    this.balancePositions(clubs);

    // Update club files
    clubs.forEach(club => dataLoader.saveClub(club));

    logger.success(`${leagueName}: ${players.length} players distributed`);
  }

  categorizeClubs(clubs) {
    const sorted = [...clubs].sort((a, b) => 
      b.reputation.global - a.reputation.global
    );

    const tier1Count = Math.ceil(sorted.length * 0.3); // Top 30%
    const tier2Count = Math.ceil(sorted.length * 0.4); // Next 40%

    return {
      tier1: sorted.slice(0, tier1Count),
      tier2: sorted.slice(tier1Count, tier1Count + tier2Count),
      tier3: sorted.slice(tier1Count + tier2Count)
    };
  }

  assignToTier(players, clubs, category) {
    for (const player of players) {
      let targetClubs = [...clubs];

      // Check priority clubs
      if (player.aiHints?.priorityClubs?.length > 0) {
        const priority = clubs.filter(c => 
          player.aiHints.priorityClubs.includes(c.name)
        );
        if (priority.length > 0) {
          targetClubs = priority;
        }
      }

      // Check avoid clubs
      if (player.aiHints?.avoidClubs?.length > 0) {
        targetClubs = targetClubs.filter(c => 
          !player.aiHints.avoidClubs.includes(c.name)
        );
      }

      // Choose club with most need for this position
      const chosenClub = this.findBestClubForPlayer(targetClubs, player);
      
      if (chosenClub) {
        this.addPlayerToClub(chosenClub, player);
        logger.debug(`${category}: ${player.name} → ${chosenClub.name}`);
      }
    }
  }

  assignToAllClubs(players, clubs, category) {
    let clubIndex = 0;
    
    for (const player of players) {
      const club = clubs[clubIndex % clubs.length];
      this.addPlayerToClub(club, player);
      logger.debug(`${category}: ${player.name} → ${club.name}`);
      clubIndex++;
    }
  }

  fillRemainingSpots(players, clubs, category) {
    for (const club of clubs) {
      const needed = 25 - (club.squad?.current_players?.length || 0);
      
      if (needed > 0 && players.length > 0) {
        const toAdd = players.splice(0, needed);
        toAdd.forEach(player => {
          this.addPlayerToClub(club, player);
          logger.debug(`${category}: ${player.name} → ${club.name}`);
        });
      }
    }
  }

  findBestClubForPlayer(clubs, player) {
    // Find club with lowest count for this position
    const positions = player.positions;
    
    let bestClub = null;
    let lowestCount = Infinity;

    for (const club of clubs) {
      const currentPlayers = club.squad?.current_players || [];
      const positionCount = currentPlayers.filter(p => 
        positions.some(pos => p.positions.includes(pos))
      ).length;

      if (positionCount < lowestCount && currentPlayers.length < 28) {
        lowestCount = positionCount;
        bestClub = club;
      }
    }

    return bestClub;
  }

  addPlayerToClub(club, player) {
    if (!club.squad) {
      club.squad = {
        current_players: [],
        squad_size: 0,
        average_age: 0,
        average_rating: 0
      };
    }

    // Add player
    club.squad.current_players.push(player);
    club.squad.squad_size = club.squad.current_players.length;

    // Update average rating
    const totalRating = club.squad.current_players.reduce(
      (sum, p) => sum + p.attributes.currentRating, 0
    );
    club.squad.average_rating = Math.round(totalRating / club.squad.squad_size);

    // Update average age
    const totalAge = club.squad.current_players.reduce(
      (sum, p) => sum + p.age, 0
    );
    club.squad.average_age = Math.round(totalAge / club.squad.squad_size);

    // Track distributed player
    this.distributedPlayers.push({
      player: player.name,
      club: club.name,
      potential: player.attributes.potentialMax
    });
  }

  balancePositions(clubs) {
    const requirements = {
      GK: { min: 2, max: 3 },
      CB: { min: 4, max: 6 },
      LB: { min: 2, max: 3 },
      RB: { min: 2, max: 3 },
      CDM: { min: 2, max: 4 },
      CM: { min: 3, max: 5 },
      CAM: { min: 1, max: 3 },
      LW: { min: 2, max: 3 },
      RW: { min: 2, max: 3 },
      ST: { min: 2, max: 4 }
    };

    for (const club of clubs) {
      const players = club.squad?.current_players || [];
      
      for (const [position, req] of Object.entries(requirements)) {
        const count = players.filter(p => p.positions.includes(position)).length;
        
        if (count < req.min) {
          logger.warning(`${club.name}: Only ${count} ${position} (need ${req.min})`);
        }
      }
    }
  }

  saveResults() {
    // Save all distributed players
    dataLoader.saveActivePlayers(this.distributedPlayers);
  }

  getTotalPlayers() {
    let total = 0;
    for (const league of Object.values(this.intake.leagues)) {
      total += league.players.length;
    }
    return total;
  }
}

export default PlayerDistributor;
