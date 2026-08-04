function updateUI() {
    // ===== KIỂM TRA PLAYERS =====
    if (!players || !players[1] || !players[2]) {
        console.warn("⚠️ Players chưa sẵn sàng!");
        return;
    }
    
    // ===== KIỂM TRA ELEMENT TỒN TẠI =====
    const p1Money = document.getElementById('p1-money');
    const p2Money = document.getElementById('p2-money');
    const p1Land = document.getElementById('p1-land-value');
    const p2Land = document.getElementById('p2-land-value');
    const p1Round = document.getElementById('p1-round');
    const p2Round = document.getElementById('p2-round');
    const p1Skip = document.getElementById('p1-skip');
    const p2Skip = document.getElementById('p2-skip');
    const turnTxt = document.getElementById('turn-txt');
    
    if (!p1Money || !p2Money || !p1Round || !p2Round) {
        console.warn("⚠️ UI elements chưa được render!");
        return;
    }
    // Reset toàn bộ token trước khi vẽ lại
    for (let i = 0; i < TOTAL_CELLS; i++) {

        const p1Slot = document.getElementById(`slot-p1-${i}`);
        if (p1Slot) {
            p1Slot.style.display = "";
            p1Slot.style.opacity = "";
            p1Slot.classList.remove("moving");
        }

        const p2Slot = document.getElementById(`slot-p2-${i}`);
        if (p2Slot) {
            p2Slot.style.display = "";
            p2Slot.style.opacity = "";
            p2Slot.classList.remove("moving");
        }
    }
    // ===== TÍNH GIÁ TRỊ ĐẤT =====
    const p1LandValue = calculateTotalLandValue(1);
    const p2LandValue = calculateTotalLandValue(2);
    
    // ===== CẬP NHẬT TIỀN MẶT =====
    p1Money.innerText = players[1].money;
    p2Money.innerText = players[2].money;
    
    // ===== 🆕 CẬP NHẬT GIÁ TRỊ ĐẤT =====
    if (p1Land) {
        p1Land.innerText = p1LandValue;
        p1Land.style.color = '#34d399';
        p1Land.style.fontWeight = 'bold';
    }
    if (p2Land) {
        p2Land.innerText = p2LandValue;
        p2Land.style.color = '#34d399';
        p2Land.style.fontWeight = 'bold';
    }
    
    p1Round.innerText = `Vòng: ${players[1].rounds}`;
    p2Round.innerText = `Vòng: ${players[2].rounds}`;
    
    if (p1Skip) p1Skip.style.display = players[1].skipNextTurn ? 'block' : 'none';
    if (p2Skip) p2Skip.style.display = players[2].skipNextTurn ? 'block' : 'none';

    if (gameStarted && currentTurn && players[currentTurn]) {
        if (turnTxt) {
            const isMyTurnText = (typeof myPlayerNumber !== 'undefined' && myPlayerNumber === currentTurn) ? " (BẠN)" : "";
            turnTxt.innerText = `LƯỢT ĐI: ${players[currentTurn].name}${isMyTurnText}`;
            turnTxt.style.background = currentTurn === 1 ? '#ef4444' : '#3b82f6';
        }
    }

    // ===== CẬP NHẬT VỊ TRÍ QUÂN CỜ =====
    for(let i = 0; i < TOTAL_CELLS; i++) {
        const el = document.getElementById(`cell-${i}`);
        if (!el) continue;

        // ===== XÓA TẤT CẢ CLASS CŨ =====
        el.classList.remove('has-p1', 'has-p2');
        
        // ===== KIỂM TRA TÀNG HÌNH =====
        let hideP1 = false;
        let hideP2 = false;

        // Nếu đang có người tàng hình
        if (window.isInvisible) {

            // Chỉ đối thủ mới bị ẩn.
            // Máy của chính người dùng skill vẫn luôn nhìn thấy mình.
            if (window.invisiblePlayer === 1 && myPlayerNumber !== 1) {
                hideP1 = true;
            }

            if (window.invisiblePlayer === 2 && myPlayerNumber !== 2) {
                hideP2 = true;
            }
        }

        // ===== CẬP NHẬT CLASS =====
        if (players[1] && players[1].pos === i && !hideP1) {
            el.classList.add("has-p1");
        }

        if (players[2] && players[2].pos === i && !hideP2) {
            el.classList.add("has-p2");
        }
        
        el.classList.toggle('has-gift', cellsData[i] && cellsData[i].hasGift);

        if (i > 0) {
            const priceEl = document.getElementById(`price-${i}`);
            if (priceEl) {
                if (i === spiderWebIndex) {
                    priceEl.innerText = "KHOÁ LƯỢT";
                } else if (typeof lightningIndex !== 'undefined' && i === lightningIndex) {
                    priceEl.innerText = "⚡ SẤM SÉT";
                } else if (i === Number(window.nuclearBombIndex) && !window.nuclearBombDetonated) {
                    priceEl.innerText = "💣 BOM";
                } else if (cellsData[i]?.isRadioactive) {
                    priceEl.innerText = "☢️ PHÓNG XẠ";
                } else {
                    priceEl.innerText = `${cellsData[i].price}$`;
                }
            }

            el.style.borderTop = "none"; 

            if (cellsData[i] && cellsData[i].owner === 1) {
                el.style.background = "linear-gradient(135deg, #7f1d1d, #ef4444)"; 
                el.style.color = "#ffffff";
            } else if (cellsData[i] && cellsData[i].owner === 2) {
                el.style.background = "linear-gradient(135deg, #1e3a8a, #3b82f6)"; 
                el.style.color = "#ffffff";
            } else {
                el.style.background = ""; 
                el.style.color = "";
            }
        }
    }

    // ===== CẬP NHẬT NÚT DÙNG KỸ NĂNG =====
    const skillBtn = document.getElementById("use-skill-btn");
    if (skillBtn) {
        const mySkill = players[myPlayerNumber]?.skill;
        if (gameStarted && currentTurn === myPlayerNumber && mySkill && !players[myPlayerNumber].skillUsed) {
            skillBtn.disabled = false;
            skillBtn.innerText = "🎴 " + mySkill.name;
        } else {
            skillBtn.disabled = true;
            if (mySkill && !players[myPlayerNumber].skillUsed) {
                skillBtn.innerText = "🎴 " + mySkill.name;
            } else {
                skillBtn.innerText = "🎴 Đã dùng";
            }
        }
    }

    // ===== HIỂN THỊ TRẠNG THÁI PHÓNG XẠ =====
    let p1Rad = document.getElementById('p1-radiation');
    if (players[1].radiationEffect && players[1].radiationEffect > 0) {
        if (!p1Rad) {
            const p1Card = document.querySelector('.p1-card');
            if (p1Card) {
                const radDiv = document.createElement('div');
                radDiv.id = 'p1-radiation';
                radDiv.style.cssText = 'color: #22d3ee; font-weight: bold; font-size: 12px; margin-top: 4px; animation: radPulse 0.5s infinite alternate;';
                radDiv.textContent = `☢️ PHÓNG XẠ: ${players[1].radiationEffect} lượt`;
                p1Card.appendChild(radDiv);
                p1Rad = radDiv;
            }
        } else {
            p1Rad.textContent = `☢️ PHÓNG XẠ: ${players[1].radiationEffect} lượt`;
            p1Rad.style.display = 'block';
        }
    } else if (p1Rad) {
        p1Rad.style.display = 'none';
    }

    let p2Rad = document.getElementById('p2-radiation');
    if (players[2].radiationEffect && players[2].radiationEffect > 0) {
        if (!p2Rad) {
            const p2Card = document.querySelector('.p2-card');
            if (p2Card) {
                const radDiv = document.createElement('div');
                radDiv.id = 'p2-radiation';
                radDiv.style.cssText = 'color: #22d3ee; font-weight: bold; font-size: 12px; margin-top: 4px; animation: radPulse 0.5s infinite alternate;';
                radDiv.textContent = `☢️ PHÓNG XẠ: ${players[2].radiationEffect} lượt`;
                p2Card.appendChild(radDiv);
                p2Rad = radDiv;
            }
        } else {
            p2Rad.textContent = `☢️ PHÓNG XẠ: ${players[2].radiationEffect} lượt`;
            p2Rad.style.display = 'block';
        }
    } else if (p2Rad) {
        p2Rad.style.display = 'none';
    }

    // ===== 🆕 CẬP NHẬT UI TELEPORT =====
    if (typeof updateTeleportUI === 'function') {
        updateTeleportUI();
    }

    // ===== 🆕 CẬP NHẬT HIỆU ỨNG NHẤP NHÁY NHÂN VẬT MANG BOM =====
    updateBombBlink();
}
// ===== NHẬT KÝ TRẬN ĐẤU =====
function addLog(text) {
    const logBox = document.getElementById('log');
    if (!logBox) return;
    logBox.innerHTML += `<div class="log-entry">${text}</div>`;
    logBox.scrollTop = logBox.scrollHeight;
}

// ===== HIỆU ỨNG SÉT THẦN THOR =====
function showThorStrike(cellIndex) {
    const cell = document.getElementById("cell-" + cellIndex);
    if (!cell) return;

    cell.style.position = "relative";

    const bolt = document.createElement("div");
    bolt.className = "thor-lightning";
    cell.appendChild(bolt);

    cell.classList.add("thor-flash");

    bolt.onanimationend = () => {
        bolt.remove();
        cell.classList.remove("thor-flash");
    };
}

// ===== BIẾN & HẰNG SỐ QUẢN LÝ THÔNG BÁO =====
let pendingCancelAction = null;
let buyDecisionTimer = null;
let buyDecisionSeconds = 10;

// ===== HIỂN THỊ THÔNG BÁO =====
function showNotification(title, desc, color, confirmCallback, showTwoButtons = true, cancelCallback = null) {
    console.trace("SHOW NOTIFICATION");
    // 🛠️ CHECK: Xử lý giải thoát mạch game khi dẫm vào ô đặc biệt
    if (typeof currentTurn !== 'undefined' && players[currentTurn]) {
        let currentPos = players[currentTurn].pos;
        if (currentPos === 0 || currentPos === spiderWebIndex || (typeof lightningIndex !== 'undefined' && currentPos === lightningIndex)) {
            console.log("Phát hiện dẫm vào ô đặc biệt. Tự động ẩn thông báo và kích hoạt chuyển lượt.");
            
            // Ẩn panel thông báo
            hideNotification();
            
            // Chuyển lượt cho đối thủ
            if (currentPos === spiderWebIndex) {
                socket.emit('skipTurnRequest', { currentTurn: currentTurn });
            } else {
                if (typeof endTurn === 'function') endTurn();
            }
            return;
        }
    }

    const panel = document.getElementById('notify-panel');
    const titleEl = document.getElementById('notify-title');
    const descEl = document.getElementById('notify-desc');
    const btnBox = document.getElementById('notify-btns-box');
    
    if (!panel || !titleEl || !descEl || !btnBox) {
        console.warn("⚠️ Notification elements chưa được render!");
        return;
    }
    
    titleEl.innerText = title;
    titleEl.style.color = color;
    panel.style.borderColor = color;
    panel.style.boxShadow = `0 0 15px ${color}33`;
    descEl.innerHTML = desc;
    
    // Luôn là Online - chỉ mình được quyết định khi tới lượt
    const isMyTurn = (typeof currentTurn !== 'undefined' && myPlayerNumber === currentTurn);

    pendingCancelAction = cancelCallback;

    if (!isMyTurn) {
        // Nếu KHÔNG phải lượt của mình -> Ẩn nút, hiển thị dòng chờ
        btnBox.innerHTML = `<span style="color: #94a3b8; font-style: italic; font-size: 13px;">⌛ Đang chờ đối thủ đưa ra quyết định...</span>`;
    } else {
        // Nếu là lượt của mình -> Hiện nút bấm
        if(showTwoButtons) {
            btnBox.innerHTML = `
                <button class="btn-confirm" onclick="handleDecision(true)">Đồng Ý</button>
                <button class="btn-cancel" onclick="handleDecision(false)">Bỏ Qua</button>
            `;
        } else {
            btnBox.innerHTML = `<button class="btn-confirm btn-single" onclick="handleDecision(true)">Xác Nhận</button>`;
        }
    }
    
    panel.style.display = 'flex';
    pendingAction = confirmCallback;

    // Chỉ popup trong game mới được đếm ngược
    if (showTwoButtons && isMyTurn) {
        startBuyDecisionTimer();
    }
}

function showSingleNotification(title, desc, color, closeCallback) {
    showNotification(title, desc, color, closeCallback, false);
}

function hideNotification() {
    const panel = document.getElementById('notify-panel');
    if (panel) panel.style.display = 'none';
}

function startBuyDecisionTimer(){
    clearInterval(buyDecisionTimer);
    buyDecisionSeconds = 10;

    buyDecisionTimer = setInterval(()=>{
        buyDecisionSeconds--;

        const titleEl = document.getElementById('notify-title');
        if(titleEl) {
            titleEl.innerText = `Yêu cầu đầu tư (${buyDecisionSeconds}s)`;
        }
        
        if(buyDecisionSeconds <= 0){
            clearInterval(buyDecisionTimer);
            addLog("⏰ Hết 10 giây không phản hồi. Tự động bỏ qua.");
            handleDecision(false);
        }
    },1000);
}

function handleDecision(isYes) {
    console.log("handleDecision", isYes);
    console.trace();
    if(buyDecisionTimer){
        clearInterval(buyDecisionTimer);
        buyDecisionTimer=null;
    }
    hideNotification();
    
    if (isYes && pendingAction) {
        pendingAction(); // Thực hiện hành động chính
    } else {
        addLog(`⏭️ Chọn bỏ qua cơ hội hành động tại ô đất này.`);
        if (pendingCancelAction) {
            pendingCancelAction(); // Thực hiện gọi hàm hủy
        } else {
            // 🔥 CHỈ GỌI ENDTURN NẾU KHÔNG PHẢI ĐANG XỬ LÝ HỘP QUÀ
            if (!window.isProcessingGift) {
                if (typeof endTurn === 'function') endTurn();
            } else {
                console.log("⏳ Đang xử lý hộp quà, không gọi endTurn() ngay!");
            }
        }
    }
    
    pendingAction = null;
    pendingCancelAction = null;
    
    // Đồng bộ dữ liệu sang máy đối thủ
    if (typeof syncGameToRemote === 'function') syncGameToRemote();

    updateUI();
}
// --- HIỂN THỊ BẢNG TỔNG KẾT ---
function showMatchSummary(exp, rankInfo, coins) {
    const expEl = document.getElementById('exp-gain');
    const rankEl = document.getElementById('rank-gain');
    const coinEl = document.getElementById('coin-gain');
    const modalEl = document.getElementById('match-summary-modal');
    
    if (expEl) expEl.innerText = `+${exp} EXP`;
    if (rankEl) rankEl.innerText = rankInfo;
    if (coinEl) coinEl.innerText = `+${coins}$`;
    if (modalEl) modalEl.style.display = 'flex';
}

// Xử lý khi bấm nút "VỀ PHÒNG CHỜ"
const backBtn = document.getElementById('btn-back-lobby');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        const modal = document.getElementById('match-summary-modal');
        if (modal) modal.style.display = 'none';
    });
}

// ===== CẬP NHẬT RANK TRONG TRẬN =====
function updateRankDisplay() {
    console.log("===== updateRankDisplay =====");
    console.log("window.players:", window.players);
    
    const rankMap = {
        "Bùn": { name: "Bùn", icon: "bun.jpg" },
        "Sắt": { name: "Sắt", icon: "sat.jpg" },
        "Đồng": { name: "Đồng", icon: "dong.jpg" },
        "Bạc": { name: "Bạc", icon: "bac.jpg" },
        "Vàng": { name: "Vàng", icon: "vang.jpg" },
        "Kim Cương": { name: "Kim Cương", icon: "kimcuong.jpg" },
        "Hali": { name: "Hali", icon: "hali.jpg" }
    };
    
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
        console.warn("⚠️ Không tìm thấy currentUser");
        return;
    }
    
    console.log("📊 currentUser:", currentUser);
    
    const myPlayerNum = window.myPlayerNumber || 1;
    const opponentNum = myPlayerNum === 1 ? 2 : 1;
    
    console.log(`📊 myPlayerNum: ${myPlayerNum}, opponentNum: ${opponentNum}`);
    
    // ===== CẬP NHẬT RANK CỦA MÌNH =====
    const myRank = currentUser.rank || "Bùn";
    const myRankInfo = rankMap[myRank] || rankMap["Bùn"];
    const myIcon = document.getElementById(`p${myPlayerNum}-rank-icon`);
    if (myIcon) {
        myIcon.src = `assets/ranks/${myRankInfo.icon}`;
        myIcon.alt = myRank;
        console.log(`✅ Cập nhật rank của bạn: ${myRank}`);
    }
    
    // ===== CẬP NHẬT RANK CỦA ĐỐI THỦ =====
    if (window.players && window.players[opponentNum]) {
        const opponentRank = window.players[opponentNum].rank || "Bùn";
        const opponentRankInfo = rankMap[opponentRank] || rankMap["Bùn"];
        const oppIcon = document.getElementById(`p${opponentNum}-rank-icon`);
        if (oppIcon) {
            oppIcon.src = `assets/ranks/${opponentRankInfo.icon}`;
            oppIcon.alt = opponentRank;
            console.log(`✅ Cập nhật rank đối thủ: ${opponentRank}`);
        }
    } else {
        console.warn("⚠️ Chưa có dữ liệu đối thủ");
        console.warn("⚠️ window.players:", window.players);
        console.warn(`⚠️ window.players[${opponentNum}]:`, window.players ? window.players[opponentNum] : 'undefined');
    }
}
// ===== HIỆU ỨNG ÁM SÁT =====
function showAssassinationEffect(targetId, assassinId, amount) {
    console.log(`🗡️ HIỆU ỨNG ÁM SÁT: ${players[assassinId].name} → ${players[targetId].name} (-${amount}$)`);
    
    // 1. Flash màn hình đỏ
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(255, 0, 0, 0.3);
        z-index: 9998;
        pointer-events: none;
        animation: assassinateFlash 0.6s ease-out forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => {
        if (flash.parentNode) flash.remove();
    }, 700);
    
    // 2. Rung màn hình
    document.body.classList.add('assassinate-shake');
    setTimeout(() => {
        document.body.classList.remove('assassinate-shake');
    }, 500);
    
    // 3. Hiển thị chữ ÁM SÁT!
    const text = document.createElement('div');
    text.textContent = `🗡️ ÁM SÁT! -${amount}$`;
    text.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: 900;
        color: #ef4444;
        text-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.5);
        z-index: 9999;
        pointer-events: none;
        animation: assassinateText 1s ease-out forwards;
        font-family: 'Arial Black', sans-serif;
        letter-spacing: 4px;
        background: rgba(0,0,0,0.7);
        padding: 20px 40px;
        border-radius: 16px;
        border: 3px solid #ef4444;
        box-shadow: 0 0 60px rgba(239, 68, 68, 0.3);
    `;
    document.body.appendChild(text);
    setTimeout(() => {
        if (text.parentNode) text.remove();
    }, 1200);
    
    // 4. Âm thanh
    if (audioGame && audioGame.danger) {
        audioGame.danger.currentTime = 0;
        audioGame.danger.volume = 0.8;
        audioGame.danger.play().catch(() => {});
    }
}

