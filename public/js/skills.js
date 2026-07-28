// ===============================
// HỆ THỐNG THẺ KỸ NĂNG
// ===============================

const skillCards = {
    doiVanMay: {
        id: "doiVanMay",
        name: "🔮 Đổi Vận May",
        description: "Đổi lại kết quả xúc xắc vừa tung.",
        type: "dice"
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
            
            // ===== KHÔNG ẨN TRÊN MÁY CỦA MÌNH =====
            // Chỉ cập nhật vị trí, không ẩn
            players[myPlayerNumber].pos = randomPos;
            
            // ===== ĐÁNH DẤU TÀNG HÌNH =====
            window.isInvisible = true;
            window.invisiblePlayer = myPlayerNumber;
            window.invisiblePos = randomPos;
            
            addLog(
                "👻 " + players[myPlayerNumber].name +
                " tàng hình và dịch chuyển đến ô " + randomPos +
                "! (Đối thủ không nhìn thấy bạn)"
            );
            
            // 🔥 GỬI ĐỒNG BỘ CHO ĐỐI THỦ
            if (socket && socket.connected) {
                socket.emit('syncInvisibleEffect', {
                    playerNum: myPlayerNumber,
                    pos: randomPos,
                    oldPos: oldPos2,
                    isInvisible: true
                });
                console.log('📤 Đã gửi syncInvisibleEffect cho đối thủ');
            }
            
            updateUI();
            shouldEndTurn = true;
            break;
        case "doiVanMay":
            let newDice = Math.floor(Math.random() * 11) + 2;
            addLog(
                "🔮 " + players[myPlayerNumber].name +
                " đổi vận may thành " + newDice + " ô"
            );
            playSFX(audioGame.run);

            // quay về vị trí trước khi tung
            players[myPlayerNumber].pos = lastPositionBeforeRoll;

            // đánh dấu đang di chuyển bằng skill
            window.isLuckyMove = true;

            // di chuyển lại theo số mới
            moveStepByStep(newDice, 0, 0);

            shouldEndTurn = false;
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
