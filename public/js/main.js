    window.haoBossTriggered = false;
    window.haoWarningPlayed = false;
    window.nuclearBombIndex = null;
    window.nuclearBombDetonated = false;
    players[1].radiationEffect = 0; // Số lượt còn lại của hiệu ứng phóng xạ
    players[2].radiationEffect = 0;
    // 🆕 THÊM SKIN_LIST VÀO WINDOW ĐỂ DÙNG CHUNG
    window.SKIN_LIST = [
        { id: 'skin_default', name: 'Mặc định', icon: '🏃‍♂️', price: 0, desc: 'Quân cờ cơ bản', rarity: 'common' },
        { id: 'skin_dragon', name: 'Rồng thần', icon: '🐉', price: 5000, desc: 'Rồng bay uy nghi', rarity: 'legendary', 
        sound: 'dragon', effect: 'dragon_fire' },
        { id: 'skin_phoenix', name: 'Phượng hoàng', icon: '🦅', price: 6000, desc: 'Phượng hoàng bất tử', rarity: 'legendary',
        sound: 'phoenix', effect: 'phoenix_feather' },
        { id: 'skin_unicorn', name: 'Kỳ lân', icon: '🦄', price: 4000, desc: 'Kỳ lân huyền thoại', rarity: 'legendary',
        sound: 'horse', effect: 'unicorn_magic' },
        { id: 'skin_ninja', name: 'Ninja', icon: '🥷', price: 3000, desc: 'Ninja bí ẩn', rarity: 'rare' },
        { id: 'skin_wizard', name: 'Phù thủy', icon: '🧙', price: 1000, desc: 'Phù thủy quyền năng', rarity: 'uncommon' },
        { id: 'skin_robot', name: 'Robot', icon: '🤖', price: 2000, desc: 'Người máy tương lai', rarity: 'rare' },
        { id: 'skin_car', name: 'Ô tô', icon: '🚗', price: 1500, desc: 'Xe hơi tốc độ', rarity: 'common' }
    ];
    // ===== KHỞI TẠO KẾT NỐI SOCKET.IO THÔNG MINH (TỰ ĐỘNG ĐỔI URL) =====
    const NODE_JS_PORT = 3000; 
    window.lightningIndex = null;
    window.spiderWebIndex = null;
    // Kiểm tra xem trình duyệt có đang chạy ở môi trường localhost hay không
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const SOCKET_SERVER_URL = isLocalhost ? `http://localhost:${NODE_JS_PORT}` : window.location.origin;
    // ===== ĐẦU FILE main.js =====
    if (typeof window._gameOverProcessing === 'undefined') {
        window._gameOverProcessing = false;
    }
    if (typeof window._gameOverSent === 'undefined') {
        window._gameOverSent = false;
    }
    if (typeof window._gameOverReceived === 'undefined') {
        window._gameOverReceived = false;
    }
    // ===== ĐẦU FILE main.js =====
    if (typeof window.isProcessingGift === 'undefined') {
        window.isProcessingGift = false;
    }
    // Không dùng lại từ khóa "let" nếu config.js đã khai báo trước. Thay bằng gán đè an toàn.
    if (typeof socket === 'undefined' || socket === null) {
        if (typeof io !== 'undefined') {
            socket = io(SOCKET_SERVER_URL);
            console.log("🔌 Đang kết nối tới Socket Server tại: " + SOCKET_SERVER_URL);
        }
    } else {
        console.log("✅ Socket đã được khởi tạo từ trước");
    }
    
    // Thêm vào đầu file
    if (typeof gameEnding === 'undefined') window.gameEnding = false;
    // Kiểm tra an toàn trước khi khởi tạo biến trạng thái game để tránh lỗi "already been declared"
    if (typeof myPlayerNumber === 'undefined') window.myPlayerNumber = null;
    if (typeof spiderWebIndex === 'undefined') window.spiderWebIndex = null;
    if (typeof lightningIndex === 'undefined') window.lightningIndex = null;
    if (typeof gameStarted === 'undefined') window.gameStarted = false;
    if (typeof currentTurn === 'undefined') window.currentTurn = null;
    if (typeof isMoving === 'undefined') window.isMoving = false;

    // Biến cờ đánh dấu Thiên tai của trận này đã từng xuất hiện hay chưa
    if (typeof disasterSpawnedThisGame === 'undefined') window.disasterSpawnedThisGame = false;

    // Chỉ để xử lý giao diện hiển thị cảnh báo lỗi thư viện ban đầu
    window.addEventListener('DOMContentLoaded', () => {
        if (!socket && typeof io === 'undefined') {
            console.error("❌ Không tìm thấy thư viện Socket.IO!");
            const lobbyStatus = document.getElementById('lobby-status');
            if (lobbyStatus) {
                lobbyStatus.innerHTML = `<span style="color:#ef4444;">❌ Lỗi: Chưa nạp được thư viện Socket.IO từ Server.</span>`;
            }
        }
    });

    // =========================================================================
    // 🌐 HỆ THỐNG LẮNG NGHE & ĐỒNG BỘ SOCKET TRẬN ĐẤU (BẬY PHÒNG)
    // =========================================================================
    if (socket) {
        // Thêm vào phần if (socket)
        socket.on('skin-effect', (data) => {
            console.log('🎬 Nhận hiệu ứng skin từ server:', data);
            
            if (data.skinId === 'skin_phoenix') {
                playPhoenixEffectGlobal();
            } else if (data.skinId === 'skin_dragon') {
                playDragonEffectGlobal();
            } else if (data.skinId === 'skin_unicorn') {
                playUnicornEffectGlobal(); // 🆕 THÊM NẾU CÓ
            }
        });
        // 🆕 NHẬN SKIN TỪ SERVER VÀ ÁP DỤNG CHO CẢ 2 NGƯỜI CHƠI
        socket.on('player-skins', (data) => {
            console.log('🎨 Nhận skin từ server:', data);
            // ✅ THÊM DÒNG NÀY: LƯU SKIN VÀO window.players ĐỂ updatePlayerSkin DÙNG
            if (window.players) {
                if (window.players[1]) window.players[1].skin = data.player1;
                if (window.players[2]) window.players[2].skin = data.player2;
            }
            // Lấy danh sách skin từ SKIN_LIST (đã có trong auth.js)
            // Nếu SKIN_LIST chưa có, tự định nghĩa
            const SKIN_LIST = window.SKIN_LIST || [
                { id: 'skin_default', name: 'Mặc định', icon: '🏃‍♂️' },
                { id: 'skin_dragon', name: 'Rồng thần', icon: '🐉' },
                { id: 'skin_phoenix', name: 'Phượng hoàng', icon: '🦅' }, // ✅ THÊM DÒNG NÀY
                { id: 'skin_ninja', name: 'Ninja', icon: '🥷' },
                { id: 'skin_wizard', name: 'Phù thủy', icon: '🧙' },
                { id: 'skin_robot', name: 'Robot', icon: '🤖' },
                { id: 'skin_car', name: 'Ô tô', icon: '🚗' }
            ];
            
            // Áp dụng skin cho Player 1
            const skin1 = SKIN_LIST.find(s => s.id === data.player1);
            if (skin1) {
                for (let i = 0; i < 36; i++) {
                    const slot = document.getElementById(`slot-p1-${i}`);
                    if (slot) {
                        const avatar = slot.querySelector('.p-avatar');
                        if (avatar) avatar.textContent = skin1.icon;
                    }
                }
                console.log(`✅ Đã áp dụng skin Player 1: ${skin1.name}`);
            }
            
            // Áp dụng skin cho Player 2 (đối thủ)
            const skin2 = SKIN_LIST.find(s => s.id === data.player2);
            if (skin2) {
                for (let i = 0; i < 36; i++) {
                    const slot = document.getElementById(`slot-p2-${i}`);
                    if (slot) {
                        const avatar = slot.querySelector('.p-avatar');
                        if (avatar) avatar.textContent = skin2.icon;
                    }
                }
                console.log(`✅ Đã áp dụng skin Player 2: ${skin2.name}`);
            }
        });
        // 🕸️ Lắng nghe vị trí Mạng Nhện ngẫu nhiên do server khởi tạo đầu trận
        socket.on('init-traps', (data) => {
            window.spiderWebIndex = data.spiderWebIndex;
            lightningIndex = data.lightningIndex;
            window.lightningIndex = lightningIndex;
            window.disasterSpawnedThisGame = false;
            
            // 🆕 THÊM BOM HẠT NHÂN
            window.nuclearBombIndex = data.nuclearBombIndex || null;
            window.nuclearBombDetonated = data.nuclearBombDetonated || false;
            
            console.log(`[SOCKET] Mạng nhện trận này được đặt tại ô: ${window.spiderWebIndex}`);
            console.log(`[SOCKET] Bom hạt nhân đặt tại ô: ${window.nuclearBombIndex}`);
            initializeBoard();
        });
        socket.on('extraTurnResult',(data)=>{

            currentTurn = data.currentTurn;

            window.extraTurns = data.extraTurns;

            isMoving = false;

            updateUI();

            checkMyTurnControl();

        });
        // 🕸️ Lắng nghe khi có người đạp trúng Mạng Nhện (Cả 2 bên nhận cùng lúc)
        socket.on('sync-spider-web-effect', (data) => {
            addLog(data.logMsg);
            window.players = data.players;
            window.currentTurn = data.nextTurn; // Ép đối thủ xúc xắc luôn

            // Chỉ người được đi mới có lượt thưởng
            window.extraTurns = data.extraTurns || 0;

            window.isMoving = false;

            updateUI();
            checkMyTurnControl();
            });
        // 🎁 Đồng bộ hiệu ứng hộp quà mất lượt / thêm lượt
        socket.on('sync-gift-effect', (data) => {

            addLog(data.logMsg);

            window.players = data.playersUpdate || data.players;

            window.currentTurn = data.nextTurn;

            window.extraTurns = data.extraTurns || 0;

            window.isMoving = false;


            updateUI();

            checkMyTurnControl();

        });
        // 🚨 Lắng nghe thông báo Server kích hoạt Thiên tai ngẫu nhiên sau vòng 1
        socket.on('disaster-spawned', (data) => {

            console.log("⚡ ĐÃ NHẬN disaster-spawned");
            console.log(data);

            console.log("📌 Server gửi lightningIndex =", data.lightningIndex);

            window.lightningIndex = Number(data.lightningIndex);
            window.disasterSpawnedThisGame = true;

            console.log("📌 Client lưu lightningIndex =", window.lightningIndex);

            addLog(data.logMsg);

            console.log("🔄 Gọi initializeBoard()");

            initializeBoard();

            if (typeof updateUI === "function") {
                updateUI();
            }
        });
        
        // ⚡ Lắng nghe khi có người dẫm trúng Thiên tai (Trừ tiền, xóa đất, ghi log 2 bên)
        socket.on('sync-lightning-effect', (data) => {
            data.logs.forEach(msg => addLog(msg));
            window.players = data.players;
            window.cellsData = data.cellsData;
            window.lightningIndex = null; // Thiên tai biến mất sau khi nổ
            
            initializeBoard(); // Vẽ lại bản đồ xóa hiệu ứng sét và đất đã mất
            if (typeof updateUI === 'function') updateUI();
            
            window.isMoving = false;
            // Tiến hành chuyển lượt bình thường sau tai nạn
            endTurn();
        });
    }

    // =========================================================================
    // 🔥 HỆ THỐNG QUẢN LÝ ĐA PHÒNG PHỤC VỤ CHƠI TỰ DO
    // =========================================================================

    function getValidUsername() {
        const nameInput = document.getElementById('username-input');
        const username = nameInput ? nameInput.value.trim() : "";
        if (!username) {
            alert("Vui lòng nhập một cái tên trước khi tham gia đấu trường!");
            return null;
        }
        return username;
    }

    function disableLobbyButtons() {
        const btnQuick = document.getElementById('btn-quick-match');
        const btnCreate = document.getElementById('btn-create-room');
        const btnJoin = document.getElementById('btn-join-room');
        if (btnQuick) btnQuick.disabled = true;
        if (btnCreate) btnCreate.disabled = true;
        if (btnJoin) btnJoin.disabled = true;
    }

    function enableLobbyButtons() {
        const btnQuick = document.getElementById('btn-quick-match');
        const btnCreate = document.getElementById('btn-create-room');
        const btnJoin = document.getElementById('btn-join-room');
        if (btnQuick) btnQuick.disabled = false;
        if (btnCreate) btnCreate.disabled = false;
        if (btnJoin) btnJoin.disabled = false;
    }

    function startQuickMatch() {
        const username = getValidUsername();
        if (!username) return;

        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (!user) {
            alert("Bạn chưa đăng nhập!");
            return;
        }

        if (socket && socket.connected) {
            disableLobbyButtons();

            const lobbyStatus = document.getElementById('lobby-status');
            if (lobbyStatus) {
                lobbyStatus.innerHTML = "⏳ Đang tìm kiếm đối thủ phù hợp trên hệ thống...<br>Vui lòng đợi người chơi khác vào trận.";
            }

            // ✅ SỬA: GỬI userId LÀ USERNAME (KHÔNG PHẢI ID)
            socket.emit('request-quick-match', {
                name: user.display_name || user.username || username,
                userId: user.username,  // ← ✅ USERNAME ĐĂNG NHẬP
                skin: user.skin || 'skin_default'
            });

        } else {
            alert("❌ Thất bại: Hiện tại mất kết nối tới máy chủ, không thể ghép trận!");
            enableLobbyButtons();
        }
    }

    function createNewRoom() {
        const username = getValidUsername();
        if (!username) return;

        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (!user) {
            alert("Bạn chưa đăng nhập!");
            return;
        }

        if (socket && socket.connected) {
            disableLobbyButtons();

            const lobbyStatus = document.getElementById('lobby-status');
            if (lobbyStatus) {
                lobbyStatus.innerHTML = "⚙️ Đang gửi yêu cầu khởi tạo phòng riêng tư lên Server...";
            }

            // ✅ SỬA: GỬI userId LÀ USERNAME
            socket.emit('request-create-room', {
                name: user.display_name || user.username || username,
                userId: user.username,  // ← ✅ USERNAME ĐĂNG NHẬP
                skin: user.skin || 'skin_default'
            });

        } else {
            alert("❌ Thất bại: Mất kết nối máy chủ, không thể tạo phòng riêng tư!");
            enableLobbyButtons();
        }
    }
    function joinRoomWithId() {
        const username = getValidUsername();
        if (!username) return;

        const user = JSON.parse(localStorage.getItem("currentUser"));
        if (!user) {
            alert("Bạn chưa đăng nhập!");
            return;
        }

        const roomIdInput = document.getElementById('room-id-input');
        const roomId = roomIdInput ? roomIdInput.value.trim() : "";

        if (!roomId) {
            alert("Vui lòng nhập ID phòng (Mã phòng) do bạn của bạn gửi!");
            return;
        }

        if (socket && socket.connected) {
            disableLobbyButtons();

            const lobbyStatus = document.getElementById('lobby-status');
            if (lobbyStatus) {
                lobbyStatus.innerHTML = `🏃‍♂️ Đang kết nối vào phòng [${roomId}]...`;
            }

            // ✅ SỬA: GỬI userId LÀ USERNAME
            socket.emit('request-join-room', {
                name: user.display_name || user.username || username,
                userId: user.username,  // ← ✅ USERNAME ĐĂNG NHẬP
                roomId: roomId,
                skin: user.skin || 'skin_default'
            });

        } else {
            alert("❌ Thất bại: Không thể kết nối đến máy chủ để vào phòng!");
            enableLobbyButtons();
        }
    }
    function displayRoomId(roomId) {
        const roomDisplayEl = document.getElementById('room-id-display');
        if (roomDisplayEl) {
            roomDisplayEl.innerHTML = `Mã Phòng: <strong style="color: #f59e0b;">${roomId}</strong>`;
        }
    }
    // BỐ HẢO EVENT
    function checkHaoBossEvent(playerId){
        const p = players[playerId];
        if (!p) return;

        // ===== VÒNG 4 : CHỈ CẢNH BÁO =====
        if (p.rounds >= 4 && !window.haoWarningPlayed) {
            window.haoWarningPlayed = true;
            
            const logMsg = `🚨 BỐ HẢO SẮP XUẤT HIỆN! (${p.name} đã đến vòng 4)`;
            
            // 🔥 GỬI SOCKET ĐỂ CẢ 2 MÁY CÙNG HIỂN THỊ
            if (socket && socket.connected) {
                socket.emit('syncHaoBossWarning', {
                    logMsg: logMsg,
                    playerName: p.name
                });
            } else {
                // Nếu không có socket (offline), chỉ hiển thị trên máy này
                addLog(logMsg);
                showHaoBossWarning();
            }
        }

        // ===== VÒNG 5 : BOSS XUẤT HIỆN =====
        if (p.rounds >= 5 && !window.haoBossTriggered) {
            window.haoBossTriggered = true;
            
            // 🆕 XÓA TẤT CẢ Ô PHÓNG XẠ KHI BỐ HẢO XUẤT HIỆN
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
            
            if (clearedCount > 0) {
                addLog(`☢️ BỐ HẢO ĐÃ XÓA SẠCH ${clearedCount} Ô PHÓNG XẠ!`);
            }
            
            const logMsg = `🔥 BỐ HẢO ĐÃ XUẤT HIỆN! (${p.name} đã đến vòng 5)`;
            
            // 🔥 GỬI SOCKET ĐỂ CẢ 2 MÁY CÙNG HIỂN THỊ
            if (socket && socket.connected) {
                socket.emit('syncHaoBossSpawn', {
                    logMsg: logMsg,
                    playerName: p.name,
                    clearRadiation: true  // 🆕 THÊM CỜ NÀY
                });
            } else {
                // Nếu không có socket (offline)
                addLog(logMsg);
                spawnHaoBoss();
                setTimeout(() => {
                    haoBossSweep();
                }, 3000);
            }
        }
    }


    // ===============================
    // BỐ HẢO QUÉT
    // ===============================
    function haoBossSweep(){
        addLog("🔥 BỐ HẢO BẮT ĐẦU CÀN QUÉT!");

        let logMessages = [];
        let hasPenalty = false;
        let gameOverSent = false;

        for(let i=1; i<=2; i++){
            const p = players[i];
            const currentCell = cellsData[p.pos];
            const safe = p.pos===0 || (currentCell && currentCell.owner===i);

            if(!safe){
                p.money -= 500;
                hasPenalty = true;
                const msg = `🔥 <strong>${p.name}</strong> không đứng trên đất của mình. -500$`;
                addLog(msg);
                logMessages.push(msg);

                if(p.money < 0){
                    const enemy = i===1 ? 2 : 1;
                    removeHaoBoss();
                    gameOverSent = true;
                    
                    // 🔥 ĐỒNG BỘ XÓA BỐ HẢO
                    if (socket && socket.connected) {
                        socket.emit('syncRemoveHaoBoss', {
                            logMsg: `💀 ${p.name} đã phá sản!`
                        });
                    }
                    
                    // ✅ SỬA: GỬI GAMEOVER LÊN SERVER THAY VÌ GỌI LOCAL
                    if (socket && socket.connected) {
                        console.log(`📤 Gửi gameOver lên server: winner=${enemy}, loser=${i}`);
                        window.gameEnding = true;
                        window.gameStarted = false;
                        socket.emit("gameOver", {
                            winnerId: enemy,
                            reason: "money"
                        });
                    } else {
                        gameOver(enemy, "money");
                    }
                    return;
                }
            }
            else{
                const msg = `🏠 <strong>${p.name}</strong> đang ở nhà nên được an toàn.`;
                addLog(msg);
                logMessages.push(msg);
            }
        }

        removeHaoBoss();
        
        // 🔥 ĐỒNG BỘ XÓA BỐ HẢO CHO MÁY ĐỐI THỦ
        if (socket && socket.connected) {
            socket.emit('syncRemoveHaoBoss', {
                logMsg: null
            });
        }

        updateUI();
        if(typeof syncGameToRemote === "function"){
            syncGameToRemote();
        }
    }



    // ===============================
    // ===============================
    // HIỆN CẢNH BÁO
    // ===============================
    function showHaoBossWarning(){
        const warning = document.getElementById("hao-warning");
        if(!warning) return;

        // 🔥 KIỂM TRA ĐÃ HIỂN THỊ CHƯA (TRÁNH LẶP TRÊN CÙNG MÁY)
        if (warning.classList.contains('show')) {
            console.log("⚠️ Cảnh báo đã hiển thị, bỏ qua!");
            return;
        }

        // phát âm thanh danger
        if(audioGame && audioGame.danger){
            audioGame.danger.currentTime = 0;
            audioGame.danger.play().catch(()=>{});
        }

        // rung màn hình
        document.body.classList.add("hao-shake");

        // reset animation
        warning.classList.remove("show");
        void warning.offsetWidth;
        warning.classList.add("show");

        setTimeout(()=>{
            warning.classList.remove("show");
            document.body.classList.remove("hao-shake");
        }, 3000);
    }

    // SINH BỐ HẢO
    // ===============================
    function spawnHaoBoss(){
        const startCell = document.getElementById("cell-0");
        if(!startCell) return;
        
        // 🔥 KIỂM TRA ĐÃ CÓ BỐ HẢO CHƯA (TRÁNH LẶP TRÊN CÙNG MÁY)
        if(document.getElementById("hao-boss")) {
            console.log("⚠️ Bố Hảo đã tồn tại, bỏ qua!");
            return;
        }

        const boss = document.createElement("div");
        boss.id = "hao-boss";
        boss.innerHTML = "💀";
        startCell.appendChild(boss);
    }


    // ===============================
    // XÓA BỐ HẢO
    // ===============================
    function removeHaoBoss(){

        const boss=document.getElementById("hao-boss");

        if(boss){

            boss.remove();

        }

    }
    // ===== 💣 NỔ BOM HẠT NHÂN =====
    function detonateNuclearBomb() {
        if (window.nuclearBombDetonated) return;
        window.nuclearBombDetonated = true;
        
        const bombPos = Number(window.nuclearBombIndex);
        if (bombPos === 0 || bombPos === null) return;
        
        // 🆕 PHÁT ÂM THANH NỔ BOM
        if (typeof playSFX === 'function' && audioGame && audioGame.bomb) {
            playSFX(audioGame.bomb);
        }
        
        addLog(`💣💥 BOM HẠT NHÂN PHÁT NỔ tại ô ${bombPos}!`);
        addLog(`📢 Phạm vi ảnh hưởng: ô ${(bombPos - 1 + TOTAL_CELLS) % TOTAL_CELLS}, ${bombPos}, ${(bombPos + 1) % TOTAL_CELLS}`);
        
        // Lấy 3 ô: left, center, right
        const leftPos = (bombPos - 1 + TOTAL_CELLS) % TOTAL_CELLS;
        const rightPos = (bombPos + 1) % TOTAL_CELLS;
        const affectedCells = [leftPos, bombPos, rightPos];
        
        let totalPenalty = 0;
        let affectedOwners = [];
        
        // Xử lý từng ô
        affectedCells.forEach(pos => {
            if (pos === 0) return; // Bỏ qua ô START
            
            // 🔥 TRỪ 10% TIỀN CỦA CHỦ SỞ HỮU (NẾU CÓ)
            if (cellsData[pos].owner) {
                const owner = cellsData[pos].owner;
                const penalty = Math.floor(players[owner].money * 0.1);
                players[owner].money -= penalty;
                totalPenalty += penalty;
                affectedOwners.push({
                    name: players[owner].name,
                    penalty: penalty,
                    pos: pos
                });
                
                addLog(`💥 ${players[owner].name} mất <strong>${penalty}$</strong> (10% tiền) do bom nổ tại ô ${pos}!`);
                
                if (players[owner].money < 0) {
                    const enemy = owner === 1 ? 2 : 1;
                    addLog(`💀 ${players[owner].name} đã phá sản!`);
                    gameOver(enemy, "money");
                    return;
                }
            } else {
                addLog(`💣 Ô ${pos} không có chủ sở hữu, chỉ bị nhiễm phóng xạ.`);
            }
            
            // 🔥 CHUYỂN THÀNH Ô NHIỄM PHÓNG XẠ (MẤT CHỦ SỞ HỮU)
            cellsData[pos].isRadioactive = true;
            cellsData[pos].nuclearRadiationCount = 3;
            cellsData[pos].owner = null;
            cellsData[pos].price = 0;
            cellsData[pos].hasGift = false;
            addLog(`☢️ Ô ${pos} bị nhiễm phóng xạ! (Hiệu ứng kéo dài 3 lượt)`);
        });
        
        // 🔥 THỐNG KÊ TỔNG THIỆT HẠI
        if (affectedOwners.length > 0) {
            let summary = affectedOwners.map(o => `${o.name}: -${o.penalty}$`).join(', ');
            addLog(`📊 Tổng thiệt hại: ${summary}`);
        }
        addLog(`💣 Tổng cộng ${affectedCells.filter(p => p !== 0).length} ô bị ảnh hưởng!`);
        
        // Đồng bộ
        if (socket && socket.connected) {
            socket.emit('syncNuclearBomb', {
                nuclearBombDetonated: true,
                affectedCells: affectedCells,
                players: players,
                cellsData: cellsData
            });
        }
        
        initializeBoard();
        updateUI();
        // 🆕 SAU KHI NỔ BOM, ĐẢM BẢO BẢN THỂ HẮC ÁM VẪN HIỂN THỊ
        // ================================================================
        if (window.darkChaseActive && window.darkChasePos !== null) {
            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
            console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi bom nổ`);
        }
    }
    // ===== KHỞI TẠO BÀN CỜ VẼ LƯỚI MA TRẬN =====
    function initializeBoard() {
        console.log("========== DRAW BOARD ==========");
        console.log("window.lightningIndex =", window.lightningIndex);
        console.log("window.nuclearBombIndex =", window.nuclearBombIndex);
        console.log("window.nuclearBombDetonated =", window.nuclearBombDetonated);
        const boardEl = document.getElementById('board');
        if (!boardEl) return;
        
        const oldCells = boardEl.querySelectorAll('.cell');
        oldCells.forEach(cell => cell.remove());

        cellsData.forEach((cell, index) => {
            const cellEl = document.createElement('div');
            const isWeb = (index === Number(spiderWebIndex));
            const isLightning = (index === Number(window.lightningIndex));
            const isNuclearBomb = (index === Number(window.nuclearBombIndex) && !window.nuclearBombDetonated);
            const isRadioactive = cell.isRadioactive || false;
            
            cellEl.className = `cell ${index === 0 ? 'start-cell' : ''} ${isWeb ? 'has-spider-web' : ''} ${isLightning ? 'has-lightning' : ''} ${isNuclearBomb ? 'has-nuclear-bomb' : ''} ${isRadioactive ? 'is-radioactive' : ''}`;
            cellEl.id = `cell-${index}`;
            cellEl.style.gridRow = mapCoords[index].r;
            cellEl.style.gridColumn = mapCoords[index].c;
            
            // Cập nhật lại màu sắc background viền hoặc tag của chủ đất nếu đã bị mua (Không ghi đè tên)
            if (cell.owner) {
                cellEl.classList.add(`owner-p${cell.owner}`); 
            }

            if(index === 0) {
                cellEl.innerHTML = '<span class="cell-title" style="font-weight:900;">START</span><br><span style="font-size:9px;color:#0f172a;position:relative;z-index:1;">+300$</span>';
            } else if (isWeb) {
                cellEl.innerHTML = `<span class="cell-title" style="color:#a855f7; font-weight:900;">MẠNG NHỆN</span><span class="cell-price" id="price-${index}">MẤT LƯỢT</span>`;
                const webIcon = document.createElement('div');
                webIcon.className = 'spider-icon'; webIcon.innerText = '🕸️';
                webIcon.style.position = 'absolute'; webIcon.style.fontSize = '24px';
                cellEl.appendChild(webIcon);
            } else if (isLightning) {
                cellEl.innerHTML = `<span class="cell-title" style="color:#eab308; font-weight:900;">🚨 THIÊN TAI</span><span class="cell-price" id="price-${index}">⚡ SẤM SÉT</span>`;
                const lightningIcon = document.createElement('div');
                lightningIcon.className = 'lightning-icon'; lightningIcon.innerText = '⚡';
                lightningIcon.style.position = 'absolute'; lightningIcon.style.fontSize = '26px'; lightningIcon.style.top = '5px';
                cellEl.appendChild(lightningIcon);
            } else if (isNuclearBomb) {
                // 🆕 BOM HẠT NHÂN - CHƯA NỔ
                cellEl.innerHTML = `<span class="cell-title" style="color:#ef4444; font-weight:900;">💣 BOM HẠT NHÂN</span><span class="cell-price" id="price-${index}">☢️ NGUY HIỂM</span>`;
                const bombIcon = document.createElement('div');
                bombIcon.className = 'nuclear-icon'; bombIcon.innerText = '💣';
                bombIcon.style.position = 'absolute'; bombIcon.style.fontSize = '30px'; bombIcon.style.top = '5px';
                bombIcon.style.animation = 'bombPulse 1s infinite alternate';
                cellEl.appendChild(bombIcon);
            } else if (isRadioactive) {
                // 🆕 NHIỄM PHÓNG XẠ
                cellEl.innerHTML = `<span class="cell-title" style="color:#22d3ee; font-weight:900;">☢️ PHÓNG XẠ</span><span class="cell-price" id="price-${index}">⚠️ -50$/lượt</span>`;
                const radIcon = document.createElement('div');
                radIcon.className = 'radioactive-icon'; radIcon.innerText = '☢️';
                radIcon.style.position = 'absolute'; radIcon.style.fontSize = '26px'; radIcon.style.top = '5px';
                radIcon.style.animation = 'radioactiveGlow 0.8s infinite alternate';
                cellEl.appendChild(radIcon);
            } else {
                // Giữ nguyên tiêu đề "Khu Đất {index}" bất kể đất đã thuộc về ai hay vừa được mua lại
                cellEl.innerHTML = `<span class="cell-title">Khu Đất ${index}</span><span class="cell-price" id="price-${index}">${cell.price}$</span>`;
            }
            
            const giftEl = document.createElement('div');
            giftEl.className = 'gift-box'; giftEl.innerText = '🎁';
            // 🆕 KHÔNG SINH HỘP QUÀ Ở Ô BOM VÀ PHÓNG XẠ
            if (index === 0 || isWeb || isLightning || isNuclearBomb || isRadioactive) {
                giftEl.style.display = 'none'; cellsData[index].hasGift = false;
            }
            cellEl.appendChild(giftEl);
            
            const slotP1 = document.createElement('div');
            slotP1.className = 'token-slot slot-p1'; slotP1.id = `slot-p1-${index}`;
            slotP1.innerHTML = '<span class="p-tag" id="p1-tag-board">P1</span><span class="p-avatar">🏃‍♂️</span>';
            cellEl.appendChild(slotP1);

            const slotP2 = document.createElement('div');
            slotP2.className = 'token-slot slot-p2'; slotP2.id = `slot-p2-${index}`;
            slotP2.innerHTML = '<span class="p-tag" id="p2-tag-board">P2</span><span class="p-avatar">🏃‍♂️</span>';
            cellEl.appendChild(slotP2);
            
            boardEl.appendChild(cellEl);
        });
        // 🆕 SAU KHI VẼ LẠI BÀN CỜ, KIỂM TRA BẢN THỂ HẮC ÁM
        // ================================================================
        if (window.darkChaseActive && window.darkChasePos !== null && window.darkChasePos !== undefined) {
            // Vẽ lại bản thể hắc ám
            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
            console.log(`👹 Đã vẽ lại Bản thể Hắc Ám tại ô ${window.darkChasePos} sau khi vẽ lại bàn cờ`);
        }
        // ===== 🆕 THÊM: ÁP DỤNG SKIN SAU KHI VẼ BÀN CỜ =====
        if (typeof updatePlayerSkin === 'function') {
            setTimeout(function() {
                updatePlayerSkin();
                console.log("✅ Đã áp dụng skin vào bàn cờ");
            }, 150);
        }
    }
    function syncGameToRemote() {

        if(socket && myPlayerNumber === currentTurn){

            socket.emit('syncActionData',{
                players: players,
                cellsData: cellsData,
                currentTurn: currentTurn
            });

        }

    }

    function checkAndUpgradeCombo(playerNum) {
        const TOTAL_CELLS = cellsData.length; 
        let baseComboUpgraded = false;

        for (let i = 0; i < TOTAL_CELLS; i++) {
            let idx1 = i;
            let idx2 = (i + 1) % TOTAL_CELLS;
            let idx3 = (i + 2) % TOTAL_CELLS;

            if (idx1 === 0 || idx2 === 0 || idx3 === 0) continue;
            if (idx1 === Number(spiderWebIndex) || idx2 === Number(spiderWebIndex) || idx3 === Number(spiderWebIndex)) continue;
            if (idx1 === Number(lightningIndex) || idx2 === Number(lightningIndex) || idx3 === Number(lightningIndex)) continue;

            if (cellsData[idx1].owner === playerNum && 
                cellsData[idx2].owner === playerNum && 
                cellsData[idx3].owner === playerNum) {
                
                let comboFound = false;
                [idx1, idx2, idx3].forEach(idx => {
                    if (!cellsData[idx].isUpgraded) {
                        cellsData[idx].isUpgraded = true;
                        cellsData[idx].price = cellsData[idx].price * 2; 
                        comboFound = true;
                        baseComboUpgraded = true;
                        
                        const cellEl = document.getElementById(`cell-${idx}`);
                        if (cellEl) {
                            cellEl.classList.add('upgraded-cyber');
                            const priceTag = cellEl.querySelector('.cell-price');
                            if (priceTag) priceTag.innerText = `${cellsData[idx].price}$`;
                        }
                    }
                });
                
                if (comboFound) {
                    addLog(`⚡ <strong>COMBO THẦN TỐC!</strong> ${players[playerNum].name} thâu tóm 3 ô liền kề [${idx1}, ${idx2}, ${idx3}], x2 giá trị đất!`);
                    playSFX(audioGame.buyLand);
                }
            }
        }
        if (baseComboUpgraded && socket) syncGameToRemote();
    }

    // 🎯 HÀM CẬP NHẬT: LOGIC HẠ CÁNH VÀO Ô ĐẶC BIỆT BẪY ĐỒNG BỘ 100%
    // =========================================================================
    function handleLandOnCell(cellIndex) {
        if (window.gameEnding) {
            console.log("⛔ Game đang kết thúc, bỏ qua handleLandOnCell!");
            return;
        }
        console.log("===== HANDLE LAND ON CELL =====");
        console.log("cellIndex =", cellIndex);
        console.log("window.lightningIndex =", window.lightningIndex);
        console.log("lightningIndex =", lightningIndex);
        console.log("window.nuclearBombIndex =", window.nuclearBombIndex);
        console.log("targetIndex =", Number(cellIndex));
        console.log("target == lightning ?", Number(cellIndex) === Number(lightningIndex));
        console.log("target == window.lightning ?", Number(cellIndex) === Number(window.lightningIndex));
        console.log("target == nuclearBomb ?", Number(cellIndex) === Number(window.nuclearBombIndex));
        const targetIndex = Number(cellIndex);
        console.log(`🎯 Quân cờ hạ cánh tại ô số: ${targetIndex}`);

        if (targetIndex === Number(window.spiderWebIndex) || targetIndex === Number(window.lightningIndex) || targetIndex === Number(window.nuclearBombIndex) || targetIndex === 0) {
            if (typeof hideBuyModal === 'function') hideBuyModal(); 
            if (typeof closeBuyModal === 'function') closeBuyModal();
        }

        // 🕸️ TRƯỜNG HỢP 1: SA VÀO MẠNG NHỆN
        if (targetIndex === Number(spiderWebIndex)) {
            playSFX(audioGame.loseMoney);
            const opponentTurn = currentTurn === 1 ? 2 : 1;
            console.log("currentTurn =", currentTurn);
            console.log("myPlayerNumber =", myPlayerNumber);
            console.log("opponentTurn =", opponentTurn);
            // Cấp 2 lượt cho đối thủ
            window.isMoving = false;

            const logMsg = `🕸️ BẪY MẠNG NHỆN! ${players[currentTurn].name} bị khóa chân. Đối thủ ${players[opponentTurn].name} được đi 2 lượt!`;

            if (socket && socket.connected) {
                window.extraTurns = 2;
                socket.emit('playerHitSpiderWebSync', {
                    logMsg: logMsg,
                    nextTurn: opponentTurn,
                    extraTurns: 2,
                    playersUpdate: players
                });
            } else {
                addLog(logMsg);
                window.currentTurn = opponentTurn;
                checkMyTurnControl();
            }
            return; 
        }

        // ⚡ TRƯỜNG HỢP 2: SA VÀO THIÊN TAI
        if (
            window.lightningIndex !== null &&
            targetIndex === Number(window.lightningIndex)
        ) { 
            console.log("🔥 ĐÃ VÀO NHÁNH THIÊN TAI");
            window.isMoving = true;
            playSFX(audioGame.lightning); 
            const activePlayer = players[currentTurn];
            let penalty = Math.floor(activePlayer.money * 0.5);
            activePlayer.money -= penalty;
            const TOTAL_CELLS = cellsData.length;
            let leftCell = (targetIndex - 1 + TOTAL_CELLS) % TOTAL_CELLS;
            let rightCell = (targetIndex + 1) % TOTAL_CELLS;
            let wipedNames = [];

            // 🆕 KHÔNG XÓA ĐẤT Ở: START, MẠNG NHỆN, BOM HẠT NHÂN, PHÓNG XẠ
            [leftCell, rightCell].forEach(idx => {
                if (idx !== 0 && 
                    idx !== Number(spiderWebIndex) && 
                    idx !== Number(window.nuclearBombIndex) &&
                    !cellsData[idx]?.isRadioactive) {
                    cellsData[idx].owner = null;
                    cellsData[idx].level = 1;
                    cellsData[idx].price = 100;
                    cellsData[idx].isUpgraded = false;
                    wipedNames.push(`Ô số ${idx}`);
                }
            });

            const log1 = `⚡ THIÊN TAI GIÁNG XUỐNG! ${activePlayer.name} bị phạt ${penalty}$.`;
            const log2 = `💸 San phẳng đất tại: ${wipedNames.join(', ')}.`;

            socket.emit('playerHitLightningSync', { logs: [log1, log2], playersUpdate: players, cellsDataUpdate: cellsData });
            return; 
        }

        // 💣 TRƯỜNG HỢP 3: SA VÀO BOM HẠT NHÂN (CHƯA NỔ)
        if (
            window.nuclearBombIndex !== null &&
            !window.nuclearBombDetonated &&
            targetIndex === Number(window.nuclearBombIndex)
        ) {
            console.log("💣 ĐÃ VÀO NHÁNH BOM HẠT NHÂN!");
            window.isMoving = true;
            playSFX(audioGame.lightning);
            
            if (typeof detonateNuclearBomb === 'function') {
                detonateNuclearBomb();
            }
            
            setTimeout(() => {
                if (!window.gameEnding) {
                    const nextTurn = currentTurn === 1 ? 2 : 1;
                    currentTurn = nextTurn;
                    if (socket && socket.connected) {
                        socket.emit('syncEndTurn', { nextTurn: nextTurn });
                    }
                    checkMyTurnControl();
                }
            }, 500);
            return;
        }

        // ================================================================
        // 🆕 KIỂM TRA BẢN THỂ HẮC ÁM
        // ================================================================
        if (window.darkChaseActive && targetIndex === window.darkChasePos) {
            // Nếu đối thủ dừng vào ô có bản thể hắc ám
            if (currentTurn === window.darkChaseTarget) {
                addLog(`💀 ${players[currentTurn].name} đã dừng vào ô có Bản thể Hắc Ám và bị bắt!`);
                executeDarkChaseCatch();
                return;
            }
            // Nếu chủ nhân dừng vào ô của chính mình
            if (currentTurn === window.darkChaseOwner) {
                addLog(`👹 ${players[currentTurn].name} đang đứng trên Bản thể Hắc Ám của mình.`);
                // Không làm gì cả, tiếp tục
            }
        }

        // 🟢 TRƯỜNG HỢP 4: Ô ĐẤT THƯỜNG
        if (targetIndex !== 0 && myPlayerNumber === currentTurn) {
            if (typeof showBuyModal === 'function') showBuyModal(targetIndex);
        }
    }

    function calculateTotalLandValue(playerNum) {
        let totalValue = 0;
        cellsData.forEach(cell => { if (cell.owner === playerNum) totalValue += cell.price; });
        return totalValue;
    }

    // ===== KẾT THÚC LƯỢT ĐI =====
    function endTurn() {
        console.log("===== END TURN =====");
        console.log("players[1].rounds =", players[1]?.rounds);
        console.log("players[2].rounds =", players[2]?.rounds);
        
        // 🔥 NẾU GAME ĐANG KẾT THÚC, THOÁT NGAY
        if (window.gameEnding) {
            console.log("⛔ Game đang kết thúc, bỏ qua endTurn!");
            return;
        }
        
        // ✅ THÊM: RESET skillUsedThisTurn KHI KẾT THÚC LƯỢT
        if (skillUsedThisTurn) {
            skillUsedThisTurn = false;
            console.log("✅ Đã reset skillUsedThisTurn sau khi kết thúc lượt");
        }
        
        // 🔥 KIỂM TRA VÒNG 7 - ƯU TIÊN CAO NHẤT
        if (players[1].rounds >= 7 || players[2].rounds >= 7) {
            console.log("🏁 PHÁT HIỆN VÒNG 7! KẾT THÚC NGAY LẬP TỨC!");
            
            // Đánh dấu game đang kết thúc
            window.gameEnding = true;
            window.isMoving = true;
            
            // Vô hiệu hóa nút roll ngay lập tức
            const rollBtn = document.getElementById('roll-btn');
            if (rollBtn) {
                rollBtn.disabled = true;
                rollBtn.innerText = "⏳ ĐANG KẾT THÚC...";
            }
            
            // Vô hiệu hóa nút skill
            const skillBtn = document.getElementById('use-skill-btn');
            if (skillBtn) {
                skillBtn.disabled = true;
            }
            
            // Ẩn thông báo mua đất nếu đang hiển thị
            if (typeof hideNotification === 'function') {
                hideNotification();
            }
            
            // Ngăn chặn bất kỳ hành động nào khác
            if (typeof closeBuyModal === 'function') {
                closeBuyModal();
            }
            if (typeof hideBuyModal === 'function') {
                hideBuyModal();
            }
            
            let p1Value = calculateTotalAsset(1);
            let p2Value = calculateTotalAsset(2);
            
            addLog(`🏁 Kết thúc trận!`);
            addLog(`📊 P1 (${players[1].name}): ${p1Value}$`);
            addLog(`📊 P2 (${players[2].name}): ${p2Value}$`);
            
            let winnerId;
            if (p1Value > p2Value) {
                winnerId = 1;
            } else if (p2Value > p1Value) {
                winnerId = 2;
            } else {
                winnerId = players[1].money >= players[2].money ? 1 : 2;
            }
            
            // 🔥 GỌI GAMEOVER VÀ THOÁT NGAY (KHÔNG GỬI SYNCACTIONDATA)
            gameOver(winnerId, "value_compare");
            return;
        }

        // 🔥 KIỂM TRA HẾT TIỀN
        if (players[1].money < 0) {
            console.log("💀 P1 HẾT TIỀN!");
            if (!window.gameEnding) {
                window.gameEnding = true;
                gameOver(2, "money");
            }
            return;
        }
        if (players[2].money < 0) {
            console.log("💀 P2 HẾT TIỀN!");
            if (!window.gameEnding) {
                window.gameEnding = true;
                gameOver(1, "money");
            }
            return;
        }
        
        // XỬ LÝ LƯỢT ƯU TIÊN (NẾU CÓ)
        if (typeof window.extraTurns !== 'undefined' && window.extraTurns > 0) {
            window.extraTurns--;
            if(window.extraTurns > 0){
                addLog(`🔄 ${players[currentTurn].name} còn ${window.extraTurns} lượt thưởng`);
                isMoving = false;
                if (socket && socket.connected) {
                    socket.emit('syncExtraTurn',{
                        currentTurn: currentTurn,
                        extraTurns: window.extraTurns
                    });
                }
                checkMyTurnControl();
                return;
            }
            window.extraTurns = 0;
        }
        else if (typeof extraTurnGranted !== 'undefined' && extraTurnGranted) {
            extraTurnGranted = false;
            addLog(`🔄 <strong>${players[currentTurn].name}</strong> nhận thêm lượt bổ sung!`);
        }
        else {
            currentTurn = currentTurn === 1 ? 2 : 1;
        }
        
        isMoving = false; 

        if (socket && socket.connected) {
            // 🔥 KIỂM TRA LẠI GAME CHƯA KẾT THÚC TRƯỚC KHI GỬI
            if (!window.gameEnding) {
                // Đồng bộ dữ liệu tiền vàng, đất đai hiện tại
                socket.emit('syncActionData', { players: players, cellsData: cellsData });
                
                // Chỉ kiểm tra thiên tai nếu game chưa kết thúc
                if (!window.gameEnding) {
                    checkAndSpawnDisaster();
                }
            }

            // Chuyển lượt đi
            socket.emit('syncEndTurn', { nextTurn: currentTurn });
        }
    }
    // ===== KIỂM TRA VÀ SINH THIÊN TAI =====
    function checkAndSpawnDisaster() {
        // Nếu game đang kết thúc, KHÔNG sinh thiên tai
        if (window.gameEnding) {
            console.log("⛔ Game đang kết thúc, bỏ qua sinh thiên tai!");
            return;
        }
        
        console.log("========== KIỂM TRA THIÊN TAI ==========");
        console.log("disasterSpawnedThisGame =", window.disasterSpawnedThisGame);
        console.log("P1 rounds =", players[1]?.rounds);
        console.log("P2 rounds =", players[2]?.rounds);

        if (
            !window.disasterSpawnedThisGame &&
            players[1]?.rounds >= 1 &&
            players[2]?.rounds >= 1
        ) {
            console.log("✅ Điều kiện xuất hiện thiên tai đạt.");

            const TOTAL_CELLS = cellsData.length;
            let randomDisasterIdx;
            let attempts = 0;
            const maxAttempts = 50;
            let found = false;
            
            // ===== 🆕 LỌC CÁC Ô HỢP LỆ =====
            while (!found && attempts < maxAttempts) {
                randomDisasterIdx = Math.floor(Math.random() * (TOTAL_CELLS - 1)) + 1;
                attempts++;
                
                // Kiểm tra ô có hợp lệ không
                const isWeb = (randomDisasterIdx === Number(spiderWebIndex));
                const isBomb = (randomDisasterIdx === Number(window.nuclearBombIndex));
                const isRadioactive = cellsData[randomDisasterIdx]?.isRadioactive || false;
                const isOwned = cellsData[randomDisasterIdx]?.owner !== null && cellsData[randomDisasterIdx]?.owner !== undefined;
                const isStart = (randomDisasterIdx === 0);
                
                // 🔥 KIỂM TRA CÁCH BOM HẠT NHÂN 1 Ô
                const isNearBomb = (
                    randomDisasterIdx === Number(window.nuclearBombIndex) - 1 ||
                    randomDisasterIdx === Number(window.nuclearBombIndex) + 1 ||
                    randomDisasterIdx === (Number(window.nuclearBombIndex) - 1 + TOTAL_CELLS) % TOTAL_CELLS ||
                    randomDisasterIdx === (Number(window.nuclearBombIndex) + 1) % TOTAL_CELLS
                );
                
                // ===== ĐIỀU KIỆN HỢP LỆ =====
                if (!isWeb && !isBomb && !isRadioactive && !isOwned && !isStart && !isNearBomb) {
                    found = true;
                    console.log(`✅ Tìm thấy ô thiên tai hợp lệ: ${randomDisasterIdx}`);
                }
            }
            
            // Nếu không tìm thấy ô hợp lệ, dùng fallback
            if (!found) {
                // Thử tìm ô trống bất kỳ (không phải web, bomb, start)
                for (let i = 1; i < TOTAL_CELLS; i++) {
                    if (i !== Number(spiderWebIndex) && 
                        i !== Number(window.nuclearBombIndex) && 
                        !cellsData[i]?.isRadioactive && 
                        cellsData[i]?.owner === null) {
                        randomDisasterIdx = i;
                        found = true;
                        console.log(`⚠️ Fallback: Chọn ô ${randomDisasterIdx} cho thiên tai`);
                        break;
                    }
                }
            }
            
            // Nếu vẫn không tìm thấy, bỏ qua thiên tai
            if (!found) {
                console.log("⚠️ Không tìm thấy ô hợp lệ cho thiên tai, bỏ qua!");
                return;
            }

            console.log("⚡ Random thiên tai =", randomDisasterIdx);

            const alertDisasterMsg = `🚨 THIÊN TAI XUẤT HIỆN tại ô ${randomDisasterIdx}`;

            if (socket && socket.connected) {
                console.log("📡 Gửi triggerDisasterSpawn lên Server");
                try {
                    socket.emit("triggerDisasterSpawn", {
                        lightningIndex: randomDisasterIdx,
                        logMsg: alertDisasterMsg
                    });
                    console.log("✅ Đã gửi triggerDisasterSpawn");
                } catch(err) {
                    console.error("❌ triggerDisasterSpawn lỗi:", err);
                }
            }
        }
    }
    // ===== KIỂM TRA QUYỀN ĐIỀU KHIỂN & ĐỒNG BỘ NÚT =====
    function checkMyTurnControl() {
        const rollBtn = document.getElementById('roll-btn');
        if(!rollBtn) return;

        // ===== 🆕 KIỂM TRA HIỆU ỨNG PHÓNG XẠ TRƯỚC KHI CHO XÚC XẮC =====
        if (myPlayerNumber === currentTurn && gameStarted) {
            const player = players[myPlayerNumber];
            if (player.radiationEffect > 0) {
                // Trừ 25$ mỗi lượt xúc xắc
                player.money -= 25;
                player.radiationEffect -= 1;
                
                addLog(`☢️ ${player.name} bị ảnh hưởng phóng xạ! Mất 25$. Còn ${player.radiationEffect} lượt.`);
                
                // 🔥 KIỂM TRA HẾT TIỀN - GỌI GAMEOVER NGAY
                if (player.money < 0) {
                    const enemy = myPlayerNumber === 1 ? 2 : 1;
                    addLog(`💀 ${player.name} đã phá sản do nhiễm phóng xạ!`);
                    
                    // Gọi gameOver (sẽ tự động gửi lên server và hiển thị popup)
                    gameOver(enemy, "money");
                    
                    // Cập nhật UI
                    updateUI();
                    
                    // Đồng bộ phóng xạ
                    if (socket && socket.connected) {
                        socket.emit('syncRadiationEffect', {
                            players: {
                                1: { radiationEffect: players[1].radiationEffect || 0 },
                                2: { radiationEffect: players[2].radiationEffect || 0 }
                            }
                        });
                    }
                    return;
                }
                
                if (player.radiationEffect <= 0) {
                    addLog(`✅ ${player.name} đã hết hiệu ứng phóng xạ!`);
                }
                
                // Đồng bộ phóng xạ
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                if (socket && socket.connected) {
                    socket.emit('syncRadiationEffect', {
                        players: {
                            1: { radiationEffect: players[1].radiationEffect || 0 },
                            2: { radiationEffect: players[2].radiationEffect || 0 }
                        }
                    });
                }
                
                updateUI();
            }
        }

        // ✅ THÊM: Reset skillUsedThisTurn khi bắt đầu lượt mới (đảm bảo an toàn)
        if (myPlayerNumber === currentTurn && gameStarted) {
            if (skillUsedThisTurn) {
                skillUsedThisTurn = false;
                console.log("✅ Đã reset skillUsedThisTurn ở đầu lượt (checkMyTurnControl)");
            }
        }

        if (typeof gameStarted !== 'undefined' && gameStarted && currentTurn !== null) {
            rollBtn.onclick = () => {
                playSFX(audioGame.dice);
                if (typeof rollDice3D === 'function') rollDice3D();
            };

            if (myPlayerNumber === currentTurn) {
                rollBtn.disabled = isMoving; 
                // CẬP NHẬT TEXT NẾU ĐANG TRONG LƯỢT ƯU TIÊN
                if (typeof window.extraTurns !== 'undefined' && window.extraTurns > 0) {
                    rollBtn.innerText = `ĐỔ XÚC XẮC (LƯỢT THÊM: ${window.extraTurns})`;
                } else {
                    rollBtn.innerText = "ĐỔ XÚC XẮC";
                }
            } else {
                rollBtn.disabled = true;
                rollBtn.innerText = `ĐỢI ĐỐI THỦ (${players[currentTurn].name})...`;
            }
        } else if (typeof determineTurn === 'function' && determineTurnData.p1Roll === null && determineTurnData.p2Roll === null) {
            determineTurn();
        }
        
        if (typeof updateUI === 'function') {
            updateUI();
        }

        if (typeof updateSkillUI === 'function') {
            updateSkillUI();
        }
    }
    // ===== TÍNH TỔNG TÀI SẢN (TIỀN + GIÁ TRỊ ĐẤT) =====
    function calculateTotalAsset(playerId){
        let money = players[playerId].money;
        let landValue = calculateTotalLandValue(playerId);
        return money + landValue;
    }
    // ===== GỬI GAMEOVER LÊN SERVER =====
    function gameOver(winnerId, reason = "money") {
        console.log("🏆 GAME OVER - Người thắng:", winnerId);
        console.log("📊 Lý do:", reason);
        console.log("👤 myPlayerNumber:", myPlayerNumber);
        
        // ===== 🛡️ CHỐNG HACK TỪ CONSOLE =====
        const stack = new Error().stack;
        if (stack && stack.includes('console')) {
            console.warn('🚨 PHÁT HIỆN GỌI gameOver TỪ CONSOLE!');
            alert('⚠️ Hành vi không được phép!');
            return;
        }
        
        // 🔥 KIỂM TRA ĐÃ XỬ LÝ GAMEOVER CHƯA (CHỐNG GỌI 2 LẦN)
        if (window._gameOverProcessing) {
            console.log("⛔ Đang xử lý gameOver, bỏ qua!");
            return;
        }
        window._gameOverProcessing = true;
        
        // 🔥 ĐÁNH DẤU GAME ĐÃ KẾT THÚC - DỪNG MỌI HÀNH ĐỘNG
        window.gameEnding = true;
        window.gameStarted = false;
        window.isMoving = true;
        
        // Ẩn nút rời trận
        if (typeof hideLeaveButton === 'function') {
            hideLeaveButton();
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
        
        // Ẩn thông báo mua đất
        if (typeof hideNotification === 'function') {
            hideNotification();
        }
        if (typeof closeBuyModal === 'function') {
            closeBuyModal();
        }
        if (typeof hideBuyModal === 'function') {
            hideBuyModal();
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
            showSimpleGameOver(winnerId);
            window._gameOverProcessing = false;
            return;
        }
        
        const isWin = (myPlayerNumber === winnerId);
        console.log(`🏆 Bạn có thắng không? ${isWin}`);
        
        // ===== 🔥 CHỈ NGƯỜI THẮNG GỬI GAMEOVER LÊN SERVER =====
        if (isWin) {
            if (window._gameOverSent) {
                console.log("⛔ Đã gửi gameOver rồi, bỏ qua!");
            } else {
                window._gameOverSent = true;
                if (socket && socket.connected) {
                    socket.emit("gameOver", {
                        winnerId: winnerId,
                        reason: reason
                    });
                    console.log("📤 Đã gửi gameOver lên server (lần đầu và duy nhất)");
                }
            }
        } else {
            console.log("🚪 Bạn là người thua, không gửi gameOver lên server!");
        }
        
        // ✅ FALLBACK: Nếu sau 5s không nhận được matchResult, tự hiển thị (CHO CẢ THẮNG VÀ THUA)
        setTimeout(() => {
            if (!window._gameOverReceived) {
                console.log("⏰ Timeout: Không nhận được matchResult, tự hiển thị kết quả...");
                const fallbackData = {
                    winnerId: winnerId,
                    isWinner: isWin,
                    reason: reason,
                    totalRounds: 0,
                    reward: {
                        winner: { exp: 150, coins: 50, points: 25 },
                        loser: { exp: 75, coins: 25, points: -20 }
                    }
                };
                if (typeof showMatchResultAnimation === 'function') {
                    showMatchResultAnimation(isWin, currentUser, fallbackData);
                } else {
                    showSimpleGameOver(winnerId);
                }
            }
        }, 5000);
        
        window._gameOverProcessing = false;
    }
    // ===== HIỂN THỊ GAME OVER ĐƠN GIẢN (FALLBACK) =====
    function showSimpleGameOver(winnerId) {
        console.log("📊 HIỂN THỊ GAME OVER FALLBACK");
        
        if(audioGame.bgm){
            audioGame.bgm.pause();
            audioGame.bgm.currentTime = 0;
        }

        const rollBtn = document.getElementById('roll-btn');
        if(rollBtn) rollBtn.disabled = true;

        const turnTxt = document.getElementById('turn-txt');
        if(turnTxt){
            turnTxt.innerText = "TRẬN ĐẤU KẾT THÚC";
            turnTxt.style.background = "#ef4444";
        }

        const overlay = document.getElementById('game-over-overlay');
        if(overlay) overlay.style.display = 'flex';

        const winText = document.getElementById('winner-text');
        if(winText && players[winnerId]) {
            winText.innerHTML = `
                <div style="font-size:60px;">🏆</div>
                <h1 style="color:#facc15;font-size:32px;">CHIẾN THẮNG!</h1>
                <div style="font-size:28px;font-weight:900;color:#10b981;">
                    ${players[winnerId].name.toUpperCase()}
                </div>
            `;
        }

        addLog(`👑 <strong>NHÀ VÔ ĐỊCH: ${players[winnerId]?.name || 'Unknown'}</strong>`);
    }
    // --- LOGIC TÍNH TOÁN KINH NGHIỆM, RANK VÀ COIN ---

    const RANKS = [
        { name: "Bùn", minPoints: 0 },
        { name: "Sắt", minPoints: 100 },
        { name: "Đồng", minPoints: 200 },
        { name: "Bạc", minPoints: 300 },
        { name: "Vàng", minPoints: 400 },
        { name: "Kim Cương", minPoints: 500 },
        { name: "Hali (Thách Đấu)", minPoints: 600 }
    ];

    // --- LOGIC TÍNH TOÁN KINH NGHIỆM, RANK VÀ COIN ---

    function handleMatchEnd(isWin, currentExp, currentPoints, currentCoins) {
        // 1. Gán phần thưởng theo Thắng/Thua
        const reward = isWin ? { exp: 150, coins: 50, points: 25 } : { exp: 75, coins: 25, points: -20 };

        // 2. Tính EXP (1000 exp = 1 cấp)
        let totalExp = currentExp + reward.exp;
        let level = Math.floor(totalExp / 1000) + 1; 

        // 3. Tính Điểm Rank (Không cho phép điểm âm)
        let newPoints = Math.max(0, currentPoints + reward.points);
        let currentRank = RANKS[0].name;

        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (newPoints >= RANKS[i].minPoints) {
                currentRank = RANKS[i].name;
                break;
            }
        }

        // 4. Cộng tiền xu
        let totalCoins = currentCoins + reward.coins;

        // 5. Hiển thị bảng tổng kết 
        let rankDisplayText = `${currentRank} [${reward.points >= 0 ? '+' + reward.points : reward.points}đ]`;
        showMatchSummary(reward.exp, rankDisplayText, reward.coins);

        // 6. Đóng gói dữ liệu mới
        const updatedData = { 
            level: level, 
            exp: totalExp, 
            points: newPoints, 
            rank: currentRank, 
            coins: totalCoins 
        };

        // 7. GỬI DỮ LIỆU LÊN SERVER ĐỂ LƯU VÀO DATABASE
        if (typeof socket !== 'undefined') {
            socket.emit('updatePlayerStats', updatedData);
            console.log("Đã gửi dữ liệu lên server:", updatedData);
        } else {
            console.warn("Lỗi: Socket chưa kết nối, không thể lưu vào database!");
        }

        return updatedData;
    }
    // =========================================================================
    // 🏆 HỆ THỐNG RANK, KINH NGHIỆM VÀ ANIMATION KẾT THÚC TRẬN ĐẤU
    // =========================================================================

    // 1. HÀM XÁC ĐỊNH RANK THEO ĐIỂM SỐ
    function getRankInfo(points) {
        if (points >= 600) return { name: "Hali", icon: "assets/ranks/hali.jpg" };
        if (points >= 500)  return { name: "Kim Cương", icon: "assets/ranks/kimcuong.jpg" };
        if (points >= 400)  return { name: "Vàng", icon: "assets/ranks/vang.jpg" };
        if (points >= 300)  return { name: "Bạc", icon: "assets/ranks/bac.jpg" };
        if (points >= 200)  return { name: "Đồng", icon: "assets/ranks/dong.jpg" };
        if (points >= 100)   return { name: "Sắt", icon: "assets/ranks/sat.jpg" };
        
        return { name: "Bùn", icon: "assets/ranks/bun.jpg" }; // Dưới 100 RP
    }

    // 2. Hàm chạy animation
    // ===== HÀM CHẠY ANIMATION =====
    // ===== HÀM CHẠY ANIMATION =====
    async function showMatchResultAnimation(isWin, currentUserData, matchData) {
        console.log("🎬 ===== BẮT ĐẦU ANIMATION =====");
        console.log("📊 isWin:", isWin);
        console.log("📊 matchData:", matchData);
        
        // 🔥 HIỂN THỊ OVERLAY NGAY LẬP TỨC (ƯU TIÊN HÀNG ĐẦU)
        // Sử dụng setTimeout 0 để đẩy việc hiển thị lên đầu event loop
        const gameOverOverlay = document.getElementById("game-over-overlay");
        if (gameOverOverlay) {
            // Đảm bảo overlay hiển thị ngay cả khi DOM chưa kịp cập nhật
            gameOverOverlay.style.display = "flex";
            gameOverOverlay.style.visibility = "visible";
            gameOverOverlay.classList.remove("hidden");
            // Force reflow để đảm bảo trình duyệt áp dụng ngay
            void gameOverOverlay.offsetHeight;
        } else {
            console.error("❌ Không tìm thấy game-over-overlay!");
            return;
        }

        // Ẩn tất cả modal có thể đang hiển thị
        if (typeof hideNotification === 'function') hideNotification();
        if (typeof closeBuyModal === 'function') closeBuyModal();
        if (typeof hideBuyModal === 'function') hideBuyModal();

        // ===== LẤY PHẦN THƯỞNG TỪ SERVER =====
        let expGained = 0;
        let coinsGained = 0;
        let pointsGained = 0;
        
        if (matchData && matchData.reward) {
            if (isWin) {
                expGained = matchData.reward.winner?.exp || 0;
                coinsGained = matchData.reward.winner?.coins || 0;
                pointsGained = matchData.reward.winner?.points || 0;
            } else {
                expGained = matchData.reward.loser?.exp || 0;
                coinsGained = matchData.reward.loser?.coins || 0;
                pointsGained = matchData.reward.loser?.points || 0;
            }
        } else {
            console.warn("⚠️ Không nhận được reward từ server, dùng giá trị mặc định");
            expGained = isWin ? 150 : 75;
            coinsGained = isWin ? 50 : 25;
            pointsGained = isWin ? 25 : -20;
        }
        
        console.log("📊 Phần thưởng:", { expGained, coinsGained, pointsGained });

        // 🔥 LẤY DỮ LIỆU USER
        let currentPts = currentUserData?.points || 0;
        let totalExp = currentUserData?.exp || 0;
        let currentCoins = currentUserData?.coin || currentUserData?.coins || 0;
        let playerName = currentUserData?.display_name || currentUserData?.username || "Bạn";
        let userId = currentUserData?.id || currentUserData?.username;

        // 🔥 LẤY CÁC ELEMENT
        const titleEl = document.getElementById("match-status-title");
        const winnerTextEl = document.getElementById("winner-text");
        const rankIconEl = document.getElementById("rank-icon");
        const rankPtsEl = document.getElementById("current-rank-pts");
        const rankDeltaEl = document.getElementById("rank-delta");
        const levelBadgeEl = document.getElementById("summary-level-num");
        const expTextEl = document.getElementById("exp-text");
        const expBarEl = document.getElementById("exp-bar-fill");
        const coinRewardEl = document.getElementById("coin-reward");

        // ===== A. TIÊU ĐỀ =====
        if (titleEl) {
            titleEl.innerText = isWin ? "🏆 VICTORY!" : "💀 DEFEAT!";
            titleEl.style.color = isWin ? "#4efe80" : "#ff4757";
        }
        
        if (winnerTextEl) {
            winnerTextEl.innerText = isWin ? 
                `🎉 ${playerName} đã chiến thắng! (${matchData?.totalRounds || 0} vòng)` : 
                `💀 ${playerName} đã thất bại! (${matchData?.totalRounds || 0} vòng)`;
        }

        // ===== B. RANK ICON =====
        let initialRank = getRankInfo(currentPts);
        if (rankIconEl) {
            rankIconEl.src = initialRank.icon;
            rankIconEl.alt = initialRank.name;
        }
        if (rankPtsEl) rankPtsEl.innerText = currentPts;
        if (coinRewardEl) coinRewardEl.innerText = `+${coinsGained} Coin`;

        // ===== C. ANIMATION RANK =====
        if (rankDeltaEl) {
            rankDeltaEl.className = pointsGained >= 0 ? "delta-text delta-plus" : "delta-text delta-minus";
            rankDeltaEl.innerText = pointsGained >= 0 ? `+${pointsGained}` : `${pointsGained}`;
        }

        let targetPts = Math.max(0, currentPts + pointsGained);
        let ptsStep = pointsGained > 0 ? 1 : -1;
        let lastRankName = initialRank.name;

        let ptsInterval = setInterval(() => {
            if (currentPts === targetPts) {
                clearInterval(ptsInterval);
            } else {
                currentPts += ptsStep;
                if (rankPtsEl) rankPtsEl.innerText = currentPts;
                
                let updatedRank = getRankInfo(currentPts);
                if (updatedRank.name !== lastRankName) {
                    lastRankName = updatedRank.name;
                    if (rankIconEl) {
                        rankIconEl.src = updatedRank.icon;
                        rankIconEl.classList.remove("rank-up-anim");
                        void rankIconEl.offsetWidth;
                        rankIconEl.classList.add("rank-up-anim");
                    }
                }
            }
        }, 40);

        // ===== D. ANIMATION EXP & LEVEL =====
        let level = Math.floor(totalExp / 1000) + 1;
        let currentLevelExp = totalExp % 1000;
        let remainingExpToAdd = expGained;

        if (levelBadgeEl) levelBadgeEl.innerText = level;
        if (expBarEl) expBarEl.style.width = `${(currentLevelExp / 1000) * 100}%`;
        if (expTextEl) expTextEl.innerText = `${currentLevelExp} / 1000 EXP`;

        await new Promise(r => setTimeout(r, 400));

        let expInterval = setInterval(() => {
            if (remainingExpToAdd <= 0) {
                clearInterval(expInterval);
                return;
            }

            currentLevelExp += 2;
            remainingExpToAdd -= 2;

            if (currentLevelExp >= 1000) {
                currentLevelExp -= 1000;
                level++;
                if (levelBadgeEl) {
                    levelBadgeEl.innerText = level;
                    if (levelBadgeEl.parentElement) {
                        levelBadgeEl.parentElement.classList.add("level-up-flash");
                        setTimeout(() => levelBadgeEl.parentElement.classList.remove("level-up-flash"), 1000);
                    }
                }
            }

            if (expBarEl) expBarEl.style.width = `${(currentLevelExp / 1000) * 100}%`;
            if (expTextEl) expTextEl.innerText = `${currentLevelExp} / 1000 EXP`;
        }, 20);

        // ===== E. CẬP NHẬT LOCALSTORAGE =====
        const finalTotalExp = totalExp + expGained;
        const finalPoints = targetPts;
        const finalRank = getRankInfo(finalPoints).name;
        const finalCoins = currentCoins + coinsGained;
        const finalLevel = Math.floor(finalTotalExp / 1000) + 1;

        const localUser = JSON.parse(localStorage.getItem("currentUser")) || {};
        const updatedUserData = {
            ...localUser,
            level: finalLevel,
            exp: finalTotalExp,
            points: finalPoints,
            rank: finalRank,
            coin: finalCoins,
            coins: finalCoins
        };

        localStorage.setItem("currentUser", JSON.stringify(updatedUserData));
        localStorage.setItem("user", JSON.stringify(updatedUserData));

        if (typeof updateLobbyUI === "function") {
            updateLobbyUI(updatedUserData);
        }

        // ================================================================
        // 🆕 GỬI DỮ LIỆU LÊN SERVER ĐỂ LƯU VÀO DATABASE
        // ================================================================
        if (userId) {
            try {
                const response = await fetch('/api/update-result', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: userId,
                        level: finalLevel,
                        exp: finalTotalExp,
                        points: finalPoints,
                        rank: finalRank,
                        coins: finalCoins
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Đã lưu dữ liệu vào database thành công!');
                } else {
                    console.error('❌ Lỗi lưu database:', result.message);
                }
            } catch (err) {
                console.error('❌ Lỗi kết nối API:', err.message);
            }
        } else {
            console.warn('⚠️ Không có userId để lưu database!');
        }

        console.log("🎬 ===== ANIMATION HOÀN TẤT =====");
    }
    // ===== HIỂN THỊ/ẨN NÚT RỜI TRẬN =====
    function showLeaveButton() {
        const btn = document.getElementById('btn-leave-game');
        if (btn) {
            btn.style.display = 'block';
            console.log("✅ Đã hiển thị nút rời trận");
        }
    }

    function hideLeaveButton() {
        const btn = document.getElementById('btn-leave-game');
        if (btn) {
            btn.style.display = 'none';
            console.log("✅ Đã ẩn nút rời trận");
        }
    }

    // ===== RỜI TRẬN =====
    function leaveGame() {
        showConfirm(
            '⚠️ Xác nhận rời trận',
            'Bạn có chắc muốn rời trận đấu?\n\nHành động này sẽ bị tính là THUA CUỘC!',
            function() {
                // ✅ Đồng ý rời trận
                console.log("🚪 Đang gửi yêu cầu rời phòng...");
                
                if (typeof showNotification === 'function') {
                    showNotification('🚪 Đang rời trận đấu...', 'warning', 2000);
                }
                
                if (socket && socket.connected) {
                    socket.emit('leave-room', {
                        reason: 'player_left'
                    });
                    console.log("📤 Đã gửi leave-room lên server");
                }
                
                setTimeout(() => {
                    document.getElementById('game-screen').style.display = 'none';
                    document.getElementById('lobby-screen').style.display = 'flex';
                    if (typeof enableLobbyButtons === 'function') {
                        enableLobbyButtons();
                    }
                    if (typeof hideLeaveButton === 'function') {
                        hideLeaveButton();
                    }
                    window.gameStarted = false;
                    window.gameEnding = false;
                    if (typeof hideNotification === 'function') {
                        hideNotification();
                    }
                }, 1500);
            },
            function() {
                // ❌ Hủy rời trận
                console.log("✅ Đã hủy rời trận");
                if (typeof showNotification === 'function') {
                    showNotification('✅ Đã hủy rời trận', 'info', 1500);
                }
            }
        );
    }
    // Hàm hiển thị chỉ số mới nhất lên Màn hình Sảnh
    function updateLobbyUI(userData) {
        // Lấy dữ liệu người dùng từ tham số truyền vào hoặc localStorage
        const user = userData || JSON.parse(localStorage.getItem("user"));
        if (!user) return;

        // 1. Cập nhật Tên hiển thị
        const nameEl = document.getElementById("user-display");
        if (nameEl) {
            nameEl.innerText = user.display_name || user.username || "Người chơi";
        }

        // 2. Cập nhật Level
        const levelEl = document.getElementById("user-level");
        if (levelEl) {
            levelEl.innerText = user.level || 1;
        }

        // 3. Cập nhật Coin (Xu)
        const coinEl = document.getElementById("user-coin");
        if (coinEl) {
            coinEl.innerText = (user.coins !== undefined ? user.coins : user.coin) || 0;
        }

        // 4. Cập nhật HÌNH ẢNH RANK hiện tại
        const rankImgEl = document.getElementById("user-rank-icon");
        if (rankImgEl && typeof getRankInfo === "function") {
            // Dùng hàm getRankInfo truyền vào số điểm (points hoặc rank_points) để lấy đường dẫn ảnh
            const userPoints = user.points || user.rank_points || 0;
            const rankInfo = getRankInfo(userPoints);
            
            // Gắn đường dẫn ảnh Rank vào thẻ <img>
            rankImgEl.src = rankInfo.icon;
            rankImgEl.alt = rankInfo.name;
        }
    }
    window.addEventListener("DOMContentLoaded", () => {

        const btnQuick = document.getElementById("btn-quick-match");
        const btnCreate = document.getElementById("btn-create-room");
        const btnJoin = document.getElementById("btn-join-room");

        if (btnQuick) {
            btnQuick.onclick = startQuickMatch;
            console.log("Đã gắn nút ghép ngẫu nhiên");
        }

        if (btnCreate) {
            btnCreate.onclick = createNewRoom;
            console.log("Đã gắn nút tạo phòng");
        }

        if (btnJoin) {
            btnJoin.onclick = joinRoomWithId;
            console.log("Đã gắn nút vào phòng");
        }

    });
    // ===== HỆ THỐNG THÔNG BÁO ĐẸP =====
let notificationTimeout = null;

function showNotification(message, type = 'info', duration = 4000) {
    const notif = document.getElementById('custom-notification');
    const msg = document.getElementById('notification-message');
    
    if (!notif || !msg) {
        // Fallback: dùng alert nếu chưa có element
        alert(message);
        return;
    }
    
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    msg.textContent = message;
    notif.className = type;
    notif.style.display = 'block';
    notif.style.animation = 'none';
    void notif.offsetWidth;
    notif.style.animation = 'slideDown 0.4s ease-out';
    
    notificationTimeout = setTimeout(() => {
        hideNotification();
    }, duration);
}

function hideNotification() {
    const notif = document.getElementById('custom-notification');
    if (notif) {
        notif.style.display = 'none';
    }
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}
function showConfirm(title, message, onConfirm, onCancel) {
    const modal = document.getElementById('custom-confirm');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    
    if (!modal) {
        // Fallback: dùng confirm cũ nếu chưa có modal
        if (confirm(message)) {
            if (onConfirm) onConfirm();
        } else {
            if (onCancel) onCancel();
        }
        return;
    }
    
    titleEl.textContent = title || 'Xác nhận';
    msgEl.textContent = message || 'Bạn có chắc chắn?';
    
    // Xóa sự kiện cũ
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    
    newOk.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    });
    
    newCancel.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        if (onCancel) onCancel();
    });
    
    // Click bên ngoài để đóng
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            if (onCancel) onCancel();
        }
    });
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}
// ===== ĐÓNG CONFIRM =====
function closeConfirm() {
    const modal = document.getElementById('custom-confirm');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
}

// ===== HIỂN THỊ THÔNG TIN NGƯỜI CHƠI =====
function loadUserInfo() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    const avatar = document.getElementById('userinfo-avatar');
    const name = document.getElementById('userinfo-name');
    const level = document.getElementById('userinfo-level');
    const coin = document.getElementById('userinfo-coin');
    const rank = document.getElementById('userinfo-rank');
    const exp = document.getElementById('userinfo-exp');
    
    // Cập nhật avatar
    const rankImages = {
        "Bùn": "bun.jpg",
        "Sắt": "sat.jpg",
        "Đồng": "dong.jpg",
        "Bạc": "bac.jpg",
        "Vàng": "vang.jpg",
        "Kim Cương": "kimcuong.jpg",
        "Hali": "hali.jpg"
    };
    const fileName = rankImages[user.rank] || "bun.jpg";
    if (avatar) avatar.src = "assets/ranks/" + fileName;
    
    if (name) name.textContent = user.display_name || user.username || "Người chơi";
    if (level) level.textContent = user.level || 1;
    if (coin) coin.textContent = user.coin || user.coins || 0;
    if (rank) rank.textContent = user.rank || "Bùn";
    if (exp) exp.textContent = user.exp || 0;
}

// ===== CHAT SYSTEM (CÓ KẾT NỐI SERVER) =====
let currentChatRoom = null;
let currentChatRoomId = null;

function loadChatRooms() {
    const container = document.getElementById('chat-room-list');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'flex';
    document.getElementById('chat-room-content').style.display = 'none';
    document.getElementById('chat-messages').innerHTML = '<div class="empty">Chưa có tin nhắn</div>';
    
    const rooms = [
        { id: 1, icon: '🍵', name: 'Phòng trà' },
        { id: 2, icon: '🎮', name: 'Game thủ' },
        { id: 3, icon: '💬', name: 'Tán gẫu' },
        { id: 4, icon: '🌟', name: 'Hội Hali' },
        { id: 5, icon: '🔥', name: 'Nhiệt huyết' }
    ];
    
    rooms.forEach((room) => {
        const div = document.createElement('div');
        div.className = 'chat-room-item';
        div.innerHTML = `
            <div style="font-size: 22px;">${room.icon}</div>
            <div style="color: #f8fafc; font-weight: bold; font-size: 13px;">${room.name}</div>
            <div style="color: #94a3b8; font-size: 10px;">${room.id === 1 ? '👥 0 người' : ''}</div>
        `;
        div.onclick = () => joinChatRoom(room.id, room.name);
        container.appendChild(div);
    });
}

function joinChatRoom(roomId, roomName) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    
    currentChatRoomId = roomId;
    currentChatRoom = roomName;
    
    // Hiển thị UI chat
    document.getElementById('chat-room-list').style.display = 'none';
    document.getElementById('chat-room-content').style.display = 'block';
    document.getElementById('chat-messages').innerHTML = `<div style="color: #94a3b8; text-align: center; padding: 10px;">⏳ Đang kết nối đến ${roomName}...</div>`;
    
    // Gửi yêu cầu tham gia phòng lên server
    if (socket && socket.connected) {
        socket.emit('join-chat-room', {
            roomId: roomId,
            roomName: roomName,
            userName: user.display_name || user.username || 'Người chơi',
            userId: user.id
        });
    } else {
        document.getElementById('chat-messages').innerHTML = `
            <div style="color: #ef4444; text-align: center; padding: 10px;">
                ❌ Không thể kết nối đến server chat!
            </div>
        `;
    }
}

function leaveChatRoom() {
    if (socket && socket.connected) {
        socket.emit('leave-chat-room');
    }
    
    currentChatRoom = null;
    currentChatRoomId = null;
    document.getElementById('chat-room-list').style.display = 'flex';
    document.getElementById('chat-room-content').style.display = 'none';
    document.getElementById('chat-input').value = '';
    
    // Xóa tin nhắn cũ
    document.getElementById('chat-messages').innerHTML = '<div class="empty">Chưa có tin nhắn</div>';
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    if (!currentChatRoomId) {
        alert('Bạn chưa vào phòng chat nào!');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const userName = user?.display_name || user?.username || 'Người chơi';
    
    // Gửi tin nhắn lên server
    if (socket && socket.connected) {
        socket.emit('chat-message', {
            message: message,
            roomId: currentChatRoomId,
            userName: userName
        });
    } else {
        // Fallback: hiển thị local nếu mất kết nối
        addChatMessage('system', '❌ Mất kết nối server, tin nhắn không được gửi!');
    }
    
    input.value = '';
}

function addChatMessage(type, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    // Xóa thông báo "Chưa có tin nhắn" nếu có
    const emptyMsg = container.querySelector('.empty');
    if (emptyMsg) emptyMsg.remove();
    
    const div = document.createElement('div');
    const isSystem = type === 'system';
    div.style.cssText = `
        padding: 4px 10px;
        margin-bottom: 2px;
        border-radius: 4px;
        font-size: 13px;
        color: ${isSystem ? '#94a3b8' : '#f8fafc'};
        ${isSystem ? 'text-align: center; font-style: italic;' : ''}
        ${!isSystem ? 'background: rgba(255,255,255,0.05);' : ''}
        word-wrap: break-word;
    `;
    div.textContent = content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ===== LẮNG NGHE SỰ KIỆN CHAT TỪ SERVER =====
if (socket) {
    // Nhận tin nhắn chat
    socket.on('chat-message', (data) => {
        console.log('📨 Nhận tin nhắn chat:', data);
        addChatMessage(data.type, data.content);
    });
    
    // Xác nhận đã vào phòng
    socket.on('chat-joined', (data) => {
        console.log('✅ Đã vào phòng chat:', data);
        document.getElementById('chat-messages').innerHTML = '';
        addChatMessage('system', `✅ Đã vào ${data.roomName}`);
        addChatMessage('system', '💬 Hãy bắt đầu trò chuyện!');
    });
    
    // Lỗi chat
    socket.on('chat-error', (data) => {
        console.error('❌ Lỗi chat:', data);
        addChatMessage('system', `❌ ${data.message}`);
    });
}

// ===== XỬ LÝ ENTER ĐỂ GỬI TIN NHẮN =====
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        // Xóa sự kiện cũ để tránh trùng
        chatInput.removeEventListener('keypress', handleChatEnter);
        chatInput.addEventListener('keypress', handleChatEnter);
    }
});

function handleChatEnter(e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
}

// ===== HIỂN THỊ CHỦ ĐỀ SKIN VIP =====
function showSkinEffectText(title, subtitle, color1, color2, icon) {
    const textDiv = document.createElement('div');
    textDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 52px;
        font-weight: 900;
        color: #fff;
        text-shadow: 0 0 30px ${color1}, 0 0 60px ${color2}, 0 0 100px ${color2};
        z-index: 99999;
        pointer-events: none;
        animation: skinEffectIn 2.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        text-align: center;
        background: rgba(0, 0, 0, 0.5);
        padding: 25px 50px;
        border-radius: 24px;
        border: 2px solid ${color1};
        box-shadow: 0 0 60px ${color1}44, inset 0 0 60px ${color1}22;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;
    textDiv.innerHTML = `
        <div style="font-size: 90px; margin-bottom: 8px; filter: drop-shadow(0 0 30px ${color1});">${icon}</div>
        <div style="font-size: 32px; font-weight: 900; background: linear-gradient(135deg, ${color1}, ${color2}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: none;">
            ${title}
        </div>
        <div style="font-size: 16px; color: ${color1}; margin-top: 6px; letter-spacing: 4px; font-weight: 300; -webkit-text-fill-color: ${color1};">
            ${subtitle}
        </div>
    `;
    document.body.appendChild(textDiv);
    
    // Xóa sau 3 giây
    setTimeout(() => {
        if (textDiv.parentNode) {
            textDiv.style.opacity = '0';
            textDiv.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (textDiv.parentNode) textDiv.remove();
            }, 500);
        }
    }, 2800);
}



// ===== HIỆU ỨNG HẠT SÁNG CHUNG =====
function createParticleEffect() {
    const colors = ['#facc15', '#f97316', '#ef4444', '#a855f7', '#38bdf8', '#34d399'];
    const container = document.getElementById('board');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 8 + 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 1.5 + 1;
        const delay = Math.random() * 0.5;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            top: ${y}%;
            left: ${x}%;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 0 10px ${color};
            animation: particleFloat ${duration}s ease-out ${delay}s forwards;
        `;
        container.appendChild(particle);
        setTimeout(() => particle.remove(), (duration + delay) * 1000 + 500);
    }
}
function playPhoenixEffectGlobal() {
    console.log('🔥 Kích hoạt hiệu ứng Phượng hoàng (toàn cục)');
    
    // Thêm class phoenix cho avatar
    document.querySelectorAll('.slot-p1 .p-avatar, .slot-p2 .p-avatar').forEach(el => {
        if (el.textContent === '🦅' || el.textContent === '🔥') {
            el.classList.add('skin-phoenix');
        }
    });
    
    // 🔥 HIỆU ỨNG CHỮ: PHƯỢNG HOÀNG GIÁNG THẾ
    showSkinEffectText(
        '🔥 PHƯỢNG HOÀNG GIÁNG THẾ',
        '⚡ BẤT TỬ CHI LỰC ⚡',
        '#facc15',
        '#ef4444',
        '🦅'
    );
    
    // Lông vũ rơi (nhiều hơn, mượt hơn)
    createPhoenixFeathersAdvanced();
    
    // Hiệu ứng ánh sáng rực rỡ
    const flashContainer = document.createElement('div');
    flashContainer.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99998;
        background: radial-gradient(circle at 50% 50%, rgba(250, 204, 21, 0.3) 0%, rgba(239, 68, 68, 0.15) 40%, transparent 70%);
        animation: phoenixFlash 2.5s ease-out forwards;
    `;
    document.body.appendChild(flashContainer);
    setTimeout(() => {
        if (flashContainer.parentNode) flashContainer.remove();
    }, 2800);
    
    // Âm thanh
    if (audioGame && audioGame.phoenix) {
        audioGame.phoenix.currentTime = 0;
        audioGame.phoenix.volume = 0.8;
        audioGame.phoenix.play().catch(() => {});
    }
}

function playDragonEffectGlobal() {
    console.log('🐉 Kích hoạt hiệu ứng Rồng thần (toàn cục)');
    
    // Thêm class legendary cho avatar
    document.querySelectorAll('.slot-p1 .p-avatar, .slot-p2 .p-avatar').forEach(el => {
        if (el.textContent === '🐉') {
            el.classList.add('skin-legendary');
        }
    });
    
    // 🐉 HIỆU ỨNG CHỮ: RỒNG THẦN XUẤT HIỆN
    showSkinEffectText(
        '🐉 RỒNG THẦN XUẤT HIỆN',
        '⚡ UY LỰC VẠN CỔ ⚡',
        '#f97316',
        '#dc2626',
        '🐉'
    );
    
    // Rung màn hình mạnh mẽ hơn
    document.body.classList.add('dragon-shake');
    setTimeout(() => {
        document.body.classList.remove('dragon-shake');
    }, 1800);
    
    // Hiệu ứng lửa bùng nổ
    const fireContainer = document.createElement('div');
    fireContainer.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99998;
        background: radial-gradient(circle at 50% 50%, rgba(255, 100, 0, 0.35) 0%, rgba(200, 50, 0, 0.15) 40%, transparent 70%);
        animation: dragonFire 2.5s ease-out forwards;
    `;
    document.body.appendChild(fireContainer);
    setTimeout(() => {
        if (fireContainer.parentNode) fireContainer.remove();
    }, 2800);
    
    // Âm thanh
    if (audioGame && audioGame.dragon) {
        audioGame.dragon.currentTime = 0;
        audioGame.dragon.volume = 0.8;
        audioGame.dragon.play().catch(() => {});
    }
}
function playUnicornEffectGlobal() {
    console.log('🦄 Kích hoạt hiệu ứng Kỳ Lân (toàn cục)');
    
    document.querySelectorAll('.slot-p1 .p-avatar, .slot-p2 .p-avatar').forEach(el => {
        if (el.textContent === '🦄') {
            el.classList.add('skin-unicorn');
        }
    });
    
    showSkinEffectText(
        '🦄 KỲ LÂN HIỆN THẾ',
        '⚡ PHÉP MÀU CỔ TÍCH ⚡',
        '#a855f7',
        '#ec4899',
        '🦄'
    );
    
    const rainbowContainer = document.createElement('div');
    rainbowContainer.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 99998;
        background: radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.15) 40%, rgba(251, 191, 36, 0.1) 60%, transparent 80%);
        animation: unicornRainbow 2.5s ease-out forwards;
    `;
    document.body.appendChild(rainbowContainer);
    setTimeout(() => {
        if (rainbowContainer.parentNode) rainbowContainer.remove();
    }, 2800);
    
    if (audioGame && audioGame.horse) {
        audioGame.horse.currentTime = 0;
        audioGame.horse.volume = 0.8;
        audioGame.horse.play().catch(() => {});
    }
}
// ===== LÔNG VŨ PHƯỢNG HOÀNG NÂNG CAO (THÊM MỚI) =====
function createPhoenixFeathersAdvanced() {
    const colors = ['#facc15', '#f97316', '#ef4444', '#fb923c', '#fcd34d', '#f87171'];
    const board = document.getElementById('board');
    if (!board) return;
    
    const featherCount = 40; // Tăng số lượng lông vũ
    
    for (let i = 0; i < featherCount; i++) {
        const feather = document.createElement('div');
        const size = Math.random() * 18 + 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 2 + 1.5;
        const delay = Math.random() * 1.2;
        const rotate = Math.random() * 360;
        const tx = (Math.random() - 0.5) * 200;
        const ty = Math.random() * 150 + 50;
        
        feather.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size * 2.2}px;
            background: ${color};
            border-radius: 50% 50% 50% 0;
            top: ${y}%;
            left: ${x}%;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.9;
            transform: rotate(${rotate}deg);
            animation: featherFallAdvanced ${duration}s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s forwards;
            box-shadow: 0 0 20px ${color}66;
            filter: blur(0.5px);
        `;
        feather.style.setProperty('--tx', tx + 'px');
        feather.style.setProperty('--ty', ty + 'px');
        board.appendChild(feather);
        setTimeout(() => {
            if (feather.parentNode) feather.remove();
        }, (duration + delay) * 1000 + 500);
    }
}
// ===== CẤU HÌNH HIỆU ỨNG SKIN VIP =====
const VIP_SKIN_EFFECTS = {
    'skin_dragon': {
        title: '🐉 RỒNG THẦN XUẤT HIỆN',
        subtitle: '⚡ UY LỰC VẠN CỔ ⚡',
        color1: '#f97316',
        color2: '#dc2626',
        icon: '🐉',
        sound: 'dragon',
        class: 'skin-legendary'
    },
    'skin_phoenix': {
        title: '🔥 PHƯỢNG HOÀNG GIÁNG THẾ',
        subtitle: '⚡ BẤT TỬ CHI LỰC ⚡',
        color1: '#facc15',
        color2: '#ef4444',
        icon: '🦅',
        sound: 'phoenix',
        class: 'skin-phoenix'
    },
    'skin_unicorn': {
        title: '🦄 KỲ LÂN HIỆN THẾ',
        subtitle: '⚡ PHÉP MÀU CỔ TÍCH ⚡',
        color1: '#a855f7',
        color2: '#ec4899',
        icon: '🦄',
        sound: 'horse',
        class: 'skin-unicorn'
    },
};

function playSkinEffectGlobal(skinId) {
    const effect = VIP_SKIN_EFFECTS[skinId];
    if (!effect) return;
    
    console.log(`✨ Kích hoạt hiệu ứng VIP cho ${skinId}`);
    
    // Thêm class cho avatar
    document.querySelectorAll('.slot-p1 .p-avatar, .slot-p2 .p-avatar').forEach(el => {
        if (el.textContent === effect.icon) {
            el.classList.add(effect.class);
        }
    });
    
    // Hiệu ứng chữ
    showSkinEffectText(
        effect.title,
        effect.subtitle,
        effect.color1,
        effect.color2,
        effect.icon
    );
    
    // Âm thanh
    if (audioGame && audioGame[effect.sound]) {
        audioGame[effect.sound].currentTime = 0;
        audioGame[effect.sound].volume = 0.8;
        audioGame[effect.sound].play().catch(() => {});
    }
    
    // Hiệu ứng đặc biệt theo từng skin
    if (skinId === 'skin_dragon') {
        document.body.classList.add('dragon-shake');
        setTimeout(() => {
            document.body.classList.remove('dragon-shake');
        }, 1800);
        
        const fireContainer = document.createElement('div');
        fireContainer.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99998;
            background: radial-gradient(circle at 50% 50%, rgba(255, 100, 0, 0.35) 0%, rgba(200, 50, 0, 0.15) 40%, transparent 70%);
            animation: dragonFire 2.5s ease-out forwards;
        `;
        document.body.appendChild(fireContainer);
        setTimeout(() => {
            if (fireContainer.parentNode) fireContainer.remove();
        }, 2800);
        
    } else if (skinId === 'skin_phoenix') {
        createPhoenixFeathersAdvanced();
        
        const flashContainer = document.createElement('div');
        flashContainer.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99998;
            background: radial-gradient(circle at 50% 50%, rgba(250, 204, 21, 0.3) 0%, rgba(239, 68, 68, 0.15) 40%, transparent 70%);
            animation: phoenixFlash 2.5s ease-out forwards;
        `;
        document.body.appendChild(flashContainer);
        setTimeout(() => {
            if (flashContainer.parentNode) flashContainer.remove();
        }, 2800);
    } else if (skinId === 'skin_unicorn') {
        // 🆕 HIỆU ỨNG KỲ LÂN - CẦU VỒNG
        // Hiệu ứng cầu vồng
        const rainbowContainer = document.createElement('div');
        rainbowContainer.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99998;
            background: radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.25) 0%, rgba(236, 72, 153, 0.15) 40%, rgba(251, 191, 36, 0.1) 60%, transparent 80%);
            animation: unicornRainbow 2.5s ease-out forwards;
        `;
        document.body.appendChild(rainbowContainer);
        setTimeout(() => {
            if (rainbowContainer.parentNode) rainbowContainer.remove();
        }, 2800);
        
        // Thêm class unicorn cho avatar
        document.querySelectorAll('.slot-p1 .p-avatar, .slot-p2 .p-avatar').forEach(el => {
            if (el.textContent === '🦄') {
                el.classList.add('skin-unicorn');
            }
        });
    }
}
// ===== ĐĂNG XUẤT =====
function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        location.reload();
    }
}
// ===== NÚT QUAY VỀ =====
function handleBackToLobby() {
    // Chỉ reload trang, không gửi gì thêm
    // Không gọi socket.emit hay gameOver gì cả
    console.log("🔙 Quay về lobby - reload trang");
    location.reload();
}
// ===== KIỂM TRA VÀ KÍCH HOẠT HIỆU ỨNG SKIN VIP =====
function checkAndPlaySkinEffects() {
    const user = getShopUser();
    if (!user) {
        console.log("⚠️ Không có user để kiểm tra skin");
        return;
    }
    
    const skinId = user.skin || 'skin_default';
    const skin = window.SKIN_LIST ? window.SKIN_LIST.find(s => s.id === skinId) : null;
    
    console.log(`🎯 Kiểm tra skin VIP: ${skinId}`);
    
    if (skin && skin.rarity === 'legendary') {
        console.log(`✨ Kích hoạt hiệu ứng VIP cho ${skin.name}`);
        
        // Gửi hiệu ứng lên server
        if (socket && socket.connected) {
            socket.emit('trigger-skin-effect', {
                skinId: skinId,
                playerNumber: 1
            });
            console.log('📤 Đã gửi trigger-skin-effect lên server');
        }
        
        // Hiển thị trên máy hiện tại
        setTimeout(() => {
            if (typeof playSkinEffectGlobal === 'function') {
                playSkinEffectGlobal(skinId);
            } else {
                // Fallback cho các hàm cũ
                if (skinId === 'skin_phoenix') {
                    playPhoenixEffectGlobal();
                } else if (skinId === 'skin_dragon') {
                    playDragonEffectGlobal();
                }
            }
        }, 800);
    }
}