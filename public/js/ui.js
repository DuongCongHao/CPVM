// ===== CẬP NHẬT GIAO DIỆN =====
function updateUI() {
    document.getElementById('p1-money').innerText = players[1].money;
    document.getElementById('p2-money').innerText = players[2].money;
    document.getElementById('p1-round').innerText = `Vòng: ${players[1].rounds}`;
    document.getElementById('p2-round').innerText = `Vòng: ${players[2].rounds}`;
    
    document.getElementById('p1-skip').style.display = players[1].skipNextTurn ? 'block' : 'none';
    document.getElementById('p2-skip').style.display = players[2].skipNextTurn ? 'block' : 'none';

    if (gameStarted && currentTurn) {
        const turnTxt = document.getElementById('turn-txt');
        // Thêm chữ (BẠN) nếu đang đến lượt của chính thiết bị này
        const isMyTurnText = (typeof myPlayerNumber !== 'undefined' && myPlayerNumber === currentTurn) ? " (BẠN)" : "";
        turnTxt.innerText = `LƯỢT ĐI: ${players[currentTurn].name}${isMyTurnText}`;
        turnTxt.style.background = currentTurn === 1 ? '#ef4444' : '#3b82f6';
    }

    for(let i = 0; i < TOTAL_CELLS; i++) {
        const el = document.getElementById(`cell-${i}`);
        if (!el) continue;

        // Cập nhật vị trí hiển thị avatar người chơi và hộp quà
        el.classList.toggle('has-p1', players[1].pos === i);
        el.classList.toggle('has-p2', players[2].pos === i);
        el.classList.toggle('has-gift', cellsData[i].hasGift);

        // 🔥 TỰ ĐỘNG ĐỒNG BỘ MÀU SẮC Ô ĐẤT THEO BIẾN OWNER CHO CẢ 2 BÊN
        if (i > 0) { // Bỏ qua ô START (ô số 0)
            const priceEl = document.getElementById(`price-${i}`);
            if (priceEl) {
                // Nếu là ô đặc biệt thì hiển thị tên, không hiện tiền
                if (i === spiderWebIndex) {
                    priceEl.innerText = "KHOÁ LƯỢT";
                } else if (typeof lightningIndex !== 'undefined' && i === lightningIndex) {
                    priceEl.innerText = "⚡ SẤM SÉT";
                } else {
                    priceEl.innerText = `${cellsData[i].price}$`;
                }
            }

            // Xóa viền lỗi hiển thị nếu có
            el.style.borderTop = "none"; 

            if (cellsData[i].owner === 1) {
                // Đất thuộc về P1 (Đỏ) -> Nhuộm đỏ
                el.style.background = "linear-gradient(135deg, #7f1d1d, #ef4444)"; 
                el.style.color = "#ffffff";
            } else if (cellsData[i].owner === 2) {
                // Đất thuộc về P2 (Xanh) -> Nhuộm xanh
                el.style.background = "linear-gradient(135deg, #1e3a8a, #3b82f6)"; 
                el.style.color = "#ffffff";
            } else {
                // Đất trống chưa ai mua -> Trả lại giao diện tối ban đầu
                el.style.background = ""; 
                el.style.color = "";
            }
        }
    }

    // ===== CẬP NHẬT NÚT DÙNG KỸ NĂNG =====
    const skillBtn = document.getElementById("use-skill-btn");

    if (skillBtn) {
        const mySkill = players[myPlayerNumber]?.skill;

        if (
            gameStarted &&
            currentTurn === myPlayerNumber &&
            mySkill &&
            !players[myPlayerNumber].skillUsed
        ) {
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
}

// ===== NHẬT KÝ TRẬN ĐẤU =====
function addLog(text) {
    const logBox = document.getElementById('log');
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
    
    // Nếu có 2 nút lựa chọn thì bắt đầu đếm
    if(showTwoButtons) {
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
            if (typeof endTurn === 'function') endTurn();
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
    document.getElementById('exp-gain').innerText = `+${exp} EXP`;
    document.getElementById('rank-gain').innerText = rankInfo;
    document.getElementById('coin-gain').innerText = `+${coins}$`;
    document.getElementById('match-summary-modal').style.display = 'flex';
}

// Xử lý khi bấm nút "VỀ PHÒNG CHỜ"
document.getElementById('btn-back-lobby').addEventListener('click', () => {
    document.getElementById('match-summary-modal').style.display = 'none';
    // Nếu bạn có hàm quay lại lobby (ví dụ: showLobby()), hãy gọi nó ở đây
});