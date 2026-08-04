// ===== PHÂN ĐỊNH NGƯỜI CHƠI ĐI TRƯỚC ONLINE =====
function determineTurn() {
    console.log("🎲 determineTurn() được gọi");
    const turnTxt = document.getElementById('turn-txt');
    const rollBtn = document.getElementById('roll-btn');
    
    if (!turnTxt || !rollBtn) {
        console.error("❌ Không tìm thấy turnTxt hoặc rollBtn trong determineTurn!");
        return;
    }
    
    console.log(`📊 determineTurnData: p1Roll=${determineTurnData.p1Roll}, p2Roll=${determineTurnData.p2Roll}`);
    
    // Luôn là chế độ Online - myPlayerNumber sẽ được server gán
    const isOnline = (typeof myPlayerNumber !== 'undefined' && myPlayerNumber !== null);

    if (determineTurnData.p1Roll === null) {
        // Giai đoạn: Đợi P1 tung xúc xắc
        turnTxt.innerText = "🎲 NGƯỜI CHƠI 1 [P1] - TỚI LƯỢT CỦA BẠN";
        turnTxt.style.background = '#ef4444';
        determineTurnData.currentPlayer = 1;

        if (isOnline && myPlayerNumber !== 1) {
            // Nếu MÌNH LÀ P2 nhưng đang là lượt P1 -> KHÓA NÚT
            rollBtn.innerText = "Đang chờ Người chơi 1 tung...";
            rollBtn.disabled = true;
            rollBtn.onclick = null;
        } else if (isOnline && myPlayerNumber === 1) {
            // Nếu mình là P1 -> MỞ NÚT
            rollBtn.innerText = "Người chơi 1 hãy xúc đi nào";
            rollBtn.disabled = false;
            rollBtn.onclick = () => requestDetermineTurn(1);
            console.log("✅ roll-btn đã được bật cho P1");
        } else {
            console.warn("⚠️ Không xác định được myPlayerNumber, giữ rollBtn disabled");
            rollBtn.disabled = true;
        }

    } else if (determineTurnData.p2Roll === null) {
        // Giai đoạn: Đợi P2 tung xúc xắc
        turnTxt.innerText = "🎲 NGƯỜI CHƠI 2 [P2] - TỚI LƯỢT CỦA BẠN";
        turnTxt.style.background = '#3b82f6';
        determineTurnData.currentPlayer = 2;

        if (isOnline && myPlayerNumber !== 2) {
            // Nếu MÌNH LÀ P1 nhưng đang là lượt P2 -> KHÓA NÚT
            rollBtn.innerText = "Đang chờ Người chơi 2 tung...";
            rollBtn.disabled = true;
            rollBtn.onclick = null;
        } else if (isOnline && myPlayerNumber === 2) {
            // Nếu mình là P2 -> MỞ NÚT
            rollBtn.innerText = "Người chơi 2 tới lượt bạn";
            rollBtn.disabled = false;
            rollBtn.onclick = () => requestDetermineTurn(2);
            console.log("✅ roll-btn đã được bật cho P2");
        } else {
            console.warn("⚠️ Không xác định được myPlayerNumber, giữ rollBtn disabled");
            rollBtn.disabled = true;
        }
    } else {
        console.warn("⚠️ determineTurn được gọi nhưng cả 2 player đã có roll!");
    }
}

// ===== GỬI YÊU CẦU TUNG XÚC XẮC TRANH LƯỢT =====
function requestDetermineTurn(playerNum) {
    console.log(`🎲 requestDetermineTurn(${playerNum}) được gọi`);
    // Khóa nút ngay lập tức sau khi bấm để tránh spam click
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) {
        rollBtn.disabled = true;
        rollBtn.innerText = "Đang tung...";
    }
    
    // Kiểm tra socket tồn tại
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        socket.emit('requestDetermineRoll', { player: playerNum });
        console.log(`📤 Đã gửi requestDetermineRoll cho player ${playerNum}`);
    } else {
        console.error("❌ Socket chưa sẵn sàng hoặc chưa kết nối!");
        if (rollBtn) {
            rollBtn.disabled = false;
            rollBtn.innerText = "Lỗi kết nối! Thử lại";
        }
        // Thử kết nối lại sau 1 giây
        setTimeout(() => {
            if (typeof determineTurn === 'function') {
                determineTurn();
            }
        }, 1000);
    }
}

// ===== ĐẢM BẢO HÀM CÓ SẴN TRONG PHẠM VI TOÀN CỤC =====
window.requestDetermineTurn = requestDetermineTurn;

// ===== LẮNG NGHE KẾT QUẢ PHÂN CHIA LƯỢT TỪ SERVER =====
socket.on('determineRollResult', (data) => {
    // data nhận về bao gồm: { player, d1, d2, sum }
    executeDetermineAnimation(data.player, data.d1, data.d2, data.sum);
});

// ===== HÀM XỬ LÝ HIỆU ỨNG XOAY VÀ CẬP NHẬT KẾT QUẢ ĐỒNG BỘ =====
function executeDetermineAnimation(player, d1, d2, sum) {
    const cube1 = document.getElementById('cube1');
    const cube2 = document.getElementById('cube2');
    
    if (!cube1 || !cube2) {
        console.error("❌ Không tìm thấy cube elements trong executeDetermineAnimation!");
        return;
    }
    
    const randomX = Math.floor(Math.random() * 360) + 720;
    const randomY = Math.floor(Math.random() * 360) + 720;
    
    cube1.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg)`;
    cube2.style.transform = `rotateX(${randomY}deg) rotateY(${randomX}deg)`;
    
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) rollBtn.disabled = true;
    
    setTimeout(() => {
        if (typeof cubeRotations !== 'undefined' && cubeRotations[d1] && cubeRotations[d2]) {
            cube1.style.transform = cubeRotations[d1];
            cube2.style.transform = cubeRotations[d2];
        } else {
            // Fallback nếu cubeRotations không tồn tại
            console.warn("⚠️ cubeRotations không tồn tại, sử dụng fallback");
            cube1.style.transform = `rotateX(${d1 * 60}deg) rotateY(${d1 * 60}deg)`;
            cube2.style.transform = `rotateX(${d2 * 60}deg) rotateY(${d2 * 60}deg)`;
        }
        
        setTimeout(() => {
            addLog(`🎲 <strong>Người chơi ${player} [P${player}]</strong> tung được: <strong>${d1} + ${d2} = ${sum}</strong>`);
            
            if (player === 1) {
                determineTurnData.p1Roll = sum;
                // Gọi lại hàm để tự động chuyển trạng thái khóa/mở nút cho lượt tiếp theo
                determineTurn();
            } else {
                determineTurnData.p2Roll = sum;
                
                // So sánh kết quả đồng bộ theo dữ liệu từ Server
                if (determineTurnData.p1Roll > determineTurnData.p2Roll) {
                    currentTurn = 1;
                    addLog(`🏆 <strong>P1 thắng!</strong> ${determineTurnData.p1Roll} > ${determineTurnData.p2Roll} → <strong>P1 đi trước!</strong>`);
                } else if (determineTurnData.p2Roll > determineTurnData.p1Roll) {
                    currentTurn = 2;
                    addLog(`🏆 <strong>P2 thắng!</strong> ${determineTurnData.p2Roll} > ${determineTurnData.p1Roll} → <strong>P2 đi trước!</strong>`);
                } else {
                    addLog(`⚔️ <strong>HÒA!</strong> Cả 2 tung được ${determineTurnData.p1Roll}. Tung lại để phân định!`);
                    determineTurnData.p1Roll = null;
                    determineTurnData.p2Roll = null;
                    determineTurn();
                    return;
                }
                
                // Khởi động trận đấu chính thức trên cả 2 máy
                gameStarted = true;
                // 🎵 BẬT NHẠC NỀN KHI TRẬN ĐẤU BẮT ĐẦU
                if (audioGame && audioGame.bgm) {
                    audioGame.bgm.currentTime = 0;
                    audioGame.bgm.play()
                    .catch(err => console.log("Không thể phát nhạc nền:", err));
                }
                // Kiểm tra lượt xem ai được quyền đổ xúc xắc chính thức đầu tiên
                if (typeof checkMyTurnControl === 'function') {
                    checkMyTurnControl();
                }
                updateUI();
                addLog(`🎮 <strong>TRẬN ĐẤU CHÍNH THỨC BẮT ĐẦU!</strong>`);
            }
        }, 500);
    }, 600);
}