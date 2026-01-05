class ScheduleGenerator {
  /**
   * Tạo lịch thi đấu vòng tròn 2 lượt (Double Round-Robin)
   * @param {Array} clubs - Danh sách object các CLB
   * @returns {Object} - Key là matchday (1-38), Value là mảng các trận đấu [{home, away}]
   */
  generate(clubs) {
    if (!clubs || clubs.length < 2) return {};

    // Chỉ lấy ID để xử lý cho nhẹ
    let teamIds = clubs.map(c => c.club_id);
    
    // Nếu số đội lẻ, thêm đội "Bye" (nghỉ) - Premier League 20 đội nên không cần, nhưng cứ để cho chắc
    if (teamIds.length % 2 !== 0) {
      teamIds.push(null);
    }

    const numTeams = teamIds.length;
    const numRounds = numTeams - 1; // Số vòng lượt đi
    const halfSize = numTeams / 2;
    const schedule = {};

    // Tạo lượt đi
    for (let round = 0; round < numRounds; round++) {
      const matchday = round + 1;
      schedule[matchday] = [];

      for (let i = 0; i < halfSize; i++) {
        const teamA = teamIds[i];
        const teamB = teamIds[numTeams - 1 - i];

        if (teamA && teamB) {
          // Đảo sân nhà/khách ngẫu nhiên để công bằng hơn ở lượt đi
          if (round % 2 === 0) {
            schedule[matchday].push({ home: teamA, away: teamB });
          } else {
            schedule[matchday].push({ home: teamB, away: teamA });
          }
        }
      }

      // Thuật toán xoay: Giữ đội đầu tiên cố định, xoay các đội còn lại
      teamIds.splice(1, 0, teamIds.pop());
    }

    // Tạo lượt về (Đảo ngược sân nhà/khách của lượt đi)
    for (let round = 0; round < numRounds; round++) {
      const returnMatchday = round + 1 + numRounds;
      schedule[returnMatchday] = [];

      const firstLegMatches = schedule[round + 1];
      firstLegMatches.forEach(match => {
        schedule[returnMatchday].push({ home: match.away, away: match.home });
      });
    }

    return schedule;
  }
}

export default new ScheduleGenerator();
