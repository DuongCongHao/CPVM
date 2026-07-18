// ===== DI CHUYỂN TỪNG BƯỚC =====
function moveStepByStep(totalSteps, d1, d2, isDirectJump = false, callback = null) {
    isMoving = true;
    let p = players[currentTurn];
    let stepsLeft = Math.abs(totalSteps);
    let direction = totalSteps >= 0 ? 1 : -1; 
    
    if (!isDirectJump) {
        addLog(`🎲 <strong>${p.name}</strong> di chuyển <strong>${totalSteps} ô</strong>...`);
    }

    function step() {
        if (stepsLeft > 0) {
            let currentSlot = document.getElementById(`slot-p${currentTurn}-${p.pos}`);
            if (currentSlot) currentSlot.classList.remove('moving');

            /// 🔥 FIX DELAY: Ép nhạc chạy phát ngay lập tức không độ trễ
            // Bật tiếng chạy khi bắt đầu di chuyển
            if (stepsLeft === Math.abs(totalSteps)) {

                if(audioGame && audioGame.run){

                    audioGame.run.loop = true;
                    audioGame.run.currentTime = 0;

                    audioGame.run.play()
                    .catch(()=>{});

                }

}

            if (direction === 1) {
                p.pos = (p.pos + 1) % TOTAL_CELLS;
                if (p.pos === 0) {
                    p.money += 300;
                    p.rounds += 1;
                    console.log("======== ROUND +1 ========");
                    console.log(p.name);
                    console.log("Rounds =", p.rounds);
                    addLog(`🎁 <strong>${p.name}</strong> hoàn thành 1 vòng (Ô START), nhận lương <strong>+300$</strong>!`);
                    
                    // 🔥 CHÈN VÀO ĐÂY: Phát tiếng tinh tinh nhận tiền thưởng qua vòng
                    if (typeof playSFX === 'function' && audioGame && audioGame.buyLand) {
                        playSFX(audioGame.buyLand);
                    }

                    checkSpawnGiftEvent();
                }
            } else {
                p.pos = (p.pos - 1 + TOTAL_CELLS) % TOTAL_CELLS;
            }
            
            let nextSlot = document.getElementById(`slot-p${currentTurn}-${p.pos}`);
            if (nextSlot) nextSlot.classList.add('moving');
            
            stepsLeft--;
            updateUI();

            // ĐỒNG BỘ: Phát vị trí đang chạy từng bước sang màn hình đối thủ
            if (typeof syncGameToRemote === 'function') {
                syncGameToRemote();
            }

            setTimeout(step, 240);
        } else {
            // Tắt tiếng chạy khi tới đích
            if(audioGame && audioGame.run){
                audioGame.run.pause();
                audioGame.run.currentTime = 0;
            }
            let finalSlot = document.getElementById(`slot-p${currentTurn}-${p.pos}`);
            if (finalSlot) finalSlot.classList.remove('moving');
            isMoving = false;
            
            // ĐỒNG BỘ: Phát vị trí chốt chặn cuối cùng
            if (typeof syncGameToRemote === 'function') {
                syncGameToRemote();
            }

            if(callback) {
                callback();
            } else {
                // Xử lý ô đất vừa đặt chân tới
                evaluateTargetCell();

                // SỬA LỖI KẸT LƯỢT: Nếu đứng ở ô START (pos === 0), không có thông báo mua bán gì, 
                // ta phải ép kết thúc lượt luôn để nhường cho người tiếp theo.
                if (p.pos === 0) {
                    if (typeof endTurn === 'function') {
                        endTurn();
                    }
                }
            }
        }
    }
    step();
}

// ===== SINH HỘP QUÀ =====
function checkSpawnGiftEvent() {
    let currentTotal = players[1].rounds + players[2].rounds;
    if (currentTotal > totalRoundsMilestone) {
        totalRoundsMilestone = currentTotal;
        spawnRandomGift();
    }
}

function spawnRandomGift() {
    let pool = [];
    for (let i = 1; i < TOTAL_CELLS; i++) {
        if (!cellsData[i].hasGift) pool.push(i);
    }
    if (pool.length > 0) {
        let randIdx = pool[Math.floor(Math.random() * pool.length)];
        cellsData[randIdx].hasGift = true;
        addLog(`🎁 ✨ <strong>SỰ KIỆN:</strong> Cả 2 người chơi đã đi hết một vòng! Một <strong>Hộp Quà Bí Ẩn</strong> đã rơi xuống Khu Đất số ${randIdx}!`);
        updateUI();
        
        // ĐỒNG BỘ: Đồng bộ cả vị trí hộp quà mới sinh ra cho tab đối thủ biết
        if (typeof syncGameToRemote === 'function') {
            syncGameToRemote();
        }
    }
}