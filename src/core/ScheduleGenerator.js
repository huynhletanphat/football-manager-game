import dataLoader from '../utils/DataLoader.js';
import logger from '../utils/Logger.js';

class ScheduleGenerator {
  constructor(leagueId, season) {
    this.leagueId = leagueId;
    this.season = season;
    this.league = null;
    this.clubs = [];
    this.fixtures = [];
  }

  async generate() {
    logger.header(`GENERATING SCHEDULE - ${this.leagueId.toUpperCase()}`);
    
    // Load league data
    this.league = dataLoader.loadLeague(this.leagueId);
    if (!this.league) {
      logger.error('Failed to load league data');
      return null;
    }

    // Load clubs
    this.clubs = dataLoader.loadLeagueClubs(this.leagueId);
    if (this.clubs.length === 0) {
      logger.error('No clubs found for league');
      return null;
    }

    logger.info(`Generating fixtures for ${this.clubs.length} teams...`);

    // Generate round-robin fixtures
    const firstHalf = this.generateRoundRobin();
    const secondHalf = this.createReturnFixtures(firstHalf);
    
    this.fixtures = [...firstHalf, ...secondHalf];

    // Assign dates
    this.assignMatchDates();

    // Apply special scheduling
    this.scheduleDerbies();
    this.scheduleTopClashes();

    // Save schedule
    this.saveSchedule();

    logger.success(`✅ Generated ${this.fixtures.length} matchdays`);
    return this.fixtures;
  }

  generateRoundRobin() {
    const teams = [...this.clubs];
    const n = teams.length;
    const fixtures = [];

    // If odd number, add dummy
    if (n % 2 === 1) {
      teams.push(null);
    }

    const totalRounds = teams.length - 1;

    for (let round = 0; round < totalRounds; round++) {
      const matchday = {
        matchday: round + 1,
        matches: []
      };

      for (let i = 0; i < teams.length / 2; i++) {
        const home = teams[i];
        const away = teams[teams.length - 1 - i];

        if (home && away) {
          // Alternate home/away each round
          if (round % 2 === 0) {
            matchday.matches.push({
              home: home.club_id,
              away: away.club_id,
              homeName: home.name,
              awayName: away.name
            });
          } else {
            matchday.matches.push({
              home: away.club_id,
              away: home.club_id,
              homeName: away.name,
              awayName: home.name
            });
          }
        }
      }

      fixtures.push(matchday);

      // Rotate teams (keep first fixed)
      teams.splice(1, 0, teams.pop());
    }

    return fixtures;
  }

  createReturnFixtures(firstHalf) {
    return firstHalf.map((matchday, index) => ({
      matchday: matchday.matchday + firstHalf.length,
      matches: matchday.matches.map(match => ({
        home: match.away,
        away: match.home,
        homeName: match.awayName,
        awayName: match.homeName
      }))
    }));
  }

  assignMatchDates() {
    const startDate = new Date(this.league.season.start_date);
    let currentDate = new Date(startDate);

    for (let i = 0; i < this.fixtures.length; i++) {
      const matchday = this.fixtures[i];

      // Weekend matches (Saturday 15:00)
      if (i % 2 === 0) {
        // Move to next Saturday
        while (currentDate.getDay() !== 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        matchday.date = currentDate.toISOString().split('T')[0];
        matchday.defaultTime = '15:00';
      } 
      // Midweek matches (Wednesday 20:00)
      else {
        // Move to next Wednesday
        while (currentDate.getDay() !== 3) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        matchday.date = currentDate.toISOString().split('T')[0];
        matchday.defaultTime = '20:00';
      }

      // Assign time to each match
      matchday.matches.forEach((match, idx) => {
        match.date = matchday.date;
        match.time = matchday.defaultTime;
        match.matchday = matchday.matchday;
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }

  scheduleDerbies() {
    const derbies = this.identifyDerbies();
    
    for (const derby of derbies) {
      // Find fixtures involving these teams
      for (const matchday of this.fixtures) {
        for (const match of matchday.matches) {
          if (
            (match.home === derby.team1 && match.away === derby.team2) ||
            (match.home === derby.team2 && match.away === derby.team1)
          ) {
            // Schedule at prime time (Sunday 16:30)
            match.time = '16:30';
            match.isDerby = true;
            match.importance = 'HIGH';
            match.tvCoverage = true;
            
            logger.info(`Derby scheduled: ${match.homeName} vs ${match.awayName} - ${match.date}`);
          }
        }
      }
    }
  }

  identifyDerbies() {
    const derbies = [];
    const derbyPairs = {
      'manchester_united': 'manchester_city',
      'arsenal': 'tottenham',
      'liverpool': 'everton',
      'chelsea': 'fulham'
    };

    for (const [team1Id, team2Id] of Object.entries(derbyPairs)) {
      const team1 = this.clubs.find(c => c.club_id.includes(team1Id));
      const team2 = this.clubs.find(c => c.club_id.includes(team2Id));

      if (team1 && team2) {
        derbies.push({
          team1: team1.club_id,
          team2: team2.club_id,
          name: `${team1.name} vs ${team2.name}`
        });
      }
    }

    return derbies;
  }

  scheduleTopClashes() {
    // Identify top 6 clubs by reputation
    const topClubs = [...this.clubs]
      .sort((a, b) => b.reputation.global - a.reputation.global)
      .slice(0, 6)
      .map(c => c.club_id);

    // Schedule top clashes at prime time
    for (const matchday of this.fixtures) {
      for (const match of matchday.matches) {
        const bothTopClubs = topClubs.includes(match.home) && 
                            topClubs.includes(match.away);
        
        if (bothTopClubs && !match.isDerby) {
          match.time = '17:30';
          match.isTopClash = true;
          match.importance = 'MEDIUM';
          match.tvCoverage = true;
        }
      }
    }
  }

  saveSchedule() {
    const scheduleData = {
      league: this.leagueId,
      season: this.season,
      generated: new Date().toISOString(),
      totalMatchdays: this.fixtures.length,
      fixtures: this.fixtures
    };

    dataLoader.saveJSON(
      `schedules/${this.leagueId}_${this.season}.json`,
      scheduleData
    );
  }

  // Get specific matchday
  getMatchday(matchdayNumber) {
    return this.fixtures.find(md => md.matchday === matchdayNumber);
  }

  // Get all matches for a club
  getClubFixtures(clubId) {
    const matches = [];
    
    for (const matchday of this.fixtures) {
      for (const match of matchday.matches) {
        if (match.home === clubId || match.away === clubId) {
          matches.push({
            ...match,
            matchday: matchday.matchday,
            isHome: match.home === clubId
          });
        }
      }
    }
    
    return matches;
  }

  // Get next match for a club
  getNextMatch(clubId, currentMatchday) {
    for (let i = currentMatchday; i < this.fixtures.length; i++) {
      const matchday = this.fixtures[i];
      const match = matchday.matches.find(m => 
        m.home === clubId || m.away === clubId
      );
      
      if (match) {
        return {
          ...match,
          matchday: matchday.matchday,
          date: matchday.date
        };
      }
    }
    
    return null;
  }
}

export default ScheduleGenerator;
