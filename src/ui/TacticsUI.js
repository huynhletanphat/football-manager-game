import chalk from 'chalk';

class TacticsUI {
  
  /**
   * Hiển thị màn hình giới thiệu đội hình (Lineup Presentation)
   */
  async presentLineups(homeClub, awayClub, homeLineup, awayLineup) {
    // 1. Giới thiệu Sân vận động & Thời tiết
    this.renderMatchIntro(homeClub, awayClub);
    await this.sleep(3000);

    // 2. Đội hình Chủ nhà (Vẽ sơ đồ)
    console.clear();
    this.renderTeamSheet(homeClub, homeLineup, 'HOME (4-3-3)');
    await this.sleep(4000);

    // 3. Đội hình Khách (Vẽ sơ đồ)
    console.clear();
    this.renderTeamSheet(awayClub, awayLineup, 'AWAY (4-2-3-1)'); // Giả lập sơ đồ
    await this.sleep(4000);

    // 4. Trọng tài & Bắt tay
    console.clear();
    this.renderOfficials();
    await this.sleep(3000);
  }

  renderMatchIntro(home, away) {
    console.clear();
    const width = 60;
    const border = chalk.gray('═'.repeat(width));
    
    console.log(border);
    console.log(chalk.center(chalk.yellow.bold('PREMIER LEAGUE BROADCAST'), width));
    console.log(border);
    console.log('\n');
    
    // Logo / Tên to
    console.log(chalk.center(`${chalk.cyan.bold(home.name)}  vs  ${chalk.red.bold(away.name)}`, width));
    console.log('\n');
    
    console.log(chalk.center(`🏟️  Sân vận động: ${chalk.green(home.stadium || 'Default Stadium')}`, width));
    console.log(chalk.center(`🌡️  Thời tiết: ${chalk.white('18°C, Có mây')}`, width));
    console.log(chalk.center(`👥  Khán giả: ${chalk.white('42,000')}`, width));
    console.log('\n');
    console.log(border);
  }

  renderTeamSheet(club, lineup, formationName) {
    const width = 50;
    // Phân loại cầu thủ theo vị trí
    const gk = lineup.filter(p => p.positions.includes('GK'));
    const def = lineup.filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB'].some(pos => p.positions.includes(pos)));
    const mid = lineup.filter(p => ['CM', 'CDM', 'CAM', 'LM', 'RM'].some(pos => p.positions.includes(pos)));
    const att = lineup.filter(p => ['ST', 'CF', 'LW', 'RW'].some(pos => p.positions.includes(pos)));

    // Fallback nếu logic lọc bị lỗi (đảm bảo hiển thị đủ 11 người)
    // (Trong code thực tế cần logic chặt chẽ hơn để map đúng sơ đồ)

    // VẼ SÂN CỎ (Background Green)
    const bg = chalk.bgGreen.black;
    const grass = (text) => bg(chalk.center(text || '', width));

    console.log(chalk.white.bold.underline(`ĐỘI HÌNH RA SÂN: ${club.name.toUpperCase()}`));
    console.log(chalk.gray(`Sơ đồ: ${formationName}`));
    console.log('');

    // KHUNG THÀNH (TOP)
    console.log(grass('🥅')); 
    
    // TIỀN ĐẠO (ATTACK)
    console.log(grass());
    console.log(grass(this.formatLine(att)));
    console.log(grass());

    // TIỀN VỆ (MIDFIELD)
    console.log(grass());
    console.log(grass(this.formatLine(mid)));
    console.log(grass());

    // HẬU VỆ (DEFENSE)
    console.log(grass());
    console.log(grass(this.formatLine(def)));
    console.log(grass());

    // THỦ MÔN (GOALKEEPER)
    console.log(grass(this.formatLine(gk)));
    console.log(grass());

    console.log(chalk.gray('HLV Trưởng: ') + chalk.white('Pep Guardiola (AI)')); 
  }

  renderOfficials() {
    console.log('\n\n');
    console.log(chalk.center('👮 TỔ TRỌNG TÀI', 60));
    console.log(chalk.center('Bắt chính: Anthony Taylor', 60));
    console.log(chalk.center('Trợ lý 1: Gary Beswick', 60));
    console.log(chalk.center('Trợ lý 2: Adam Nunn', 60));
    console.log(chalk.center('VAR: Michael Oliver', 60));
    console.log('\n\n');
    console.log(chalk.center(chalk.yellow('TRẬN ĐẤU SẮP BẮT ĐẦU...'), 60));
  }

  // Helper để dàn đều tên cầu thủ trên 1 dòng
  formatLine(players) {
    if (!players || players.length === 0) return '';
    // Lấy tên (Last Name) cho ngắn gọn
    return players.map(p => {
        const names = p.name.split(' ');
        return names[names.length - 1]; // Lấy tên cuối (VD: Messi, Ronaldo)
    }).join('   -   ');
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// Polyfill chalk.center nếu chưa có
chalk.center = (str, width) => {
    const len = str.length; // Lưu ý: Hàm này tính độ dài đơn giản, chưa xử lý mã màu ANSI
    if (len >= width) return str;
    const left = Math.floor((width - len) / 2);
    return ' '.repeat(left) + str;
};

export default new TacticsUI();
