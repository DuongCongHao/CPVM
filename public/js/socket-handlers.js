// ===== LẮNG NGHE ĐỒNG BỘ TỪ SERVER =====
if (typeof socket !== 'undefined' && socket) {

    // =========================================================================
    // 🔥 HỆ THỐNG QUẢN LÝ PHÒNG (ROOM CHƠI TỰ DO)
    // =========================================================================
    // ===== NHẬN RANK TỪ SERVER =====
    socket.on('userRankResponse', (data) => {
        console.log('📥 Nhận rank từ server:', data);
        
        if (data.success) {
            // Lấy user hiện tại từ localStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (currentUser && currentUser.username === data.username) {
                // Cập nhật rank
                currentUser.rank = data.rank || 'Bùn';
                currentUser.level = data.level || 1;
                currentUser.coin = data.coin || 0;
                currentUser.exp = data.exp || 0;
                
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Cập nhật giao diện
                if (typeof updateRankDisplay === 'function') {
                    updateRankDisplay();
                }
                
                console.log(`✅ Đã cập nhật rank: ${data.rank}`);
            }
        } else {
            console.error('❌ Lỗi lấy rank:', data.error);
        }
    });
    // SERVER TRẢ VỀ: Khi tạo phòng riêng tư thành công
    socket.off('room-created').on('room-created', (data) => {
        const roomId = data.roomId;
        if (typeof displayRoomId === 'function') displayRoomId(roomId);
        if (typeof addLog === 'function') addLog(`🏠 <strong>Phòng riêng tư [${roomId}] đã được khởi tạo!</strong>`);
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = `Mã phòng của bạn: <strong style="color:#f59e0b; font-size:18px;">${roomId}</strong><br>Hãy gửi mã này cho bạn bè để cùng tham gia. Đang chờ người chơi thứ 2...`;
        }
    });
    // ============================================
    // SOCKET HANDLERS - PHẦN CUỐI FILE
    // ============================================

    // ===== NHẬN DANH SÁCH NGƯỜI CHƠI =====
    socket.on('update-lobby-players', (players) => {
        window.players = {};
        players.forEach(p => {
            window.players[p.playerNumber] = p;
        });
        
        // Cập nhật rank cho đối thủ
        if (typeof updateRankDisplay === 'function') {
            updateRankDisplay();
        }
    });

    // ===== NHẬN THÔNG TIN PHÒNG =====
    socket.on('room-joined', (data) => {
        if (data.players) {
            window.players = {};
            data.players.forEach(p => {
                window.players[p.playerNumber] = p;
            });
            
            // Cập nhật rank
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
            }
        }
    });

    // ===== NHẬN RANK TỪ SERVER =====
    socket.on('userRankResponse', (data) => {
        console.log('📥 Nhận rank từ server:', data);
        
        if (!data.success) {
            console.error('❌ Lỗi lấy rank:', data.error);
            return;
        }
        
        let needUpdate = false;
        
        // Cập nhật rank cho mình (so sánh với username)
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username === data.username) {
            currentUser.rank = data.rank || 'Bùn';
            currentUser.level = data.level || 1;
            currentUser.coin = data.coin || 0;
            currentUser.exp = data.exp || 0;
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            console.log(`✅ Đã cập nhật rank của bạn: ${data.rank}`);
            needUpdate = true;
        }
        
        // ===== CẬP NHẬT RANK CHO ĐỐI THỦ =====
        // 🔥 QUAN TRỌNG: So sánh với id hoặc userId, KHÔNG so sánh với name
        if (window.players) {
            for (let i = 1; i <= 2; i++) {
                const player = window.players[i];
                if (!player) continue;
                
                // Nếu player này có id hoặc userId khớp với username từ server
                // HOẶC nếu player này KHÔNG phải là mình
                if (player.id === data.username || player.userId === data.username) {
                    if (player.rank !== data.rank) {
                        player.rank = data.rank || 'Bùn';
                        console.log(`✅ Đã cập nhật rank cho đối thủ ${player.name}: ${data.rank}`);
                        needUpdate = true;
                    }
                    break;
                }
            }
        }
        
        // ===== NẾU VẪN CHƯA TÌM THẤY, THỬ TÌM BẰNG CÁCH LOẠI TRỪ =====
        if (!needUpdate && window.players) {
            // Tìm player KHÔNG phải là mình
            for (let i = 1; i <= 2; i++) {
                const player = window.players[i];
                if (!player) continue;
                
                // Nếu player này KHÔNG phải là mình
                if (currentUser && player.id !== currentUser.id && player.userId !== currentUser.id) {
                    if (player.rank !== data.rank) {
                        player.rank = data.rank || 'Bùn';
                        console.log(`✅ Đã cập nhật rank cho đối thủ ${player.name}: ${data.rank}`);
                        needUpdate = true;
                    }
                    break;
                }
            }
        }
        
        // Cập nhật giao diện
        if (needUpdate && typeof updateRankDisplay === 'function') {
            setTimeout(() => {
                updateRankDisplay();
            }, 200);
        }
    });

    // SERVER TRẢ VỀ: Khi kết nối vào phòng thành công (Quick Match hoặc Join by ID)
    // SERVER TRẢ VỀ: Khi kết nối vào phòng thành công (Quick Match hoặc Join by ID)
    socket.off('room-joined').on('room-joined', (data) => {
        // 🔥 RESET CỜ GAME ENDING KHI VÀO PHÒNG MỚI
        window.gameEnding = false;
        console.log("✅ gameEnding đã được reset =", window.gameEnding);
        
        const roomId = data.roomId;
        if (typeof displayRoomId === 'function') displayRoomId(roomId);
        if (typeof addLog === 'function') addLog(`🚪 Bạn đã tham gia vào phòng [${roomId}].`);
        if (typeof showLeaveButton === 'function') {
            showLeaveButton();
        }
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = "Đã vào phòng thành công! Đang chờ đối thủ sẵn sàng...";
        }
        
        if (data.players && Array.isArray(data.players) && data.players.length === 2) {
            console.log("📥 Nhận dữ liệu players từ server:", data.players);
            
            // Lưu thông tin players
            window.players = {};
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            let opponentId = null;
            
            data.players.forEach((p, index) => {
                const playerNum = index + 1;
                window.players[playerNum] = {
                    id: p.id || p.userId,           // ✅ LƯU ID TỪ SERVER
                    userId: p.userId || p.id,       // ✅ LƯU USER ID
                    name: p.name || `Player ${playerNum}`,
                    money: 1000,
                    pos: 0,
                    rounds: 0,
                    socketId: p.socketId || p.id,
                    skillUsed: false,
                    skin: p.skin || 'skin_default',
                    rank: p.rank || 'Bùn'
                };
                
                // 🔥 LƯU ID CỦA ĐỐI THỦ
                if (currentUser) {
                    if (p.id !== currentUser.id && p.userId !== currentUser.id) {
                        opponentId = p.id || p.userId;
                        console.log(`👤 Đối thủ ID: ${opponentId}, Name: ${p.name}`);
                    }
                }
            });
            
            // ===== GỬI YÊU CẦU LẤY RANK CHO MÌNH =====
            if (currentUser && currentUser.username) {
                socket.emit('getUserRank', { 
                    username: currentUser.username 
                });
                console.log('📤 Đã gửi yêu cầu lấy rank cho mình:', currentUser.username);
            }
            
            // ===== GỬI YÊU CẦU LẤY RANK CHO ĐỐI THỦ =====
            // 🔥 GỬI BẰNG ID HOẶC USERNAME
            if (opponentId) {
                socket.emit('getUserRank', { 
                    username: opponentId 
                });
                console.log('📤 Đã gửi yêu cầu lấy rank cho đối thủ với ID:', opponentId);
            }
            
            // ===== CẬP NHẬT UI (KHÔNG GỌI determineTurn) =====
            if (typeof updateUI === 'function') {
                updateUI();
            }
            
            if (typeof checkMyTurnControl === 'function') {
                checkMyTurnControl();
            }
            
            if (typeof addLog === 'function') {
                addLog(`🎮 TRẬN ĐẤU BẮT ĐẦU!`);
                if (window.players[1]) addLog(`👤 ${window.players[1].name} VS ${window.players[2]?.name || '???'}`);
                if (window.myPlayerNumber) addLog(`👤 Bạn là Player ${window.myPlayerNumber}`);
            }
            
            // ===== ÁP DỤNG SKIN =====
            if (typeof updatePlayerSkin === 'function') {
                setTimeout(function() {
                    updatePlayerSkin();
                    console.log("✅ Đã áp dụng skin vào bàn cờ");
                }, 300);
            }
            
            console.log("✅ Game đã sẵn sàng!");
            console.log("👥 Players:", window.players);
            console.log("🎯 Current turn:", window.currentTurn);
            console.log("👤 My player number:", window.myPlayerNumber);
        }
        
        if (typeof checkAndPlaySkinEffects === 'function') {
            setTimeout(function() {
                checkAndPlaySkinEffects();
                console.log("✅ Đã kiểm tra skin VIP");
            }, 500);
        }
    });
    // SERVER TRẢ VỀ: Khi có lỗi xảy ra (Sai ID phòng, phòng đầy, đối thủ out,...)
    socket.off('room-error').on('room-error', (data) => {
        alert(data.message);
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = `Thất bại: ${data.message}`;
        }
        // Mở khóa lại các nút ở màn hình sảnh
        if (typeof enableLobbyButtons === 'function') enableLobbyButtons();
    });

    // =========================================================================
    // HOẠT ĐỘNG ĐỒNG BỘ TRONG TRẬN ĐẤU
    // =========================================================================

    socket.off('update-lobby-players').on('update-lobby-players', (playerList) => {
        if (!playerList) return;
        if (playerList[0]) {
            players[1].name = playerList[0].name;
            const p1Display = document.getElementById('p1-name-display');
            if (p1Display) p1Display.innerText = playerList[0].name;
        }
        if (playerList[1]) {
            players[2].name = playerList[1].name;
            const p2Display = document.getElementById('p2-name-display');
            if (p2Display) p2Display.innerText = playerList[1].name;
        }
    });

    socket.off('playerAssigned').on('playerAssigned', (data) => {
        myPlayerNumber = data.playerNumber;
    });

    socket.off('startGame').on('startGame', (data) => {
        console.log("🎮 Nhận startGame từ server:", data);
        
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';

        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.style.display = 'none';

        spiderWebIndex = data.spiderWebIndex;
        lightningIndex = data.lightningIndex || null;

        // ===== ĐỒNG BỘ KỸ NĂNG =====
        gameStarted = true;
        if(data.skills){
            players[1].skill = skillCards[data.skills[1]];
            players[2].skill = skillCards[data.skills[2]];

            console.log("P1 SKILL:", players[1].skill);
            console.log("P2 SKILL:", players[2].skill);

            document.getElementById("p1-skill").innerHTML =
                players[1].skill 
                ? "🎴 " + players[1].skill.name
                : "🎴 Chưa có thẻ";

            document.getElementById("p2-skill").innerHTML =
                players[2].skill
                ? "🎴 " + players[2].skill.name
                : "🎴 Chưa có thẻ";
        }
        
        // ===== KHỞI TẠO BÀN CỜ =====
        initializeBoard();
        
        // ===== LẤY RANK TỪ SERVER =====
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username) {
            socket.emit('getUserRank', { 
                username: currentUser.username 
            });
            console.log('📤 Đã gửi yêu cầu lấy rank cho:', currentUser.username);
        }
        
        // ===== LẤY RANK CHO ĐỐI THỦ =====
        if (window.players) {
            for (let i = 1; i <= 2; i++) {
                if (window.players[i] && window.players[i].name !== currentUser?.username) {
                    socket.emit('getUserRank', { 
                        username: window.players[i].name 
                    });
                    console.log('📤 Đã gửi yêu cầu lấy rank cho đối thủ:', window.players[i].name);
                    break;
                }
            }
        }
        
        // ===== ĐỢI 1 GIÂY ĐỂ RANK VỀ RỒI MỚI PHÂN ĐỊNH LƯỢT =====
        setTimeout(() => {
            // Cập nhật rank lần cuối
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
            }
            
            // Xác định lượt đi
            if (typeof determineTurn === 'function') {
                determineTurn();
            }
            
            console.log("✅ Đã hoàn tất khởi tạo game!");
        }, 1000);
    });
    // ===== THIÊN TAI XUẤT HIỆN =====
    socket.off('lightningSummoned').on('lightningSummoned', (data) => {
        lightningIndex = data.lightningIndex;
        
        if (typeof addLog === 'function') {
            addLog(`⚡ <strong style="color: #eab308;">THIÊN TAI BẤT NGỜ!</strong> Sấm Sét đã giáng xuống ô số [${lightningIndex}]!`);
        }
        
        if (typeof playSFX === 'function' && typeof audioGame !== 'undefined') {
            playSFX(audioGame.lightning);
        }

        // Tái tạo lại bàn cờ để nạp thuộc tính ô Thiên Tai đồng bộ từ server
        if (typeof initializeBoard === 'function') initializeBoard();
        if (typeof updateUI === 'function') updateUI();
    });

    socket.off('lightningCleared').on('lightningCleared', (data) => {
        lightningIndex = null;
        if (data && data.playersUpdate) players = data.playersUpdate;
        if (data && data.cellsDataUpdate) cellsData = data.cellsDataUpdate;

        if (data && data.logs && Array.isArray(data.logs)) {
            data.logs.forEach(msg => {
                if (typeof addLog === 'function') addLog(msg);
            });
        }
        
        if (typeof playSFX === 'function' && typeof audioGame !== 'undefined') {
            playSFX(audioGame.lightning); 
            setTimeout(() => { playSFX(audioGame.loseMoney); }, 500);
        }
        
        // Vẽ lại bàn cờ sạch
        if (typeof initializeBoard === 'function') initializeBoard();
        if (typeof updateUI === 'function') updateUI();
        
        isMoving = false;
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });

    // ===== TIMER CẬP NHẬT =====
    socket.off('timerUpdate').on('timerUpdate', (data) => {
        const turnTxt = document.getElementById('turn-txt');
        if (turnTxt) {
            if (data.playerNum === myPlayerNumber) {
                turnTxt.innerHTML = `LƯỢT CỦA BẠN (<span style="color: #f43f5e; font-weight:900;">${data.timeLeft}s</span>)`;
            } else {
                const enemyName = (typeof players !== 'undefined' && players[data.playerNum]) ? players[data.playerNum].name.toUpperCase() : "ĐỐI THỦ";
                turnTxt.innerHTML = `LƯỢT CỦA ${enemyName} (${data.timeLeft}s)`;
            }
        }
    });

    // ===== CẬP NHẬT DỮ LIỆU HÀNH ĐỘNG =====
    socket.off('updateActionDataResult').on('updateActionDataResult', (data) => {
        if (data.players) {
            for (let pId in data.players) {
                if (!players[pId]) continue;
                players[pId].money = data.players[pId].money;
                players[pId].pos = data.players[pId].pos;
                players[pId].rounds = data.players[pId].rounds;
                players[pId].skipNextTurn = data.players[pId].skipNextTurn;
                players[pId].skill = data.players[pId].skill;
                players[pId].skillUsed = data.players[pId].skillUsed;
            }
        }
        
        if (data.cellsData) {
            data.cellsData.forEach((remoteCell, idx) => {
                if (!cellsData[idx]) return;
                cellsData[idx].owner = remoteCell.owner;
                cellsData[idx].level = remoteCell.level;
                cellsData[idx].price = remoteCell.price;
                cellsData[idx].hasGift = remoteCell.hasGift;
                cellsData[idx].isUpgraded = remoteCell.isUpgraded; 
                
                const priceEl = document.getElementById(`price-${idx}`);
                if (priceEl) {
                    if (idx === spiderWebIndex) priceEl.innerText = "KHOÁ LƯỢT";
                    else if (idx === lightningIndex) priceEl.innerText = "⚡ SẤM SÉT";
                    else priceEl.innerText = `${remoteCell.price}$`; 
                }
                
                const cellEl = document.getElementById(`cell-${idx}`);
                if (cellEl) {
                    const giftBox = cellEl.querySelector('.gift-box');
                    if (giftBox) {
                        if (idx === 0 || idx === spiderWebIndex || idx === lightningIndex) {
                            giftBox.style.display = 'none';
                        } else {
                            giftBox.style.display = remoteCell.hasGift ? 'block' : 'none';
                        }
                    }

                    // Bảo vệ giao diện của ô Thiên Tai và Mạng nhện không bị ghi đè
                    if (idx !== 0 && idx !== spiderWebIndex && idx !== lightningIndex) {
                        cellEl.style.background = ""; 
                        if (remoteCell.isUpgraded) cellEl.classList.add('upgraded-cyber');
                        else cellEl.classList.remove('upgraded-cyber');

                        if (remoteCell.owner === 1) {
                            cellEl.style.background = "linear-gradient(135deg, #7f1d1d, #ef4444)"; 
                            cellEl.style.color = "#ffffff";
                        } else if (remoteCell.owner === 2) {
                            cellEl.style.background = "linear-gradient(135deg, #1e3a8a, #3b82f6)"; 
                            cellEl.style.color = "#ffffff";
                        } else {
                            cellEl.style.background = ""; 
                            cellEl.style.color = "";
                        }
                    }
                }
            });
        }
        
        // Kiểm tra điều kiện kết thúc 7 vòng của Game
        if (players[1] && players[2] && (players[1].rounds >= 7 || players[2].rounds >= 7)) {
            let p1Value = typeof calculateTotalLandValue === 'function' ? calculateTotalLandValue(1) : 0;
            let p2Value = typeof calculateTotalLandValue === 'function' ? calculateTotalLandValue(2) : 0;
            if (p1Value > p2Value) { if (typeof gameOver === 'function') return gameOver(1, "value_compare"); }
            else if (p2Value > p1Value) { if (typeof gameOver === 'function') return gameOver(2, "value_compare"); }
            else {
                if (players[1].money >= players[2].money) { if (typeof gameOver === 'function') return gameOver(1, "value_compare"); }
                else { if (typeof gameOver === 'function') return gameOver(2, "value_compare"); }
            }
        }
        
        if (document.getElementById("notify-panel").style.display !== "flex") {
            isMoving = false;
        }
        if (typeof updateUI === 'function') updateUI();
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });

    // ===== ĐỒNG BỘ KẾT THÚC LƯỢT =====
    socket.off('syncEndTurnResult').on('syncEndTurnResult', (data) => {
        currentTurn = data.nextTurn;
        isMoving = false;
        
        // Reset skillUsed cho player mới khi chuyển lượt
        if (currentTurn && players[currentTurn]) {
            players[currentTurn].skillUsed = false;
        }
        
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });
    // ===== HỘP QUÀ: ĐỒNG BỘ ĐỐI THỦ ĐƯỢC THÊM 2 LƯỢT =====
    socket.off("giftExtraTurnResult").on("giftExtraTurnResult", (data) => {

        currentTurn = data.nextTurn;
        window.extraTurns = data.extraTurns;

        if (data.logMsg) {
            addLog(data.logMsg);
        }

        isMoving = false;

        if (typeof updateUI === "function")
            updateUI();

        if (typeof checkMyTurnControl === "function")
            checkMyTurnControl();

    });
    

    // ===============================
    // NHẬN KẾT QUẢ DÙNG KỸ NĂNG
    // ===============================
    socket.off("useSkillResult").on("useSkillResult", (data) => {
        players = data.players;
        cellsData = data.cellsData;
        
        if (data.player === myPlayerNumber) {
            players[myPlayerNumber].skill = null;
            players[myPlayerNumber].skillUsed = true;
        }
        
        document.getElementById("use-skill-btn").disabled = true;
        updateUI();
        updateSkillUI();
    });

    // ===== HIỆU ỨNG THẦN THOR =====
    socket.off("thorEffect").on("thorEffect",(data)=>{
        players = data.players;
        cellsData = data.cellsData;

        updateUI();

        data.cells.forEach((cell, index)=>{
            setTimeout(()=>{
                showThorStrike(cell);
                playSFX(audioGame.lightning);
            }, index*250);
        });
    });

    // ===== KẾT QUẢ KẾT THÚC TRÒ CHƠI =====
    socket.off("gameOverResult").on("gameOverResult", (data) => {
        gameOver(data.winnerId, data.reason);
    });
}
