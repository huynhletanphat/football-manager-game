class CoachAI {
  constructor() {
    this.tactics = {
      'PARK_THE_BUS': { name: 'Tử thủ (Park the Bus)', bias: 'defensive' },
      'COUNTER_ATTACK': { name: 'Phòng ngự Phản công', bias: 'counter' },
      'POSSESSION': { name: 'Kiểm soát bóng', bias: 'control' },
      'HIGH_PRESS': { name: 'Gegenpressing', bias: 'attacking' },
      'ALL_OUT_ATTACK': { name: 'Tấn công Tổng lực', bias: 'ultra_attacking' }
    };

    // KHO TỪ VỰNG KHỔNG LỒ (30+ Câu thoại)
    this.comments = {
      winning_comfortable: [ // Thắng cách biệt > 2 bàn
        "Tuyệt vời! Hãy giữ vững thế trận này.",
        "Đừng chủ quan! Tập trung giữ sạch lưới.",
        "Các khán giả đang rất hài lòng. Hãy cống hiến thêm bàn thắng!",
        "Thế trận đã an bài. Hãy chơi thong dong để giữ sức."
      ],
      winning_tight: [ // Thắng sát nút 1 bàn
        "Tập trung! Một sai lầm lúc này sẽ phải trả giá đắt.",
        "Đừng lùi quá sâu! Tiếp tục gây áp lực lên họ.",
        "Hãy cầm bóng chắc chắn (Hold play), đừng để mất bóng vô duyên.",
        "Câu giờ đi! Đưa bóng ra biên."
      ],
      losing_tight: [ // Thua sát nút 1 bàn
        "Chúng ta chỉ cần 1 khoảnh khắc thôi! Đẩy cao đội hình lên!",
        "Đừng nản chí! Vẫn còn thời gian để gỡ hòa.",
        "Tăng tốc độ luân chuyển bóng! Họ đang mệt rồi.",
        "Tại sao không ai theo kèm người vậy? Tập trung vào!"
      ],
      losing_badly: [ // Thua đậm > 2 bàn
        "Một màn trình diễn thảm họa! Tôi muốn thấy tinh thần chiến đấu!",
        "Đá vì danh dự đi! Đừng để thua thêm nữa.",
        "Hàng phòng ngự đang ngủ gật à? Tỉnh táo lại ngay!",
        "Thật đáng thất vọng. Chúng ta sẽ phải nói chuyện sau trận đấu."
      ],
      drawing_boring: [ // Hòa 0-0, ít cơ hội
        "Tăng tốc độ trận đấu lên! Chúng ta đang ru ngủ khán giả đấy.",
        "Mạnh dạn đột phá hơn! Đừng chuyền về nữa.",
        "Hãy thử sút xa xem sao. Hàng thủ họ đang lùi rất sâu."
      ],
      wasteful: [ // xG cao nhưng không ghi bàn
        "Làm ơn nắn nót lại thước ngắm đi!",
        "Cơ hội mười mươi mà cũng bỏ lỡ được sao?",
        "Bình tĩnh lại (Composure)! Đừng vội vàng dứt điểm."
      ],
      under_pressure: [ // Bị ép sân (Possession thấp)
        "Họ đang ép rất rát. Giữ cự ly đội hình hẹp lại (Stay Compact)!",
        "Phá bóng dứt khoát lên! Đừng mạo hiểm ở sân nhà.",
        "Kiên nhẫn chờ đợi sai lầm của họ để phản công."
      ]
    };
  }

  /**
   * BỘ NÃO CHIẾN THUẬT (Tactical Brain)
   */
  analyzeGame(matchData) {
    const { minute, score, stats, teamSide } = matchData;
    const opponentSide = teamSide === 'home' ? 'away' : 'home';
    
    // Dữ liệu cơ bản
    const myScore = score[teamSide];
    const opScore = score[opponentSide];
    const scoreDiff = myScore - opScore;
    const myStats = stats[teamSide];
    
    // Tỉ lệ kiểm soát bóng
    const totalPoss = stats.home.possession + stats.away.possession || 1;
    const possessionPct = (myStats.possession / totalPoss) * 100;

    let analysis = {
      tacticChange: null,
      message: null,
      urgent: false
    };

    // RANDOM TRIGGER: Chỉ phân tích 30% số lần gọi để tránh Spam và tạo sự tự nhiên
    // Trừ khi là phút cuối (Crunch time) thì luôn phân tích
    if (Math.random() > 0.3 && minute < 80) return analysis;

    // --- LOGIC PHÂN TÍCH ---

    // 1. PHÂN TÍCH CUỐI TRẬN (80' -> 90')
    if (minute >= 80) {
      if (scoreDiff === 1) { // Đang thắng 1 bàn -> TỬ THỦ
        analysis.tacticChange = 'PARK_THE_BUS';
        analysis.message = this.getRandomMsg('winning_tight');
        analysis.urgent = true;
      } 
      else if (scoreDiff === -1) { // Đang thua 1 bàn -> TẤT TAY
        analysis.tacticChange = 'ALL_OUT_ATTACK';
        analysis.message = this.getRandomMsg('losing_tight');
        analysis.urgent = true;
      }
      else if (scoreDiff <= -2) { // Thua đậm -> BUÔNG XUÔI/DANH DỰ
        // Không đổi chiến thuật nữa, chỉ chửi
        analysis.message = this.getRandomMsg('losing_badly');
      }
      return analysis; // Ưu tiên logic cuối trận, return luôn
    }

    // 2. PHÂN TÍCH HIỆU QUẢ (xG vs Goals)
    // Tạo ra > 1.2 xG mà chưa ghi bàn -> Gỗ
    if (myStats.xG > 1.2 && myScore === 0) {
      analysis.message = this.getRandomMsg('wasteful');
      // Không đổi chiến thuật, chỉ nhắc nhở
      return analysis;
    }

    // 3. PHÂN TÍCH THẾ TRẬN (POSSESSION)
    if (possessionPct < 35) {
      // Bị ép sân quá mức
      if (scoreDiff >= 0) {
        // Đang thắng hoặc hòa -> Chấp nhận đá phản công
        if (Math.random() < 0.5) { // 50% cơ hội HLV sẽ nhận ra và đổi chiến thuật
            analysis.tacticChange = 'COUNTER_ATTACK';
            analysis.message = this.getRandomMsg('under_pressure');
        }
      } else {
        // Đang thua mà không có bóng -> Nguy to -> Pressing
        analysis.tacticChange = 'HIGH_PRESS';
        analysis.message = "Chúng ta cần bóng! Pressing ngay bên phần sân đối phương!";
      }
    } 
    else if (possessionPct > 65 && myScore === opScore) {
      // Cầm bóng nhiều mà không ghi bàn (bế tắc)
      analysis.tacticChange = 'ALL_OUT_ATTACK';
      analysis.message = this.getRandomMsg('drawing_boring');
    }

    // 4. PHÂN TÍCH TỈ SỐ (Giữa trận)
    if (scoreDiff >= 2) {
      // Thắng đậm -> Đá kiểm soát
      analysis.tacticChange = 'POSSESSION';
      analysis.message = this.getRandomMsg('winning_comfortable');
    }

    return analysis;
  }

  /**
   * LOGIC THAY NGƯỜI (Thông minh hơn)
   */
  evaluateSubstitutions(lineup, bench, subsUsed, maxSubs, minute) {
    if (subsUsed >= maxSubs || minute < 50) return null;

    // Convert lineup object to array
    const players = Object.values(lineup);

    // 1. CHẤN THƯƠNG / THỂ LỰC (Ưu tiên số 1)
    const exhaustedPlayer = players.find(p => p.condition < 55);
    if (exhaustedPlayer) {
      const sub = this.findBestReplacement(exhaustedPlayer, bench);
      if (sub) return { out: exhaustedPlayer, in: sub, reason: `Kiệt sức (${Math.round(exhaustedPlayer.condition)}%)` };
    }

    // 2. CHIẾN THUẬT (Thay tiền đạo nếu cần bàn thắng)
    // Nếu đang hòa hoặc thua sau phút 70
    // Và chưa thay tiền đạo nào
    if (minute > 70) {
        // Tìm cầu thủ đá tệ nhất trên sân
        const worstPlayer = players.sort((a, b) => a.matchRating - b.matchRating)[0];
        
        if (worstPlayer.matchRating < 6.0) {
            const sub = this.findBestReplacement(worstPlayer, bench);
            if (sub) return { out: worstPlayer, in: sub, reason: `Chiến thuật (Rating: ${worstPlayer.matchRating.toFixed(1)})` };
        }
    }

    return null;
  }

  findBestReplacement(playerOut, bench) {
    const role = playerOut.positions[0];
    // Tìm người cùng vị trí có rating cao nhất
    let sub = bench.filter(p => p.positions.includes(role))
                   .sort((a, b) => b.attributes.currentRating - a.attributes.currentRating)[0];
    
    // Fallback: Tìm vị trí tương đương
    if (!sub) {
        if (['ST', 'CF', 'RW', 'LW'].includes(role)) {
            sub = bench.find(p => ['ST', 'CF', 'RW', 'LW'].some(x => p.positions.includes(x)));
        } else if (['CB', 'LB', 'RB'].includes(role)) {
            sub = bench.find(p => ['CB', 'LB', 'RB'].some(x => p.positions.includes(x)));
        }
    }
    return sub || null;
  }

  getRandomMsg(category) {
    const list = this.comments[category];
    return list ? list[Math.floor(Math.random() * list.length)] : "Tập trung thi đấu!";
  }
}

export default new CoachAI();
