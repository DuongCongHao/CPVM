// ===== ĐÁNH GIÁ Ô ĐẤT =====
function evaluateTargetCell() {
    // 🔥 NẾU GAME ĐANG KẾT THÚC, KHÔNG CHO MUA ĐẤT
    if (window.gameEnding) {
        console.log("⛔ Game đang kết thúc, bỏ qua mua đất!");
        endTurn();
        return;
    }
    
    let targetPlayer = window.isLuckyMove 
        ? myPlayerNumber 
        : currentTurn;
    let p = players[targetPlayer];
    let targetCell = cellsData[p.pos];

    // 🆕 KIỂM TRA Ô BOM HẠT NHÂN (CHƯA NỔ) - NỔ KHI ĐI VÀO
    if (p.pos === Number(window.nuclearBombIndex) && !window.nuclearBombDetonated) {
        addLog(`💣 ${p.name} đã dẫm vào bom hạt nhân! BOM PHÁT NỔ NGAY LẬP TỨC!`);
        if (typeof detonateNuclearBomb === 'function') {
            detonateNuclearBomb();
        }
        endTurn();
        return;
    }

    // 🆕 KIỂM TRA Ô NHIỄM PHÓNG XẠ - DÍNH HIỆU ỨNG LÊN NGƯỜI CHƠI
    if (cellsData[p.pos]?.isRadioactive) {
        // Dính hiệu ứng phóng xạ 3 lượt lên người chơi
        players[targetPlayer].radiationEffect = 3;
        addLog(`☢️ ${p.name} dính hiệu ứng phóng xạ! Mỗi lượt xúc xắc sẽ mất 25$, kéo dài 3 lượt.`);
        
        // Đồng bộ phóng xạ
        if (typeof syncGameToRemote === 'function') syncGameToRemote();
        if (socket && socket.connected) {
            socket.emit('syncRadiationEffect', {
                players: {
                    1: { radiationEffect: players[1].radiationEffect || 0 },
                    2: { radiationEffect: players[2].radiationEffect || 0 }
                }
            });
        }
        
        updateUI();
        endTurn();
        return;
    }

    // 🔥 FIX CHÍNH: KIỂM TRA MẠNG NHỆN TRƯỚC TIÊN
    if (p.pos === spiderWebIndex) {
        addLog(`🕷️ <strong>${p.name}</strong> dẫm vào Mạng Nhện! Mất lượt xúc xắc ở vòng kế tiếp!`);
        players[targetPlayer].skipNextTurn = true;

        addLog(`🕷️ ${players[targetPlayer].name} sẽ bị mất lượt ở vòng tiếp theo!`);

        updateUI();

        if (typeof syncGameToRemote === 'function')
            syncGameToRemote();
        
        // 🔥 FIX: Chuyển lượt ngay lập tức (KHÔNG thêm lượt cho đối thủ)
        endTurn();
        return;
    }

    // 🔥 KIỂM TRA DÙNG SKILL - NẾU CÓ THÌ BỎ QUA MUA ĐẤT VÀ CHUYỂN LƯỢT
    if (skillUsedThisTurn) {
        addLog(`⏭️ <strong>${p.name}</strong> đã dùng kỹ năng, bỏ qua cơ hội mua đất lần này!`);
        skillUsedThisTurn = false;
        endTurn();
        return;
    }

    // 🔥 FIX CHÍNH: KIỂM TRA THIÊN TAI TRƯỚC TIÊN
    
    console.log("===== CHECK LIGHTNING =====");
    console.log("p.pos =", p.pos);
    console.log("window.lightningIndex =", window.lightningIndex);

    if (
        window.lightningIndex !== null &&
        p.pos === Number(window.lightningIndex)
    )
    {
        console.log(">>> GỌI handleLandOnCell");
        handleLandOnCell(p.pos);
        return;
    }
    
    if (targetCell.hasGift) {
        targetCell.hasGift = false;
        updateUI();
        if (typeof syncGameToRemote === 'function') syncGameToRemote(); 
        triggerGiftAction();
        return;
    }

    // 🔥 CHỈ CHO MUA ĐẤT NẾU GAME CHƯA KẾT THÚC
    if (p.pos === 0) {
        endTurn();
    } else if (targetCell.owner === null) {
        if (p.money >= targetCell.price) {
            const buyerPlayerId = targetPlayer;
            showNotification("💰 Mua Đất Trống", `Khu Đất số ${p.pos} chưa thuộc về ai. Bạn muốn chi <strong>${targetCell.price}$</strong> để sở hữu ô này?`, '#10b981', () => {
                // 🔥 KIỂM TRA LẠI GAME CHƯA KẾT THÚC
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy mua đất!");
                    endTurn();
                    return;
                }
                players[buyerPlayerId].money -= targetCell.price;
                targetCell.owner = buyerPlayerId;
                
                addLog(`🏠 <strong>${players[buyerPlayerId].name}</strong> mua thành công Khu Đất ${p.pos} (${targetCell.price}$)`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy mua đất!");
                    endTurn();
                    return;
                }
                addLog(`⏭️ <strong>${p.name}</strong> quyết định không mua Khu Đất ${p.pos}.`);
                endTurn();
            });
        } else {
            addLog(`💸 Không đủ tài chính đầu tư Khu Đất ${p.pos}.`);
            endTurn();
        }
    } else if (targetCell.owner === targetPlayer) {
        if (p.money >= 100) {
            const upgraderPlayerId = targetPlayer;
            showNotification("📈 Nâng Cấp Bất Động Sản", `Bạn đang đứng ở Khu Đất số ${p.pos} của chính mình. Bỏ ra <strong>100$</strong> để nâng cấp giá trị đất lên gấp đôi không?`, '#eab308', () => {
                // 🔥 KIỂM TRA LẠI GAME CHƯA KẾT THÚC
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy nâng cấp!");
                    endTurn();
                    return;
                }
                players[upgraderPlayerId].money -= 100;
                targetCell.price *= 2;
                
                addLog(`⚡ <strong>${players[upgraderPlayerId].name}</strong> nâng cấp Khu Đất ${p.pos}! Giá trị mới tăng lên: <strong>${targetCell.price}$</strong>!`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy nâng cấp!");
                    endTurn();
                    return;
                }
                addLog(`⏭️ <strong>${p.name}</strong> bỏ qua cơ hội nâng cấp Khu Đất ${p.pos}.`);
                endTurn();
            });
        } else {
            addLog(`An toàn nghỉ ngơi tại nhà mình (Khu Đất ${p.pos}). Bạn không đủ 100$ để nâng cấp.`);
            endTurn();
        }
    } else {
        let enemyId = targetPlayer === 1 ? 2 : 1;
        let fine = targetCell.price * 2;
        
        addLog(`⚠️ Dẫm bẫy! Bạn bước vào địa bàn của ${players[enemyId].name}. Nộp tiền phạt: <strong>${fine}$</strong>`);
        
        p.money -= fine;
        players[enemyId].money += fine;
        
        updateUI();
        if (typeof syncGameToRemote === 'function') syncGameToRemote();

        if (p.money < 0) {
            console.log("🏆 CLIENT GỌI GAMEOVER", {
                winnerId: enemyId,
                reason:"money"
            });
            socket.emit("gameOver", {
                winnerId: enemyId,
                reason: "money"
            });
            return;
        }

        if (p.money >= fine) {
            const forceBuyerPlayerId = targetPlayer;
            showNotification("🔥 Mua Đứt Tài Sản", `Chi thêm <strong>${fine}$</strong> để cưỡng chế mua đứt lại Khu Đất ${p.pos} từ đối thủ?`, '#ef4444', () => {
                // 🔥 KIỂM TRA LẠI GAME CHƯA KẾT THÚC
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy mua đứt!");
                    endTurn();
                    return;
                }
                players[forceBuyerPlayerId].money -= fine;
                targetCell.owner = forceBuyerPlayerId;
                targetCell.price = fine; 
                
                addLog(`🔥 <strong>${players[forceBuyerPlayerId].name}</strong> THU MUA ĐỨT Khu Đất ${p.pos}! Giá đất tăng lên ${fine}$`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
                if (window.gameEnding) {
                    console.log("⛔ Game đã kết thúc, hủy mua đứt!");
                    endTurn();
                    return;
                }
                addLog(`⏭️ <strong>${p.name}</strong> chấp nhận nộp phạt chứ không mua đứt ô đất.`);
                endTurn();
            });
        } else {
            addLog(`⏭️ <strong>${p.name}</strong> không đủ tiền mặt để thực hiện lệnh ép mua đứt.`);
            endTurn();
        }
    }
}
// ===== XỬ LÝ HỘP QUÀ =====
function triggerGiftAction() {
    // 🔥 ĐÁNH DẤU ĐANG XỬ LÝ HỘP QUÀ
    window.isProcessingGift = true;
    
    let giftPlayer = window.isLuckyMove
        ? myPlayerNumber
        : currentTurn;

    let p = players[giftPlayer];
    let enemyId = giftPlayer === 1 ? 2 : 1;
    
    const actions = ["money_plus", "money_minus", "free_buy", "go_forward", "go_backward", "skip_turn"];
    const chosenAction = actions[Math.floor(Math.random() * actions.length)];

    // Hàm callback chung để kết thúc xử lý hộp quà
    const finishGift = (callback) => {
        window.isProcessingGift = false;
        if (callback) callback();
    };

    if (chosenAction === "money_plus") {
        p.money += 200;
        showSingleNotification("🎁 HỘP QUÀ MAY MẮN", `Bạn mở được phong bao tài lộc! Nhận ngay <strong>+200$</strong> tiền thưởng mặt.`, '#3b82f6', () => {
            addLog(`🎁 🎉 Quà tặng: <strong>${p.name}</strong> bốc trúng rương vàng nhận <strong>+200$</strong>.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            finishGift(() => endTurn());
        });
    } 
    else if (chosenAction === "money_minus") {
        p.money -= 200;
        showSingleNotification("💥 HỘP QUÀ XUI XẺO", `Ôi không! Hộp quà phát nổ, bạn bị phạt tổn thất tài chính <strong>-200$</strong>!`, '#ef4444', () => {
            addLog(`🎁 💥 Hình phạt: <strong>${p.name}</strong> dẫm mìn rương bẫy bị phạt nặng <strong>-200$</strong>.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            
            if (p.money < 0) {
                finishGift(() => gameOver(enemyId));
            } else {
                finishGift(() => endTurn());
            }
        });
    } 
    else if (chosenAction === "free_buy") {
        let enemyCellIndices = [];
        cellsData.forEach((c, idx) => {
            if (c.owner === enemyId) enemyCellIndices.push(idx);
        });

        if (enemyCellIndices.length > 0) {
            let randomIdx = enemyCellIndices[Math.floor(Math.random() * enemyCellIndices.length)];
            cellsData[randomIdx].owner = giftPlayer;
            
            showSingleNotification("👑 SIÊU QUÀ ĐẶC QUYỀN", `Bạn nhận được Sắc lệnh tịch thu! Chiếm quyền sở hữu <strong>Khu Đất số ${randomIdx}</strong> của đối thủ hoàn toàn <strong>MIỄN PHÍ</strong>!`, '#10b981', () => {
                addLog(`🎁 👑 Quà đặc quyền: <strong>${p.name}</strong> tước đoạt thành công Khu Đất số ${randomIdx} của đối thủ miễn phí.`);
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                finishGift(() => endTurn());
            });
        } else {
            showSingleNotification("🎁 HỘP QUÀ TRỐNG", `Bạn nhận được đặc quyền chiếm đất đối thủ, nhưng đối thủ chưa sở hữu mảnh đất nào cả! Tiếc quá!`, '#94a3b8', () => {
                addLog(`🎁 💨 Quà hụt: Không có đất đối thủ để tịch thu.`);
                finishGift(() => endTurn());
            });
        }
    } 
    else if (chosenAction === "go_forward") {
        showSingleNotification("🚀 DỊCH CHUYỂN TIẾN", `Sức mạnh phản lực phóng bạn **Tiến lên phía trước 2 ô**!`, '#38bdf8', () => {
            addLog(`🎁 🚀 <strong>${p.name}</strong> được đẩy tiến thêm 2 ô.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            
            // 🔥 QUAN TRỌNG: Đánh dấu đã xử lý hộp quà trước khi di chuyển
            window.isProcessingGift = false;
            
            moveStepByStep(2, 0, 0, true, () => {
                // Sau khi di chuyển, xử lý ô đất
                evaluateTargetCell();
            });
        });
    } 
    else if (chosenAction === "go_backward") {
        showSingleNotification("⏳ DỊCH CHUYỂN LÙI", `Bạn dẫm phải vết nứt thời gian, bị **Lùi lại phía sau 2 ô**!`, '#f43f5e', () => {
            addLog(`🎁 ⏳ <strong>${p.name}</strong> bị kéo lùi về sau 2 ô.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            
            // 🔥 QUAN TRỌNG: Đánh dấu đã xử lý hộp quà trước khi di chuyển
            window.isProcessingGift = false;
            
            moveStepByStep(-2, 0, 0, true, () => {
                // Sau khi di chuyển, xử lý ô đất
                evaluateTargetCell();
            });
        });
    }
    // ===== THÊM TRƯỜNG HỢP SKIP_TURN =====
    else if (chosenAction === "skip_turn") {
        showSingleNotification("⏭️ MẤT LƯỢT", `Bạn đã mở hộp quà và bị mất lượt!`, '#ef4444', () => {
            addLog(`🎁 ⏭️ <strong>${p.name}</strong> đã mở hộp quà và bị mất lượt!`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            finishGift(() => endTurn());
        });
    }
}