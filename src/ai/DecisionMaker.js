class DecisionMaker {
  
  /**
   * Tính toán điểm hiệu quả thực tế của cầu thủ tại thời điểm cụ thể
   * Áp dụng: Thể lực (Stamina) và Áp lực tâm lý (Composure)
   */
  getEffectiveAttribute(player, category, attrName, pressure = 0) {
    const baseValue = player[category][attrName];
    
    // 1. Hệ số Thể lực (Stamina Factor)
    // Nếu thể lực < 50%, các chỉ số vật lý và kỹ thuật giảm mạnh
    let fatiguePenalty = 1.0;
    if (player.condition < 50) {
      fatiguePenalty = 0.5 + (player.condition / 100); // Giảm tới 50% hiệu suất
    }

    // 2. Hệ số Áp lực (Pressure/Composure Factor)
    // Composure càng cao, càng ít bị ảnh hưởng bởi pressure
    // Pressure: 0 (Thoải mái) -> 100 (Bị kèm chặt/Phút cuối)
    const mentalResilience = player.mental.composure / 100;
    const pressureEffect = pressure * (1 - mentalResilience); 
    
    let effectiveValue = baseValue * fatiguePenalty;

    // Chỉ số Mental ít bị ảnh hưởng bởi thể lực, nhưng Technical bị ảnh hưởng nặng
    if (category === 'technical') {
      effectiveValue -= pressureEffect * 0.5; // Kỹ thuật bị giảm khi run
    }

    return Math.max(1, effectiveValue);
  }

  /**
   * Quyết định hành động: SÚT, CHUYỀN hay RÊ BÓNG?
   */
  decideNextMove(player, matchContext) {
    const { position, scoreDiff, time } = matchContext;

    // Lấy chỉ số đã hiệu chỉnh
    const vision = this.getEffectiveAttribute(player, 'mental', 'vision');
    const aggression = this.getEffectiveAttribute(player, 'mental', 'aggression');
    const finishing = this.getEffectiveAttribute(player, 'technical', 'finishing');
    const dribbling = this.getEffectiveAttribute(player, 'technical', 'dribbling');

    // --- TÍNH ĐIỂM ƯU TIÊN (WEIGHTS) ---

    // 1. Điểm Sút (Shot): Dựa trên Vị trí + Dứt điểm + Độ "ích kỷ" (Aggression)
    let shotScore = finishing * 0.4 + aggression * 0.2;
    if (['ST', 'CF'].includes(player.positions[0])) shotScore += 30; // Tiền đạo ham sút
    if (['RW', 'LW'].includes(player.positions[0])) shotScore += 15;
    
    // Logic: Đang thua cuối trận -> Ham sút hơn (Panic)
    if (scoreDiff < 0 && time > 80) shotScore *= 1.5;

    // 2. Điểm Chuyền (Pass): Dựa trên Tầm nhìn (Vision) + Teamwork (WorkRate làm proxy)
    let passScore = vision * 0.6 + player.mental.workRate * 0.3;
    if (['CM', 'CDM', 'CAM'].includes(player.positions[0])) passScore += 25;

    // 3. Điểm Rê (Dribble): Dựa trên Kỹ thuật + Tốc độ + Agility
    let dribbleScore = dribbling * 0.5 + player.physical.agility * 0.3 + player.physical.acceleration * 0.2;
    if (['RW', 'LW'].includes(player.positions[0])) dribbleScore += 20;

    // Chọn hành động dựa trên Roulette Wheel Selection
    const total = shotScore + passScore + dribbleScore;
    const roll = Math.random() * total;

    if (roll < shotScore) return 'SHOOT';
    if (roll < shotScore + passScore) return 'PASS';
    return 'DRIBBLE';
  }

  /**
   * Tính toán chất lượng cú sút (xG cơ bản)
   * Sử dụng: Finishing, ShotPower, Composure, Balance (trụ)
   */
  calculateShotQuality(shooter, defenderPressure) {
    const finish = this.getEffectiveAttribute(shooter, 'technical', 'finishing', defenderPressure);
    const power = this.getEffectiveAttribute(shooter, 'technical', 'shotPower', defenderPressure);
    const balance = this.getEffectiveAttribute(shooter, 'physical', 'balance', defenderPressure); // Trụ vững mới sút tốt
    const composure = this.getEffectiveAttribute(shooter, 'mental', 'composure', defenderPressure);

    // Công thức: (Dứt điểm * 40%) + (Lực * 30%) + (Trụ * 10%) + (Tâm lý * 20%)
    return (finish * 0.4) + (power * 0.3) + (balance * 0.1) + (composure * 0.2);
  }

  /**
   * Tính toán khả năng cứu thua của thủ môn
   * Sử dụng: Reflexes, Handling, Positioning, Height, Jumping
   */
  calculateSaveQuality(gk, shotQuality) {
    const reflex = gk.goalkeeper.reflexes;
    const position = gk.goalkeeper.positioning; // Chọn vị trí tốt đỡ phải bay
    const handling = gk.goalkeeper.handling; // Bắt dính bóng
    const heightBonus = (gk.physical.height - 180) * 0.5; // Cao hơn thì với xa hơn
    const jump = gk.physical.jumping * 0.2;

    const baseSave = (reflex * 0.45) + (position * 0.35) + (handling * 0.1) + heightBonus + jump;
    
    // Random factor: Phong độ nhất thời (Consistency ẩn)
    return baseSave * (0.9 + Math.random() * 0.2); 
  }

  /**
   * Tính toán pha đối đầu 1v1 (Rê bóng vs Tắc bóng)
   */
  calculateDribbleVsTackle(attacker, defender) {
    // Attacker: Dribbling + Agility + Acceleration + Balance
    const attScore = (attacker.technical.dribbling * 0.4) + 
                     (attacker.physical.agility * 0.3) + 
                     (attacker.physical.acceleration * 0.2) + 
                     (attacker.physical.balance * 0.1);

    // Defender: Tackling + Strength + Positioning + Pace (để đuổi theo)
    const defScore = (defender.technical.tackling * 0.4) + 
                     (defender.physical.strength * 0.3) + 
                     (defender.mental.positioning * 0.2) + 
                     (defender.physical.pace * 0.1);

    return { attScore, defScore };
  }

  /**
   * Tính toán tranh chấp bóng bổng (Đánh đầu)
   */
  calculateAerialDuel(p1, p2) {
    const getAirScore = (p) => {
      // Công thức vật lý: Chiều cao + Sức bật + Sức mạnh tì đè + Kỹ thuật đánh đầu
      return (p.physical.height * 0.4) + 
             (p.physical.jumping * 0.3) + 
             (p.physical.strength * 0.2) + 
             (p.technical.heading * 0.1);
    };

    return { p1Score: getAirScore(p1), p2Score: getAirScore(p2) };
  }
}

export default new DecisionMaker();
