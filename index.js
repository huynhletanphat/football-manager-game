#!/usr/bin/env node

import gameEngine from './src/core/GameEngine.js';
import matchUI from './src/ui/MatchUI.js';
import logger from './src/utils/Logger.js';

// Xử lý lỗi không mong muốn
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR:', err);
});

async function main() {
  try {
    // --- KẾT NỐI UI VỚI CORE ---
    // Đây là đoạn code quan trọng nhất để sửa lỗi của bạn.
    // Chúng ta gán hàm hiển thị của MatchUI vào GameEngine.
    
    gameEngine.playMatchUIHandler = async (simulator) => {
      // Khi GameEngine yêu cầu chạy trận đấu người chơi,
      // nó sẽ gọi hàm này. Hàm này sẽ kích hoạt UI delay 5s.
      await matchUI.startMatch(simulator);
    };

    // --- BẮT ĐẦU GAME ---
    await gameEngine.start();

  } catch (error) {
    logger.error('Failed to start game: ' + error.message);
    console.error(error); // In chi tiết lỗi nếu có
  }
}

main();
