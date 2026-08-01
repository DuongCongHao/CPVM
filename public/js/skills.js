// ===== ĐẦU FILE skills.js =====
// Khởi tạo biến toàn cục cho Hắc Ám Truy Sát
if (typeof window.darkChaseActive === 'undefined') {
    window.darkChaseActive = false;
    window.darkChaseOwner = null;
    window.darkChaseTarget = null;
    window.darkChasePos = null;
    window.darkChaseTargetPos = null;
    window.darkChaseTurns = 0;
    window.darkChaseStarted = false;
    window.darkChaseCaught = false;  // 🆕 THÊM BIẾN NÀY
    window.darkChaseDice = 0;
}
// ===============================
// HỆ THỐNG THẺ KỸ NĂNG
// ===============================

const skillCards = {
    hacAmTruySat: {
        id: "hacAmTruySat",
        name: "🌑 Hắc Ám Truy Sát",
        description: "Triệu hồi bản thể hắc ám đuổi theo đối thủ 3 lượt. Đuổi kịp → mất 10% tiền + 1 ô đất!",
        type: "chase"
    },

    dieuHuong: {
        id: "dieuHuong",
        name: "👻 Tàng Hình",
        description: "Ẩn thân và dịch chuyển đến ô ngẫu nhiên. Hiệu ứng kết thúc khi đến ô START.",
        type: "move"
    },

    thor: {
        id: "thor",
        name: "⚡ Sét Đánh",
        description: "Bắn tia sét vào đối thủ, gây mất 5% tiền và đẩy lùi 3 ô.",
        type: "attack"
    },

    cuopTien: {
        id: "cuopTien",
        name: "💰 Cướp Tiền",
        description: "Lấy 15% tiền hiện có của đối thủ.",
        type: "steal"
    },

    doiViTri: {
        id: "doiViTri",
        name: "🔄 Đổi Vị Trí",
        description: "Đổi vị trí hiện tại với đối thủ.",
        type: "swap"
    }
};

function initPlayerSkills(serverSkills){
    console.log("===== INIT PLAYER SKILLS =====");
    console.log(serverSkills);

    players[1].skill = skillCards[serverSkills[1]];
    players[2].skill = skillCards[serverSkills[2]];

    console.log("P1:", players[1].skill);
    console.log("P2:", players[2].skill);

    updateSkillUI();
}

function updateSkillButton(){
    const btn = document.getElementById("use-skill-btn");

    if(!btn) return;

    // chỉ bật khi: tới lượt mình + còn kỹ năng
    btn.disabled = !(
        currentTurn === myPlayerNumber &&
        players[myPlayerNumber] &&
        players[myPlayerNumber].skill &&
        !players[myPlayerNumber].skillUsed
    );
}

function useSkill(){
    // 🔥 KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
    if (window.gameEnding) {
        console.log("⛔ Game đã kết thúc, không thể dùng skill!");
        alert("Trận đấu đã kết thúc!");
        return;
    }
    
    if(!gameStarted) {
        alert("Game chưa bắt đầu!");
        return;
    }

    if(currentTurn !== myPlayerNumber){
        alert("Chưa tới lượt của bạn!");
        return;
    }

    // Không còn kỹ năng
    if (!players[myPlayerNumber].skill || players[myPlayerNumber].skillUsed) {
        alert("Bạn đã dùng hết kỹ năng!");
        return;
    }

    let skill = players[myPlayerNumber].skill;
    let enemy = myPlayerNumber === 1 ? 2 : 1;

    addLog(
        "✨ <strong>" +
        players[myPlayerNumber].name +
        "</strong> đã sử dụng <strong>" +
        skill.name +
        "</strong>"
    );

    let shouldEndTurn = true;

    switch(skill.id){
        case "cuopTien":
            playSFX(audioGame.buyLand);
            let money = Math.floor(players[enemy].money * 0.15);
            players[enemy].money -= money;
            players[myPlayerNumber].money += money;
            addLog(
                "💰 " + players[myPlayerNumber].name +
                " đã cướp " + money + "$ của đối thủ"
            );
            break;

        case "doiViTri":
            let opponent = myPlayerNumber === 1 ? 2 : 1;
            let tempPos = players[opponent].pos;
            players[opponent].pos = players[myPlayerNumber].pos;
            players[myPlayerNumber].pos = tempPos;
            addLog(
                "🔄 " + players[myPlayerNumber].name +
                " đã đổi vị trí với đối thủ"
            );
            updateUI();
            break;

        // ===== 🆕 THẦN THOR MỚI =====
        case "thor":
            playSFX(audioGame.lightning);
            
            // Đối thủ mất 5% tiền
            let lostMoney = Math.floor(players[enemy].money * 0.05);
            players[enemy].money -= lostMoney;
            
            // Lưu vị trí cũ để hiệu ứng sét
            let oldPos = players[enemy].pos;
            
            // Đối thủ bị đẩy lùi 3 ô
            let newPos = (oldPos - 3 + TOTAL_CELLS) % TOTAL_CELLS;
            players[enemy].pos = newPos;
            
            // Hiệu ứng sét trên ô cũ của đối thủ
            if (typeof showThorStrike === 'function') {
                showThorStrike(oldPos);
            }
            
            addLog(
                "⚡ " + players[myPlayerNumber].name +
                " bắn sét vào " + players[enemy].name +
                "! Mất " + lostMoney + "$ và bị đẩy lùi 3 ô về ô " + newPos + "!"
            );
            
            // Cập nhật UI
            updateUI();
            
            // Gửi hiệu ứng sét cho cả 2 máy
            if (socket && socket.connected) {
                socket.emit('thorEffect', {
                    cells: [oldPos],
                    players: players,
                    cellsData: cellsData
                });
            }
            
            shouldEndTurn = true;
            break;

        // ===== 🆕 ĐIỀU HƯỚNG MỚI (TÀNG HÌNH) =====
        case "dieuHuong":
            playSFX(audioGame.run);
            
            let randomPos = Math.floor(Math.random() * (TOTAL_CELLS - 1)) + 1;
            let oldPos2 = players[myPlayerNumber].pos;
            
            // ===== CẬP NHẬT VỊ TRÍ =====
            players[myPlayerNumber].pos = randomPos;
            
            // ===== TRÊN MÁY MÌNH: VẪN HIỂN THỊ =====
            // Không ẩn gì cả
            
            // ===== ĐÁNH DẤU TÀNG HÌNH =====
            window.isInvisible = true;
            window.invisiblePlayer = myPlayerNumber;
            window.invisiblePos = randomPos;
            
            // ===== GỬI ĐỒNG BỘ CHO ĐỐI THỦ =====
            if (socket && socket.connected) {
                socket.emit('syncInvisibleEffect', {
                    playerNum: myPlayerNumber,
                    pos: randomPos,
                    oldPos: oldPos2,
                    isInvisible: true
                });
                console.log('📤 Đã gửi syncInvisibleEffect cho đối thủ');
            }
            
            addLog(
                "👻 " + players[myPlayerNumber].name +
                " tàng hình và dịch chuyển đến ô " + randomPos +
                "! (Đối thủ không nhìn thấy bạn)"
            );
            
            updateUI();
            shouldEndTurn = true;
            break;
        // ===== KỸ NĂNG: HẮC ÁM TRUY SÁT (THAY THẾ ĐỔI VẬN MAY) =====
        case "hacAmTruySat": 
            const player = players[myPlayerNumber];
            const enemyId = myPlayerNumber === 1 ? 2 : 1;
            const enemy = players[enemyId];
            
            // Lưu vị trí của đối thủ
            const enemyPos = enemy.pos;
            
            // Tính vị trí bản thể hắc ám: phía sau đối thủ 5 ô (ngược chiều)
            const darkPos = (enemyPos - 5 + TOTAL_CELLS) % TOTAL_CELLS;
            
            // KÍCH HOẠT TRUY SÁT
            window.darkChaseActive = true;
            window.darkChaseOwner = myPlayerNumber;
            window.darkChaseTarget = enemyId;
            window.darkChasePos = darkPos;
            window.darkChaseTargetPos = enemyPos;
            window.darkChaseTurns = 3;
            window.darkChaseStarted = false;
            
            // 🆕 HIỂN THỊ 🌑 TRÊN CẢ 2 MÁY
            renderDarkChaser(darkPos, myPlayerNumber);
            
            // 🆕 HIỆU ỨNG UI ĐẸP CHO CẢ 2 MÁY
            if (typeof showSkinEffectText === 'function') {
                showSkinEffectText(
                    '🌑 HẮC ÁM TRUY SÁT',
                    '⚡ BẢN THỂ BÓNG TỐI ĐANG TRUY ĐUỔI ⚡',
                    '#8b5cf6',
                    '#4c1d95',
                    '🌑'
                );
            }
            
            // 🎵 Hiệu ứng âm thanh
            if (audioGame && audioGame.dragon) {
                playSFX(audioGame.dragon);
            }
            
            // 📝 LOG - HIỂN THỊ TRÊN CẢ 2 MÁY
            addLog(`🌑 ${player.name} triệu hồi BẢN THỂ HẮC ÁM!`);
            addLog(`📍 Bản thể xuất hiện tại ô ${darkPos}, phía sau ${enemy.name} 5 ô!`);
            addLog(`⏳ Có 3 lượt để truy đuổi!`);
            addLog(`🎯 Nếu đuổi kịp: ${enemy.name} mất 10% tiền và 1 ô đất!`);
            
            // 🆕 GỬI ĐỒNG BỘ CHO ĐỐI THỦ
            if (socket && socket.connected) {
                socket.emit('syncDarkChase', {
                    playerNum: myPlayerNumber,
                    targetId: enemyId,
                    darkPos: darkPos,
                    targetPos: enemyPos,
                    turns: 3,
                    playerName: player.name,
                    targetName: enemy.name
                });
            }
            
            // Đánh dấu đã dùng skill
            players[myPlayerNumber].skill = null;
            players[myPlayerNumber].skillUsed = true;
            skillUsedThisTurn = true;
            
            updateUI();
            updateSkillUI();
            
            shouldEndTurn = true;
            break;
        }

    // ===== XÓA KỸ NĂNG SAU KHI DÙNG =====
    players[myPlayerNumber].skill = null;
    players[myPlayerNumber].skillUsed = true;

    if (skill.id !== "doiVanMay") {
        skillUsedThisTurn = true;
    }

    console.log("===== SAU KHI DÙNG SKILL =====");
    console.log(players[myPlayerNumber]);

    updateUI();
    updateSkillUI();
    updateSkillButton();
    
    socket.emit("useSkill", {
        player: myPlayerNumber,
        skill: skill.id,
        players: players,
        cellsData: cellsData,
        currentTurn: currentTurn,
        skillUser: true
    });

    hideNotification();

    if (shouldEndTurn) {
        // 🔥 KIỂM TRA LẠI GAME CHƯA KẾT THÚC TRƯỚC KHI ENDTURN
        if (!window.gameEnding) {
            endTurn();
        }
    }

    updateUI();
}

function updateSkillUI(){
    console.log("===== updateSkillUI =====");
    console.log(players[myPlayerNumber]);

    // ===== PLAYER 1 =====
    const p1Skill = document.getElementById("p1-skill");
    if(players[1].skill) {
        p1Skill.innerHTML = "🎴 " + players[1].skill.name;
    } else {
        p1Skill.innerHTML = "🎴 Đã dùng";
    }

    // ===== PLAYER 2 =====
    const p2Skill = document.getElementById("p2-skill");
    if(players[2].skill) {
        p2Skill.innerHTML = "🎴 " + players[2].skill.name;
    } else {
        p2Skill.innerHTML = "🎴 Đã dùng";
    }

    // ===== NÚT =====
    const btn = document.getElementById("use-skill-btn");
    if(!btn) return;

    if(
        gameStarted &&
        myPlayerNumber &&
        currentTurn === myPlayerNumber &&
        players[myPlayerNumber].skill
    ) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}
// ===== RENDER BẢN THỂ HẮC ÁM =====
// ===== RENDER BẢN THỂ HẮC ÁM (ICON QUỶ 👹) =====
// ===== RENDER BẢN THỂ HẮC ÁM (ICON QUỶ 👹) =====
function renderDarkChaser(pos, owner) {
    console.log(`🎨 renderDarkChaser: pos=${pos}, owner=${owner}, active=${window.darkChaseActive}`);
    
    // 🆕 NẾU KHÔNG ACTIVE THÌ THOÁT
    if (!window.darkChaseActive) {
        console.log('⚠️ renderDarkChaser: darkChaseActive is false, bỏ qua render');
        return;
    }
    
    // 🆕 XÓA SẠCH TẤT CẢ ICON VÀ HIỆU ỨNG TRÊN TOÀN BỘ BÀN CỜ
    document.querySelectorAll('.dark-chaser-icon').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-glow').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-effect').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-label').forEach(el => el.remove());
    
    // 🆕 RESET TẤT CẢ CÁC Ô ĐÃ TỪNG CÓ HIỆU ỨNG
    document.querySelectorAll('.cell').forEach(el => {
        el.style.boxShadow = '';
        el.style.border = '';
        el.style.background = '';
        el.style.position = '';
        el.style.transition = '';
        el.classList.remove('has-dark-chaser');
    });
    
    // Nếu không có vị trí hoặc không active thì thoát
    if (pos === null || pos === undefined) {
        console.log('⚠️ renderDarkChaser: pos is null');
        return;
    }
    if (!window.darkChaseActive) {
        console.log('⚠️ renderDarkChaser: darkChaseActive is false');
        return;
    }
    
    // Lấy cell tại vị trí cần render
    const cell = document.getElementById(`cell-${pos}`);
    if (!cell) {
        console.log(`⚠️ renderDarkChaser: Không tìm thấy cell-${pos}`);
        return;
    }
    
    // Đánh dấu ô đang có bản thể hắc ám
    cell.classList.add('has-dark-chaser');
    
    // ============================================
    // 🎭 TẠO ICON QUỶ 👹 (HOẶC ICON BẠN MUỐN)
    // ============================================
    const icon = document.createElement('div');
    icon.className = 'dark-chaser-icon';
    icon.textContent = '👹';
    icon.style.cssText = `
        position: absolute;
        font-size: 38px;
        top: -14px;
        left: -14px;
        z-index: 20;
        animation: darkChaserPulse 0.6s infinite alternate;
        filter: drop-shadow(0 0 30px #ef4444) drop-shadow(0 0 60px #8b5cf6);
        pointer-events: none;
        background: rgba(0,0,0,0.6);
        border-radius: 50%;
        padding: 4px;
        border: 3px solid #ef4444;
        box-shadow: 0 0 30px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(239, 68, 68, 0.2);
        transform: scale(1);
        transition: transform 0.3s ease;
        user-select: none;
    `;
    cell.appendChild(icon);
    
    // ============================================
    // 🔥 HIỆU ỨNG LỬA MA QUỶ (HIỆU ỨNG NỀN)
    // ============================================
    cell.style.boxShadow = '0 0 50px rgba(239, 68, 68, 0.5), 0 0 100px rgba(139, 92, 246, 0.3)';
    cell.style.border = '3px solid #ef4444';
    cell.style.position = 'relative';
    cell.style.background = 'radial-gradient(circle, rgba(239,68,68,0.15), transparent 70%)';
    cell.style.transition = 'all 0.3s ease';
    
    // ============================================
    // 💜 HIỆU ỨNG GLOW TÍM (LỚP PHÍA SAU)
    // ============================================
    const glow = document.createElement('div');
    glow.className = 'dark-chaser-glow';
    glow.style.cssText = `
        position: absolute;
        inset: -6px;
        border-radius: 10px;
        background: radial-gradient(circle, rgba(139,92,246,0.3), rgba(239,68,68,0.1) 50%, transparent 80%);
        z-index: -1;
        animation: darkGlowPulse 1s infinite alternate;
        pointer-events: none;
    `;
    cell.appendChild(glow);
    
    // ============================================
    // ⚡ HIỆU ỨNG TIA LỬA ĐIỆN (THÊM PHẦN TỬ TRANG TRÍ)
    // ============================================
    const effect = document.createElement('div');
    effect.className = 'dark-chaser-effect';
    effect.style.cssText = `
        position: absolute;
        inset: -8px;
        border-radius: 12px;
        border: 2px solid rgba(239, 68, 68, 0.3);
        z-index: -1;
        animation: darkChaserEffect 0.8s infinite alternate;
        pointer-events: none;
        box-shadow: inset 0 0 40px rgba(239, 68, 68, 0.1);
    `;
    cell.appendChild(effect);
    
    // ============================================
    // 💀 THÊM TEXT "SÁT THỦ" BÊN DƯỚI (TÙY CHỌN)
    // ============================================
    const label = document.createElement('div');
    label.className = 'dark-chaser-label';
    label.textContent = 'TRUY SÁT';
    label.style.cssText = `
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        font-weight: 900;
        color: #ef4444;
        background: rgba(0,0,0,0.8);
        padding: 1px 8px;
        border-radius: 10px;
        border: 1px solid #ef4444;
        letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        white-space: nowrap;
        z-index: 25;
        pointer-events: none;
    `;
    cell.appendChild(label);
}
function removeDarkChaser() {
    // Xóa icon
    document.querySelectorAll('.dark-chaser-icon').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-glow').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-effect').forEach(el => el.remove());
    document.querySelectorAll('.dark-chaser-label').forEach(el => el.remove());
    
    // 🆕 RESET TẤT CẢ CÁC Ô ĐÃ TỪNG CÓ HIỆU ỨNG
    document.querySelectorAll('.cell').forEach(el => {
        el.style.boxShadow = '';
        el.style.border = '';
        el.style.background = '';
        el.style.position = '';
        el.style.transition = '';
        el.classList.remove('has-dark-chaser');
    });
    
    // Reset trạng thái
    window.darkChaseActive = false;
    window.darkChaseStarted = false;
    window.darkChaseOwner = null;
    window.darkChaseTarget = null;
    window.darkChasePos = null;
    window.darkChaseTargetPos = null;  // 🆕 THÊM DÒNG NÀY
    window.darkChaseTurns = 0;
    window.darkChaseCaught = false;
    window.darkChaseDice = 0;
}

// ===== CẬP NHẬT TRUY ĐUỔI MỖI LƯỢT =====
function updateDarkChase(diceResult) {
    if (!window.darkChaseActive) return false;
    
    const targetId = window.darkChaseTarget;
    const targetPos = players[targetId].pos;
    window.darkChaseTargetPos = targetPos;
    
    // Lần đầu: gán kết quả xúc xắc cho bản thể
    if (window.darkChaseStarted === false) {
        window.darkChaseStarted = true;
        window.darkChaseDice = diceResult;
        // ⭐ GIỮ NGUYÊN 3 LẦN, CHƯA GIẢM VÌ ĐÂY LÀ LẦN ĐẦU
        window.darkChaseTurns = 3;
        
        // Di chuyển bản thể lần đầu
        const oldPos = window.darkChasePos;
        const newPos = (oldPos + diceResult) % TOTAL_CELLS;
        window.darkChasePos = newPos;
        
        // 📝 LOG - HIỂN THỊ TRÊN CẢ 2 MÁY
        addLog(`🌑 Bản thể hắc ám bắt đầu truy đuổi với ${diceResult} ô!`);
        addLog(`📍 Bản thể: ${oldPos} → ${newPos}`);
        
        // Kiểm tra khoảng cách
        const distance = Math.abs(newPos - targetPos);
        const minDistance = Math.min(distance, TOTAL_CELLS - distance);
        addLog(`📍 Khoảng cách đến ${players[targetId].name}: ${minDistance} ô (còn ${window.darkChaseTurns} lượt xúc xắc của bạn)`);
        
        // CẬP NHẬT ICON TRÊN CẢ 2 MÁY
        renderDarkChaser(newPos, window.darkChaseOwner);
        
        // GỬI ĐỒNG BỘ CHO ĐỐI THỦ
        if (socket && socket.connected) {
            socket.emit('syncDarkChaseUpdate', {
                darkPos: newPos,
                targetPos: targetPos,
                turns: window.darkChaseTurns,
                diceResult: diceResult,
                playerNum: window.darkChaseOwner,
                targetId: targetId
            });
        }
        
        // Kiểm tra xem có đuổi kịp ngay lần đầu không
        if (minDistance <= 1) {
            return executeDarkChaseCatch();
        }
        
        updateUI();
        return false;
    }
    
    // ⭐ CÁC LƯỢT TIẾP THEO - GIẢM 1 LẦN (CHỈ GỌI KHI CHỦ NHÂN TUNG XÚC XẮC)
    window.darkChaseTurns--;
    
    const oldPos = window.darkChasePos;
    const newPos = (oldPos + diceResult) % TOTAL_CELLS;
    window.darkChasePos = newPos;
    
    // 📝 LOG - HIỂN THỊ TRÊN CẢ 2 MÁY
    addLog(`🌑 Bản thể hắc ám di chuyển ${diceResult} ô từ ${oldPos} → ${newPos}`);
    
    // Kiểm tra khoảng cách
    const distance = Math.abs(newPos - targetPos);
    const minDistance = Math.min(distance, TOTAL_CELLS - distance);
    addLog(`📍 Khoảng cách đến ${players[targetId].name}: ${minDistance} ô (còn ${window.darkChaseTurns} lượt xúc xắc của bạn)`);
    
    // CẬP NHẬT ICON TRÊN CẢ 2 MÁY
    renderDarkChaser(newPos, window.darkChaseOwner);
    
    // GỬI ĐỒNG BỘ CHO ĐỐI THỦ
    if (socket && socket.connected) {
        socket.emit('syncDarkChaseUpdate', {
            darkPos: newPos,
            targetPos: targetPos,
            turns: window.darkChaseTurns,
            diceResult: diceResult,
            playerNum: window.darkChaseOwner,
            targetId: targetId
        });
    }
    
    // 🎯 KIỂM TRA ĐUỔI KỊP
    if (minDistance <= 1) {
        return executeDarkChaseCatch();
    }
    
    // ⏰ KIỂM TRA HẾT GIỜ (SAU 3 LẦN XÚC CỦA CHỦ NHÂN)
    if (window.darkChaseTurns <= 0) {
        // ⭐ LƯU LẠI GIÁ TRỊ TRƯỚC KHI RESET
        const ownerId = window.darkChaseOwner;
        const targetIdCopy = window.darkChaseTarget;
        const ownerName = players[ownerId]?.name || 'Người chơi';
        const targetName = players[targetIdCopy]?.name || 'Đối thủ';
        
        addLog(`⏰ Hết 3 lượt xúc xắc! Bản thể hắc ám đã tan biến. ${targetName} an toàn!`);
        
        // ⭐ RESET TRẠNG THÁI
        removeDarkChaser();
        window.darkChaseActive = false;
        window.darkChaseStarted = false;
        window.darkChaseTurns = 0;
        window.darkChaseOwner = null;
        window.darkChaseTarget = null;
        window.darkChaseCaught = false;
        
        updateUI();
        
        // ⭐ GỬI ĐỒNG BỘ CHO ĐỐI THỦ (DÙNG BIẾN ĐÃ LƯU)
        if (socket && socket.connected) {
            socket.emit('syncDarkChaseEnd', {
                playerNum: ownerId,      // ← ĐÃ LƯU TRƯỚC KHI RESET
                targetId: targetIdCopy,  // ← ĐÃ LƯU TRƯỚC KHI RESET
                reason: 'timeout'
            });
        }
        
        return false;
    }
    
    // Vẫn đang truy đuổi
    updateUI();
    return false;
}

// ===== XỬ LÝ KHI BẮT ĐƯỢC =====
function executeDarkChaseCatch() {
    const targetId = window.darkChaseTarget;
    const ownerId = window.darkChaseOwner;
    const target = players[targetId];
    const owner = players[ownerId];
    
    // Kiểm tra nếu đã bắt được rồi thì không xử lý lại
    if (window.darkChaseCaught) return true;
    window.darkChaseCaught = true;
    
    // 📝 LOG - HIỂN THỊ TRÊN CẢ 2 MÁY
    addLog(`💀 BẮT ĐƯỢC! Bản thể hắc ám đã đuổi kịp ${target.name}!`);
    
    // 1. Trừ 10% tiền
    const penalty = Math.floor(target.money * 0.1);
    target.money -= penalty;
    owner.money += penalty;
    
    addLog(`💰 ${target.name} mất ${penalty}$ (10%), ${owner.name} nhận được!`);
    
    // 2. Mất 1 ô đất ngẫu nhiên
    let stolenCell = -1;
    const targetCells = [];
    for (let i = 1; i < TOTAL_CELLS; i++) {
        if (cellsData[i].owner === targetId) {
            targetCells.push(i);
        }
    }
    
    if (targetCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * targetCells.length);
        stolenCell = targetCells[randomIndex];
        cellsData[stolenCell].owner = ownerId;
        
        addLog(`🏠 ${target.name} mất ô đất ${stolenCell} cho ${owner.name}!`);
        
        // Hiệu ứng animation trên cả 2 máy
        const cellEl = document.getElementById(`cell-${stolenCell}`);
        if (cellEl) {
            cellEl.style.animation = 'cellSteal 0.6s ease';
            setTimeout(() => {
                cellEl.style.animation = '';
            }, 700);
        }
        
        initializeBoard();
    } else {
        addLog(`⚠️ ${target.name} không có đất nào để mất!`);
    }
    
    // GỬI ĐỒNG BỘ CHO ĐỐI THỦ
    if (socket && socket.connected) {
        socket.emit('syncDarkChaseCatch', {
            playerNum: ownerId,
            targetId: targetId,
            penalty: penalty,
            stolenCell: stolenCell,
            players: players,
            cellsData: cellsData,
            ownerName: owner.name,
            targetName: target.name
        });
    }
    
    // ⭐ RESET HOÀN TOÀN TRẠNG THÁI
    removeDarkChaser();
    window.darkChaseActive = false;
    window.darkChaseStarted = false;
    window.darkChaseTurns = 0;
    window.darkChaseOwner = null;
    window.darkChaseTarget = null;
    window.darkChaseCaught = false;
    
    updateUI();
    
    // Kiểm tra game over
    if (target.money < 0) {
        const enemy = targetId === 1 ? 2 : 1;
        gameOver(enemy, "money");
        return true;
    }
    
    return true;
}