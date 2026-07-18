const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Cấu hình CORS để nhận mọi kết nối từ các thiết bị khác nhau
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public'));

// =========================================================================
// 🌐 HỆ THỐNG LƯU TRỮ ĐA PHÒNG QUỐC TẾ (MULTI-ROOM)
// =========================================================================
const rooms = {}; // Cấu trúc: { 'ROOM_ID': { players: [...], currentTurn: 1, timer: null, spiderWebIndex, lightningIndex, lightningTriggered, status } }
let quickMatchQueue = []; // Hàng đợi ghép trận nhanh
const TURN_TIME_LIMIT = 15;
// ===== DANH SÁCH THẺ KỸ NĂNG =====
const SKILLS = [
    "doiVanMay",
    "dieuHuong",
    "thor",
    "cuopTien",
    "doiViTri"
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

    // 🌐 1. XỬ LÝ GHÉP TRẬN NGẪU NHIÊN (QUICK MATCH)
    socket.on('request-quick-match', (data) => {
        socket.username = data.name || "Vô danh";
        
        // Lọc bỏ các socket đã đứt kết nối hoặc chính socket này để tránh tự ghép với mình
        quickMatchQueue = quickMatchQueue.filter(s => s.connected && s.id !== socket.id);
        
        // Nếu có người đang xếp hàng đợi hợp lệ
        if (quickMatchQueue.length > 0) {
            let opponentSocket = quickMatchQueue.shift(); // Lấy người đầu tiên ra khỏi hàng đợi
            
            // Sinh mã phòng ngẫu nhiên cho trận đấu nhanh
            let roomId = 'QM_' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            socket.join(roomId);
            opponentSocket.join(roomId);
            
            socket.roomId = roomId;
            opponentSocket.roomId = roomId;

            // Khởi tạo trạng thái game cho phòng này
            const skills = randomSkills();
            rooms[roomId] = {
                players: [
                    { id: opponentSocket.id, name: opponentSocket.username, playerNumber: 1, rounds: 0, skillUsed: false },
                    { id: socket.id, name: socket.username, playerNumber: 2, rounds: 0, skillUsed: false }
                ],
                currentTurn: null,
                spiderWebIndex: Math.floor(Math.random() * 19) + 1,
                lightningIndex: null,
                lightningTriggered: false,
                status: 'playing',
                timer: null,
                skills: skills
            };

            // Báo thông tin phòng về cho client
            opponentSocket.emit('room-joined', { roomId: roomId });
            socket.emit('room-joined', { roomId: roomId });

            opponentSocket.emit('playerAssigned', { playerNumber: 1 });
            socket.emit('playerAssigned', { playerNumber: 2 });

            io.to(roomId).emit('update-lobby-players', rooms[roomId].players);
            
            // Gửi vị trí mạng nhện đồng bộ đầu trận thông qua sự kiện init-traps
            io.to(roomId).emit('init-traps', { 
                spiderWebIndex: rooms[roomId].spiderWebIndex,
                lightningIndex: rooms[roomId].lightningIndex 
            });
            
            // Ép cả phòng vào màn hình chơi game
            io.to(roomId).emit('startGame', { spiderWebIndex: rooms[roomId].spiderWebIndex, skills: rooms[roomId].skills });
            console.log(`🎮 Trận đấu ngẫu nhiên bắt đầu tại phòng: ${roomId} (${opponentSocket.username} VS ${socket.username})`);
        } else {
            // Chưa có ai thì cho vào hàng đợi nằm chờ
            quickMatchQueue.push(socket);
            console.log(`👥 ${socket.username} (${socket.id}) đang nằm chờ trong hàng đợi ghép trận...`);
        }
    });

    // 🏠 2. XỬ LÝ TỰ TẠO PHÒNG RIÊNG (PRIVATE ROOM)
    socket.on('request-create-room', (data) => {
        socket.username = data.name || "Chủ phòng";
        let roomId = 'ROOM_' + Math.floor(1000 + Math.random() * 9000); // Mã 4 chữ số ngẫu nhiên
        
        socket.join(roomId);
        socket.roomId = roomId;
        const skills = randomSkills();
        rooms[roomId] = {
            players: [
                { id: socket.id, name: socket.username, playerNumber: 1, rounds: 0, skillUsed: false }
            ],
            currentTurn: null,
            spiderWebIndex: null,
            lightningIndex: null,
            lightningTriggered: false,
            status: 'waiting',
            timer: null,
            skills: skills
        };

        socket.emit('room-created', { roomId: roomId });
        socket.emit('playerAssigned', { playerNumber: 1 });
        io.to(roomId).emit('update-lobby-players', rooms[roomId].players);
    });

    // 🚪 3. XỬ LÝ VÀO PHÒNG QUA ID BẠN BÈ
    socket.on('request-join-room', (data) => {
        let roomId = data.roomId;
        socket.username = data.name || "Khách";

        if (!rooms[roomId]) {
            return socket.emit('room-error', { message: "Mã phòng không tồn tại! Vui lòng kiểm tra lại." });
        }
        if (rooms[roomId].players.length >= 2 || rooms[roomId].status === 'playing') {
            return socket.emit('room-error', { message: "Phòng này đã đầy hoặc trận đấu đã bắt đầu!" });
        }

        socket.join(roomId);
        socket.roomId = roomId;

        rooms[roomId].players.push({ id: socket.id, name: socket.username, playerNumber: 2, rounds: 0, skillUsed: false });
        rooms[roomId].status = 'playing';

        socket.emit('room-joined', { roomId: roomId });
        socket.emit('playerAssigned', { playerNumber: 2 });

        io.to(roomId).emit('update-lobby-players', rooms[roomId].players);

        // Sinh vị trí bẫy mạng nhện cho phòng riêng tư
        rooms[roomId].spiderWebIndex = Math.floor(Math.random() * 19) + 1;
        
        // Gửi thông tin bẫy đầu trận
        io.to(roomId).emit('init-traps', { 
            spiderWebIndex: rooms[roomId].spiderWebIndex,
            lightningIndex: rooms[roomId].lightningIndex 
        });

        // Kích hoạt trận đấu cho cả phòng riêng tư
        io.to(roomId).emit('startGame', { spiderWebIndex: rooms[roomId].spiderWebIndex, skills: rooms[roomId].skills });
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

        // Hủy đếm ngược của phòng ngay lập tức khi người chơi thao tác đổ xúc xắc
        if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const totalSteps = d1 + d2;

        io.to(roomId).emit('diceRolledResult', { d1, d2, totalSteps });
    });

    // =========================================================================
    // 🔥 ĐỒNG BỘ HIỆU ỨNG BẪY ĐẶC BIỆT THEO MÃ PHÒNG (FIX LỖI HIỂN THỊ MỘT BÊN)
    // =========================================================================

    // 🕸️ FIX CHÍNH: THÊM HANDLER skipTurnRequest (Mạng Nhện)
    socket.on('skipTurnRequest', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];
        const currentPlayer = data.currentTurn;
        const nextTurn = currentPlayer === 1 ? 2 : 1;

        // 1. Tắt bộ đếm hiện tại
        if (room.timer) clearInterval(room.timer);

        // 2. Cập nhật lượt cho phòng
        room.currentTurn = nextTurn;

        // 3. Phát tín hiệu skipTurnResult về cho tất cả client trong phòng
        io.to(roomId).emit('skipTurnResult', {
            nextTurn: nextTurn,
            previousTurn: currentPlayer,
            players: room.players
        });

        console.log(`🕸️ [Phòng ${roomId}] P${currentPlayer} dẫm Mạng Nhện. Lượt chuyển sang P${nextTurn}`);

        // 4. Khởi động lại bộ đếm cho người tiếp theo
        startTurnCountdown(roomId, nextTurn);
    });

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
            players: data.playersUpdate, // Nếu client gửi kèm danh sách player
            nextTurn: data.nextTurn,
            extraTurns: data.extraTurns // Đồng bộ số lượt ưu tiên xuống Client
        });

        // 4. Tái khởi động lại bộ đếm lượt 15 giây cho người được nhường lượt
        // Điều này đảm bảo đối thủ có 15s để đổ xúc xắc lượt ưu tiên
        startTurnCountdown(roomId, data.nextTurn);
        
        console.log(`🕸️ [Phòng ${roomId}] ${socket.username} dẫm Mạng Nhện. Đối thủ được hưởng ${data.extraTurns} lượt.`);
    });

    // 🚨 B. Đồng bộ sự kiện tạo THIÊN TAI SẤM SÉT (Từ Client main.js)
    socket.on('triggerDisasterSpawn', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        rooms[roomId].lightningTriggered = true;
        rooms[roomId].lightningIndex = data.lightningIndex;

        // Phát thông báo thiên tai đến cả 2 thiết bị
        io.to(roomId).emit('disaster-spawned', {
            lightningIndex: data.lightningIndex,
            logMsg: data.logMsg
        });
        
        console.log(`⚡ [Phòng ${roomId}] THIÊN TAI GIÁNG XUỐNG ô số ${data.lightningIndex}`);
        
        // KHÔNG thay đổi lượt khi thiên tai xuất hiện, 
        // nhưng có thể reset nhẹ bộ đếm để người chơi kịp đọc thông báo
        if (rooms[roomId].timer) {
            clearInterval(rooms[roomId].timer);
            startTurnCountdown(roomId, rooms[roomId].currentTurn);
        }
    });

    // ⚡ C. Đồng bộ sự kiện dẫm trúng THIÊN TAI SẤM SÉT
    socket.on('playerHitLightningSync', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        // Xóa trạng thái thiên tai khỏi server
        rooms[roomId].lightningIndex = null; 

        // Dội thông tin bị hủy đất và trừ 50% tiền về cả 2 máy
        io.to(roomId).emit('sync-lightning-effect', {
            logs: data.logs,
            players: data.playersUpdate,
            cellsData: data.cellsDataUpdate
        });

        // QUAN TRỌNG: Sau khi dẫm trúng thiên tai, thường sẽ kết thúc lượt của người chơi đó
        // Chúng ta cập nhật lại lượt và reset đếm ngược để người chơi kế tiếp có đủ 15s
        const nextTurn = rooms[roomId].currentTurn === 1 ? 2 : 1;
        rooms[roomId].currentTurn = nextTurn;
        
        // Thông báo cho client rằng lượt đã kết thúc sau khi chịu phạt
        io.to(roomId).emit('syncEndTurnResult', { nextTurn: nextTurn, reason: 'lightning_penalty' });
        
        // Khởi động lại đếm ngược cho người tiếp theo
        startTurnCountdown(roomId, nextTurn);
        
        console.log(`⚡ [Phòng ${roomId}] Người chơi đã chịu phạt. Chuyển lượt sang P${nextTurn}`);
    });

    // Nhận dữ liệu cập nhật hành động mua đất đai, tiền bạc thông thường
    socket.on('syncActionData', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const room = rooms[roomId];

        if (data && data.players) {
            const playersArray = Array.isArray(data.players) 
                ? data.players 
                : Object.values(data.players);

            // Lưu số vòng của người chơi vào phòng để đồng bộ bộ nhớ
            playersArray.forEach(pData => {
                if (!pData) return;
                let matchedPlayer = room.players.find(p => p.playerNumber === pData.playerNumber);
                if (matchedPlayer) matchedPlayer.rounds = pData.rounds;
            });
        }
        // Phát dữ liệu đồng bộ mua đất/nâng cấp combo cho đối thủ chung phòng nhận diện
        socket.to(roomId).emit('updateActionDataResult', data);
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

        if(playerData.skillUsed){
            console.log("❌ Skill đã được dùng");
            return;
        }

        playerData.skillUsed = true;
        playerData.skill = null;
        data.players[me].skill = null;
        const enemy = me === 1 ? 2 : 1;

        switch(data.skill){

            case "Cướp tiền": {

                if(data.players[enemy].money <= 0){
                    break;
                }

                const stolen = Math.floor(data.players[enemy].money * 0.15);

                data.players[enemy].money -= stolen;
                data.players[me].money += stolen;

                break;
            }

            case "doiViTri":
                break;

            case "dieuHuong":
                break;

            case "doiVanMay":
                break;

            case "thor":
                break;
        }

        io.to(roomId).emit("useSkillResult",{
            players:data.players,
            cellsData:data.cellsData,
            currentTurn:data.currentTurn,
            player:data.player,
            skillUser: true,
            player:me
        });

    });
    // Xử lý khi người chơi bất ngờ mất kết nối hoặc thoát ứng dụng
    socket.on('disconnect', () => {
        console.log(`❌ Thiết bị ngắt kết nối: ${socket.id}`);
        
        // Xóa khỏi hàng đợi tìm trận nhanh nếu đang đợi mà out
        quickMatchQueue = quickMatchQueue.filter(s => s.id !== socket.id);

        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            // Hủy bộ đếm thời gian của phòng để tránh rò rỉ bộ nhớ (Memory Leak)
            if (rooms[roomId].timer) clearInterval(rooms[roomId].timer);

            // Thông báo sập phòng cho người còn lại và hủy phòng
            socket.to(roomId).emit('room-error', { message: "Đối thủ của bạn đã mất kết nối hoặc rời trận đấu!" });
            delete rooms[roomId];
            console.log(`🗑️ Phòng [${roomId}] đã được giải phóng bộ nhớ RAM.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server đa phòng đang chạy online tại cổng: ${PORT}`);
});
