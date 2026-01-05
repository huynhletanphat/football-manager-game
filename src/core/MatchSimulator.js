import decisionMaker from '../ai/DecisionMaker.js';

class MatchSimulator {
  constructor(homeClub, awayClub) {
    this.home = homeClub;
    this.away = awayClub;
    this.score = { home: 0, away: 0 };
    this.stats = {
      home: { possession: 0, shots: 0, onTarget: 0, xG: 0, corners: 0, fouls: 0, yellow: 0 },
      away: { possession: 0, shots: 0, onTarget: 0, xG: 0, corners: 0, fouls: 0, yellow: 0 }
    };
    this.lineups = { home: this.prepareSquad(homeClub), away: this.prepareSquad(awayClub) };
    
    // Lưu trữ hệ số chiến thuật từ InMatchAI
    this.tacticalModifiers = { 
        home: { attack: 1, defense: 1, tempo: 1 }, 
        away: { attack: 1, defense: 1, tempo: 1 } 
    };

    // KHO BÌNH LUẬN NÂNG CAO
    this.commentaryDB = {
      counter_start: ["PHẢN CÔNG!!! {player} cướp được bóng và dốc thẳng về phía trước!", "Cơ hội phản công chớp nhoáng cho {team}!", "{player} phất một đường bóng dài cực chuẩn để phản công."],
      pass_through: ["{player} chọc khe tinh tế xé toang hàng thủ!", "Đường chuyền 'phẫu thuật' của {player}!", "{player} vẩy má ngoài điệu nghệ."],
      dribble_skill: ["{player} đảo chân làm hoa mắt đối thủ!", "{player} xoay compa đẳng cấp!", "{player} xâu kim đầy ngẫu hứng."],
      defense_intercept: ["{defender} đọc bài quá hay!", "{defender} cắt bóng ngay trong chân đối thủ.", "{defender} hóa giải pha tấn công."],
      goal_normal: ["VÀOOOO!!! Dứt điểm lạnh lùng!", "GOAL!!! Bóng nằm gọn trong lưới.", "VÀOOOO!!! Khán đài nổ tung!"],
      goal_counter: ["VÀOOOO!!! Một pha phản công mẫu mực!", "GOAL!!! Tốc độ kinh hoàng và cái kết hoàn hảo!", "VÀOOOO!!! Trừng phạt sai lầm của đối thủ!"],
      save: ["KHÔNG VÀO!!! {gk} bay người cứu thua!", "CỨU THUA!!! Phản xạ xuất thần!", "{gk} từ chối bàn thắng mười mươi."],
      miss: ["Bóng đi sạt cột dọc!", "Dứt điểm lên trời đáng tiếc.", "Cú sút đi chệch khung thành."]
    };
  }

  prepareSquad(club) {
    return club.squad.current_players.slice(0, 11).map(p => ({
      ...p, condition: 100, matchRating: 6.0, stats: { goals: 0, assists: 0 }
    }));
  }

  async *playMatch() {
    const stadium = this.home.stadium || "Sân vận động CLB";
    yield { type: 'KICK_OFF', message: 'TRẬN ĐẤU BẮT ĐẦU!', score: this.score, stats: this.stats, stadium };
    const extraTime = Math.floor(Math.random() * 5) + 2;

    for (let minute = 1; minute <= 90 + extraTime; minute++) {
      this.drainStamina(minute);
      const attSide = this.calculatePossession(); // Bên cầm bóng
      this.stats[attSide].possession++;

      const roll = Math.random();
      
      // Lấy hệ số Tempo của đội cầm bóng (đội tấn công nhiều thì tempo cao)
      const tempo = this.tacticalModifiers[attSide].tempo || 1.0;
      const attackChance = 0.30 * tempo; // 30% base chance

      // 1. TẤN CÔNG
      if (roll < attackChance) {
        yield* this.simulateAttackChain(attSide, minute);
      }
      // 2. GIỮA SÂN (Flavor text)
      else if (roll < 0.60) {
        yield this.generateMidfieldAction(attSide, minute);
      }
      // 3. THẺ PHẠT
      else if (roll < 0.62) {
        yield this.generateFoul(attSide === 'home' ? 'away' : 'home', minute);
      }

      if (minute % 10 === 0) yield { type: 'STATS_UPDATE', minute, score: this.score, stats: this.stats };
    }
    yield { type: 'FULL_TIME', message: 'HẾT GIỜ', score: this.score, stats: this.stats, lineups: this.lineups };
  }

  simulateFast() {
    let h=0, a=0; for(let i=0; i<10; i++) { if(Math.random()>0.6) h++; if(Math.random()>0.6) a++; }
    this.score={home:h, away:a}; return {score:this.score, homeId:this.home.id, awayId:this.away.id, lineups:this.lineups};
  }

  // --- LOGIC CHUỖI TẤN CÔNG & PHẢN CÔNG ---
  async *simulateAttackChain(attSide, minute, isCounter = false) {
    const defSide = attSide === 'home' ? 'away' : 'home';
    const creator = this.getRandomPlayer(attSide, ['CAM', 'CM', 'LW', 'RW']);
    const defender = this.getRandomPlayer(defSide, ['CB', 'LB', 'RB', 'CDM']);
    const gk = this.getGoalkeeper(defSide);

    // Nếu là phản công, bỏ qua bước Decision, lao lên luôn
    let action = 'PASS';
    if (!isCounter) {
        action = decisionMaker.decideNextMove(creator, {
            position: creator.positions[0],
            scoreDiff: this.score[attSide] - this.score[defSide],
            time: minute
        });
    }

    // 1. PASS / COUNTER PASS
    if (action === 'PASS' || isCounter) {
      const passBonus = isCounter ? 1.5 : 1.0; // Phản công chuyền dễ hơn do thoáng
      const passSkill = (creator.technical.shortPassing + creator.mental.vision) * passBonus;
      const interceptSkill = defender.mental.positioning + defender.technical.marking;

      if (passSkill * Math.random() > interceptSkill * Math.random()) {
        // THÀNH CÔNG
        const msgKey = isCounter ? 'counter_start' : 'pass_through';
        const msg = this.getComment(msgKey, { player: creator.name, team: attSide === 'home' ? this.home.name : this.away.name });
        
        yield { type: isCounter ? 'DRIBBLE' : 'PASS', minute, message: msg, team: attSide };

        const striker = this.getRandomPlayer(attSide, ['ST', 'RW', 'LW']);
        // Sút! (Phản công sút hiểm hơn)
        yield this.executeShot(attSide, striker, gk, minute, isCounter ? 1.3 : 1.1, `${striker.name} đối mặt thủ môn...`, false, isCounter);
      
      } else {
        // THẤT BẠI -> CÓ CƠ HỘI PHẢN CÔNG NGƯỢC LẠI? (Counter-Counter)
        const msg = this.getComment('defense_intercept', { defender: defender.name });
        yield { type: 'INTERCEPT', minute, message: msg, team: defSide };

        // 20% Cơ hội đội phòng ngự cướp bóng và phản công ngay lập tức!
        if (Math.random() < 0.20) {
            yield* this.simulateAttackChain(defSide, minute, true); // Gọi đệ quy với isCounter = true
        }
      }
    }
    // 2. DRIBBLE
    else if (action === 'DRIBBLE') {
        const { attScore, defScore } = decisionMaker.calculateDribbleVsTackle(creator, defender);
        if (attScore > defScore) {
            const msg = this.getComment('dribble_skill', { player: creator.name });
            yield { type: 'DRIBBLE', minute, message: msg, team: attSide };
            yield this.executeShot(attSide, creator, gk, minute, 1.0, `${creator.name} dứt điểm ngay!`);
        } else {
            const msg = "Tắc bóng chính xác!";
            yield { type: 'DEFENSE', minute, message: msg, team: defSide };
        }
    }
    else {
        yield this.executeShot(attSide, creator, gk, minute, 0.8, `${creator.name} sút xa.`);
    }
  }

  executeShot(attSide, shooter, gk, minute, qualityMult, contextMsg, isHeader = false, isCounter = false) {
    this.stats[attSide].shots++;
    const pressure = isCounter ? 20 : Math.random() * 60; // Phản công ít áp lực
    const shotQuality = decisionMaker.calculateShotQuality(shooter, pressure) * qualityMult;
    const saveQuality = decisionMaker.calculateSaveQuality(gk, shotQuality); // Bỏ nerf thủ môn, để nó bắt công bằng
    
    // TÍNH xG (Giảm bớt để thực tế hơn)
    // ShotQuality thường rơi vào 50-150. Chia 300 để xG max tầm 0.5-0.6 thôi (trừ khi siêu phẩm)
    const xG = Math.min(0.8, shotQuality / 300); 
    this.stats[attSide].xG += xG;

    // GHI BÀN
    if (shotQuality > saveQuality + 10) {
      this.score[attSide]++;
      this.stats[attSide].onTarget++;
      this.updateRating(shooter, 1.5);
      this.updateRating(gk, -1.0);
      const goalKey = isCounter ? 'goal_counter' : 'goal_normal';
      const goalText = this.getComment(goalKey, {});
      return { type: 'GOAL', minute, message: `${contextMsg} -> ${goalText}`, scorer: shooter.name, score: this.score, team: attSide };
    } 
    
    // CỨU THUA
    if (shotQuality > saveQuality - 20) {
      this.stats[attSide].onTarget++;
      this.stats[attSide].corners++;
      this.updateRating(gk, 0.5); // Buff ít thôi
      const saveText = this.getComment('save', { gk: gk.name });
      return { type: 'SAVE', minute, message: `${contextMsg} -> ${saveText}`, team: attSide };
    }

    // RA NGOÀI
    const missText = this.getComment('miss', {});
    return { type: 'MISS', minute, message: `${contextMsg} -> ${missText}`, team: attSide };
  }

  generateMidfieldAction(side, minute) {
    const p = this.getRandomPlayer(side, ['CM', 'CDM']);
    const msgs = [`${p.name} quan sát chiến thuật.`, `${p.name} chuyền về an toàn.`, `${p.name} tranh chấp quyết liệt.`];
    return { type: 'COMMENTARY', minute, message: msgs[Math.floor(Math.random()*msgs.length)], team: side };
  }
  generateFoul(defSide, minute) {
    const p = this.getRandomPlayer(defSide, ['CB', 'CDM']);
    this.stats[defSide].fouls++;
    if(Math.random()<0.2){ this.stats[defSide].yellow++; return {type:'YELLOW_CARD', minute, message:`${p.name} nhận thẻ vàng.`, team:defSide}; }
    return {type:'FOUL', minute, message:`${p.name} phạm lỗi.`, team:defSide};
  }
  
  // Helpers
  getComment(key, params) { const l=this.commentaryDB[key]; if(!l)return""; const r=l[Math.floor(Math.random()*l.length)]; return r.replace(/{(\w+)}/g,(_,k)=>params[k]||k); }
  drainStamina(m) { ['home','away'].forEach(s => this.lineups[s].forEach(p => p.condition = Math.max(0, p.condition-0.08))); }
  calculatePossession() { 
      const h = this.lineups.home.reduce((s,p)=>s+p.technical.shortPassing,0);
      const a = this.lineups.away.reduce((s,p)=>s+p.technical.shortPassing,0);
      return Math.random()*(h+a) < h ? 'home' : 'away';
  }
  getRandomPlayer(s, pos) { const l=this.lineups[s].filter(p=>pos.some(x=>p.positions.includes(x))); return l.length?l[Math.floor(Math.random()*l.length)]:this.lineups[s][0]; }
  getGoalkeeper(s) { return this.lineups[s].find(p=>p.positions.includes('GK')) || this.lineups[s][0]; }
  updateRating(p, v) { p.matchRating = Math.max(1, Math.min(10, p.matchRating + v)); }
}

export default MatchSimulator;
