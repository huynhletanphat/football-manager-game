import coachAI from './CoachAI.js';
import logger from '../utils/Logger.js';

class InMatchAI {
  constructor(matchSimulator) {
    this.match = matchSimulator;
    
    this.subState = {
      home: { used: 0, max: 5, lastSubMinute: 0 },
      away: { used: 0, max: 5, lastSubMinute: 0 }
    };

    this.currentTactics = { home: 'BALANCED', away: 'BALANCED' };
    
    // NEW: Theo dõi lần cuối HLV nói để tránh spam
    this.lastCoachTalk = { home: 0, away: 0 };

    this.benches = {
      home: this.prepareBench(matchSimulator.home, matchSimulator.lineups.home),
      away: this.prepareBench(matchSimulator.away, matchSimulator.lineups.away)
    };
  }

  prepareBench(club, starters) {
    const starterIds = starters.map(p => p.id);
    return club.squad.current_players.filter(p => !starterIds.includes(p.id) && !p.injured && !p.suspended);
  }

  async update(minute) {
    await this.processTeam('home', minute);
    await this.processTeam('away', minute);
  }

  async processTeam(side, minute) {
    const clubName = this.match[side].name;

    // --- 1. PHÂN TÍCH CHIẾN THUẬT (CHẶN SPAM) ---
    // Chỉ phân tích nếu đã qua 6 phút kể từ lần nói cuối, HOẶC vừa có bàn thắng (Logic check bàn thắng nằm ở CoachAI)
    // Hoặc là những phút cực kỳ quan trọng (85, 90)
    
    const timeSinceLastTalk = minute - this.lastCoachTalk[side];
    const isCrunchTime = minute >= 85 && timeSinceLastTalk >= 3;
    const isNormalTime = timeSinceLastTalk >= 8;

    if (isNormalTime || isCrunchTime) {
        const matchData = { minute, score: this.match.score, stats: this.match.stats, teamSide: side };
        const analysis = coachAI.analyzeGame(matchData);

        if (analysis.message) {
            // Cập nhật timestamp để không nói lại ngay
            this.lastCoachTalk[side] = minute;

            if (analysis.tacticChange && analysis.tacticChange !== this.currentTactics[side]) {
                this.currentTactics[side] = analysis.tacticChange;
                this.applyTacticalEffects(side, analysis.tacticChange);
                logger.tacticalChange(clubName, `Đổi chiến thuật: ${coachAI.tactics[analysis.tacticChange].name}`);
                logger.aiThinking(`HLV ${clubName}`, analysis.message);
            } else {
                // Chỉ nhắc nhở, không đổi chiến thuật
                logger.aiThinking(`HLV ${clubName}`, analysis.message);
            }
        }
    }

    // --- 2. THAY NGƯỜI ---
    if (this.subState[side].used < this.subState[side].max && minute - this.subState[side].lastSubMinute > 5) {
      const subDecision = coachAI.evaluateSubstitutions(
        this.match.lineups[side], this.benches[side],
        this.subState[side].used, this.subState[side].max, minute
      );

      if (subDecision) {
        this.executeSubstitution(side, subDecision.out, subDecision.in, subDecision.reason, minute);
      }
    }
  }

  executeSubstitution(side, playerOut, playerIn, reason, minute) {
    const lineup = this.match.lineups[side];
    const outIndex = lineup.findIndex(p => p.id === playerOut.id);
    
    if (outIndex !== -1) {
      // Cầu thủ vào sân rating mặc định 6.5 (để tạo dấu ấn)
      const newPlayer = { ...playerIn, condition: 100, matchRating: 6.5, stats: { goals: 0, assists: 0 } };
      lineup[outIndex] = newPlayer;
      this.subState[side].used++;
      this.subState[side].lastSubMinute = minute;
      this.benches[side] = this.benches[side].filter(p => p.id !== playerIn.id);

      logger.tacticalChange(this.match[side].name, `THAY NGƯỜI (${minute}'): ⬆ ${playerIn.name} | ⬇ ${playerOut.name} (${reason})`);
    }
  }

  applyTacticalEffects(side, tacticType) {
    const lineup = this.match.lineups[side];
    const modifier = this.getTacticalModifier(tacticType);
    // Lưu modifier vào object đội bóng trong simulator để dùng cho tính toán
    this.match.tacticalModifiers = this.match.tacticalModifiers || {};
    this.match.tacticalModifiers[side] = modifier;
  }

  getTacticalModifier(tacticType) {
    // Trả về hệ số ảnh hưởng (Attack, Defense, Tempo)
    switch (tacticType) {
      case 'ALL_OUT_ATTACK': return { attack: 1.5, defense: 0.5, tempo: 1.5 };
      case 'PARK_THE_BUS': return { attack: 0.3, defense: 2.0, tempo: 0.5 };
      case 'HIGH_PRESS': return { attack: 1.2, defense: 0.8, tempo: 1.3 };
      case 'COUNTER_ATTACK': return { attack: 1.1, defense: 1.2, tempo: 1.2 }; // Counter attack buff cả thủ lẫn công
      default: return { attack: 1.0, defense: 1.0, tempo: 1.0 };
    }
  }
}

export default InMatchAI;
