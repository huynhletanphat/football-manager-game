import fs from 'fs';
import path from 'path';

const CLUBS_DIR = './src/data/clubs';

console.log("🔍 Đang kiểm tra cú pháp JSON trong " + CLUBS_DIR + "...\n");

if (!fs.existsSync(CLUBS_DIR)) {
    console.error("❌ Không tìm thấy thư mục data!");
    process.exit(1);
}

const files = fs.readdirSync(CLUBS_DIR);
let errorCount = 0;

files.forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(CLUBS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        try {
            JSON.parse(content);
            console.log(`✅ ${file}: OK`);
        } catch (err) {
            errorCount++;
            console.error(`❌ ${file}: LỖI CÚ PHÁP!`);
            console.error(`   ➤ Chi tiết: ${err.message}`);
            
            // Cố gắng trích xuất vị trí lỗi để gợi ý
            const match = err.message.match(/position (\d+)/);
            if (match) {
                const pos = parseInt(match[1]);
                const start = Math.max(0, pos - 20);
                const end = Math.min(content.length, pos + 20);
                const snippet = content.substring(start, end);
                console.error(`   ➤ Tại đoạn: "...${snippet}..."`);
                console.error(`   ➤ Gợi ý: Kiểm tra dấu phẩy thừa, hoặc dấu nháy đơn (') thay vì nháy kép (")`);
            }
            console.log('-'.repeat(40));
        }
    }
});

if (errorCount === 0) {
    console.log("\n✨ Tuyệt vời! Tất cả file data đều chuẩn.");
} else {
    console.log(`\n⚠️  Tìm thấy ${errorCount} file bị lỗi. Hãy sửa chúng trước khi Start Game.`);
}
