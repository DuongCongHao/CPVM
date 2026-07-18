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
                // SỬA TẠI ĐÂY: Nếu là ô đặc biệt thì XÓA TRỐNG số tiền, không cho hiện 100$
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
                // Đất thuộc về P1 (Đỏ) -> Nhuộm đỏ hẳn miếng đất
                el.style.background = "linear-gradient(135deg, #7f1d1d, #ef4444)"; 
                el.style.color = "#ffffff";
            } else if (cellsData[i].owner === 2) {
                // Đất thuộc về P2 (Xanh) -> Nhuộm xanh hẳn miếng đất
                el.style.background = "linear-gradient(135deg, #1e3a8a, #3b82f6)"; 
                el.style.color = "#ffffff";
            } else {
                // Đất trống chưa ai mua -> Trả lại giao diện tối ban đầu
                el.style.background = ""; 
                el.style.color = "";
            }
        }
    }
    // =========================
    // Cập nhật nút dùng kỹ năng
    // =========================
    const skillBtn = document.getElementById("use-skill-btn");

    if (skillBtn) {

        const mySkill = players[myPlayerNumber]?.skill;

        if (
            gameStarted &&
            currentTurn === myPlayerNumber &&
            mySkill
        ) {
            skillBtn.disabled = false;
            skillBtn.innerText = "🎴 " + mySkill.name;
        } else {
            skillBtn.disabled = true;

            if (mySkill) {
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

// Biến toàn cục để quản lý trạng thái nút bấm bất đồng bộ
let pendingCancelAction = null;
// ===== TIMER QUYẾT ĐỊNH MUA ĐẤT =====
let buyDecisionTimer = null;
let buyDecisionSeconds = 10;
// ===== HIỂN THỊ THÔNG BÁO =====
function showNotification(title, desc, color, confirmCallback, showTwoButtons = true, cancelCallback = null) {
    // 🛠️ SỬA TẠI ĐÂY: Xử lý giải thoát mạch game khi dẫm vào ô đặc biệt
    if (typeof currentTurn !== 'undefined' && players[currentTurn]) {
        let currentPos = players[currentTurn].pos;
        if (currentPos === 0 || currentPos === spiderWebIndex || (typeof lightningIndex !== 'undefined' && currentPos === lightningIndex)) {
            console.log("Phát hiện dẫm vào ô đặc biệt. Tự động ẩn thông báo và kích hoạt chuyển lượt.");
            
            // 1. Ẩn panel thông báo nếu có lỡ hiện
            hideNotification();
            
            // 2. Chuyển lượt cho đối thủ để tránh đứng game (Áp dụng cho cả Offline lẫn Online qua Socket)
            if (socket) {
                // Nếu dẫm vào Mạng Nhện thì gọi skipturn của server, nếu là Thiên tai/ô khác thì endTurn thông thường
                if (currentPos === spiderWebIndex) {
                    socket.emit('skipTurnRequest', { currentTurn: currentTurn });
                } else {
                    if (typeof endTurn === 'function') endTurn();
                }
            } else {
                // Chế độ Offline cục bộ
                if (typeof endTurn === 'function') {
                    endTurn();
                } else {
                    // Dự phòng nếu main.js chưa load kịp hàm endTurn
                    currentTurn = currentTurn === 1 ? 2 : 1;
                    isMoving = false;
                    if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
                }
            }
            return; // Thoát hàm hoàn toàn
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
    
    // KIỂM TRA QUYỀN RA QUYẾT ĐỊNH ONLINE
    const isOnlineMode = (typeof myPlayerNumber !== 'undefined' && myPlayerNumber !== null);
    const isMyTurn = (typeof currentTurn !== 'undefined' && myPlayerNumber === currentTurn);

    // Lưu lại hành động hủy nếu người chơi chọn bấm Bỏ Qua
    pendingCancelAction = cancelCallback;

    if (isOnlineMode && !isMyTurn) {
        // Nếu là chế độ Online và KHÔNG phải lượt của mình -> Ẩn nút, hiển thị dòng chờ
        btnBox.innerHTML = `<span style="color: #94a3b8; font-style: italic; font-size: 13px;">⌛ Đang chờ đối thủ đưa ra quyết định...</span>`;
    } else {
        // Nếu là lượt của mình hoặc đang chơi Offline -> Hiện nút bấm như bình thường
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
    if(showTwoButtons){

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


        if(titleEl){

            titleEl.innerText =
            `Yêu cầu đầu tư (${buyDecisionSeconds}s)`;

        }
        if(buyDecisionSeconds <= 0){
            clearInterval(buyDecisionTimer);
            addLog(
                "⏰ Hết 10 giây không phản hồi. Tự động bỏ qua."
            );
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
        
        pendingAction(); // Thực hiện hành động chính (Mua đất/Nâng cấp/Mua đứt) từ cells.js
    } else {
        addLog(`⏭️ Chọn bỏ qua cơ hội hành động tại ô đất này.`);
        if (pendingCancelAction) {
            pendingCancelAction(); // Thực hiện gọi hàm hủy của cells.js (nếu có)
        } else {
            // Trường hợp dự phòng nếu cells.js không truyền callback hủy, tự động gọi kết thúc lượt để cứu mạch game
            if (typeof endTurn === 'function') endTurn();
        }
    }
    
    pendingAction = null;
    pendingCancelAction = null;
    
    // 1. Đồng bộ dữ liệu mới nhất sang máy đối thủ ngay lập tức qua cổng socket
    if (typeof syncGameToRemote === 'function') syncGameToRemote();

    // 2. Vẽ lại giao diện để cập nhật ngay lập tức màu đất và điểm số vừa thay đổi trên máy chủ thể
    updateUI();
}