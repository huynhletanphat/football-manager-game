import Table from 'cli-table3';
import chalk from 'chalk';
import logger from '../utils/Logger.js';
import translator from '../utils/Translator.js';

class LeagueTable {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  display(leagueId) {
    const tableData = this.gameEngine.getLeagueTable(leagueId);
    
    if (!tableData) {
      logger.error('League table not found');
      return;
    }

    logger.clear();
    logger.header(tableData.league);
    
    const table = new Table({
      head: [
        chalk.bold('#'),
        chalk.bold('Club'),
        chalk.bold('P'),
        chalk.bold('W'),
        chalk.bold('D'),
        chalk.bold('L'),
        chalk.bold('GF'),
        chalk.bold('GA'),
        chalk.bold('GD'),
        chalk.bold('Pts'),
        chalk.bold('Form')
      ],
      colWidths: [5, 25, 5, 5, 5, 5, 5, 5, 6, 6, 15]
    });

    tableData.standings.forEach((club, index) => {
      const position = index + 1;
      const isPlayerClub = club.clubId === this.gameEngine.selectedClub.club_id;
      
      // Color coding for positions
      let posColor = 'white';
      if (position <= 4) {
        posColor = 'green'; // Champions League
      } else if (position === 5) {
        posColor = 'blue'; // Europa League
      } else if (position === 6) {
        posColor = 'cyan'; // Conference League
      } else if (position >= 18) {
        posColor = 'red'; // Relegation
      }

      const formString = this.formatForm(club.form);
      
      const row = [
        chalk[posColor](position),
        isPlayerClub ? chalk.yellow.bold(club.name) : club.name,
        club.played,
        club.won,
        club.drawn,
        club.lost,
        club.goalsFor,
        club.goalsAgainst,
        this.colorizeGD(club.goalDifference),
        chalk.bold(club.points),
        formString
      ];

      table.push(row);
    });

    console.log(table.toString());
    
    this.displayLegend();
  }

  formatForm(form) {
    if (!form || form.length === 0) return '-';
    
    return form.map(result => {
      switch (result) {
        case 'W': return chalk.green('W');
        case 'D': return chalk.yellow('D');
        case 'L': return chalk.red('L');
        default: return result;
      }
    }).join(' ');
  }

  colorizeGD(gd) {
    if (gd > 0) {
      return chalk.green(`+${gd}`);
    } else if (gd < 0) {
      return chalk.red(gd);
    } else {
      return chalk.gray('0');
    }
  }

  displayLegend() {
    console.log('\n' + chalk.gray('═'.repeat(80)));
    console.log(chalk.green('█') + ' Top 4: Champions League');
    console.log(chalk.blue('█') + ' 5th: Europa League');
    console.log(chalk.cyan('█') + ' 6th: Conference League');
    console.log(chalk.red('█') + ' Bottom 3: Relegation');
    console.log(chalk.yellow('█') + ' Your Club');
    console.log(chalk.gray('═'.repeat(80)) + '\n');
  }

  displayTopScorers(leagueId) {
    logger.header('TOP SCORERS');
    
    // This would require match history tracking
    // Simplified version for now
    
    const table = new Table({
      head: [
        chalk.bold('#'),
        chalk.bold('Player'),
        chalk.bold('Club'),
        chalk.bold('Goals')
      ],
      colWidths: [5, 25, 25, 8]
    });

    // Sample data
    const topScorers = [
      { name: 'Erling Haaland', club: 'Man City', goals: 24 },
      { name: 'Mohamed Salah', club: 'Liverpool', goals: 19 },
      { name: 'Harry Kane', club: 'Bayern', goals: 18 }
    ];

    topScorers.forEach((player, index) => {
      table.push([
        chalk.yellow(index + 1),
        player.name,
        player.club,
        chalk.bold(player.goals)
      ]);
    });

    console.log(table.toString());
    console.log('\n');
  }

  displayFixtures(leagueId, matchday) {
    const schedule = this.gameEngine.schedules[leagueId];
    if (!schedule) {
      logger.error('Schedule not found');
      return;
    }

    const fixtures = schedule.find(md => md.matchday === matchday);
    if (!fixtures) {
      logger.error(`Matchday ${matchday} not found`);
      return;
    }

    logger.clear();
    logger.header(`MATCHDAY ${matchday} FIXTURES`);
    logger.info(`Date: ${fixtures.date}\n`);

    const table = new Table({
      head: [
        chalk.bold('Time'),
        chalk.bold('Home'),
        chalk.bold(''),
        chalk.bold('Away')
      ],
      colWidths: [10, 30, 5, 30]
    });

    fixtures.matches.forEach(match => {
      const isPlayerMatch = 
        match.home === this.gameEngine.selectedClub.club_id ||
        match.away === this.gameEngine.selectedClub.club_id;

      const homeName = isPlayerMatch && match.home === this.gameEngine.selectedClub.club_id
        ? chalk.yellow.bold(match.homeName)
        : match.homeName;

      const awayName = isPlayerMatch && match.away === this.gameEngine.selectedClub.club_id
        ? chalk.yellow.bold(match.awayName)
        : match.awayName;

      table.push([
        match.time,
        homeName,
        'vs',
        awayName
      ]);
    });

    console.log(table.toString());
    console.log('\n');
  }

  displayResults(leagueId, matchday) {
    logger.header(`MATCHDAY ${matchday} RESULTS`);

    // Would need match results from history
    // This is a simplified version
    
    const table = new Table({
      head: [
        chalk.bold('Home'),
        chalk.bold('Score'),
        chalk.bold('Away')
      ],
      colWidths: [30, 10, 30]
    });

    // Sample results
    const results = [
      { home: 'Arsenal', score: '2-1', away: 'Chelsea' },
      { home: 'Man City', score: '3-0', away: 'Everton' },
      { home: 'Liverpool', score: '1-1', away: 'Man Utd' }
    ];

    results.forEach(result => {
      const [homeScore, awayScore] = result.score.split('-').map(Number);
      const scoreDisplay = homeScore > awayScore 
        ? chalk.green.bold(result.score)
        : homeScore < awayScore
        ? chalk.red.bold(result.score)
        : chalk.yellow.bold(result.score);

      table.push([
        result.home,
        scoreDisplay,
        result.away
      ]);
    });

    console.log(table.toString());
    console.log('\n');
  }
}

export default LeagueTable;
