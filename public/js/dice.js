// ===== QUAY XÚC XẮC 3D ONLINE =====
function rollDice3D() {
    // Nếu game chưa bắt đầu hoặc đang trong hiệu ứng di chuyển thì chặn bấm
    if(!gameStarted || isMoving) return;
    
    // KHÓA CỨNG: Chỉ có người chơi có lượt mới được gửi lệnh tung xúc xắc
    if (typeof myPlayerNumber !== 'undefined' && myPlayerNumber !== currentTurn) {
        return; 
    }

    // Tạm thời vô hiệu hóa nút bấm để tránh người chơi spam click khi đang đợi kết quả
    document.getElementById('roll-btn').disabled = true;
    hideNotification();
    
    // GỬI LỆNH LÊN SERVER: Yêu cầu tung xúc xắc
    socket.emit('requestRollDice');
}

// LẮNG NGHE KẾT QUẢ TỪ SERVER TRẢ VỀ (Dùng chung cho cả 2 máy người chơi)
socket.off('diceRolledResult').on('diceRolledResult', (data) => {
    // Cả 2 tab cùng khóa nút chặn bấm bậy bạ trong lúc đổ xúc xắc
    isMoving = true;
    document.getElementById('roll-btn').disabled = true;
    playSFX(audioGame.dice);
    // Chạy hiệu ứng xoay 3D
    executeDiceAnimation(data.d1, data.d2);
});

// HÀM XỬ LÝ HIỆU ỨNG QUAY 3D
function executeDiceAnimation(d1, d2) {
    const cube1 = document.getElementById('cube1');
    const cube2 = document.getElementById('cube2');

    if (!cube1 || !cube2) {
        // Phòng trường hợp không tìm thấy phần tử HTML xúc xắc
        moveStepByStep(d1 + d2, d1, d2);
        return;
    }

    // Tạo hiệu ứng xoay tít mù ngẫu nhiên trước khi dừng
    const randomX = Math.floor(Math.random() * 360) + 720;
    const randomY = Math.floor(Math.random() * 360) + 720;
    
    cube1.style.transform = `rotateX(${randomX}deg) rotateY(${randomY}deg)`;
    cube2.style.transform = `rotateX(${randomY}deg) rotateY(${randomX}deg)`;

    // Sau 0.6 giây, ép xúc xắc dừng lại đúng mặt kết quả chuẩn từ Server
    setTimeout(() => {
        if (typeof cubeRotations !== 'undefined' && cubeRotations[d1] && cubeRotations[d2]) {
            cube1.style.transform = cubeRotations[d1];
            cube2.style.transform = cubeRotations[d2];
        }
        lastDiceResult = d1 + d2;
        // Đợi hiệu ứng dừng hẳn (0.5 giây) rồi xử lý logic di chuyển
        setTimeout(() => {
            if ((d1 === 1 && d2 === 1) || (d1 === 6 && d2 === 6)) {
                players[currentTurn].money += 100;
                extraTurnGranted = true;
                addLog(`🎉 QUÁ MAY MẮN! Lắc ra bộ đôi [${d1}:${d2}], <strong>${players[currentTurn].name}</strong> nhận ngay <strong>+100$</strong> và được thưởng thêm 1 lượt lắc!`);
            } else {
                extraTurnGranted = false;
            }
            
            // Chỉ có tab đang tới lượt của mình mới được chạy hàm di chuyển
            // Tab đối thủ chỉ ngồi đợi dữ liệu vị trí chốt được bắn qua từ hàm syncActionData
            if (currentTurn === myPlayerNumber) {
                // Lưu vị trí trước khi tung xúc xắc
                lastPositionBeforeRoll = players[currentTurn].pos;

                moveStepByStep(d1 + d2, d1, d2);
            } else {
                addLog(`🎲 <strong>${players[currentTurn].name}</strong> di chuyển <strong>${d1 + d2} ô</strong>...`);
            }
        }, 500);
    }, 600);
}
