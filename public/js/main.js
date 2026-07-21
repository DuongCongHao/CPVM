window.haoBossTriggered = false;
window.haoWarningPlayed=false;
// ===== KHỞI TẠO KẾT NỐI SOCKET.IO THÔNG MINH (TỰ ĐỘNG ĐỔI URL) =====
const NODE_JS_PORT = 3000; 
window.lightningIndex = null;
window.spiderWebIndex = null;
// Kiểm tra xem trình duyệt có đang chạy ở môi trường localhost hay không
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const SOCKET_SERVER_URL = isLocalhost ? `http://localhost:${NODE_JS_PORT}` : window.location.origin;

// Không dùng lại từ khóa "let" nếu config.js đã khai báo trước. Thay bằng gán đè an toàn.
if (typeof socket === 'undefined' || socket === null) {
    if (typeof io !== 'undefined') {
        socket = io(SOCKET_SERVER_URL);
        console.log("🔌 Đang kết nối tới Socket Server tại: " + SOCKET_SERVER_URL);
    }
}

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
    // 🕸️ Lắng nghe vị trí Mạng Nhện ngẫu nhiên do server khởi tạo đầu trận
    socket.on('init-traps', (data) => {
        window.spiderWebIndex = data.spiderWebIndex;
        lightningIndex = data.lightningIndex;
        window.lightningIndex = lightningIndex;
        window.disasterSpawnedThisGame = false;
        console.log(`[SOCKET] Mạng nhện trận này được đặt tại ô: ${window.spiderWebIndex}`);
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
    socket.on("gameOver", (data)=>{

        showGameOver(
            data.winnerId,
            data.reason
        );

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


    const user = JSON.parse(
        localStorage.getItem("currentUser")
    );


    if (!user) {

        alert("Bạn chưa đăng nhập!");

        return;

    }



    if (socket && socket.connected) {


        disableLobbyButtons();


        const lobbyStatus =
            document.getElementById('lobby-status');


        if (lobbyStatus) {

            lobbyStatus.innerHTML =
            "⏳ Đang tìm kiếm đối thủ phù hợp trên hệ thống...<br>Vui lòng đợi người chơi khác vào trận.";

        }



        socket.emit(
            'request-quick-match',
            {

                name: username,

                userId: user.id

            }
        );


    } else {


        alert(
            "❌ Thất bại: Hiện tại mất kết nối tới máy chủ, không thể ghép trận!"
        );


        enableLobbyButtons();

    }

}

function createNewRoom() {

    const username = getValidUsername();

    if (!username) return;


    const user = JSON.parse(
        localStorage.getItem("currentUser")
    );


    if(!user){

        alert("Bạn chưa đăng nhập!");

        return;

    }


    if (socket && socket.connected) {


        disableLobbyButtons();


        const lobbyStatus =
        document.getElementById('lobby-status');


        if (lobbyStatus) {

            lobbyStatus.innerHTML =
            "⚙️ Đang gửi yêu cầu khởi tạo phòng riêng tư lên Server...";

        }


        socket.emit(
            'request-create-room',
            {

                name: username,

                userId:user.id

            }
        );


    } else {


        alert(
        "❌ Thất bại: Mất kết nối máy chủ, không thể tạo phòng riêng tư!"
        );


        enableLobbyButtons();

    }

}

function joinRoomWithId() {

    const username = getValidUsername();

    if (!username) return;


    const user = JSON.parse(
        localStorage.getItem("currentUser")
    );


    if(!user){

        alert("Bạn chưa đăng nhập!");

        return;

    }


    const roomIdInput =
    document.getElementById('room-id-input');


    const roomId =
    roomIdInput ? roomIdInput.value.trim() : "";


    if (!roomId) {

        alert(
        "Vui lòng nhập ID phòng (Mã phòng) do bạn của bạn gửi!"
        );

        return;

    }


    if (socket && socket.connected) {


        disableLobbyButtons();


        const lobbyStatus =
        document.getElementById('lobby-status');


        if (lobbyStatus) {

            lobbyStatus.innerHTML =
            `🏃‍♂️ Đang kết nối vào phòng [${roomId}]...`;

        }


        socket.emit(
            'request-join-room',
            {

                name: username,

                userId:user.id,

                roomId:roomId

            }
        );


    } else {


        alert(
        "❌ Thất bại: Không thể kết nối đến máy chủ để vào phòng!"
        );


        enableLobbyButtons();

    }

}
function displayRoomId(roomId) {
    const roomDisplayEl = document.getElementById('room-id-display');
    if (roomDisplayEl) {
        roomDisplayEl.innerHTML = `Mã Phòng: <strong style="color: #f59e0b;">${roomId}</strong>`;
    }
}
// ===============================
// BỐ HẢO EVENT
// ===============================
// Kiểm tra mỗi khi người chơi hoàn thành 1 vòng
function checkHaoBossEvent(playerId){

    const p = players[playerId];

    // ===== VÒNG 4 : CHỈ CẢNH BÁO =====
    if(
        p.rounds >= 4 &&
        !window.haoWarningPlayed
    ){

        window.haoWarningPlayed = true;

        addLog("🚨 BỐ HẢO SẮP XUẤT HIỆN!");

        showHaoBossWarning();

    }

    // ===== VÒNG 5 : BOSS XUẤT HIỆN =====
    if(
        p.rounds >= 5 &&
        !window.haoBossTriggered
    ){

        window.haoBossTriggered = true;

        addLog("🔥 BỐ HẢO ĐÃ XUẤT HIỆN!");

        spawnHaoBoss();

        setTimeout(()=>{

            haoBossSweep();

        },3000);

    }

}


// ===============================
// BỐ HẢO QUÉT
// ===============================
function haoBossSweep(){

    addLog("🔥 BỐ HẢO BẮT ĐẦU CÀN QUÉT!");

    for(let i=1;i<=2;i++){

        const p = players[i];

        const currentCell = cellsData[p.pos];

        const safe =
            p.pos===0 ||
            (
                currentCell &&
                currentCell.owner===i
            );

        if(!safe){

            p.money-=500;

            addLog(
                `🔥 <strong>${p.name}</strong> không đứng trên đất của mình.<br>-500$`
            );

            if(p.money<0){

                const enemy=i===1?2:1;

                removeHaoBoss();

                gameOver(enemy,"money");

                return;

            }

        }
        else{

            addLog(
                `🏠 <strong>${p.name}</strong> đang ở nhà nên được an toàn.`
            );

        }

    }

    removeHaoBoss();

    updateUI();

    if(typeof syncGameToRemote==="function"){
        syncGameToRemote();
    }

}



// ===============================
// HIỆN CẢNH BÁO
// ===============================
function showHaoBossWarning(){

    const warning=document.getElementById("hao-warning");

    if(!warning) return;

    // phát âm thanh danger
    if(audioGame && audioGame.danger){

        audioGame.danger.currentTime=0;

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

    },3000);

}



// ===============================
// SINH BỐ HẢO
// ===============================
function spawnHaoBoss(){

    const startCell=document.getElementById("cell-0");

    if(!startCell) return;

    if(document.getElementById("hao-boss")) return;

    const boss=document.createElement("div");

    boss.id="hao-boss";

    boss.innerHTML="💀";

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
// ===== KHỞI TẠO BÀN CỜ VẼ LƯỚI MA TRẬN =====
function initializeBoard() {
    console.log("========== DRAW BOARD ==========");
    console.log("window.lightningIndex =", window.lightningIndex);
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    
    const oldCells = boardEl.querySelectorAll('.cell');
    oldCells.forEach(cell => cell.remove());

    cellsData.forEach((cell, index) => {
        const cellEl = document.createElement('div');
        const isWeb = (index === Number(spiderWebIndex));
        const isLightning = (index === Number(window.lightningIndex));
        
        cellEl.className = `cell ${index === 0 ? 'start-cell' : ''} ${isWeb ? 'has-spider-web' : ''} ${isLightning ? 'has-lightning' : ''}`;
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
        } else {
            // Giữ nguyên tiêu đề "Khu Đất {index}" bất kể đất đã thuộc về ai hay vừa được mua lại
            cellEl.innerHTML = `<span class="cell-title">Khu Đất ${index}</span><span class="cell-price" id="price-${index}">${cell.price}$</span>`;
        }
        
        const giftEl = document.createElement('div');
        giftEl.className = 'gift-box'; giftEl.innerText = '🎁';
        if (index === 0 || isWeb || isLightning) {
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

// =========================================================================
// 🎯 HÀM CẬP NHẬT: LOGIC HẠ CÁNH VÀO Ô ĐẶC BIỆT BẪY ĐỒNG BỘ 100%
// =========================================================================
function handleLandOnCell(cellIndex) {
    
    console.log("===== HANDLE LAND ON CELL =====");
    console.log("cellIndex =", cellIndex);
    console.log("window.lightningIndex =", window.lightningIndex);
    console.log("lightningIndex =", lightningIndex);
    console.log("targetIndex =", Number(cellIndex));
    console.log("target == lightning ?", Number(cellIndex) === Number(lightningIndex));
    console.log("target == window.lightning ?", Number(cellIndex) === Number(window.lightningIndex));
    const targetIndex = Number(cellIndex);
    console.log(`🎯 Quân cờ hạ cánh tại ô số: ${targetIndex}`);

    if (targetIndex === Number(window.spiderWebIndex) || targetIndex === Number(window.lightningIndex) || targetIndex === 0) {
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
        window.isMoving = false; // Giải phóng nút ngay lập tức

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

    // ⚡ TRƯỜNG HỢP 2: SA VÀO THIÊN TAI (Giữ nguyên logic của bạn)
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

        [leftCell, rightCell].forEach(idx => {
            if (idx !== 0 && idx !== Number(spiderWebIndex)) {
                cellsData[idx].owner = null; cellsData[idx].level = 1;
                cellsData[idx].price = 100; cellsData[idx].isUpgraded = false;
                wipedNames.push(`Ô số ${idx}`);
            }
        });

        const log1 = `⚡ THIÊN TAI GIÁNG XUỐNG! ${activePlayer.name} bị phạt ${penalty}$.`;
        const log2 = `💸 San phẳng đất tại: ${wipedNames.join(', ')}.`;

        socket.emit('playerHitLightningSync', { logs: [log1, log2], playersUpdate: players, cellsDataUpdate: cellsData });
        return; 
    }

    // 🟢 TRƯỜNG HỢP 3: Ô ĐẤT THƯỜNG
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
    console.log(players[1].rounds);
    console.log(players[2].rounds);
    if (players[1].rounds >= 7 || players[2].rounds >= 7) {
        let p1Value = calculateTotalAsset(1);
        let p2Value = calculateTotalAsset(2);
        addLog(
        `🏁 Kết thúc trận!
        P1: ${p1Value}$
        P2: ${p2Value}$`
        );
        if (p1Value > p2Value) return gameOver(1, "value_compare");
        else if (p2Value > p1Value) return gameOver(2, "value_compare");
        else return gameOver(players[1].money >= players[2].money ? 1 : 2, "value_compare");
    }

    if (players[1].money < 0) return gameOver(2, "money");
    if (players[2].money < 0) return gameOver(1, "money");
    
    // XỬ LÝ LƯỢT ƯU TIÊN (NẾU CÓ)
    if (typeof window.extraTurns !== 'undefined' && window.extraTurns > 0) {

        window.extraTurns--;

        if(window.extraTurns > 0){

            addLog(
            `🔄 ${players[currentTurn].name} còn ${window.extraTurns} lượt thưởng`
            );

            isMoving = false;

            socket.emit('syncExtraTurn',{
                currentTurn: currentTurn,
                extraTurns: window.extraTurns
            });

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
        // Đồng bộ dữ liệu tiền vàng, đất đai hiện tại
        socket.emit('syncActionData', { players: players, cellsData: cellsData });
        console.log("========== KIỂM TRA THIÊN TAI ==========");
        console.log("disasterSpawnedThisGame =", window.disasterSpawnedThisGame);
        console.log("P1 rounds =", players[1].rounds);
        console.log("P2 rounds =", players[2].rounds);

        if (
            !window.disasterSpawnedThisGame &&
            players[1].rounds >= 1 &&
            players[2].rounds >= 1
        ) {

            console.log("✅ Điều kiện xuất hiện thiên tai đạt.");

            const TOTAL_CELLS = cellsData.length;

            let randomDisasterIdx;

            do {
                randomDisasterIdx =
                    Math.floor(Math.random() * (TOTAL_CELLS - 1)) + 1;
            } while (randomDisasterIdx === Number(spiderWebIndex));

            console.log("⚡ Random thiên tai =", randomDisasterIdx);

            const alertDisasterMsg =
                `🚨 THIÊN TAI XUẤT HIỆN tại ô ${randomDisasterIdx}`;

            if (socket && socket.connected) {

                console.log("📡 Gửi triggerDisasterSpawn lên Server");

                try {

                    socket.emit("triggerDisasterSpawn", {

                        lightningIndex: randomDisasterIdx,
                        logMsg: alertDisasterMsg

                    });

                    console.log("✅ Đã gửi triggerDisasterSpawn");
                }
                catch(err){
                    console.error("❌ triggerDisasterSpawn lỗi");
                    console.error(err);
                }
            } else {
                console.error("❌ Socket chưa kết nối.");
            }

        }

        // Chuyển lượt đi
        socket.emit('syncEndTurn', { nextTurn: currentTurn });
    }
}

// ===== KIỂM TRA QUYỀN ĐIỀU KHIỂN & ĐỒNG BỘ NÚT =====
function checkMyTurnControl() {
    const rollBtn = document.getElementById('roll-btn');
    if(!rollBtn) return;

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
function calculateTotalAsset(playerId){

    let money = players[playerId].money;

    let landValue = calculateTotalLandValue(playerId);

    return money + landValue;
}
// ===== KẾT THÚC TRÒ CHƠI HOÀN TOÀN =====
let matchResultSent = false;

// ===== GỬI GAMEOVER LÊN SERVER =====
function gameOver(winnerId, reason = "money") {
    // GỬI SERVER: Trận đấu kết thúc
    socket.emit("gameOver", {
        winnerId: winnerId,
        reason: reason
    });

    // Hiển thị kết quả trên máy hiện tại
    showGameOver(winnerId, reason);
}
// ===== HIỂN THỊ KẾT QUẢ GAMEOVER =====
function showGameOver(winnerId, reason = "money") {


    if(audioGame.bgm){

        audioGame.bgm.pause();

        audioGame.bgm.currentTime = 0;

    }


    const rollBtn = document.getElementById('roll-btn');

    if(rollBtn)
        rollBtn.disabled = true;



    if(typeof hideNotification === 'function')
        hideNotification();



    const turnTxt = document.getElementById('turn-txt');


    if(turnTxt){

        turnTxt.innerText = "TRẬN ĐẤU KẾT THÚC";

        turnTxt.style.background = "#ef4444";

    }



    const overlay = document.getElementById('game-over-overlay');

    const winText = document.getElementById('winner-text');


    if(overlay)
        overlay.style.display = 'flex';



    if(winText){


        let winner = players[winnerId];


        let loserId = winnerId === 1 ? 2 : 1;


        let loser = players[loserId];



        let winnerLand =
            calculateTotalLandValue(winnerId);



        let loserLand =
            calculateTotalLandValue(loserId);



        let winnerTotal =
            winner.money + winnerLand;



        let loserTotal =
            loser.money + loserLand;



        winText.innerHTML = `


        <div class="victory-box">


            <div style="
                font-size:60px;
                animation:trophy 1s infinite alternate;
            ">
                🏆
            </div>



            <h1 style="
                color:#facc15;
                font-size:32px;
                margin:10px;
            ">
                CHIẾN THẮNG!
            </h1>



            <div style="
                font-size:28px;
                font-weight:900;
                color:#10b981;
            ">
                ${winner.name.toUpperCase()}
            </div>



            <hr>



            <div class="stat-line">
                💰 Tiền mặt:
                <b>${winner.money}$</b>
            </div>



            <div class="stat-line">
                🏠 Giá trị đất:
                <b>${winnerLand}$</b>
            </div>



            <div class="stat-line total">
                👑 Tổng tài sản:
                <b>${winnerTotal}$</b>
            </div>



            <br>



            <div style="
                color:#94a3b8;
                font-size:14px;
            ">

                Đối thủ ${loser.name}

                <br>

                💰 ${loser.money}$

                |

                🏠 ${loserLand}$


                <br>

                Tổng:
                ${loserTotal}$

            </div>



            <div style="
                margin-top:15px;
                color:#38bdf8;
            ">

            🎮 Trận đấu kết thúc sau 

            ${Math.max(
                players[1].rounds,
                players[2].rounds
            )}

            vòng

            </div>


        </div>


        `;

    }



    addLog(
        `👑 <strong>NHÀ VÔ ĐỊCH: ${players[winnerId].name}</strong> thâu tóm toàn bộ sàn đấu!`
    );

}