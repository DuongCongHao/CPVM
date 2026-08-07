// ===== LẮNG NGHE ĐỒNG BỘ TỪ SERVER =====
if (typeof socket !== 'undefined' && socket) {
    // ===== ĐẦU FILE socket-handlers.js =====
    if (typeof window.myPlayerNumber === 'undefined') {
        window.myPlayerNumber = null;
    }
    // =========================================================================
    // 🔥 HỆ THỐNG QUẢN LÝ PHÒNG (ROOM CHƠI TỰ DO)
    // =========================================================================
    // SERVER TRẢ VỀ: Khi tạo phòng riêng tư thành công
    socket.off('room-created').on('room-created', (data) => {
        const roomId = data.roomId;
        if (typeof displayRoomId === 'function') displayRoomId(roomId);
        if (typeof addLog === 'function') addLog(`🏠 <strong>Phòng riêng tư [${roomId}] đã được khởi tạo!</strong>`);
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = `
                Mã phòng của bạn: <strong style="color:#f59e0b; font-size:18px;">${roomId}</strong>
                <br>Hãy gửi mã này cho bạn bè để cùng tham gia. Đang chờ người chơi thứ 2...
                <br><br>
                <button id="cancel-matchmaking-btn" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 6px 16px;
                    font-size: 13px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 8px;
                    transition: all 0.2s;
                ">❌ Hủy tạo phòng</button>
            `;
            
            // Gán sự kiện hủy
            const cancelBtn = document.getElementById('cancel-matchmaking-btn');
            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    cancelMatchmaking('create');
                };
            }
        }
    });
    // ============================================
    // SOCKET HANDLERS - PHẦN CUỐI FILE
    // ============================================
    // ===== ĐỒNG BỘ HẮC ÁM TRUY SÁT =====
    socket.on('syncDarkChase', (data) => {
        console.log('🌑 Nhận đồng bộ Hắc Ám Truy Sát:', data);
        
        window.darkChaseActive = true;
        window.darkChaseOwner = data.playerNum;
        window.darkChaseTarget = data.targetId;
        window.darkChasePos = data.darkPos;
        window.darkChaseTargetPos = data.targetPos;
        window.darkChaseTurns = data.turns || 3;
        window.darkChaseStarted = false;
        
        // 🆕 HIỂN THỊ 🌑 TRÊN MÁY ĐỐI THỦ
        renderDarkChaser(data.darkPos, data.playerNum);
        
        // 🆕 HIỆU ỨNG UI ĐẸP CHO ĐỐI THỦ
        if (typeof showSkinEffectText === 'function') {
            showSkinEffectText(
                '🌑 HẮC ÁM TRUY SÁT',
                `⚠️ ${data.targetName} ĐANG BỊ TRUY ĐUỔI! ⚠️`,
                '#ef4444',
                '#dc2626',
                '🚨'
            );
        }
        
        // 🆕 LOG CHO ĐỐI THỦ
        addLog(`🌑 ${data.playerName} đã triệu hồi BẢN THỂ HẮC ÁM!`);
        addLog(`📍 Bản thể xuất hiện tại ô ${data.darkPos}, phía sau ${data.targetName} 5 ô!`);
        addLog(`⏳ Có 3 lượt để truy đuổi!`);
        addLog(`🚨 ${data.targetName} hãy cẩn thận! Bạn đang bị truy đuổi!`);
        
        // 🆕 CẢNH BÁO CHO ĐỐI THỦ
        if (myPlayerNumber === data.targetId) {
            // Đây là máy của người bị truy đuổi
            const turnTxt = document.getElementById('turn-txt');
            if (turnTxt) {
                turnTxt.style.background = '#ef4444';
                turnTxt.style.animation = 'chaserWarning 0.3s infinite alternate';
                turnTxt.innerHTML = `🚨 CẢNH BÁO! ${data.playerName} ĐANG TRUY ĐUỔI BẠN!`;
            }
            
            // Phát âm thanh cảnh báo
            if (audioGame && audioGame.danger) {
                playSFX(audioGame.danger);
            }
        }
        
        updateUI();
    });

    // ===== ĐỒNG BỘ CẬP NHẬT VỊ TRÍ =====
    socket.on('syncDarkChaseUpdate', (data) => {
        console.log('🌑 Nhận cập nhật Hắc Ám:', data);
        
        // 🆕 NẾU CHƯA ACTIVE NHƯNG NHẬN ĐƯỢC UPDATE, KÍCH HOẠT LẠI
        if (!window.darkChaseActive) {
            console.log('⚠️ darkChaseActive is false, kích hoạt lại từ update!');
            if (data.playerNum && data.targetId) {
                window.darkChaseActive = true;
                window.darkChaseOwner = data.playerNum;
                window.darkChaseTarget = data.targetId;
                window.darkChaseTurns = data.turns || 3;
            } else {
                return;
            }
        }
        
        window.darkChasePos = data.darkPos;
        window.darkChaseTargetPos = data.targetPos;
        window.darkChaseTurns = data.turns;
        
        // 🆕 CẬP NHẬT ICON TRÊN MÁY ĐỐI THỦ
        renderDarkChaser(data.darkPos, data.playerNum);
        
        // 📝 LOG CHO CẢ 2 MÁY
        const ownerName = players[data.playerNum]?.name || 'Người chơi';
        const targetName = players[data.targetId]?.name || 'Đối thủ';
        
        const distance = Math.abs(data.darkPos - data.targetPos);
        const minDist = Math.min(distance, TOTAL_CELLS - distance);
        addLog(`🌑 ${ownerName} đang truy đuổi! Khoảng cách: ${minDist} ô (còn ${data.turns} lượt)`);
        
        // 🆕 CẢNH BÁO KHI ĐẾN GẦN
        if (myPlayerNumber === data.targetId && minDist <= 2) {
            const turnTxt = document.getElementById('turn-txt');
            if (turnTxt) {
                turnTxt.style.background = '#ef4444';
                turnTxt.style.animation = 'chaserWarning 0.3s infinite alternate';
                turnTxt.innerHTML = `🚨 CẢNH BÁO! HẮC ÁM CÁCH BẠN ${minDist} Ô!`;
            }
            
            if (audioGame && audioGame.danger) {
                playSFX(audioGame.danger);
            }
        }
        
        if (data.turns <= 0) {
            addLog(`⏰ Hết 3 lượt! Bản thể hắc ám tan biến. ${targetName} an toàn!`);
            removeDarkChaser();
            window.darkChaseActive = false;
            
            // Reset cảnh báo
            const turnTxt = document.getElementById('turn-txt');
            if (turnTxt) {
                turnTxt.style.animation = '';
                turnTxt.style.background = myPlayerNumber === 1 ? '#ef4444' : '#3b82f6';
            }
        }
        
        updateUI();
    });

    // ===== ĐỒNG BỘ KHI BẮT ĐƯỢC =====
    socket.on('syncDarkChaseCatch', (data) => {
        console.log('🌑 Nhận đồng bộ bắt được:', data);
        
        // Cập nhật dữ liệu
        if (data.players) {
            for (let i = 1; i <= 2; i++) {
                if (data.players[i]) {
                    players[i].money = data.players[i].money;
                }
            }
        }
        if (data.cellsData) {
            cellsData = data.cellsData;
        }
        
        // 📝 LOG CHO CẢ 2 MÁY
        addLog(`💀 BẮT ĐƯỢC! ${data.targetName} đã bị bắt!`);
        addLog(`💰 ${data.targetName} mất ${data.penalty}$!`);
        if (data.stolenCell !== -1) {
            addLog(`🏠 ${data.targetName} mất ô đất ${data.stolenCell} cho ${data.ownerName}!`);
            initializeBoard();
        }
        
        // 🆕 RESET CẢNH BÁO
        const turnTxt = document.getElementById('turn-txt');
        if (turnTxt) {
            turnTxt.style.animation = '';
            turnTxt.style.background = myPlayerNumber === 1 ? '#ef4444' : '#3b82f6';
        }
        
        removeDarkChaser();
        updateUI();
    });

    // ===== ĐỒNG BỘ KẾT THÚC (HẾT GIỜ) =====
    socket.on('syncDarkChaseEnd', (data) => {
        console.log('🌑 Nhận đồng bộ kết thúc:', data);
        
        const targetName = players[data.targetId]?.name || 'Đối thủ';
        addLog(`⏰ Hết 3 lượt! Bản thể hắc ám tan biến. ${targetName} an toàn!`);
        
        // Reset cảnh báo
        const turnTxt = document.getElementById('turn-txt');
        if (turnTxt) {
            turnTxt.style.animation = '';
            turnTxt.style.background = myPlayerNumber === 1 ? '#ef4444' : '#3b82f6';
        }
        
        removeDarkChaser();
        updateUI();
    });
    // ===== ĐỒNG BỘ DỊCH CHUYỂN =====
    socket.on('syncTeleport', (data) => {
        console.log('🌀 Nhận đồng bộ dịch chuyển:', data);
        
        const playerId = data.playerId;
        if (players[playerId]) {
            players[playerId].pos = data.targetPos;
            players[playerId].teleportCooldown = data.cooldown;
            players[playerId].teleportAvailable = data.available;
            
            addLog(`🌀 ${players[playerId].name} đã dịch chuyển đến ô ${data.targetPos}`);
            
            // ================================================================
            // 🎵 PHÁT ÂM THANH TELEPORT CHO CẢ 2 MÁY
            // ================================================================
            if (audioGame && audioGame.teleport) {
                audioGame.teleport.currentTime = 0;
                audioGame.teleport.volume = 0.8;
                audioGame.teleport.play().catch(() => {});
            }
            
            updateUI();
            updateTeleportUI();
        }
    });
    // ===== NHẬN THÔNG TIN PHÒNG =====
    socket.on('room-joined', (data) => {
        if (matchmakingTimer) {
            clearInterval(matchmakingTimer);
            matchmakingTimer = null;
            matchmakingSeconds = 0;
        }
        if (data.players) {
            window.players = {};
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            data.players.forEach(p => {
                const playerNum = p.playerNumber;
                window.players[playerNum] = {
                    id: p.id || p.userId,
                    userId: p.userId || p.id,
                    name: p.name,
                    money: 1000,
                    pos: 0,
                    rounds: 0,
                    socketId: p.socketId || p.id,
                    skillUsed: false,
                    skin: p.skin || 'skin_default',
                    rank: p.rank || 'Bùn'   // ← LẤY RANK TỪ SERVER
                };
                
                console.log(`👤 Player ${playerNum}: ${p.name}, Rank: ${p.rank || 'Bùn'}`);
            });
            
            // ================================================================
            // 🆕 KHỞI TẠO TELEPORT CHO TỪNG PLAYER
            // ================================================================
            for (let i = 1; i <= 2; i++) {
                if (window.players[i]) {
                    window.players[i].teleportCooldown = 0;
                    window.players[i].teleportMaxCooldown = 5;
                    window.players[i].teleportAvailable = true;
                }
            }
            if (typeof updateTeleportUI === 'function') {
                updateTeleportUI();
            }
            
            // Cập nhật rank
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
            }

            // ================================================================
            // 🆕 XÓA NÚT HỦY TÌM TRẬN KHI ĐÃ VÀO PHÒNG
            // ================================================================
            const cancelBtn = document.getElementById('cancel-matchmaking-btn');
            if (cancelBtn) cancelBtn.remove();

            // Cập nhật trạng thái lobby
            const lobbyStatus = document.getElementById('lobby-status');
            if (lobbyStatus) {
                lobbyStatus.innerHTML = '✅ Đã vào phòng! Đang chờ bắt đầu trận đấu...';
            }
        }
    });

    // SERVER TRẢ VỀ: Khi kết nối vào phòng thành công (Quick Match hoặc Join by ID)
    socket.off('room-joined').on('room-joined', (data) => {
        // 🔥 RESET CỜ GAME ENDING KHI VÀO PHÒNG MỚI
        window.gameEnding = false;
        console.log("✅ gameEnding đã được reset =", window.gameEnding);
        
        const roomId = data.roomId;
        if (typeof displayRoomId === 'function') displayRoomId(roomId);
        if (typeof addLog === 'function') addLog(`🚪 Bạn đã tham gia vào phòng [${roomId}].`);
        if (typeof showLeaveButton === 'function') {
            showSettingsButton();
        }
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = "Đã vào phòng thành công! Đang chờ đối thủ sẵn sàng...";
        }
        
        if (data.players && Array.isArray(data.players) && data.players.length === 2) {
            console.log("📥 Nhận dữ liệu players từ server:", data.players);
            
            window.players = {};
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            
            // 🔥 LOG ĐỂ DEBUG
            console.log("📊 currentUser:", currentUser);
            
            data.players.forEach((p, index) => {
                const playerNum = index + 1;
                
                window.players[playerNum] = {
                    id: p.id || p.userId,
                    userId: p.userId || p.id,
                    name: p.name || `Player ${playerNum}`,
                    money: 1000,
                    pos: 0,
                    rounds: 0,
                    socketId: p.socketId || p.id,
                    skillUsed: false,
                    skin: p.skin || 'skin_default',
                    rank: p.rank || 'Bùn'
                };
                
                console.log(`👤 Player ${playerNum}: id=${p.id}, userId=${p.userId}, name=${p.name}, rank=${p.rank || 'Bùn'}`);
            });
            
            // ===== XÁC ĐỊNH PLAYER NUMBER CỦA MÌNH =====
            if (currentUser) {
                let found = false;
                data.players.forEach((p, index) => {
                    // 🔥 SO SÁNH VỚI CẢ id VÀ userId
                    if (p.id === currentUser.id || p.id === currentUser.username || 
                        p.userId === currentUser.id || p.userId === currentUser.username) {
                        window.myPlayerNumber = index + 1;
                        console.log(`✅ Bạn là Player ${window.myPlayerNumber} (${p.name})`);
                        found = true;
                    }
                });
                
                // 🔥 NẾU KHÔNG TÌM THẤY, THỬ SO SÁNH BẰNG TÊN
                if (!found) {
                    data.players.forEach((p, index) => {
                        if (p.name === currentUser.display_name || p.name === currentUser.username) {
                            window.myPlayerNumber = index + 1;
                            console.log(`✅ Bạn là Player ${window.myPlayerNumber} (bằng tên: ${p.name})`);
                            found = true;
                        }
                    });
                }
                
                // 🔥 NẾU VẪN KHÔNG TÌM THẤY, MẶC ĐỊNH LÀ PLAYER 1
                if (!found) {
                    window.myPlayerNumber = 1;
                    console.warn(`⚠️ Không tìm thấy player của bạn, mặc định là Player 1`);
                }
            }
            
            // ===== CẬP NHẬT RANK =====
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
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
        window._resultPopupShown = false;
        window._gameOverSent = false;
        window._gameOverReceived = false;
        window._gameOverProcessing = false;

        spiderWebIndex = data.spiderWebIndex;
        lightningIndex = data.lightningIndex || null;
        
        // 🆕 THÊM BOM HẠT NHÂN
        window.nuclearBombIndex = data.nuclearBombIndex || null;
        window.nuclearBombDetonated = data.nuclearBombDetonated || false;

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
        
        // ================================================================
        // 🆕 KHỞI TẠO TELEPORT CHO NGƯỜI CHƠI
        // ================================================================
        for (let i = 1; i <= 2; i++) {
            if (players[i]) {
                if (players[i].teleportCooldown === undefined) {
                    players[i].teleportCooldown = 0;
                    players[i].teleportMaxCooldown = 5;
                    players[i].teleportAvailable = true;
                }
            }
        }
        if (typeof updateTeleportUI === 'function') {
            updateTeleportUI();
        }
        
        // ===== KHỞI TẠO BÀN CỜ =====
        initializeBoard();
        
        // ===== ĐỢI 1.5 GIÂY ĐỂ SKIN VÀ UI ỔN ĐỊNH, RỒI MỚI PHÂN ĐỊNH LƯỢT =====
        setTimeout(() => {
            // Cập nhật rank lần cuối
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
            }
            
            // ✅ GỌI DETERMINE TURN (SẼ BẬT NÚT ROLL)
            if (typeof determineTurn === 'function') {
                console.log("🎲 Gọi determineTurn từ startGame");
                determineTurn();
            } else {
                console.error("❌ Hàm determineTurn không tồn tại!");
            }
            
            console.log("✅ Đã hoàn tất khởi tạo game!");
            console.log(`💣 Bom hạt nhân tại ô: ${window.nuclearBombIndex}`);
        }, 1500); // Tăng lên 1500ms để đảm bảo
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
        // 🆕 SAU KHI VẼ LẠI BÀN CỜ, ĐẢM BẢO BẢN THỂ HẮC ÁM VẪN HIỂN THỊ
        // ================================================================
        if (window.darkChaseActive && window.darkChasePos !== null) {
            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
            console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi thiên tai xuất hiện`);
        }
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
        /// 🆕 SAU KHI VẼ LẠI BÀN CỜ, ĐẢM BẢO BẢN THỂ HẮC ÁM VẪN HIỂN THỊ
        // ================================================================
        if (window.darkChaseActive && window.darkChasePos !== null) {
            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
            console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi thiên tai kết thúc`);
        }
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
    // ===== ĐỒNG BỘ BOM =====

    // Khi gài bom
    socket.on('syncBombPlanted', (data) => {
        console.log('💣 Nhận đồng bộ gài bom:', data);
        window.bombData = {
            targetId: data.targetId,
            ownerId: data.ownerId,
            turnsLeft: data.turnsLeft,
            active: true,
            plantedAt: Date.now()
        };
        addLog(`💣 ${data.ownerName} đã gài bom vào người ${data.targetName}! (Còn ${data.turnsLeft} lượt)`);
        
        // Cảnh báo cho người bị gài
        if (myPlayerNumber === data.targetId) {
            showNotification('💣 CẢNH BÁO! Bạn đang mang bom!', 'danger', 3000);
            // Hiệu ứng đỏ trên thanh turn
            const turnTxt = document.getElementById('turn-txt');
            if (turnTxt) {
                turnTxt.style.background = '#ef4444';
                turnTxt.style.animation = 'bombWarning 0.5s infinite alternate';
            }
        }
        updateUI();
    });

    // Khi bom đếm ngược
    socket.on('syncBombCountdown', (data) => {
        if (window.bombData && window.bombData.targetId === data.targetId) {
            window.bombData.turnsLeft = data.turnsLeft;
            addLog(`💣 Bom còn ${data.turnsLeft} lượt xúc xắc`);
        }
    });

    // Khi bom nổ
    socket.on('syncBombExploded', (data) => {
        console.log('💥 Nhận đồng bộ bom nổ:', data);
        // Cập nhật dữ liệu
        if (data.players) {
            for (let i = 1; i <= 2; i++) {
                if (data.players[i]) {
                    players[i].money = data.players[i].money;
                    players[i].pos = data.players[i].pos;
                }
            }
        }
        if (data.cellsData) {
            cellsData = data.cellsData;
        }
        
        // Hiệu ứng nổ
        if (typeof showBombExplosionEffect === 'function') {
            showBombExplosionEffect(data.affectedCells[1], data.affectedCells[0], data.affectedCells[2]);
        }
        
        addLog(`💥💥💥 BOM PHÁT NỔ!`);
        if (data.penalty) {
            addLog(`💰 Mất ${data.penalty}$`);
        }
        
        initializeBoard();
        updateUI();
        
        // Reset bombData
        window.bombData = null;
    });

    // Khi bom được gỡ
    socket.on('syncBombDefused', (data) => {
        console.log('💣 Nhận đồng bộ bom được gỡ:', data);
        if (window.bombData && window.bombData.targetId === data.targetId) {
            window.bombData.active = false;
            window.bombData = null;
            addLog(`💣 Bom đã được gỡ bỏ an toàn!`);
            
            // Reset cảnh báo
            const turnTxt = document.getElementById('turn-txt');
            if (turnTxt) {
                turnTxt.style.background = '';
                turnTxt.style.animation = '';
            }
            if (typeof hideNotification === 'function') {
                hideNotification();
            }
            updateUI();
        }
    });
    // ===== ĐỒNG BỘ ÁM SÁT (TÀNG HÌNH) =====
    socket.on('syncAssassination', (data) => {
        console.log('🗡️ Nhận đồng bộ ám sát:', data);
        
        const targetId = data.targetId;
        const assassinId = data.assassinId;
        const amount = data.amount;
        const pos = data.pos;
        
        // Cập nhật tiền cho đối thủ (target)
        if (players[targetId]) {
            players[targetId].money -= amount;
            
            // Log nổi bật
            const assassinName = players[assassinId]?.name || 'Ai đó';
            const targetName = players[targetId]?.name || 'Ai đó';
            addLog(`🗡️🔥 <strong style="color: #ef4444; font-size: 16px;">${assassinName} (TÀNG HÌNH) ĐÃ ÁM SÁT ${targetName}! Mất ${amount}$!</strong>`);
            
            // Gọi hiệu ứng nổi bật
            showAssassinationEffect(targetId, assassinId, amount);
            
            updateUI();
            
            // Kiểm tra phá sản
            if (players[targetId].money < 0) {
                addLog(`💀 ${targetName} đã bị ám sát và phá sản!`);
                if (socket && socket.connected) {
                    socket.emit("gameOver", { winnerId: assassinId, reason: "money" });
                } else {
                    gameOver(assassinId, "money");
                }
            }
        }
    });
    // ===== RELAY ÁM SÁT =====
    socket.on('syncAssassination', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        console.log(`🗡️ [Phòng ${roomId}] Relay ám sát: ${data.assassinId} → ${data.targetId} (-${data.amount}$)`);
        io.to(roomId).emit('syncAssassination', data);
    });
    socket.on('queue-cancelled', (data) => {
        console.log('✅ Đã hủy tìm trận thành công:', data);
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerHTML = '🟢 Đã hủy. Sẵn sàng tham gia đấu trường!';
            lobbyStatus.style.color = '#94a3b8';
        }
        hideCancelButton();
        enableLobbyButtons();
        isSearching = false;
    });
    // ===== NHẬN KẾT QUẢ TRẬN ĐẤU TỪ SERVER =====
    socket.on('matchResult', (data) => {
        console.log('🏆 NHẬN KẾT QUẢ TRẬN ĐẤU:', data);
        
        // Đánh dấu đã nhận matchResult
        window._gameOverReceived = true;
        
        // Dừng mọi hoạt động ngay lập tức
        window.gameEnding = true;
        window.gameStarted = false;
        window.isMoving = false;
        
        // Hủy tất cả timer đang chạy (nếu có)
        if (window._turnTimer) {
            clearInterval(window._turnTimer);
            window._turnTimer = null;
        }
        
        // Ẩn nút rời trận
        if (typeof hideLeaveButton === 'function') {
            hideLeaveButton();
        }
        
        // Ẩn tất cả notification/modal ngay lập tức
        if (typeof hideNotification === 'function') {
            hideNotification();
        }
        if (typeof closeBuyModal === 'function') {
            closeBuyModal();
        }
        if (typeof hideBuyModal === 'function') {
            hideBuyModal();
        }
        
        // Vô hiệu hóa nút roll
        const rollBtn = document.getElementById('roll-btn');
        if (rollBtn) {
            rollBtn.disabled = true;
            rollBtn.innerText = "⏳ KẾT THÚC";
        }
        
        // Vô hiệu hóa nút skill
        const skillBtn = document.getElementById('use-skill-btn');
        if (skillBtn) {
            skillBtn.disabled = true;
        }
        
        // Dừng nhạc nền
        if (audioGame && audioGame.bgm) {
            audioGame.bgm.pause();
            audioGame.bgm.currentTime = 0;
        }
        
        // Dừng âm thanh chạy
        if (audioGame && audioGame.run) {
            audioGame.run.pause();
            audioGame.run.currentTime = 0;
        }
        
        // Lấy user từ localStorage
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (!currentUser) {
            console.error("❌ Không tìm thấy user!");
            showSimpleGameOver(data.winnerId);
            return;
        }
        
        // 🔥 TỰ TÍNH isWinner DỰA TRÊN winnerId
        const myNumber = Number(window.myPlayerNumber);
        const winnerNumber = Number(data.winnerId);

        const isWinner = myNumber === winnerNumber;

        console.log("🏆 ===== KIỂM TRA WINNER =====");
        console.log("myPlayerNumber:", window.myPlayerNumber, "=>", myNumber);
        console.log("winnerId:", data.winnerId, "=>", winnerNumber);
        console.log("isWinner:", isWinner);
        console.log(`🎬 isWinner = ${isWinner} (myPlayerNumber: ${window.myPlayerNumber}, winnerId: ${data.winnerId})`);
        
        // 🔥 ƯU TIÊN HIỂN THỊ POPUP NGAY LẬP TỨC
        if (typeof showMatchResultAnimation === 'function') {
            console.log(`🎬 Gọi showMatchResultAnimation với isWin = ${isWinner}`);
            // Dùng requestAnimationFrame để ưu tiên render
            requestAnimationFrame(() => {
                showMatchResultAnimation(isWinner, currentUser, data);
            });
        } else {
            showSimpleGameOver(data.winnerId);
        }
    });

    // ===== LỖI PHÒNG =====
    socket.on('room-error', (data) => {
        console.log('❌ LỖI PHÒNG:', data);
        alert(data.message);
        if (matchmakingTimer) {
            clearInterval(matchmakingTimer);
            matchmakingTimer = null;
            matchmakingSeconds = 0;
        }
        
        // 🆕 XÓA NÚT HỦY TÌM TRẬN KHI CÓ LỖI
        const cancelBtn = document.getElementById('cancel-matchmaking-btn');
        if (cancelBtn) cancelBtn.remove();
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = `Thất bại: ${data.message}`;
        }
        if (typeof enableLobbyButtons === 'function') {
            enableLobbyButtons();
        }
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
    // ===== ĐỒNG BỘ CẢNH BÁO BỐ HẢO =====
    socket.on('syncHaoBossWarning', (data) => {
        console.log('📢 Nhận đồng bộ cảnh báo Bố Hảo:', data);
        
        // ✅ THÊM LOG CHO CẢ 2 MÁY
        if (typeof addLog === 'function') {
            addLog(data.logMsg);
        }
        
        // ✅ HIỂN THỊ CẢNH BÁO TRÊN CẢ 2 MÁY
        if (typeof showHaoBossWarning === 'function') {
            showHaoBossWarning();
        }
    });

    // ===== ĐỒNG BỘ BỐ HẢO XUẤT HIỆN =====
    socket.on('syncHaoBossSpawn', (data) => {
        console.log('📢 Nhận đồng bộ Bố Hảo xuất hiện:', data);
        
        // ✅ THÊM LOG CHO CẢ 2 MÁY
        if (typeof addLog === 'function') {
            addLog(data.logMsg);
        }
        
        // 🆕 XÓA TẤT CẢ Ô PHÓNG XẠ KHI BỐ HẢO XUẤT HIỆN
        if (data.clearRadiation) {
            let clearedCount = 0;
            cellsData.forEach((cell, index) => {
                if (cell.isRadioactive) {
                    cell.isRadioactive = false;
                    cell.nuclearRadiationCount = 0;
                    cell.price = 100;
                    cell.owner = null;
                    clearedCount++;
                }
            });
            
            if (clearedCount > 0 && typeof addLog === 'function') {
                addLog(`☢️ BỐ HẢO ĐÃ XÓA SẠCH ${clearedCount} Ô PHÓNG XẠ!`);
            }
            
            // Vẽ lại bàn cờ
            if (typeof initializeBoard === 'function') {
                initializeBoard();
            }
        }
        
        // ✅ HIỂN THỊ BỐ HẢO TRÊN CẢ 2 MÁY
        if (typeof spawnHaoBoss === 'function') {
            spawnHaoBoss();
        }
        
        // ✅ CHẠY QUÉT SAU 3 GIÂY TRÊN CẢ 2 MÁY
        setTimeout(() => {
            if (typeof haoBossSweep === 'function') {
                haoBossSweep();
            }
        }, 3000);
    });
    // ===== ĐỒNG BỘ XÓA BỐ HẢO =====
    socket.on('syncRemoveHaoBoss', (data) => {
        console.log('📢 Nhận đồng bộ xóa Bố Hảo');
        
        if (typeof removeHaoBoss === 'function') {
            removeHaoBoss();
        }
        
        if (data.logMsg && typeof addLog === 'function') {
            addLog(data.logMsg);
        }
    });
    // ===== ĐỒNG BỘ TÀNG HÌNH =====
    socket.on('syncInvisibleEffect', (data) => {
        console.log('👻 Nhận đồng bộ tàng hình từ server:', data);
        
        const playerNum = data.playerNum;
        const pos = data.pos;
        const oldPos = data.oldPos;
        
        // 🔥 NẾU LÀ MÌNH THÌ KHÔNG ẨN
        if (myPlayerNumber !== null && playerNum === myPlayerNumber) {
            console.log('👻 Đây là mình, không ẩn!');
            if (players[playerNum]) {
                players[playerNum].pos = pos;
            }
            updateUI();
            return;
        }
        
        // ===== CHỈ ẨN KHI LÀ ĐỐI THỦ =====
        console.log('👻 Đây là đối thủ, ẩn đi!');
        
        if (players[playerNum]) {
            players[playerNum].pos = pos;
        }
        
        
        
        // Ẩn ở vị trí mới
        let newSlot = document.getElementById(`slot-p${playerNum}-${pos}`);
        if (newSlot) {
            newSlot.style.display = 'none';
            newSlot.style.opacity = '0';
            newSlot.classList.remove('has-p1', 'has-p2');
            newSlot.dataset.invisible = 'true';
        }
        
        window.isInvisible = true;
        window.invisiblePlayer = playerNum;
        window.invisiblePos = pos;
        
        updateUI();
    });

    // ===== ĐỒNG BỘ XÓA TÀNG HÌNH =====
    socket.on('syncRemoveInvisible', (data) => {
        console.log('👻 Nhận đồng bộ xóa tàng hình:', data);
        
        const playerNum = data.playerNum;
        const pos = data.pos;
        
        // 🔥 NẾU LÀ MÌNH THÌ KHÔNG CẦN LÀM GÌ
        if (playerNum === myPlayerNumber) {
            console.log('👻 Đây là mình, không cần hiện lại!');
            return;
        }
        
        // ===== CẬP NHẬT VỊ TRÍ MỚI CHO ĐỐI THỦ =====
        if (players[playerNum]) {
            players[playerNum].pos = pos;
            console.log(`👻 Đã cập nhật vị trí đối thủ ${playerNum} về ô ${pos}`);
        }
        
        
        
        // Reset biến toàn cục
        window.isInvisible = false;
        window.invisiblePlayer = null;
        window.invisiblePos = null;
        
        // Cập nhật UI để hiển thị đúng vị trí
        updateUI();
    });
    // ===== ĐỒNG BỘ BOM HẠT NHÂN =====
    socket.on('syncNuclearBomb', (data) => {
        console.log('💣 Nhận đồng bộ bom hạt nhân:', data);
        
        // 🆕 PHÁT ÂM THANH NỔ BOM CHO MÁY ĐỐI THỦ
        if (typeof playSFX === 'function' && audioGame && audioGame.bomb) {
            playSFX(audioGame.bomb);
        }
        
        window.nuclearBombDetonated = true;
        
        // Cập nhật dữ liệu
        if (data.players) {
            for (let i = 1; i <= 2; i++) {
                if (data.players[i]) {
                    players[i].money = data.players[i].money;
                    players[i].pos = data.players[i].pos;
                    players[i].rounds = data.players[i].rounds;
                }
            }
        }
        
        if (data.cellsData) {
            cellsData = data.cellsData;
        }
        
        // Vẽ lại bàn cờ
        initializeBoard();
        updateUI();
         // 🆕 SAU KHI VẼ LẠI BÀN CỜ, ĐẢM BẢO BẢN THỂ HẮC ÁM VẪN HIỂN THỊ
        // ================================================================
        if (window.darkChaseActive && window.darkChasePos !== null) {
            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
            console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi bom nổ (đối thủ)`);
        }
        
        addLog(`💣💥 BOM HẠT NHÂN ĐÃ PHÁT NỔ!`);
        
        // Kiểm tra game over
        if (players[1].money < 0) {
            gameOver(2, "money");
            return;
        }
        if (players[2].money < 0) {
            gameOver(1, "money");
            return;
        }
    });

    // ===== ĐỒNG BỘ PHÓNG XẠ =====
    socket.on('syncNuclearRadiation', (data) => {
        console.log('☢️ Nhận đồng bộ phóng xạ:', data);
        
        if (data.cellsData) {
            cellsData = data.cellsData;
            initializeBoard();
            updateUI();
            // 🆕 SAU KHI VẼ LẠI BÀN CỜ, ĐẢM BẢO BẢN THỂ HẮC ÁM VẪN HIỂN THỊ
            // ================================================================
            if (window.darkChaseActive && window.darkChasePos !== null) {
                renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
                console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi đồng bộ phóng xạ`);
            }
        }
        
        // 🔥 THÊM LOG ĐỂ DEBUG
        cellsData.forEach((cell, idx) => {
            if (cell.isRadioactive) {
                console.log(`☢️ Ô ${idx} nhiễm phóng xạ, còn ${cell.nuclearRadiationCount} lượt`);
            }
        });
    });
    // ===== ĐỒNG BỘ PHÓNG XẠ =====
    socket.on('syncRadiationEffect', (data) => {
        console.log('☢️ Nhận đồng bộ phóng xạ:', data);
        
        if (data.players) {
            for (let i = 1; i <= 2; i++) {
                if (data.players[i]) {
                    players[i].radiationEffect = data.players[i].radiationEffect || 0;
                }
            }
            updateUI();
        }
    });
    // ===== ĐỒNG BỘ KHI NGƯỜI KHÁC RỜI TRẬN =====
    socket.on('opponent-left', (data) => {
        console.log('🚪 Đối thủ đã rời trận:', data);
        
        // Đánh dấu game kết thúc
        window.gameEnding = true;
        window.gameStarted = false;
        window._gameOverReceived = true;
        window.isMoving = false;
        
        // Ẩn tất cả notification/modal
        if (typeof hideNotification === 'function') {
            hideNotification();
        }
        if (typeof closeBuyModal === 'function') {
            closeBuyModal();
        }
        if (typeof hideBuyModal === 'function') {
            hideBuyModal();
        }
        
        // Vô hiệu hóa nút roll
        const rollBtn = document.getElementById('roll-btn');
        if (rollBtn) {
            rollBtn.disabled = true;
            rollBtn.innerText = "⏳ KẾT THÚC";
        }
        
        // Vô hiệu hóa nút skill
        const skillBtn = document.getElementById('use-skill-btn');
        if (skillBtn) {
            skillBtn.disabled = true;
        }
        
        // Dừng nhạc nền
        if (audioGame && audioGame.bgm) {
            audioGame.bgm.pause();
            audioGame.bgm.currentTime = 0;
        }
        
        // Dừng âm thanh chạy
        if (audioGame && audioGame.run) {
            audioGame.run.pause();
            audioGame.run.currentTime = 0;
        }
        
        // Ẩn nút rời trận
        if (typeof hideLeaveButton === 'function') {
            hideLeaveButton();
        }
        
        // Lấy user từ localStorage
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        if (!currentUser) {
            console.error("❌ Không tìm thấy user!");
            showSimpleGameOver(1);
            return;
        }
        
        // ================================================================
        // 🔥 HIỂN THỊ POPUP THẮNG (VÌ ĐỐI THỦ ĐÃ RỜI)
        // ================================================================
        if (typeof showMatchResultAnimation === 'function') {
            // Tạo dữ liệu matchResult để hiển thị popup
            const matchData = {
                winnerId: window.myPlayerNumber,
                isWinner: true,
                reason: 'opponent-left',
                message: data.message || 'Đối thủ đã rời trận. Bạn được xử thắng!',
                totalRounds: 0,
                reward: {
                    winner: {
                        exp: 150,
                        coins: 50,
                        points: 25
                    },
                    loser: {
                        exp: 0,
                        coins: 0,
                        points: -25
                    }
                }
            };
            
            console.log(`🎬 Gọi showMatchResultAnimation với isWin = true (đối thủ rời)`);
            showMatchResultAnimation(true, currentUser, matchData);
        } else {
            // Fallback: hiển thị popup đơn giản
            showSimpleGameOver(window.myPlayerNumber);
        }
        
        // Thêm log
        if (typeof addLog === 'function') {
            addLog(`🏆 ${data.message || 'Đối thủ đã rời trận. Bạn được xử thắng!'}`);
        }
    });
}
