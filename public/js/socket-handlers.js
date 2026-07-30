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
            
            // Cập nhật rank
            if (typeof updateRankDisplay === 'function') {
                updateRankDisplay();
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
            showLeaveButton();
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
        
        // ===== KHỞI TẠO BÀN CỜ =====
        initializeBoard();
        
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
            console.log(`💣 Bom hạt nhân tại ô: ${window.nuclearBombIndex}`);
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
        
        // Ẩn ở vị trí cũ
        if (oldPos !== undefined) {
            let oldSlot = document.getElementById(`slot-p${playerNum}-${oldPos}`);
            if (oldSlot) {
                oldSlot.style.display = 'none';
                oldSlot.style.opacity = '0';
                oldSlot.classList.remove('has-p1', 'has-p2');
                oldSlot.dataset.invisible = 'true';
            }
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
        
        // ===== HIỆN LẠI NHÂN VẬT CỦA ĐỐI THỦ =====
        console.log('👻 Hiện lại nhân vật đối thủ!');
        
        // Xóa tất cả dataset.invisible của player này
        for (let i = 0; i < TOTAL_CELLS; i++) {
            let slot = document.getElementById(`slot-p${playerNum}-${i}`);
            if (slot) {
                slot.dataset.invisible = 'false';
                slot.style.display = '';
                slot.style.opacity = '1';
                slot.classList.remove('invisible-skill');
                const avatar = slot.querySelector('.p-avatar');
                if (avatar) {
                    avatar.style.textShadow = '';
                    avatar.style.filter = '';
                }
            }
        }
        
        // Hiện lại ở vị trí START
        let slot = document.getElementById(`slot-p${playerNum}-${pos}`);
        if (slot) {
            slot.style.display = '';
            slot.style.opacity = '1';
            if (playerNum === 1) {
                slot.classList.add('has-p1');
            } else {
                slot.classList.add('has-p2');
            }
        }
        
        window.isInvisible = false;
        window.invisiblePlayer = null;
        window.invisiblePos = null;
        
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
}
