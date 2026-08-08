require("dotenv").config();
const express = require('express');
const axios = require("axios");
const app = express();
const http = require('http');
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
app.use(express.json());
const authRoutes = require("./routes/auth");
const API_BASE = `http://localhost:${PORT}/api`;
// ============================================
// 🛡️ HÀM VALIDATE DỮ LIỆU - CHỐNG HACK
// ============================================

const MAX_MONEY = 4500;
const MIN_MONEY = 0;
const MAX_CELL_PRICE = 2800;
const MAX_MOVE_STEPS = 20;
const TOTAL_CELLS = 20;
const MAX_POINTS_PER_MATCH = 25;
const MAX_COINS_PER_MATCH = 100;
const MAX_EXP_PER_MATCH = 200;

function validateMoney(value) {
    // Server không có window, bỏ kiểm tra gameEnding
    // Cho phép tiền âm (có thể do Bố Hảo quét)
    return typeof value === 'number' && !isNaN(value) && value <= MAX_MONEY;
}

function validatePosition(pos) {
    return typeof pos === 'number' && 
           !isNaN(pos) && 
           pos >= 0 && 
           pos < TOTAL_CELLS;
}

function validateMoveSteps(steps) {
    return typeof steps === 'number' && 
           !isNaN(steps) && 
           steps >= 2 && 
           steps <= MAX_MOVE_STEPS;
}

function validatePlayerData(player) {
    if (!player) return false;
    
    // ✅ BỎ QUA KIỂM TRA TIỀN ÂM (CHO PHÉP MỌI GIÁ TRỊ TIỀN)
    if (typeof player.money !== 'number' || isNaN(player.money)) {
        console.warn(`⚠️ Tiền không hợp lệ: ${player.money}`);
        return false;
    }
    // Cho phép tiền âm (không kiểm tra MIN_MONEY)
    if (player.money > MAX_MONEY) {
        console.warn(`⚠️ Tiền quá lớn: ${player.money} (tối đa ${MAX_MONEY})`);
        return false;
    }
    
    if (!validatePosition(player.pos)) {
        console.warn(`⚠️ Vị trí không hợp lệ: ${player.pos}`);
        return false;
    }
    
    if (typeof player.rounds !== 'number' || player.rounds < 0 || player.rounds > 10) {
        console.warn(`⚠️ Số vòng không hợp lệ: ${player.rounds}`);
        return false;
    }
    
    return true;
}
function validateCellsData(cellsData) {
    if (!cellsData || !Array.isArray(cellsData) || cellsData.length !== TOTAL_CELLS) {
        console.warn(`⚠️ cellsData không hợp lệ`);
        return false;
    }
    
    for (let i = 0; i < cellsData.length; i++) {
        const cell = cellsData[i];
        if (!cell) return false;
        
        if (typeof cell.price !== 'number' || cell.price < 0 || cell.price > MAX_CELL_PRICE) {
            console.warn(`⚠️ Giá ô ${i} không hợp lệ: ${cell.price} (tối đa ${MAX_CELL_PRICE})`);
            return false;
        }
        
        if (cell.owner !== null && cell.owner !== undefined) {
            if (typeof cell.owner !== 'number' || (cell.owner !== 1 && cell.owner !== 2)) {
                console.warn(`⚠️ Owner ô ${i} không hợp lệ: ${cell.owner}`);
                return false;
            }
        }
    }
    
    return true;
}

function validatePoints(points) {
    return typeof points === 'number' && 
           !isNaN(points) && 
           points >= -25 && 
           points <= MAX_POINTS_PER_MATCH;
}

function validateCoins(coins) {
    return typeof coins === 'number' && 
           !isNaN(coins) && 
           coins >= 0 && 
           coins <= MAX_COINS_PER_MATCH;
}

function validateExp(exp) {
    return typeof exp === 'number' && 
           !isNaN(exp) && 
           exp >= 0 && 
           exp <= MAX_EXP_PER_MATCH;
}
// ============================================
// 🏆 TÍNH TOÁN PHẦN THƯỞNG TRÊN SERVER (KHÔNG BONUS)
// ============================================

function calculateRewards(isWin, currentData) {
    // ===== PHẦN THƯỞNG CƠ BẢN (KHÔNG BONUS) =====
    let expGained = isWin ? 150 : 75;
    let coinsGained = isWin ? 50 : 25;
    let pointsGained = isWin ? 25 : -20;
    
    // Giới hạn an toàn
    const MAX_EXP_PER_MATCH = 300;
    const MAX_COINS_PER_MATCH = 100;
    const MAX_POINTS_PER_MATCH = 25;
    
    expGained = Math.min(expGained, MAX_EXP_PER_MATCH);
    coinsGained = Math.min(coinsGained, MAX_COINS_PER_MATCH);
    pointsGained = Math.max(-MAX_POINTS_PER_MATCH, Math.min(pointsGained, MAX_POINTS_PER_MATCH));
    
    // Tính toán dữ liệu mới
    const newExp = (currentData.exp || 0) + expGained;
    const newLevel = Math.floor(newExp / 1000) + 1;
    const newPoints = Math.max(0, (currentData.points || 0) + pointsGained);
    const newCoins = (currentData.coin || 0) + coinsGained;
    
    // Xác định rank mới
    let newRank = "Bùn";
    if (newPoints >= 600) newRank = "Hali";
    else if (newPoints >= 500) newRank = "Kim Cương";
    else if (newPoints >= 400) newRank = "Vàng";
    else if (newPoints >= 300) newRank = "Bạc";
    else if (newPoints >= 200) newRank = "Đồng";
    else if (newPoints >= 100) newRank = "Sắt";
    
    return {
        level: newLevel,
        exp: newExp,
        points: newPoints,
        rank: newRank,
        coin: newCoins,
        expGained: expGained,
        coinsGained: coinsGained,
        pointsGained: pointsGained
    };
}
// ============================================
// 🏆 HÀM XÁC ĐỊNH RANK THEO ĐIỂM
// ============================================
function getRankFromPoints(points) {
    if (points >= 600) return "Hali";
    if (points >= 500) return "Kim Cương";
    if (points >= 400) return "Vàng";
    if (points >= 300) return "Bạc";
    if (points >= 200) return "Đồng";
    if (points >= 100) return "Sắt";
    return "Bùn";
}
// Cấu hình CORS để nhận mọi kết nối từ các thiết bị khác nhau
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));
app.use("/api", authRoutes);
// =========================================================================
// 🌐 HỆ THỐNG LƯU TRỮ ĐA PHÒNG QUỐC TẾ (MULTI-ROOM)
// =========================================================================
const rooms = {};
const finishedRooms = new Set();
let quickMatchQueue = [];
const TURN_TIME_LIMIT = 15;
// ===== DANH SÁCH THẺ KỸ NĂNG =====
const SKILLS = [
    "hacAmTruySat",
    "dieuHuong",
    "thor",
    "cuopTien",
    "doiViTri",
    "gaiBom"
];


// Random 2 kỹ năng khác nhau
function randomSkills() {

    const arr = [...SKILLS];

    const p1 =
        arr.splice(
            Math.floor(Math.random() * arr.length),
            1
        )[0];


    const p2 =
        arr.splice(
            Math.floor(Math.random() * arr.length),
            1
        )[0];


    return {
        1:p1,
        2:p2
    };
}
// Hàm khởi chạy đếm ngược 15 giây độc lập cho TỪNG PHÒNG
function startTurnCountdown(roomId, playerNum) {
    const room = rooms[roomId];
    if (!room) return;

    // Xóa bộ đếm cũ của riêng phòng này nếu có
    if (room.timer) clearInterval(room.timer);
    
    let timeLeft = TURN_TIME_LIMIT;
    io.to(roomId).emit('timerUpdate', { timeLeft, playerNum });

    room.timer = setInterval(() => {
        timeLeft--;
        io.to(roomId).emit('timerUpdate', { timeLeft, playerNum });

        if (timeLeft <= 0) {
            clearInterval(room.timer);
            console.log(`⏰ Phòng [${roomId}] - P${playerNum} hết thời gian! Tự động chuyển lượt.`);
            
            const nextTurn = playerNum === 1 ? 2 : 1;
            room.currentTurn = nextTurn;
            
            io.to(roomId).emit('syncEndTurnResult', { nextTurn: nextTurn, reason: 'timeout' });
            
            // Tiếp tục đếm ngược cho người kế tiếp trong phòng đó
            startTurnCountdown(roomId, nextTurn);
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log(`🔌 Thiết bị kết nối mới: ${socket.id}`);
    // ===== HỆ THỐNG CHAT =====
    // Lưu phòng chat hiện tại của socket
    socket.currentChatRoom = null;
    socket.chatUserName = null;
    socket.chatUserId = null;
    // ===== 🆕 LƯU RANK MẶC ĐỊNH =====
    socket.rank = 'Bùn';
    // ============================================
    // 🌑 HẮC ÁM TRUY SÁT - RELAY CHO CẢ 2 MÁY
    // ============================================

    // 1. Khi người chơi triệu hồi hắc ám
    socket.on('syncDarkChase', (data) => {
        const roomId = socket.roomId;
        if (!roomId) {
            console.log('⚠️ Không tìm thấy roomId cho syncDarkChase');
            return;
        }
        
        console.log(`🌑 [Phòng ${roomId}] ${data.playerName} triệu hồi Hắc Ám Truy Sát!`);
        console.log(`📍 Target: ${data.targetName} tại ô ${data.targetPos}`);
        console.log(`📍 Dark chaser tại ô ${data.darkPos}`);
        
        // 🆕 GỬI CHO CẢ 2 MÁY TRONG PHÒNG
        io.to(roomId).emit('syncDarkChase', data);
    });
    // ===== RELAY TELEPORT =====
    socket.on('syncTeleport', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`🌀 [Phòng ${roomId}] Teleport: Player ${data.playerId} → ô ${data.targetPos}`);
        io.to(roomId).emit('syncTeleport', data);
    });
    // 2. Khi cập nhật vị trí hắc ám (mỗi lượt)
    socket.on('syncDarkChaseUpdate', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        console.log(`🌑 [Phòng ${roomId}] Cập nhật vị trí hắc ám: ô ${data.darkPos}, còn ${data.turns} lượt`);
        
        // 🆕 GỬI CHO CẢ 2 MÁY TRONG PHÒNG
        io.to(roomId).emit('syncDarkChaseUpdate', data);
    });

    // 3. Khi bắt được đối thủ
    socket.on('syncDarkChaseCatch', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        console.log(`💀 [Phòng ${roomId}] BẮT ĐƯỢC! ${data.targetName} bị bắt!`);
        console.log(`💰 ${data.targetName} mất ${data.penalty}$`);
        if (data.stolenCell !== -1) {
            console.log(`🏠 Mất ô đất ${data.stolenCell}`);
        }
        
        // 🆕 GỬI CHO CẢ 2 MÁY TRONG PHÒNG
        io.to(roomId).emit('syncDarkChaseCatch', data);
    });

    // 4. Khi hết giờ (không đuổi kịp)
    socket.on('syncDarkChaseEnd', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        console.log(`⏰ [Phòng ${roomId}] Hết 3 lượt! Hắc ám tan biến.`);
        
        // 🆕 GỬI CHO CẢ 2 MÁY TRONG PHÒNG
        io.to(roomId).emit('syncDarkChaseEnd', data);
    });
    // ===== HỦY TÌM TRẬN / TẠO PHÒNG =====
    socket.on('cancel-matchmaking', (data) => {
        console.log(`❌ Người chơi ${socket.id} hủy ${data.type === 'quick' ? 'tìm trận' : 'tạo phòng'}`);
        
        // Xóa socket khỏi hàng đợi quick match
        quickMatchQueue = quickMatchQueue.filter(s => s.id !== socket.id);
        
        // Nếu đang ở phòng chờ (chưa có đối thủ) thì xóa phòng
        const roomId = socket.roomId;
        if (roomId && rooms[roomId] && rooms[roomId].status === 'waiting') {
            if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
            delete rooms[roomId];
            socket.leave(roomId);
            socket.roomId = null;
        }
        
        // Gửi xác nhận
        socket.emit('cancel-confirmed', { success: true });
    });
    // Xử lý hủy tìm trận
    socket.on('cancel-queue', () => {
        // Xóa socket khỏi hàng đợi quick match
        quickMatchQueue = quickMatchQueue.filter(s => s.id !== socket.id);
        // Gửi phản hồi cho client
        socket.emit('queue-cancelled', { success: true });
        console.log(`🚫 Người chơi ${socket.id} đã hủy tìm trận.`);
    });
    // ===== RELAY ÁM SÁT (TÀNG HÌNH) =====
    socket.on('syncAssassination', (data) => {
        const roomId = socket.roomId;
        if (!roomId) {
            console.warn('⚠️ Không tìm thấy roomId cho syncAssassination');
            return;
        }
        
        console.log(`🗡️ [Phòng ${roomId}] Relay ám sát: ${data.assassinId} → ${data.targetId} (-${data.amount}$)`);
        io.to(roomId).emit('syncAssassination', data);
    });
    // ===== RELAY BOM =====
    socket.on('syncBombPlanted', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`💣 [Phòng ${roomId}] Gài bom: ${data.ownerName} → ${data.targetName}`);
        io.to(roomId).emit('syncBombPlanted', data);
    });

    socket.on('syncBombCountdown', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        io.to(roomId).emit('syncBombCountdown', data);
    });

    socket.on('syncBombExploded', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`💥 [Phòng ${roomId}] Bom nổ! Target: ${data.targetId}`);
        io.to(roomId).emit('syncBombExploded', data);
    });

    socket.on('syncBombDefused', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`💣 [Phòng ${roomId}] Bom đã được gỡ`);
        io.to(roomId).emit('syncBombDefused', data);
    });
    // ===== 🆕 LẤY RANK NGAY KHI KẾT NỐI (NẾU CÓ USER ID) =====
    socket.on('setUserInfo', async (data) => {
        const { userId, username } = data;
        socket.userId = userId;
        socket.username = username;
        
        try {
            // Gọi API lấy rank từ database
            const response = await axios.get(`http://localhost:${PORT}/api/user/${username}`);
            if (response.data && response.data.success !== false) {
                socket.rank = response.data.rank || 'Bùn';
                console.log(`✅ Đã lấy rank cho ${username}: ${socket.rank}`);
            } else {
                socket.rank = 'Bùn';
                console.log(`⚠️ Không tìm thấy rank cho ${username}, mặc định Bùn`);
            }
        } catch (err) {
            console.error(`❌ Lỗi lấy rank cho ${username}:`, err.message);
            socket.rank = 'Bùn';
        }
    });
    // ===== LẤY RANK TỪ DATABASE =====
    socket.on('getUserRank', (data) => {
        const { username } = data;
        console.log(`📥 Yêu cầu lấy rank của: ${username}`);
        
        // Gọi API từ routes/auth.js
        axios.get(`http://localhost:${PORT}/api/user/${username}`)
            .then(response => {
                const user = response.data;
                if (user && user.success !== false) {
                    socket.emit('userRankResponse', {
                        success: true,
                        username: username,
                        rank: user.rank || 'Bùn',
                        level: user.level || 1,
                        coin: user.coin || 0,
                        exp: user.exp || 0
                    });
                    console.log(`✅ Đã gửi rank cho ${username}: ${user.rank}`);
                } else {
                    socket.emit('userRankResponse', {
                        success: false,
                        error: 'Không tìm thấy người dùng'
                    });
                }
            })
            .catch(err => {
                console.error('❌ Lỗi lấy rank:', err.message);
                socket.emit('userRankResponse', {
                    success: false,
                    error: err.message
                });
            });
    });
    // Thêm vào server.js, trong io.on('connection')
    socket.on('trigger-skin-effect', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        // Gửi hiệu ứng cho cả phòng
        io.to(roomId).emit('skin-effect', {
            skinId: data.skinId,
            playerNumber: data.playerNumber
        });
    });
    // Tham gia phòng chat
    socket.on('join-chat-room', (data) => {
        const { roomId, roomName, userName, userId } = data;
        
        // Rời phòng cũ nếu có
        if (socket.currentChatRoom) {
            socket.leave(socket.currentChatRoom);
            console.log(`💬 ${socket.chatUserName || 'Ai đó'} đã rời phòng ${socket.currentChatRoom}`);
        }
        
        // Tham gia phòng mới
        const chatRoomName = `chat_${roomId}`;
        socket.join(chatRoomName);
        socket.currentChatRoom = chatRoomName;
        socket.chatUserName = userName || 'Người chơi';
        socket.chatUserId = userId || 'unknown';
        
        console.log(`💬 ${socket.chatUserName} đã vào phòng chat ${roomName} (${chatRoomName})`);
        
        // Lấy số người trong phòng
        const room = io.sockets.adapter.rooms.get(chatRoomName);
        const memberCount = room ? room.size : 0;
        
        // Gửi thông báo cho mọi người trong phòng
        io.to(chatRoomName).emit('chat-message', {
            type: 'system',
            content: `🔹 ${socket.chatUserName} đã vào phòng! (${memberCount} người)`,
            time: new Date().toLocaleTimeString()
        });
        
        // Gửi lại thông tin phòng cho người vừa vào
        socket.emit('chat-joined', {
            roomId: roomId,
            roomName: roomName,
            message: `✅ Đã vào phòng ${roomName}`,
            memberCount: memberCount
        });
    });

    // Gửi tin nhắn chat
    socket.on('chat-message', (data) => {
        const { message, roomId, userName } = data;
        const chatRoomName = `chat_${roomId}`;
        
        if (!socket.currentChatRoom || socket.currentChatRoom !== chatRoomName) {
            socket.emit('chat-error', { message: 'Bạn chưa vào phòng chat nào!' });
            return;
        }
        
        console.log(`💬 ${userName || socket.chatUserName}: ${message}`);
        
        // Gửi tin nhắn cho tất cả trong phòng (bao gồm cả người gửi)
        io.to(chatRoomName).emit('chat-message', {
            type: 'user',
            content: `${userName || socket.chatUserName}: ${message}`,
            time: new Date().toLocaleTimeString()
        });
    });

    // Rời phòng chat
    socket.on('leave-chat-room', () => {
        if (socket.currentChatRoom) {
            const roomName = socket.currentChatRoom;
            const userName = socket.chatUserName || 'Ai đó';
            
            io.to(roomName).emit('chat-message', {
                type: 'system',
                content: `🔹 ${userName} đã rời phòng.`,
                time: new Date().toLocaleTimeString()
            });
            
            socket.leave(roomName);
            socket.currentChatRoom = null;
            console.log(`💬 ${userName} đã rời phòng chat`);
        }
    });
    // ============================================
    // 🆕 RELAY TÀNG HÌNH - CHUYỂN TIẾP CHO ĐỐI THỦ
    // ============================================

    socket.on('syncInvisibleEffect', (data) => {
        const roomId = socket.roomId;
        if (!roomId) {
            console.log('⚠️ Không tìm thấy roomId cho syncInvisibleEffect');
            return;
        }
        
        console.log(`📤 Server relay syncInvisibleEffect trong phòng ${roomId}:`, data);
        
        // Gửi đến TẤT CẢ người chơi trong phòng (bao gồm cả người gửi)
        io.to(roomId).emit('syncInvisibleEffect', data);
    });

    socket.on('syncRemoveInvisible', (data) => {
        const roomId = socket.roomId;
        if (!roomId) {
            console.log('⚠️ Không tìm thấy roomId cho syncRemoveInvisible');
            return;
        }
        
        console.log(`📤 Server relay syncRemoveInvisible trong phòng ${roomId}:`, data);
        
        // Gửi đến TẤT CẢ người chơi trong phòng
        io.to(roomId).emit('syncRemoveInvisible', data);
    });
    // ============================================
    // 🆕 THÊM VÀO ĐÂY - RELAY BỐ HẢO
    // ============================================
    socket.on('syncHaoBossWarning', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`📤 Server relay syncHaoBossWarning trong phòng ${roomId}:`, data);
        io.to(roomId).emit('syncHaoBossWarning', data);
    });

    socket.on('syncHaoBossSpawn', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`📤 Server relay syncHaoBossSpawn trong phòng ${roomId}:`, data);
        io.to(roomId).emit('syncHaoBossSpawn', data);
    });

    socket.on('syncRemoveHaoBoss', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`📤 Server relay syncRemoveHaoBoss trong phòng ${roomId}:`, data);
        io.to(roomId).emit('syncRemoveHaoBoss', data);
    });
    // ============================================
    // 🆕 RELAY BOM HẠT NHÂN
    // ============================================
    socket.on('syncNuclearBomb', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`💣 Server relay syncNuclearBomb trong phòng ${roomId}:`, data);
        io.to(roomId).emit('syncNuclearBomb', data);
    });

    socket.on('syncNuclearRadiation', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        console.log(`☢️ Server relay syncNuclearRadiation trong phòng ${roomId}:`, data);
        io.to(roomId).emit('syncNuclearRadiation', data);
    });
    // 🌐 1. XỬ LÝ GHÉP TRẬN NGẪU NHIÊN (QUICK MATCH)
    socket.on('request-quick-match', async (data) => {

        socket.username = data.name || "Vô danh";

        socket.userId = data.userId;
        socket.skin = data.skin || 'skin_default';
        socket.rank = 'Bùn';
        // Lọc bỏ các socket đã đứt kết nối hoặc chính socket này để tránh tự ghép với mình
        // ===== 🆕 LẤY RANK =====
        if (data.userId) {
            try {
                const response = await axios.get(`http://localhost:${PORT}/api/user/${data.userId}`);
                if (response.data && response.data.success !== false) {
                    socket.rank = response.data.rank || 'Bùn';
                    console.log(`✅ Đã lấy rank cho ${data.userId}: ${socket.rank}`);
                }
            } catch (err) {
                console.error(`❌ Lỗi lấy rank cho ${data.userId}:`, err.message);
            }
        }
        quickMatchQueue = quickMatchQueue.filter(s => s.connected && s.id !== socket.id);
        
        // Nếu có người đang xếp hàng đợi hợp lệ
        if (quickMatchQueue.length > 0) {
            let opponentSocket = quickMatchQueue.shift();
            
            // Sinh mã phòng ngẫu nhiên cho trận đấu nhanh
            let roomId = 'QM_' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            socket.join(roomId);
            opponentSocket.join(roomId);
            
            socket.roomId = roomId;
            opponentSocket.roomId = roomId;

            // Khởi tạo trạng thái game cho phòng này
            const skills = randomSkills();
            
            // ===== SINH VỊ TRÍ MẠNG NHỆN =====
            const spiderWebIdx = Math.floor(Math.random() * 19) + 1;
            
            // ===== 🆕 SINH BOM HẠT NHÂN (khác với mạng nhện và ô START) =====
            let bombIdx;
            do {
                bombIdx = Math.floor(Math.random() * 19) + 1;
            } while (bombIdx === spiderWebIdx);
            
            console.log(`💣 Bom hạt nhân đặt tại ô: ${bombIdx}`);
            
            rooms[roomId] = {
                players: [
                    {
                        id: opponentSocket.id,
                        userId: opponentSocket.userId,
                        name: opponentSocket.username,
                        playerNumber: 1,
                        rounds: 0,
                        skillUsed: false,
                        skin: opponentSocket.skin || 'skin_default',
                        rank: opponentSocket.rank || 'Bùn',
                        teleportCooldown: 0,        // 🆕
                        teleportMaxCooldown: 5,     // 🆕
                        teleportAvailable: true  
                    },
                    {
                        id: socket.id,
                        userId: socket.userId,
                        name: socket.username,
                        playerNumber: 2,
                        rounds: 0,
                        skillUsed: false,
                        skin: socket.skin || 'skin_default',
                        rank: socket.rank || 'Bùn',
                        teleportCooldown: 0,        // 🆕
                        teleportMaxCooldown: 5,     // 🆕
                        teleportAvailable: true  
                    }
                ],
                currentTurn: null,
                spiderWebIndex: spiderWebIdx,
                lightningIndex: null,
                lightningTriggered: false,
                status: 'playing',
                timer: null,
                skills: skills,
                // 🆕 BOM HẠT NHÂN
                nuclearBombIndex: bombIdx,
                nuclearBombDetonated: false,
                gameEnding: false
            };
            
            console.log(`🎨 Skin P1: ${rooms[roomId].players[0].skin}, P2: ${rooms[roomId].players[1].skin}`);
            
            const playersData = rooms[roomId].players.map(p => ({
                id: p.userId || p.id,
                name: p.name,
                socketId: p.id,
                playerNumber: p.playerNumber,
                skin: p.skin || 'skin_default',
                rank: p.rank || 'Bùn'
            }));
            
            io.to(roomId).emit('player-skins', {
                player1: rooms[roomId].players[0].skin || 'skin_default',
                player2: rooms[roomId].players[1].skin || 'skin_default'
            });
            
            opponentSocket.emit('room-joined', { 
                roomId: roomId,
                players: playersData
            });
            
            socket.emit('room-joined', { 
                roomId: roomId,
                players: playersData
            });

            opponentSocket.emit('playerAssigned', { playerNumber: 1 });
            socket.emit('playerAssigned', { playerNumber: 2 });

            io.to(roomId).emit('update-lobby-players', rooms[roomId].players);
            
            // 🆕 GỬI BOM HẠT NHÂN CÙNG VỚI init-traps
            io.to(roomId).emit('init-traps', { 
                spiderWebIndex: rooms[roomId].spiderWebIndex,
                lightningIndex: rooms[roomId].lightningIndex,
                nuclearBombIndex: rooms[roomId].nuclearBombIndex,
                nuclearBombDetonated: rooms[roomId].nuclearBombDetonated
            });
            
            io.to(roomId).emit('startGame', { 
                spiderWebIndex: rooms[roomId].spiderWebIndex, 
                skills: rooms[roomId].skills,
                nuclearBombIndex: rooms[roomId].nuclearBombIndex  // 🆕 THÊM
            });
            
            console.log(`🎮 Trận đấu ngẫu nhiên bắt đầu tại phòng: ${roomId} (${opponentSocket.username} VS ${socket.username})`);
        } else {
            quickMatchQueue.push(socket);
            console.log(`👥 ${socket.username} (${socket.id}) đang nằm chờ trong hàng đợi ghép trận...`);
        }
    });
    socket.on('playerHitGiftSync',(data)=>{

        const roomId = socket.roomId;

        if(!roomId || !rooms[roomId]) return;


        rooms[roomId].currentTurn = data.nextTurn;


        io.to(roomId).emit(
            'sync-gift-effect',
            data
        );

    });
    // 🏠 2. XỬ LÝ TỰ TẠO PHÒNG RIÊNG (PRIVATE ROOM)
    socket.on('request-create-room', async (data) => {
        socket.username = data.name || "Chủ phòng";
        socket.userId = data.userId;
        socket.skin = data.skin || 'skin_default';
        socket.rank = 'Bùn';
        let roomId = 'ROOM_' + Math.floor(1000 + Math.random() * 9000);
        
        if (data.userId) {
            try {
                const response = await axios.get(`http://localhost:${PORT}/api/user/${data.userId}`);
                if (response.data && response.data.success !== false) {
                    socket.rank = response.data.rank || 'Bùn';
                    console.log(`✅ Đã lấy rank cho ${data.userId}: ${socket.rank}`);
                }
            } catch (err) {
                console.error(`❌ Lỗi lấy rank cho ${data.userId}:`, err.message);
            }
        }
        
        socket.join(roomId);
        socket.roomId = roomId;
        const skills = randomSkills();
        
        // 🆕 SINH BOM HẠT NHÂN CHO PHÒNG RIÊNG
        let bombIdx = Math.floor(Math.random() * 19) + 1;
        console.log(`💣 Bom hạt nhân đặt tại ô: ${bombIdx} (phòng riêng)`);
        
        rooms[roomId] = {
            players: [
                {
                    id: socket.id,
                    userId: socket.userId,
                    name: socket.username,
                    playerNumber: 1,
                    rounds: 0,
                    skillUsed: false,
                    skin: socket.skin || 'skin_default',
                    rank: socket.rank || 'Bùn', 
                    teleportCooldown: 0,        // 🆕
                    teleportMaxCooldown: 5,     // 🆕
                    teleportAvailable: true
                }
            ],
            currentTurn: null,
            spiderWebIndex: null,
            lightningIndex: null,
            lightningTriggered: false,
            status: 'waiting',
            timer: null,
            skills: skills,
            // 🆕 BOM HẠT NHÂN
            nuclearBombIndex: bombIdx,
            nuclearBombDetonated: false,
            gameEnding: false
        };

        socket.emit('room-created', { roomId: roomId });
        socket.emit('playerAssigned', { playerNumber: 1 });
        io.to(roomId).emit('update-lobby-players', rooms[roomId].players);
    });

    // 🚪 3. XỬ LÝ VÀO PHÒNG QUA ID BẠN BÈ
    socket.on('request-join-room', async (data) => {
        let roomId = data.roomId;
        socket.userId = data.userId;
        socket.skin = data.skin || 'skin_default';
        socket.username = data.name || "Khách";
        socket.rank = 'Bùn';
        
        if (data.userId) {
            try {
                const response = await axios.get(`http://localhost:${PORT}/api/user/${data.userId}`);
                if (response.data && response.data.success !== false) {
                    socket.rank = response.data.rank || 'Bùn';
                    console.log(`✅ Đã lấy rank cho ${data.userId}: ${socket.rank}`);
                }
            } catch (err) {
                console.error(`❌ Lỗi lấy rank cho ${data.userId}:`, err.message);
            }
        }
        
        if (!rooms[roomId]) {
            return socket.emit('room-error', { message: "Mã phòng không tồn tại! Vui lòng kiểm tra lại." });
        }
        if (rooms[roomId].players.length >= 2 || rooms[roomId].status === 'playing') {
            return socket.emit('room-error', { message: "Phòng này đã đầy hoặc trận đấu đã bắt đầu!" });
        }

        socket.join(roomId);
        socket.roomId = roomId;

        rooms[roomId].players.push({
            id: socket.id,
            userId: socket.userId,
            name: socket.username,
            playerNumber: 2,
            rounds: 0,
            skillUsed: false,
            skin: socket.skin || 'skin_default',
            rank: socket.rank || 'Bùn',
            teleportCooldown: 0,        // 🆕
            teleportMaxCooldown: 5,     // 🆕
            teleportAvailable: true
        });
        
        rooms[roomId].status = 'playing';
        
        // 🆕 NẾU CHƯA CÓ BOM THÌ SINH (PHÒNG RIÊNG TƯ DO CHỦ TẠO)
        if (rooms[roomId].nuclearBombIndex === undefined || rooms[roomId].nuclearBombIndex === null) {
            let bombIdx;
            do {
                bombIdx = Math.floor(Math.random() * 19) + 1;
            } while (bombIdx === rooms[roomId].spiderWebIndex);
            rooms[roomId].nuclearBombIndex = bombIdx;
            rooms[roomId].nuclearBombDetonated = false;
            console.log(`💣 Bom hạt nhân đặt tại ô: ${bombIdx} (phòng riêng)`);
        }
        
        io.to(roomId).emit('player-skins', {
            player1: rooms[roomId].players[0].skin || 'skin_default',
            player2: rooms[roomId].players[1].skin || 'skin_default'
        });

        const playersData = rooms[roomId].players.map(p => ({
            id: p.userId || p.id,
            name: p.name,
            socketId: p.id,
            playerNumber: p.playerNumber,
            skin: p.skin || 'skin_default',
            rank: p.rank || 'Bùn'
        }));

        socket.emit('room-joined', { 
            roomId: roomId,
            players: playersData
        });
        
        socket.emit('playerAssigned', { playerNumber: 2 });

        io.to(roomId).emit('update-lobby-players', rooms[roomId].players);

        // Sinh vị trí bẫy mạng nhện cho phòng riêng tư (nếu chưa có)
        if (rooms[roomId].spiderWebIndex === null || rooms[roomId].spiderWebIndex === undefined) {
            rooms[roomId].spiderWebIndex = Math.floor(Math.random() * 19) + 1;
        }
        
        // 🆕 GỬI BOM HẠT NHÂN CÙNG VỚI init-traps
        io.to(roomId).emit('init-traps', { 
            spiderWebIndex: rooms[roomId].spiderWebIndex,
            lightningIndex: rooms[roomId].lightningIndex,
            nuclearBombIndex: rooms[roomId].nuclearBombIndex,
            nuclearBombDetonated: rooms[roomId].nuclearBombDetonated || false
        });

        io.to(roomId).emit('startGame', { 
            spiderWebIndex: rooms[roomId].spiderWebIndex, 
            skills: rooms[roomId].skills,
            nuclearBombIndex: rooms[roomId].nuclearBombIndex,  // 🆕 THÊM
            nuclearBombDetonated: rooms[roomId].nuclearBombDetonated
        });
    });

    // =========================================================================
    // ĐỒNG BỘ LOGIC GAME THEO PHÒNG (ROOM CO-OP)
    // =========================================================================

    // Sự kiện tung xúc xắc phân định lượt đi đầu game
    socket.on('requestDetermineRoll', (data) => {
        if (!socket.roomId) return;
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2;
        io.to(socket.roomId).emit('determineRollResult', { player: data.player, d1, d2, sum });
    });

    // Phát lệnh kích hoạt đếm ngược khi biết ai đi trước
    socket.on('setFirstTurn', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;
        
        rooms[roomId].currentTurn = data.firstPlayer;
        startTurnCountdown(roomId, rooms[roomId].currentTurn);
    });

    // Khi có người đổ xúc xắc chính thức trong lượt
    socket.on('requestRollDice', () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const totalSteps = d1 + d2;

        // 🛡️ VALIDATE: Xúc xắc luôn từ 2-12
        if (totalSteps < 2 || totalSteps > 12) {
            console.warn(`⚠️ Xúc xắc bất thường: ${totalSteps}`);
            const newD1 = Math.floor(Math.random() * 6) + 1;
            const newD2 = Math.floor(Math.random() * 6) + 1;
            io.to(roomId).emit('diceRolledResult', { d1: newD1, d2: newD2, totalSteps: newD1 + newD2 });
            return;
        }

        io.to(roomId).emit('diceRolledResult', { d1, d2, totalSteps });
    });

    // =========================================================================
    // 🔥 ĐỒNG BỘ HIỆU ỨNG BẪY ĐẶC BIỆT THEO MÃ PHÒNG (FIX LỖI HIỂN THỊ MỘT BÊN)
    // =========================================================================


    // 🕸️ A. Đồng bộ sự kiện đạp trúng MẠNG NHỆN (CẬP NHẬT MỚI)
    socket.on('playerHitSpiderWebSync', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        // 1. Tắt bộ đếm hiện tại của phòng
        if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);

        // 2. Cập nhật lượt đi cho phòng
        rooms[roomId].currentTurn = data.nextTurn;

        // 3. Phát tín hiệu đồng bộ cho cả phòng
        // Bao gồm cả logMsg, thông tin người chơi, lượt tiếp theo và biến extraTurns
        io.to(roomId).emit('sync-spider-web-effect', {
            logMsg: data.logMsg,
            players: data.playersUpdate,
            nextTurn: data.nextTurn,
            extraTurns: data.extraTurns
        });

        // 4. Tái khởi động lại bộ đếm lượt 15 giây cho người được nhường lượt
        startTurnCountdown(roomId, data.nextTurn);
        
        console.log(`🕸️ [Phòng ${roomId}] ${socket.username} dẫm Mạng Nhện. Đối thủ được hưởng ${data.extraTurns} lượt.`);
    });

    // 🚨 B. Đồng bộ sự kiện tạo THIÊN TAI SẤM SÉT (Từ Client main.js)
    socket.on('triggerDisasterSpawn', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        rooms[roomId].lightningTriggered = true;
        rooms[roomId].lightningIndex = data.lightningIndex;

        io.to(roomId).emit('disaster-spawned', {
            lightningIndex: data.lightningIndex,
            logMsg: data.logMsg
        });
        
        console.log(`⚡ [Phòng ${roomId}] THIÊN TAI GIÁNG XUỐNG ô số ${data.lightningIndex}`);
        
        if (rooms[roomId].timer) {
            clearInterval(rooms[roomId].timer);
            startTurnCountdown(roomId, rooms[roomId].currentTurn);
        }
    });

    // ⚡ C. Đồng bộ sự kiện dẫm trúng THIÊN TAI SẤM SÉT
    socket.on('playerHitLightningSync', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        rooms[roomId].lightningIndex = null; 

        io.to(roomId).emit('sync-lightning-effect', {
            logs: data.logs,
            players: data.playersUpdate,
            cellsData: data.cellsDataUpdate
        });

        const nextTurn = rooms[roomId].currentTurn === 1 ? 2 : 1;
        rooms[roomId].currentTurn = nextTurn;
        
        io.to(roomId).emit('syncEndTurnResult', { nextTurn: nextTurn, reason: 'lightning_penalty' });
        
        startTurnCountdown(roomId, nextTurn);
        
        console.log(`⚡ [Phòng ${roomId}] Người chơi đã chịu phạt. Chuyển lượt sang P${nextTurn}`);
    });

    // ===== 🛡️ VALIDATE DỮ LIỆU TRONG syncActionData =====
    socket.on("syncActionData", (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        let isValid = true;
        
        // Kiểm tra players
        if (data.players) {
            for (let i = 1; i <= 2; i++) {
                if (data.players[i] && !validatePlayerData(data.players[i])) {
                    isValid = false;
                    console.warn(`⚠️ Player ${i} dữ liệu không hợp lệ!`);
                    break;
                }
            }
        } else {
            isValid = false;
        }
        
        // Kiểm tra cellsData
        if (data.cellsData && !validateCellsData(data.cellsData)) {
            isValid = false;
            console.warn(`⚠️ cellsData không hợp lệ!`);
        }
        
        // Kiểm tra currentTurn
        if (data.currentTurn && data.currentTurn !== 1 && data.currentTurn !== 2) {
            isValid = false;
            console.warn(`⚠️ currentTurn không hợp lệ: ${data.currentTurn}`);
        }
        
        if (isValid) {
            rooms[roomId].playersState = JSON.parse(JSON.stringify(data.players));
            rooms[roomId].cellsState = JSON.parse(JSON.stringify(data.cellsData));
            rooms[roomId].currentTurn = data.currentTurn;
            socket.to(roomId).emit("updateActionDataResult", {
                players: data.players,
                cellsData: data.cellsData
            });
        } else {
            console.log(`🛡️ Từ chối dữ liệu hack từ ${socket.id}`);
            
            const validData = {
                players: rooms[roomId].playersState || rooms[roomId].players,
                cellsData: rooms[roomId].cellsState || rooms[roomId].cellsData,
                currentTurn: rooms[roomId].currentTurn || 1
            };
            
            socket.emit("updateActionDataResult", validData);
            console.log(`🚨 PHÁT HIỆN HACK từ ${socket.id}`);
        }
    });
    socket.on('syncExtraTurn', (data) => {

        const roomId = socket.roomId;

        if (!roomId || !rooms[roomId]) return;

        // Cập nhật lượt của phòng
        rooms[roomId].currentTurn = data.currentTurn;

        // Gửi cho cả 2 máy
        io.to(roomId).emit('extraTurnResult', {
            currentTurn: data.currentTurn,
            extraTurns: data.extraTurns,
            logMsg: data.logMsg
        });

        // Reset timer cho người vừa được thêm lượt
        startTurnCountdown(roomId, data.currentTurn);

    });
    // Người chơi chủ động bấm "Kết thúc lượt" thông thường
    socket.on('syncEndTurn', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        rooms[roomId].currentTurn = data.nextTurn;
        io.to(roomId).emit('syncEndTurnResult', { nextTurn: data.nextTurn });
        
        // Khởi động đếm ngược 15s cho người tiếp theo của phòng đó
        startTurnCountdown(roomId, data.nextTurn);
    });
    socket.on("useSkill", (data) => {
        console.log("==== DÙNG KỸ NĂNG ====");
        console.log(data);
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];

        const me = data.player;
        const playerData = room.players.find(
            p => p.playerNumber === me
        );

        // 🔥 Kiểm tra skill đã dùng chưa
        if(playerData.skillUsed){
            console.log("❌ Skill đã được dùng");
            return;
        }

        // ===== 🛡️ VALIDATE DỮ LIỆU TRƯỚC KHI XỬ LÝ =====
        let isValid = true;
        for (let i = 1; i <= 2; i++) {
            if (data.players[i] && !validatePlayerData(data.players[i])) {
                isValid = false;
                console.warn(`⚠️ Player ${i} dữ liệu không hợp lệ khi dùng skill!`);
                break;
            }
        }
        
        if (!isValid) {
            console.log(`🛡️ Từ chối dùng skill do dữ liệu không hợp lệ!`);
            return;
        }

        // 🔥 Đánh dấu skill đã dùng ở server
        playerData.skillUsed = true;
        playerData.skill = null;
        data.players[me].skill = null;
        const enemy = me === 1 ? 2 : 1;

        // 🔥 XỬ LÝ LOGIC TỪNG LOẠI SKILL
        switch(data.skill){

            case "cuopTien": {

                if(data.players[enemy].money <= 0){
                    break;
                }

                const stolen = Math.floor(data.players[enemy].money * 0.15);

                data.players[enemy].money -= stolen;
                data.players[me].money += stolen;

                break;
            }

            case "doiViTri": {
                // Đổi vị trí được xử lý ở client, server chỉ cần broadcast lại
                break;
            }

            case "dieuHuong": {
                // Điều hướng được xử lý ở client, server chỉ cần broadcast lại
                break;
            }

            case "doiVanMay": {
                // Đổi vận may được xử lý ở client, server chỉ cần broadcast lại
                break;
            }

            case "thor": {
                const TOTAL_CELLS = data.cellsData.length;
                let thunderCells = [];

                while(thunderCells.length < 5){

                    let x = Math.floor(Math.random() * TOTAL_CELLS);

                    if(!thunderCells.includes(x))
                        thunderCells.push(x);
                }

                for(let i=1;i<=2;i++){

                    if(thunderCells.includes(data.players[i].pos)){

                        let lost = Math.floor(data.players[i].money * 0.25);

                        data.players[i].money -= lost;
                    }
                }

                io.to(roomId).emit("thorEffect",{

                    cells: thunderCells,

                    players:data.players,

                    cellsData:data.cellsData

                });

                break;
            }
        }

        // ===== 🛡️ KIỂM TRA LẠI TIỀN SAU KHI XỬ LÝ =====
        for (let i = 1; i <= 2; i++) {
            if (data.players[i] && data.players[i].money < 0) {
                data.players[i].money = 0;
                console.warn(`⚠️ Reset tiền P${i} về 0 do bị âm`);
            }
            if (data.players[i] && data.players[i].money > MAX_MONEY) {
                data.players[i].money = MAX_MONEY;
                console.warn(`⚠️ Reset tiền P${i} về ${MAX_MONEY} do quá lớn`);
            }
        }

        // 🔥 BROADCAST KẾT QUẢ
        io.to(roomId).emit("useSkillResult",{
            players:data.players,
            cellsData:data.cellsData,
            currentTurn:data.currentTurn,
            player: me,
            skillUsed: true
        });

    });
    

    // Thêm biến toàn cục ở đầu file server.js
    const processedGameOver = new Set();

// Handler gameOver
    socket.on("gameOver", async (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        // ===== 🛡️ CHỐNG XỬ LÝ GAMEOVER 2 LẦN =====
        const gameKey = `${roomId}_${data.winnerId}`;
        if (processedGameOver.has(gameKey)) {
            console.log(`⚠️ GameOver ${gameKey} đã xử lý rồi, bỏ qua!`);
            return;
        }
        processedGameOver.add(gameKey);
        
        // Xóa key sau 10s để phòng trường hợp phòng mới
        setTimeout(() => {
            processedGameOver.delete(gameKey);
        }, 10000);

        if (finishedRooms.has(roomId)) {
            console.log("⚠️ GAMEOVER đã xử lý rồi, bỏ qua:", roomId);
            return;
        }
        rooms[roomId].gameEnding = true;

        finishedRooms.add(roomId);
        console.log("🔥 SERVER NHẬN GAMEOVER lần đầu:", data);

        if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);

        const winner = rooms[roomId].players.find(p => p.playerNumber === data.winnerId);
        const loser = rooms[roomId].players.find(p => p.playerNumber !== data.winnerId);
        
        if (!winner || !loser) {
            console.log(`⚠️ Không tìm thấy người chơi hợp lệ!`);
            return;
        }

        const totalRounds = Math.max(winner.rounds || 0, loser.rounds || 0);
        
        console.log(`📊 Kết quả trận đấu: ${winner.name} thắng, ${loser.name} thua, ${totalRounds} vòng`);
        
        // =====================================================
        // 🔥 NẾU THẮNG DO ĐỐI THỦ RỜI TRẬN / MẤT KẾT NỐI
        // THÌ DATABASE ĐÃ ĐƯỢC UPDATE Ở disconnect hoặc leave-room
        // KHÔNG UPDATE LẦN NỮA
        // =====================================================
        if (data.reason === "disconnect" || data.reason === "leave") {
            let winnerPoints = 25;
            let loserPoints = -25;
            let winnerExp = 150;
            let loserExp = 0;
            let winnerCoins = 50;
            let loserCoins = 0;

            const matchResult = {
                winnerId: data.winnerId,
                winnerName: winner.name,
                reason: data.reason,
                totalRounds: totalRounds,
                reward: {
                    winner: {
                        exp: winnerExp,
                        coins: winnerCoins,
                        points: winnerPoints
                    },
                    loser: {
                        exp: loserExp,
                        coins: loserCoins,
                        points: loserPoints
                    }
                }
            };

            // ✅ GỬI CHO CẢ PHÒNG
            io.to(roomId).emit("matchResult", matchResult);
            console.log(`📤 Đã gửi matchResult cho phòng ${roomId} (disconnect/leave)`);

            console.log("✅ GameOver bỏ qua cập nhật Database vì đã xử lý ở disconnect/leave-room");
            return;
        }
        
        // ===== 🏆 LẤY DỮ LIỆU MỚI NHẤT CỦA 2 NGƯỜI =====
        let winnerReward;
        let loserReward;

        try {
            // 🚀 LẤY DATABASE CỦA WINNER + LOSER CÙNG LÚC
            const [winnerUserResponse, loserUserResponse] = await Promise.all([
                axios.get(`http://localhost:${PORT}/api/user/${winner.userId}`),
                axios.get(`http://localhost:${PORT}/api/user/${loser.userId}`)
            ]);

            const winnerCurrentData = winnerUserResponse.data;
            const loserCurrentData = loserUserResponse.data;

            // ============================================
            // 🏆 TÍNH THƯỞNG WINNER
            // ============================================
            if (winnerCurrentData && winnerCurrentData.success !== false) {

                winnerReward = calculateRewards(true, winnerCurrentData);

                console.log(
                    `🏆 ${winner.name}: ` +
                    `+${winnerReward.expGained} EXP, ` +
                    `+${winnerReward.coinsGained} Coin, ` +
                    `+${winnerReward.pointsGained} RP`
                );

            } else {

                console.log(
                    `⚠️ Không tìm thấy user ${winner.userId}`
                );

                winnerReward = {
                    expGained: 150,
                    coinsGained: 50,
                    pointsGained: 25
                };
            }


            // ============================================
            // 💀 TÍNH THƯỞNG LOSER
            // ============================================
            if (loserCurrentData && loserCurrentData.success !== false) {

                loserReward = calculateRewards(false, loserCurrentData);

                console.log(
                    `💀 ${loser.name}: ` +
                    `+${loserReward.expGained} EXP, ` +
                    `+${loserReward.coinsGained} Coin, ` +
                    `${loserReward.pointsGained} RP`
                );

            } else {

                console.log(
                    `⚠️ Không tìm thấy user ${loser.userId}`
                );

                loserReward = {
                    expGained: 75,
                    coinsGained: 25,
                    pointsGained: -20
                };
            }


            // =====================================================
            // 🚀 QUAN TRỌNG:
            // GỬI KẾT QUẢ NGAY SAU KHI TÍNH ĐƯỢC REWARD
            // KHÔNG CHỜ DATABASE UPDATE
            // =====================================================

            const matchResult = {
                winnerId: data.winnerId,
                winnerName: winner.name,
                reason: data.reason,
                totalRounds: totalRounds,

                reward: {
                    winner: {
                        exp: winnerReward.expGained,
                        coins: winnerReward.coinsGained,
                        points: winnerReward.pointsGained
                    },

                    loser: {
                        exp: loserReward.expGained,
                        coins: loserReward.coinsGained,
                        points: loserReward.pointsGained
                    }
                }
            };

            // 🔥 CẢ 2 NGƯỜI NHẬN NGAY
            io.to(roomId).emit("matchResult", matchResult);

            console.log(
                `📤 Đã gửi matchResult NGAY cho cả phòng ${roomId}`
            );


            // =====================================================
            // 💾 UPDATE DATABASE
            // Popup đã được gửi trước nên không ảnh hưởng tốc độ popup
            // =====================================================

            try {

                console.log("💾 Bắt đầu cập nhật DATABASE...");

                const [winnerUpdate, loserUpdate] = await Promise.all([

                    axios.post(`${process.env.API_URL}/api/update-result`, {
                        id: winnerCurrentData.id || winner.userId,
                        level: winnerReward.level,
                        exp: winnerReward.exp,
                        points: winnerReward.points,
                        rank: winnerReward.rank,
                        coins: winnerReward.coin
                    }),

                    axios.post(`${process.env.API_URL}/api/update-result`, {
                        id: loserCurrentData.id || loser.userId,
                        level: loserReward.level,
                        exp: loserReward.exp,
                        points: loserReward.points,
                        rank: loserReward.rank,
                        coins: loserReward.coin
                    })

                ]);

                console.log("✅ WINNER DATABASE:", winnerUpdate.data);
                console.log("✅ LOSER DATABASE:", loserUpdate.data);

                console.log("💾 DATABASE ĐÃ CẬP NHẬT XONG");

                // 🔥 BÁO CHO 2 CLIENT BIẾT DATABASE ĐÃ LƯU
                io.to(roomId).emit("matchResultSaved");

            } catch (err) {

                console.error(
                    "❌ DATABASE UPDATE FAILED:",
                    err.response?.data || err.message
                );

                // Báo cho client biết update thất bại
                io.to(roomId).emit("matchResultSaveFailed");
            }


        } catch (err) {

            console.error(
                `❌ Lỗi khi lấy dữ liệu người chơi:`,
                err.message
            );


            // =====================================================
            // FALLBACK
            // =====================================================

            winnerReward = {
                expGained: 150,
                coinsGained: 50,
                pointsGained: 25
            };

            loserReward = {
                expGained: 75,
                coinsGained: 25,
                pointsGained: -20
            };


            const matchResult = {
                winnerId: data.winnerId,
                winnerName: winner.name,
                reason: data.reason,
                totalRounds: totalRounds,

                reward: {
                    winner: {
                        exp: winnerReward.expGained,
                        coins: winnerReward.coinsGained,
                        points: winnerReward.pointsGained
                    },

                    loser: {
                        exp: loserReward.expGained,
                        coins: loserReward.coinsGained,
                        points: loserReward.pointsGained
                    }
                }
            };

            // Vẫn cho người chơi thấy kết quả
            io.to(roomId).emit("matchResult", matchResult);

            console.log(
                `📤 Đã gửi fallback matchResult cho phòng ${roomId}`
            );
        }

        // ================================================================
        // 🗑️ DỌN DẸP PHÒNG
        // ================================================================
        if (rooms[roomId]) {
            if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
            delete rooms[roomId];
        }
        console.log(`🗑️ Đã xóa phòng ${roomId}`);
    });
    // =========================================================================
    // 📊 PHẦN THÊM MỚI: HỨNG DỮ LIỆU CẬP NHẬT CHỈ SỐ (EXP, RANK, COINS) TỪ CLIENT
    // =========================================================================
    socket.on('updatePlayerStats', async (data) => {
        console.log(`📊 Nhận dữ liệu cập nhật từ ${socket.username || socket.id}:`, data);
        
        // ===== 🛡️ VALIDATE DỮ LIỆU =====
        if (data.points && !validatePoints(data.points)) {
            console.warn(`⚠️ Points không hợp lệ: ${data.points} (tối đa ${MAX_POINTS_PER_MATCH})`);
            data.points = Math.max(-25, Math.min(data.points, MAX_POINTS_PER_MATCH));
        }
        
        if (data.coins && !validateCoins(data.coins)) {
            console.warn(`⚠️ Coins không hợp lệ: ${data.coins} (tối đa ${MAX_COINS_PER_MATCH})`);
            data.coins = Math.max(0, Math.min(data.coins, MAX_COINS_PER_MATCH));
        }
        
        if (data.exp && !validateExp(data.exp)) {
            console.warn(`⚠️ EXP không hợp lệ: ${data.exp} (tối đa ${MAX_EXP_PER_MATCH})`);
            data.exp = Math.max(0, Math.min(data.exp, MAX_EXP_PER_MATCH));
        }
        
        if (data.level && (data.level < 1 || data.level > 20)) {
            console.warn(`⚠️ Level không hợp lệ: ${data.level}`);
            data.level = Math.max(1, Math.min(data.level, 20));
        }
        
        try {
            await axios.post(
                `${process.env.API_URL}/api/update-result`,
                {
                    id: socket.userId,
                    level: data.level || 1,
                    exp: data.exp || 0,
                    points: data.points || 0,
                    rank: data.rank || "Bùn",
                    coins: data.coins || 0
                }
            );
            console.log(`✅ Đã lưu thành công chỉ số mới cho User ID: ${socket.userId}`);
        } catch (err) {
            console.log(`❌ Lỗi khi gọi API lưu chỉ số cho User ID ${socket.userId}:`, err.message);
        }
    });

    

    socket.on("match-finished", async(data)=>{

        console.log("🏆 NHẬN KẾT QUẢ:",data);


    });
    // ===== XỬ LÝ KHI NGƯỜI CHƠI MẤT KẾT NỐI =====
    socket.on('disconnect', () => {
        console.log(`❌ Thiết bị ngắt kết nối: ${socket.id}`);
        
        // ===== XỬ LÝ RỜI PHÒNG CHAT =====
        if (socket.currentChatRoom) {
            const roomName = socket.currentChatRoom;
            const userName = socket.chatUserName || 'Ai đó';
            
            io.to(roomName).emit('chat-message', {
                type: 'system',
                content: `🔹 ${userName} đã mất kết nối.`,
                time: new Date().toLocaleTimeString()
            });
            
            socket.leave(roomName);
            socket.currentChatRoom = null;
            console.log(`💬 ${userName} đã rời phòng chat do disconnect`);
        }
        
        // Xóa khỏi hàng đợi tìm trận nhanh nếu đang đợi
        quickMatchQueue = quickMatchQueue.filter(s => s.id !== socket.id);

        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) {
            console.log(`⚠️ Socket ${socket.id} không ở trong phòng nào`);
            return;
        }
        
        // 🔥 KIỂM TRA: NẾU PHÒNG ĐÃ KẾT THÚC, KHÔNG XỬ LÝ GÌ
        if (finishedRooms.has(roomId)) {
            console.log(`⚠️ Phòng ${roomId} đã kết thúc, bỏ qua xử lý disconnect`);
            if (rooms[roomId]) {
                if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
                delete rooms[roomId];
            }
            return;
        }
        
        console.log(`📢 Người chơi ${socket.id} đã rời khỏi phòng ${roomId}`);
        
        const disconnectedPlayer = rooms[roomId].players.find(p => p.id === socket.id);
        if (!disconnectedPlayer) {
            console.log(`⚠️ Không tìm thấy người chơi ${socket.id} trong phòng ${roomId}`);
            if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
            delete rooms[roomId];
            return;
        }
        
        const opponent = rooms[roomId].players.find(p => p.id !== socket.id);
        
        if (opponent) {
            console.log(`🏆 ${opponent.name} được xử thắng vì ${disconnectedPlayer.name} đã mất kết nối!`);
            
            // ================================================================
            // 🆕 XỬ LÝ TRỪ ĐIỂM CHO NGƯỜI RỜI TRẬN (disconnectedPlayer)
            // ================================================================
            const disconnectedUserId = disconnectedPlayer.userId;
            const opponentUserId = opponent.userId;
            
            // ✅ ĐÚNG: Thêm /api vào trước URL
            const API_BASE = `http://localhost:${PORT}/api`;
            
            // ================================================================
            // 1. TRỪ ĐIỂM CHO NGƯỜI RỜI TRẬN
            // ================================================================
            axios.get(`${API_BASE}/user/${disconnectedUserId}`)
                .then(async (response) => {
                    const user = response.data;
                    if (user && user.success !== false) {
                        console.log(`📊 Người rời: ${user.username}, Points cũ: ${user.points}`);
                        
                        // TRỪ ĐIỂM RANK CHO NGƯỜI RỜI TRẬN (KHÔNG NHẬN EXP/COIN)
                        const newPoints = Math.max(0, (user.points || 0) - 25);
                        const newRank = getRankFromPoints(newPoints);
                        
                        // ✅ SỬA: DÙNG user.id (UUID) THAY VÌ disconnectedUserId (username)
                        await axios.post(`${API_BASE}/update-result`, {
                            id: user.id,  // ← UUID THẬT
                            level: user.level || 1,
                            exp: user.exp || 0, // ⭐ KHÔNG CỘNG EXP
                            points: newPoints,
                            rank: newRank,
                            coins: user.coin || 0 // ⭐ KHÔNG CỘNG COIN
                        });
                        console.log(`✅ Đã trừ 25 RP cho ${disconnectedPlayer.name} (rời trận - mất kết nối)`);
                    }
                })
                .catch(err => {
                    console.log("STATUS:", err.response?.status);
                    console.log("URL:", err.config?.url);
                    console.log("DATA:", err.response?.data);
                });
            
            // ================================================================
            // 2. THƯỞNG CHO ĐỐI THỦ (opponent)
            // ================================================================
            axios.get(`${API_BASE}/user/${opponentUserId}`)
                .then(async (response) => {
                    const user = response.data;
                    if (user && user.success !== false) {
                        console.log(`📊 Đối thủ: ${user.username}, Points cũ: ${user.points}`);
                        
                        // Người thắng nhận thưởng bình thường
                        const newExp = (user.exp || 0) + 150;
                        const newPoints = (user.points || 0) + 25;
                        const newCoins = (user.coin || 0) + 50;
                        const newLevel = Math.floor(newExp / 1000) + 1;
                        const newRank = getRankFromPoints(newPoints);
                        
                        // ✅ SỬA: DÙNG user.id (UUID) THAY VÌ opponentUserId (username)
                        await axios.post(`${API_BASE}/update-result`, {
                            id: user.id,  // ← UUID THẬT
                            level: newLevel,
                            exp: newExp,
                            points: newPoints,
                            rank: newRank,
                            coins: newCoins
                        });
                        console.log(`✅ Đã thưởng cho ${opponent.name}: +150 EXP, +25 RP, +50 Coin`);
                    }
                })
                .catch(err => {
                    console.log("STATUS:", err.response?.status);
                    console.log("URL:", err.config?.url);
                    console.log("DATA:", err.response?.data);
                });
            
            // ================================================================
            // 3. GỬI SỰ KIỆN CHO ĐỐI THỦ
            // ================================================================
            const opponentSocket = io.sockets.sockets.get(opponent.id);
            if (opponentSocket) {
                // Gửi gameOver cho đối thủ (để cập nhật điểm)
                opponentSocket.emit('gameOver', {
                    winnerId: opponent.playerNumber,
                    reason: 'disconnect',
                    message: `${disconnectedPlayer.name} đã mất kết nối. Bạn được xử thắng!`,
                    isLoser: false
                });
                console.log(`📤 Đã gửi gameOver cho ${opponent.name}`);
                
                // Gửi sự kiện đối thủ rời trận (để client xử lý UI)
                opponentSocket.emit('opponent-left', {
                    message: `${disconnectedPlayer.name} đã mất kết nối. Bạn được xử thắng!`
                });
                console.log(`📤 Đã gửi opponent-left cho ${opponent.name}`);
            }
        } else {
            console.log(`⚠️ Không tìm thấy đối thủ trong phòng ${roomId}`);
        }
        
        finishedRooms.add(roomId);
        
        if (rooms[roomId].timer) {
            clearInterval(rooms[roomId].timer);
            console.log(`⏰ Đã hủy timer của phòng ${roomId}`);
        }
        
        delete rooms[roomId];
        console.log(`🗑️ Đã xóa phòng ${roomId}`);
    });
    // ===== XỬ LÝ KHI NGƯỜI CHƠI CHỦ ĐỘNG RỜI PHÒNG =====
    // ===== XỬ LÝ KHI NGƯỜI CHƠI CHỦ ĐỘNG RỜI PHÒNG =====
    socket.on('leave-room', (data) => {
        console.log(`🚪 Người chơi ${socket.id} chủ động rời phòng`);
        
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) {
            console.log(`⚠️ Không tìm thấy phòng ${roomId}`);
            return;
        }
        
        if (finishedRooms.has(roomId)) {
            console.log(`⚠️ Phòng ${roomId} đã kết thúc, bỏ qua xử lý leave-room`);
            if (rooms[roomId]) {
                if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
                delete rooms[roomId];
            }
            return;
        }
        
        const leaver = rooms[roomId].players.find(p => p.id === socket.id);
        if (!leaver) {
            console.log(`⚠️ Không tìm thấy người chơi ${socket.id} trong phòng`);
            return;
        }
        
        const opponent = rooms[roomId].players.find(p => p.id !== socket.id);
        
        if (opponent) {
            console.log(`🏆 ${opponent.name} được xử thắng vì ${leaver.name} đã rời trận!`);
            
            // ================================================================
            // 🆕 XỬ LÝ TRỪ ĐIỂM CHO NGƯỜI RỜI TRẬN (leaver)
            // ================================================================
            const leaverUserId = leaver.userId;
            const opponentUserId = opponent.userId;
            
            // ✅ ĐÚNG: Thêm /api vào trước URL
            const API_BASE = `http://localhost:${PORT}/api`;
            
            // ================================================================
            // 1. TRỪ ĐIỂM CHO NGƯỜI RỜI TRẬN
            // ================================================================
            axios.get(`${API_BASE}/user/${leaverUserId}`)
                .then(async (response) => {
                    const user = response.data;
                    if (user && user.success !== false) {
                        console.log(`📊 Người rời: ${user.username}, Points cũ: ${user.points}`);
                        
                        // TRỪ ĐIỂM RANK CHO NGƯỜI RỜI TRẬN (KHÔNG NHẬN EXP/COIN)
                        const newPoints = Math.max(0, (user.points || 0) - 25);
                        const newRank = getRankFromPoints(newPoints);
                        
                        // ✅ SỬA: DÙNG user.id (UUID) THAY VÌ leaverUserId (username)
                        await axios.post(`${API_BASE}/update-result`, {
                            id: user.id,  // ← UUID THẬT
                            level: user.level || 1,
                            exp: user.exp || 0, // ⭐ KHÔNG CỘNG EXP
                            points: newPoints,
                            rank: newRank,
                            coins: user.coin || 0 // ⭐ KHÔNG CỘNG COIN
                        });
                        console.log(`✅ Đã trừ 25 RP cho ${leaver.name} (rời trận chủ động)`);
                    }
                })
                .catch(err => {
                    console.error(`❌ Lỗi trừ điểm cho ${leaver.name}:`, err.message);
                });
            
            // ================================================================
            // 2. THƯỞNG CHO ĐỐI THỦ (opponent)
            // ================================================================
            axios.get(`${API_BASE}/user/${opponentUserId}`)
                .then(async (response) => {
                    const user = response.data;
                    if (user && user.success !== false) {
                        console.log(`📊 Đối thủ: ${user.username}, Points cũ: ${user.points}`);
                        
                        // Người thắng nhận thưởng bình thường
                        const newExp = (user.exp || 0) + 150;
                        const newPoints = (user.points || 0) + 25;
                        const newCoins = (user.coin || 0) + 50;
                        const newLevel = Math.floor(newExp / 1000) + 1;
                        const newRank = getRankFromPoints(newPoints);
                        
                        // ✅ SỬA: DÙNG user.id (UUID) THAY VÌ opponentUserId (username)
                        await axios.post(`${API_BASE}/update-result`, {
                            id: user.id,  // ← UUID THẬT
                            level: newLevel,
                            exp: newExp,
                            points: newPoints,
                            rank: newRank,
                            coins: newCoins
                        });
                        console.log(`✅ Đã thưởng cho ${opponent.name}: +150 EXP, +25 RP, +50 Coin`);
                    }
                })
                .catch(err => {
                    console.error(`❌ Lỗi thưởng cho ${opponent.name}:`, err.message);
                });
            
            // ================================================================
            // 3. GỬI SỰ KIỆN CHO ĐỐI THỦ
            // ================================================================
            const opponentSocket = io.sockets.sockets.get(opponent.id);
            if (opponentSocket) {
                // Gửi gameOver cho đối thủ (để cập nhật điểm)
                opponentSocket.emit('gameOver', {
                    winnerId: opponent.playerNumber,
                    reason: 'leave',
                    message: `${leaver.name} đã rời trận. Bạn được xử thắng!`,
                    isLoser: false
                });
                console.log(`📤 Đã gửi gameOver cho ${opponent.name}`);
                
                // Gửi sự kiện đối thủ rời trận (để client xử lý UI)
                opponentSocket.emit('opponent-left', {
                    message: `${leaver.name} đã rời trận. Bạn được xử thắng!`
                });
                console.log(`📤 Đã gửi opponent-left cho ${opponent.name}`);
            }
        }
        
        finishedRooms.add(roomId);
        
        if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);
        delete rooms[roomId];
        console.log(`🗑️ Đã xóa phòng ${roomId}`);
    });
});
server.listen(PORT, () => {
    console.log(`Server đa phòng đang chạy online tại cổng: ${PORT}`);
});