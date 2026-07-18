// ===== LẮNG NGHE ĐỒNG BỘ TỪ SERVER =====
if (typeof socket !== 'undefined' && socket) {

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

    // SERVER TRẢ VỀ: Khi kết nối vào phòng thành công (cho cả Quick Match và vào bằng ID)
    socket.off('room-joined').on('room-joined', (data) => {
        const roomId = data.roomId;
        if (typeof displayRoomId === 'function') displayRoomId(roomId);
        if (typeof addLog === 'function') addLog(`🚪 Bạn đã tham gia vào phòng [${roomId}].`);
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = "Đã vào phòng thành công! Đang chờ đối thủ sẵn sàng...";
        }
    });

    // SERVER TRẢ VỀ: Khi có lỗi xảy ra (Sai ID phòng, phòng đầy, đối thủ out,...)
    socket.off('room-error').on('room-error', (data) => {
        alert(data.message);
        
        const lobbyStatus = document.getElementById('lobby-status');
        if (lobbyStatus) {
            lobbyStatus.innerText = `Thất bại: ${data.message}`;
        }
        // Mở khóa lại các nút ở màn hình sảnh để người chơi có thể thao tác lại
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
        
        initializeBoard();
        if (typeof determineTurn === 'function')
            determineTurn();
    });

    // SỬA LỖI: Ép vẽ lại toàn diện UI bàn cờ khi Thiên Tai được Triệu Hồi nhằm tránh lỗi mất hiển thị text/màu sắc
    socket.off('lightningSummoned').on('lightningSummoned', (data) => {
        lightningIndex = data.lightningIndex;
        
        if (typeof addLog === 'function') {
            addLog(`⚡ <strong style="color: #eab308;">THIÊN TAI BẤT NGỜ!</strong> Sấm Sét đã giáng xuống ô số [${lightningIndex}]!`);
        }
        
        if (typeof playSFX === 'function' && typeof audioGame !== 'undefined') {
            playSFX(audioGame.lightning);
        }

        // Tái tạo lại bàn cờ gốc để nạp thuộc tính ô Thiên Tai đồng bộ từ hàm vẽ chính
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
        
        // Vẽ lại bàn cờ sạch để xóa bỏ hoàn toàn trạng thái thiên tai cũ
        if (typeof initializeBoard === 'function') initializeBoard();
        if (typeof updateUI === 'function') updateUI();
        
        isMoving = false;
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });

    // 🔥 FIX CHÍNH: THÊM HANDLER CHO skipTurnResult (Mạng Nhện)
    socket.off('skipTurnResult').on('skipTurnResult', (data) => {
        // Server trả về thông tin sau khi xử lý lệnh bỏ qua lượt
        if (data && data.nextTurn) {
            currentTurn = data.nextTurn;
            
            // Cập nhật biến skipNextTurn nếu có từ server
            if (data.players) {
                for (let pId in data.players) {
                    if (players[pId]) {
                        players[pId].skipNextTurn = data.players[pId].skipNextTurn || false;
                    }
                }
            }
            
            if (typeof addLog === 'function') {
                addLog(`⏭️ <strong>${players[data.previousTurn] ? players[data.previousTurn].name : "Người chơi"}</strong> bị mất lượt do dẫm vào Mạng Nhện!`);
            }
            
            addLog(`🎲 <strong>LƯỢT TIẾP THEO:</strong> Đến lượt của <strong>${players[currentTurn].name}</strong>`);
        }
        
        isMoving = false;
        if (typeof updateUI === 'function') updateUI();
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });

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

    socket.off('updateActionDataResult').on('updateActionDataResult', (data) => {
        if (data.players) {
            for (let pId in data.players) {
                if (!players[pId]) continue;
                players[pId].money = data.players[pId].money;
                players[pId].pos = data.players[pId].pos;
                players[pId].rounds = data.players[pId].rounds;
                players[pId].skipNextTurn = data.players[pId].skipNextTurn;
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

                    // SỬA LỖI LOGIC: Bảo vệ giao diện của ô Thiên Tai và Mạng nhện không bị ghi đè màu nền đất thường
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
        
        isMoving = false;
        if (typeof updateUI === 'function') updateUI(); // Đảm bảo quân cờ di chuyển đúng vị trí sau khi nhận gói tin từ đối thủ
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });

    socket.off('syncEndTurnResult').on('syncEndTurnResult', (data) => {
        currentTurn = data.nextTurn;
        isMoving = false; 
        if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
    });
    // ===============================
    // NHẬN KẾT QUẢ DÙNG KỸ NĂNG
    // ===============================
    socket.off("useSkillResult").on("useSkillResult", (data) => {

        players = data.players;
        cellsData = data.cellsData;
        currentTurn = data.currentTurn;

        // 🔒 Khóa kỹ năng sau khi đã sử dụng
        if(data.skillUsed && data.player){
            players[data.player].skill = null;
            players[data.player].skillUsed = true;
        }

        updateUI();

        // cập nhật chữ kỹ năng
        if(typeof updateSkillUI === "function"){
            updateSkillUI();
        }

        // cập nhật trạng thái nút dùng kỹ năng
        if(typeof updateSkillButton === "function"){
            updateSkillButton();
        }

    });
}
