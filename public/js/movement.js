// ===== DI CHUYỂN TỪNG BƯỚC =====
function moveStepByStep(totalSteps, d1, d2, isDirectJump = false, callback = null) {
    // 🔥 THÊM DÒNG NÀY: NẾU GAME ĐANG KẾT THÚC, KHÔNG DI CHUYỂN
    if (window.gameEnding) {
        console.log("⛔ Game đang kết thúc, bỏ qua di chuyển!");
        return;
    }
    
    isMoving = true;
    let movePlayer = window.isLuckyMove 
        ? myPlayerNumber 
        : currentTurn;

    let p = players[movePlayer];
    let stepsLeft = Math.abs(totalSteps);
    let direction = totalSteps >= 0 ? 1 : -1; 
    
    if (!isDirectJump) {
        addLog(`🎲 <strong>${p.name}</strong> di chuyển <strong>${totalSteps} ô</strong>...`);
    }

    let audioStarted = false;

    function step() {
        // 🔥 THÊM KIỂM TRA TRONG VÒNG LẶP: NẾU GAME ĐANG KẾT THÚC, DỪNG NGAY
        if (window.gameEnding) {
            console.log("⛔ Game đang kết thúc, dừng di chuyển!");
            // Tắt tiếng
            if (audioGame && audioGame.run) {
                audioGame.run.pause();
                audioGame.run.currentTime = 0;
            }
            // Xóa class moving
            let currentSlot = document.getElementById(`slot-p${movePlayer}-${p.pos}`);
            if (currentSlot) currentSlot.classList.remove('moving');
            isMoving = false;
            return;
        }
        
        if (stepsLeft > 0) {
            let currentSlot = document.getElementById(`slot-p${movePlayer}-${p.pos}`);
            if (currentSlot) currentSlot.classList.remove('moving');

            if (!audioStarted && audioGame && audioGame.run) {
                audioGame.run.loop = true;
                audioGame.run.currentTime = 0;
                audioGame.run.play().catch(() => {});
                audioStarted = true;
            }

            if (direction === 1) {
                p.pos = (p.pos + 1) % TOTAL_CELLS;

                if (p.pos === 0) {
                    // 🔥 KIỂM TRA TRƯỚC KHI CỘNG TIỀN
                    if (window.gameEnding) {
                        console.log("⛔ Game đang kết thúc, không cộng tiền!");
                        return;
                    }
                    
                    // ===== KIỂM TRA TÀNG HÌNH =====
                    if (window.isInvisible && window.invisiblePlayer === movePlayer) {
                        // ===== TRÊN MÁY MÌNH: KHÔNG CẦN LÀM GÌ =====
                        // (Vì mình vẫn thấy)
                        
                        // ===== GỬI ĐỒNG BỘ HIỆN LẠI CHO ĐỐI THỦ =====
                        if (socket && socket.connected) {
                            socket.emit('syncRemoveInvisible', {
                                playerNum: movePlayer,
                                pos: 0
                            });
                            console.log('📤 Đã gửi syncRemoveInvisible cho đối thủ');
                        }
                        
                        window.isInvisible = false;
                        window.invisiblePlayer = null;
                        window.invisiblePos = null;
                        
                        addLog(`👻 ${p.name} đã đến START, hiệu ứng tàng hình kết thúc! (Đối thủ đã thấy bạn)`);
                    }
                    
                    p.money += 300;
                    p.rounds += 1;

                    console.log("======== ROUND +1 ========");
                    console.log(p.name);
                    console.log("Rounds =", p.rounds);

                    addLog(`🎁 <strong>${p.name}</strong> hoàn thành 1 vòng (Ô START), nhận lương <strong>+300$</strong>!`);

                    if (typeof playSFX === 'function' && audioGame && audioGame.buyLand) {
                        playSFX(audioGame.buyLand);
                    }

                    // 🔥 KIỂM TRA TRƯỚC KHI SINH QUÀ
                    if (!window.gameEnding) {
                        checkSpawnGiftEvent();
                    }

                    // 🔥 KIỂM TRA TRƯỚC KHI SINH BOSS
                    if (!window.gameEnding) {
                        checkHaoBossEvent(movePlayer);
                    }

                    // ===== 🆕 KIỂM TRA BOM HẠT NHÂN =====
                    if (!window.gameEnding && !window.nuclearBombDetonated && 
                        players[1].rounds >= 3 && players[2].rounds >= 3) {  // ✅ CẢ 2 MỚI NỔ
                        if (typeof detonateNuclearBomb === 'function') {
                            detonateNuclearBomb();
                        }
                    }
                }
            } else {
                p.pos = (p.pos - 1 + TOTAL_CELLS) % TOTAL_CELLS;
            }
            
            let nextSlot = document.getElementById(`slot-p${movePlayer}-${p.pos}`);
            if (nextSlot) nextSlot.classList.add('moving');
            
            stepsLeft--;
            updateUI();

            if (typeof syncGameToRemote === 'function') {
                syncGameToRemote();
            }

            setTimeout(step, 240);
        } else {
            // Tắt tiếng chạy khi tới đích
            if (audioGame && audioGame.run) {
                audioGame.run.pause();
                audioGame.run.currentTime = 0;
            }

            let finalSlot = document.getElementById(`slot-p${movePlayer}-${p.pos}`);
            if (finalSlot) finalSlot.classList.remove('moving');
            
            isMoving = false;
            
            if (typeof syncGameToRemote === 'function') {
                syncGameToRemote();
            }

            // 🔥 KIỂM TRA TRƯỚC KHI GỌI CALLBACK
            if (window.gameEnding) {
                console.log("⛔ Game đang kết thúc, bỏ qua callback!");
                return;
            }

            if (callback) {
                callback();
            } else {
                if (window.isLuckyMove) {
                    window.isLuckyMove = false;
                }
                
                if (p.pos === 0) {
                    endTurn();
                } else {
                    evaluateTargetCell();
                }
            }
        }
    }
    step();
}
// ===== SINH HỘP QUÀ =====
function checkSpawnGiftEvent() {
    // 🔥 NẾU GAME ĐANG KẾT THÚC, KHÔNG SINH QUÀ
    if (window.gameEnding) {
        console.log("⛔ Game đang kết thúc, bỏ qua sinh hộp quà!");
        return;
    }
    
    let currentTotal = players[1].rounds + players[2].rounds;
    if (currentTotal > totalRoundsMilestone) {
        totalRoundsMilestone = currentTotal;
        spawnRandomGift();
    }
}

function spawnRandomGift() {
    // 🔥 NẾU GAME ĐANG KẾT THÚC, KHÔNG SINH QUÀ
    if (window.gameEnding) {
        console.log("⛔ Game đang kết thúc, bỏ qua spawnRandomGift!");
        return;
    }
    
    let pool = [];
    for (let i = 1; i < TOTAL_CELLS; i++) {
        // 🆕 KHÔNG SINH QUÀ Ở: MẠNG NHỆN, THIÊN TAI, BOM HẠT NHÂN, PHÓNG XẠ
        if (!cellsData[i].hasGift && 
            i !== Number(spiderWebIndex) && 
            i !== Number(window.lightningIndex) && 
            i !== Number(window.nuclearBombIndex) &&
            !cellsData[i].isRadioactive) {
            pool.push(i);
        }
    }
    if (pool.length > 0) {
        let randIdx = pool[Math.floor(Math.random() * pool.length)];
        cellsData[randIdx].hasGift = true;
        addLog(`🎁 ✨ <strong>SỰ KIỆN:</strong> Cả 2 người chơi đã đi hết một vòng! Một <strong>Hộp Quà Bí Ẩn</strong> đã rơi xuống Khu Đất số ${randIdx}!`);
        updateUI();
        
        if (typeof syncGameToRemote === 'function') {
            syncGameToRemote();
        }
    }
}
