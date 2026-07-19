// ===============================
// HỆ THỐNG THẺ KỸ NĂNG
// ===============================


const skillCards = {

    doiVanMay: {
        id: "doiVanMay",
        name: "🔮 Đổi Vận May",
        description:
        "Đổi lại kết quả xúc xắc vừa tung.",
        type: "dice"
    },


    dieuHuong: {
        id: "dieuHuong",
        name: "🧭 Điều Hướng",
        description:
        "Tăng hoặc giảm 3 bước di chuyển.",
        type: "move"
    },


    thor: {
        id: "thor",
        name: "⚡ Thần Thor",
        description:
        "Triệu hồi sét đánh 5 ô ngẫu nhiên. Người trúng mất 25% tiền.",
        type: "attack"
    },


    cuopTien: {
        id: "cuopTien",
        name: "💰 Cướp Tiền",
        description:
        "Lấy 15% tiền hiện có của đối thủ.",
        type: "steal"
    },


    doiViTri: {
        id: "doiViTri",
        name: "🔄 Đổi Vị Trí",
        description:
        "Đổi vị trí hiện tại với đối thủ.",
        type: "swap"
    }

};


function initPlayerSkills(serverSkills){

    console.log("===== INIT PLAYER SKILLS =====");
    console.log(serverSkills);


    players[1].skill = skillCards[serverSkills[1]];
    players[2].skill = skillCards[serverSkills[2]];


    console.log(
        "P1:",
        players[1].skill
    );

    console.log(
        "P2:",
        players[2].skill
    );


    updateSkillUI();
}
function updateSkillButton(){

    const btn = document.getElementById("use-skill-btn");

    if(!btn) return;

    // chưa xác định người chơi
    if(typeof myPlayerNumber === "undefined"){
        btn.disabled = true;
        return;
    }

    // chỉ bật khi:
    // - tới lượt mình
    // - còn kỹ năng

    btn.disabled = !(
        currentTurn === myPlayerNumber &&
        players[myPlayerNumber] &&
        players[myPlayerNumber].skill &&
        !players[myPlayerNumber].skillUsed
    );

}
function useSkill(){

    if(!gameStarted) return;

    if(currentTurn !== myPlayerNumber){
        alert("Chưa tới lượt của bạn!");
        return;
    }

    // Không còn kỹ năng
    if (
        !players[myPlayerNumber].skill ||
        players[myPlayerNumber].skillUsed
    ) {
        alert("Bạn đã dùng hết kỹ năng!");
        return;
    }

    let skill = players[myPlayerNumber].skill;

    addLog(
        "✨ <strong>" +
        players[myPlayerNumber].name +
        "</strong> đã sử dụng <strong>" +
        skill.name +
        "</strong>"
    );

    switch(skill.id){


        // =========================
        // 💰 CƯỚP TIỀN
        // =========================
        case "cuopTien":
            playSFX(audioGame.buyLand);
            let enemy = myPlayerNumber === 1 ? 2 : 1;

            let money = Math.floor(players[enemy].money * 0.15);

            players[enemy].money -= money;
            players[myPlayerNumber].money += money;

            addLog(
                players[myPlayerNumber].name +
                " đã cướp " +
                money +
                "$ của đối thủ"
            );

            break;



        // =========================
        // 🔄 ĐỔI VỊ TRÍ
        // =========================
        case "doiViTri":
            
            let opponent = myPlayerNumber === 1 ? 2 : 1;

            let tempPos = players[opponent].pos;

            players[opponent].pos =
                players[myPlayerNumber].pos;

            players[myPlayerNumber].pos =
                tempPos;


            addLog(
                players[myPlayerNumber].name +
                " đã đổi vị trí với đối thủ"
            );


            updateUI();

            break;




        // =========================
        // ⚡ THẦN THOR
        // =========================
        case "thor":

            addLog(
                "⚡ " +
                players[myPlayerNumber].name +
                " triệu hồi Thần Thor..."
            );

            break;
        // =========================
        case "doiVanMay": {

            let newDice = Math.floor(Math.random() * 11) + 2;

            addLog(
                "🔮 " +
                players[myPlayerNumber].name +
                " đổi vận may thành " +
                newDice +
                " ô"
            );

            playSFX(audioGame.luck);


            // quay về vị trí trước khi tung
            players[myPlayerNumber].pos = lastPositionBeforeRoll;


            // đánh dấu đang di chuyển bằng skill
            window.isLuckyMove = true;


            // di chuyển lại theo số mới
            moveStepByStep(
                newDice,
                0,
                0
            );


            break;
        }
        // =========================
        // 🧭 ĐIỀU HƯỚNG
        // =========================
        case "dieuHuong":
            playSFX(audioGame.run);

            let change =
                Math.random() > 0.5 ? 3 : -3;


            players[myPlayerNumber].pos += change;



            // tránh vượt bàn cờ
            if(players[myPlayerNumber].pos < 0)
            {
                players[myPlayerNumber].pos = 0;
            }


            if(players[myPlayerNumber].pos >= TOTAL_CELLS)
            {
                players[myPlayerNumber].pos =
                    TOTAL_CELLS - 1;
            }



            addLog(
                "🧭 " +
                players[myPlayerNumber].name +
                " điều hướng " +
                (change > 0 ? "+" : "") +
                change +
                " ô"
            );


            updateUI();

            // 🔥 FIX: Reset flag sau Điều Hướng
            skillUsedThisTurn = false;

            break;

    }
// ===== XÓA KỸ NĂNG SAU KHI DÙNG =====
players[myPlayerNumber].skill = null;
players[myPlayerNumber].skillUsed = true;

// 🔥 FIX: Chỉ set skillUsedThisTurn cho những kỹ năng KHÔNG DI CHUYỂN
if (skill.id !== "doiVanMay" && skill.id !== "dieuHuong") {
    skillUsedThisTurn = true;
}

console.log("===== SAU KHI DÙNG SKILL =====");
console.log(players[myPlayerNumber]);

updateUI();
updateSkillUI();
updateSkillButton();
socket.emit("useSkill",{

    player: myPlayerNumber,

    skill: skill.id,

    players: players,

    cellsData: cellsData,

    currentTurn: currentTurn,
    skillUser: true
});

hideNotification();

if (skill.id === "doiVanMay") {
    return;
}

// 🔥 FIX: Dừng tiếng chạy nếu đã play
if (audioGame && audioGame.run) {
    audioGame.run.pause();
    audioGame.run.currentTime = 0;
}

// 🔥 FIX: Reset flag trước khi end turn
skillUsedThisTurn = false;

endTurn();
updateUI();
}
function updateSkillUI(){
    console.log("===== updateSkillUI =====");
    console.log(players[myPlayerNumber]);

    // ===== PLAYER 1 =====
    const p1Skill = document.getElementById("p1-skill");

    if(players[1].skill){

        p1Skill.innerHTML="🎴 "+players[1].skill.name;

    }else{

        p1Skill.innerHTML="🎴 Đã dùng";
    }

    // ===== PLAYER 2 =====
    const p2Skill=document.getElementById("p2-skill");

    if(players[2].skill){

        p2Skill.innerHTML="🎴 "+players[2].skill.name;

    }else{

        p2Skill.innerHTML="🎴 Đã dùng";
    }

    // ===== NÚT =====

    const btn=document.getElementById("use-skill-btn");

    if(!btn) return;

    if(
        gameStarted &&
        myPlayerNumber &&
        currentTurn===myPlayerNumber &&
        players[myPlayerNumber].skill
    ){

        btn.disabled=false;

    }else{

        btn.disabled=true;
    }

}
