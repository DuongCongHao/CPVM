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
                // Di chuyển tiến 1 ô
                p.pos = (p.pos + 1) % TOTAL_CELLS;

                // ================================================================
                // 🗡️ KIỂM TRA ÁM SÁT KHI ĐANG TÀNG HÌNH VÀ ĐI QUA ĐỐI THỦ
                // ================================================================
                if (window.isInvisible && window.invisiblePlayer === movePlayer) {
                    const enemyId = movePlayer === 1 ? 2 : 1;
                    const enemy = players[enemyId];
                    // Kiểm tra: đối thủ đang đứng ở ô vừa bước vào
                    if (enemy && enemy.pos === p.pos) {
                        const cell = cellsData[p.pos];
                        const isEnemySafe = (cell.owner === enemyId);
                        
                        if (!isEnemySafe) {
                            // Thực hiện ám sát: trừ 250 tiền của đối thủ
                            const assassinateAmount = 250;
                            enemy.money -= assassinateAmount;
                            
                            // Log nổi bật trên máy kẻ ám sát
                            addLog(`🗡️🔥 <strong style="color: #ef4444;">${p.name} (TÀNG HÌNH) ĐÃ ÁM SÁT ${enemy.name}! Mất ${assassinateAmount}$!</strong>`);
                            
                            // Gửi sự kiện ám sát cho cả 2 máy
                            if (socket && socket.connected) {
                                socket.emit('syncAssassination', {
                                    targetId: enemyId,
                                    assassinId: movePlayer,
                                    amount: assassinateAmount,
                                    pos: p.pos
                                });
                                console.log(`🗡️ Đã gửi syncAssassination: ${p.name} → ${enemy.name} (-${assassinateAmount}$)`);
                            }
                            
                            // Gọi hiệu ứng nổi bật trên máy hiện tại (kẻ ám sát)
                            if (typeof showAssassinationEffect === 'function') {
                                showAssassinationEffect(enemyId, movePlayer, assassinateAmount);
                            }
                            
                            // Cập nhật UI
                            updateUI();
                            
                            // Kiểm tra nếu đối thủ phá sản
                            if (enemy.money < 0) {
                                addLog(`💀 ${enemy.name} đã bị ám sát và phá sản!`);
                                if (socket && socket.connected) {
                                    socket.emit("gameOver", { winnerId: movePlayer, reason: "money" });
                                } else {
                                    gameOver(movePlayer, "money");
                                }
                                // Dừng di chuyển vì game kết thúc
                                isMoving = false;
                                return;
                            }
                        }
                    }
                }

                if (p.pos === 0) {
                    // 🔥 KIỂM TRA TRƯỚC KHI CỘNG TIỀN
                    if (window.gameEnding) {
                        console.log("⛔ Game đang kết thúc, không cộng tiền!");
                        return;
                    }
                    
                    // ===== KIỂM TRA TÀNG HÌNH =====
                    if (window.isInvisible && window.invisiblePlayer === movePlayer) {
                        // ===== XÓA TÀNG HÌNH TRÊN MÁY MÌNH =====
                        // Không cần làm gì vì máy mình vẫn thấy
                        
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
                    
                    // ================================================================
                    // 💣 KIỂM TRA BOM KHI QUA START (THÊM VÀO)
                    // ================================================================
                    if (window.bombData && window.bombData.active && window.bombData.targetId === movePlayer) {
                        // Gỡ bom (không nổ)
                        window.bombData.active = false;
                        addLog(`💣 ${p.name} đã đi qua START, bom đã được gỡ bỏ an toàn!`);
                        
                        // Đồng bộ
                        if (socket && socket.connected) {
                            socket.emit('syncBombDefused', {
                                targetId: movePlayer,
                                ownerId: window.bombData.ownerId
                            });
                        }
                        
                        // Reset bombData
                        window.bombData = null;
                        // Đảm bảo không nổ bom ở cuối lượt
                        window.bombCheckAfterMove = false;
                    }
                    
                    p.money += 300;
                    p.rounds += 1;

                    // ================================================================
                    // 🆕 GIỮ BẢN THỂ HẮC ÁM KHI ĐI QUA START
                    // ================================================================
                    if (window.darkChaseActive) {
                        // Nếu chủ nhân của bản thể đang đi qua START
                        if (window.darkChaseOwner === movePlayer) {
                            // Bản thể vẫn ở vị trí cũ, không thay đổi
                            // Render lại icon để đảm bảo hiển thị
                            renderDarkChaser(window.darkChasePos, movePlayer);
                            addLog(`👹 Bản thể Hắc Ám vẫn đang truy đuổi tại ô ${window.darkChasePos}! (Còn ${window.darkChaseTurns} lượt)`);
                        }
                        // Nếu đối thủ đang đi qua START (người bị truy đuổi)
                        else if (window.darkChaseTarget === movePlayer) {
                            // Vẫn render bản thể ở vị trí cũ để đối thủ thấy
                            renderDarkChaser(window.darkChasePos, window.darkChaseOwner);
                            addLog(`👹 ${p.name} đi qua START, Bản thể Hắc Ám vẫn đang truy đuổi! (Còn ${window.darkChaseTurns} lượt)`);
                        }
                    }

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
                // Di chuyển lùi 1 ô
                p.pos = (p.pos - 1 + TOTAL_CELLS) % TOTAL_CELLS;
                
                // ================================================================
                // 🗡️ KIỂM TRA ÁM SÁT KHI ĐANG TÀNG HÌNH VÀ ĐI QUA ĐỐI THỦ (LÙI)
                // ================================================================
                if (window.isInvisible && window.invisiblePlayer === movePlayer) {
                    const enemyId = movePlayer === 1 ? 2 : 1;
                    const enemy = players[enemyId];
                    if (enemy && enemy.pos === p.pos) {
                        const cell = cellsData[p.pos];
                        const isEnemySafe = (cell.owner === enemyId);
                        
                        if (!isEnemySafe) {
                            const assassinateAmount = 250;
                            enemy.money -= assassinateAmount;
                            
                            addLog(`🗡️🔥 <strong style="color: #ef4444;">${p.name} (TÀNG HÌNH) ĐÃ ÁM SÁT ${enemy.name}! Mất ${assassinateAmount}$!</strong>`);
                            
                            if (socket && socket.connected) {
                                socket.emit('syncAssassination', {
                                    targetId: enemyId,
                                    assassinId: movePlayer,
                                    amount: assassinateAmount,
                                    pos: p.pos
                                });
                                console.log(`🗡️ Đã gửi syncAssassination: ${p.name} → ${enemy.name} (-${assassinateAmount}$)`);
                            }
                            
                            if (typeof showAssassinationEffect === 'function') {
                                showAssassinationEffect(enemyId, movePlayer, assassinateAmount);
                            }
                            
                            updateUI();
                            
                            if (enemy.money < 0) {
                                addLog(`💀 ${enemy.name} đã bị ám sát và phá sản!`);
                                if (socket && socket.connected) {
                                    socket.emit("gameOver", { winnerId: movePlayer, reason: "money" });
                                } else {
                                    gameOver(movePlayer, "money");
                                }
                                isMoving = false;
                                return;
                            }
                        }
                    }
                }
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

            // ================================================================
            // 💣 KIỂM TRA BOM SAU KHI DI CHUYỂN XONG (THÊM VÀO)
            // ================================================================
            if (window.bombCheckAfterMove && window.bombData && window.bombData.active) {
                window.bombCheckAfterMove = false;
                // Nếu người chơi đã qua START thì không nổ (nhưng trường hợp này đã được xử lý ở trên)
                // Kiểm tra nếu vị trí hiện tại KHÔNG phải START
                if (p.pos !== 0) {
                    // BOM NỔ!
                    if (typeof executeBombExplosion === 'function') {
                        executeBombExplosion(movePlayer);
                    } else {
                        console.error("❌ Hàm executeBombExplosion chưa được định nghĩa!");
                    }
                } else {
                    // Đã qua START, bom đã được gỡ ở trên (nếu có)
                    window.bombData = null;
                }
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
