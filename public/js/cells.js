// ===== ĐÁNH GIÁ Ô ĐẤT =====
function evaluateTargetCell() {
    
    let p = players[currentTurn];
    let targetCell = cellsData[p.pos];

    // 🔥 FIX CHÍNH: KIỂM TRA MẠNG NHỆN TRƯỚC TIÊN
    if (p.pos === spiderWebIndex) {
        addLog(`🕷️ <strong>${p.name}</strong> dẫm vào Mạng Nhện! Mất lượt xúc xắc ở vòng kế tiếp!`);
        players[currentTurn].skipNextTurn = true;
        updateUI();
        if (typeof syncGameToRemote === 'function') syncGameToRemote();
        
        if (socket) {
            socket.emit('skipTurnRequest', { currentTurn: currentTurn });
        } else {
            // Offline: Chuyển lượt ngay lập tức sau 1.5 giây
            setTimeout(() => {
                currentTurn = currentTurn === 1 ? 2 : 1;
                isMoving = false;
                if (typeof checkMyTurnControl === 'function') checkMyTurnControl();
            }, 1500);
        }
        return; // Thoát khỏi hàm, không xử lý các điều kiện khác
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

    if (p.pos === 0) {
        endTurn();
    } else if (targetCell.owner === null) {
        if (p.money >= targetCell.price) {
            showNotification("💰 Mua Đất Trống", `Khu Đất số ${p.pos} chưa thuộc về ai. Bạn muốn chi <strong>${targetCell.price}$</strong> để sở hữu ô này?`, '#10b981', () => {
                p.money -= targetCell.price;
                targetCell.owner = currentTurn; // Chỉ cập nhật dữ liệu owner
                
                addLog(`🏠 <strong>${p.name}</strong> mua thành công Khu Đất ${p.pos} (${targetCell.price}$)`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
                addLog(`⏭️ <strong>${p.name}</strong> quyết định không mua Khu Đất ${p.pos}.`);
                endTurn();
            });
        } else {
            addLog(`💸 Không đủ tài chính đầu tư Khu Đất ${p.pos}.`);
            endTurn();
        }
    } else if (targetCell.owner === currentTurn) {
        if (p.money >= 100) {
            showNotification("📈 Nâng Cấp Bất Động Sản", `Bạn đang đứng ở Khu Đất số ${p.pos} của chính mình. Bỏ ra <strong>100$</strong> để nâng cấp giá trị đất lên gấp đôi không?`, '#eab308', () => {
                p.money -= 100;
                targetCell.price *= 2;
                
                addLog(`⚡ <strong>${p.name}</strong> nâng cấp Khu Đất ${p.pos}! Giá trị mới tăng lên: <strong>${targetCell.price}$</strong>!`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
                addLog(`⏭️ <strong>${p.name}</strong> bỏ qua cơ hội nâng cấp Khu Đất ${p.pos}.`);
                endTurn();
            });
        } else {
            addLog(`An toàn nghỉ ngơi tại nhà mình (Khu Đất ${p.pos}). Bạn không đủ 100$ để nâng cấp.`);
            endTurn();
        }
    } else {
        let enemyId = currentTurn === 1 ? 2 : 1;
        let fine = targetCell.price * 2;
        
        addLog(`⚠️ Dẫm bẫy! Bạn bước vào địa bàn của ${players[enemyId].name}. Nộp tiền phạt: <strong>${fine}$</strong>`);
        
        p.money -= fine;
        players[enemyId].money += fine;
        
        updateUI();
        if (typeof syncGameToRemote === 'function') syncGameToRemote();

        if (p.money < 0) {
            gameOver(enemyId);
            return;
        }

        if (p.money >= fine) {
            showNotification("🔥 Mua Đứt Tài Sản", `Chi thêm <strong>${fine}$</strong> để cưỡng chế mua đứt lại Khu Đất ${p.pos} từ đối thủ?`, '#ef4444', () => {
                p.money -= fine;
                targetCell.owner = currentTurn;
                targetCell.price = fine; 
                
                addLog(`🔥 <strong>${p.name}</strong> THU MUA ĐỨT Khu Đất ${p.pos}! Giá đất tăng lên ${fine}$`);
                
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn(); 
            }, true, () => {
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
    let p = players[currentTurn];
    let enemyId = currentTurn === 1 ? 2 : 1;
    
    const actions = ["money_plus", "money_minus", "free_buy", "go_forward", "go_backward", "skip_turn"];
    const chosenAction = actions[Math.floor(Math.random() * actions.length)];

    if (chosenAction === "money_plus") {
        p.money += 200;
        showSingleNotification("🎁 HỘP QUÀ MAY MẮN", `Bạn mở được phong bao tài lộc! Nhận ngay <strong>+200$</strong> tiền thưởng mặt.`, '#3b82f6', () => {
            addLog(`🎁 🎉 Quà tặng: <strong>${p.name}</strong> bốc trúng rương vàng nhận <strong>+200$</strong>.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            endTurn(); 
        });
    } 
    else if (chosenAction === "money_minus") {
        p.money -= 200;
        showSingleNotification("💥 HỘP QUÀ XUI XẺO", `Ôi không! Hộp quà phát nổ, bạn bị phạt tổn thất tài chính <strong>-200$</strong>!`, '#ef4444', () => {
            addLog(`🎁 💥 Hình phạt: <strong>${p.name}</strong> dẫm mìn rương bẫy bị phạt nặng <strong>-200$</strong>.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            
            if (p.money < 0) {
                gameOver(enemyId);
            } else {
                endTurn(); 
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
            cellsData[randomIdx].owner = currentTurn;
            
            showSingleNotification("👑 SIÊU QUÀ ĐẶC QUYỀN", `Bạn nhận được Sắc lệnh tịch thu! Chiếm quyền sở hữu <strong>Khu Đất số ${randomIdx}</strong> của đối thủ hoàn toàn <strong>MIỄN PHÍ</strong>!`, '#10b981', () => {
                addLog(`🎁 👑 Quà đặc quyền: <strong>${p.name}</strong> tước đoạt thành công Khu Đất số ${randomIdx} của đối thủ miễn phí.`);
                updateUI();
                if (typeof syncGameToRemote === 'function') syncGameToRemote();
                endTurn();
            });
        } else {
            showSingleNotification("🎁 HỘP QUÀ TRỐNG", `Bạn nhận được đặc quyền chiếm đất đối thủ, nhưng đối thủ chưa sở hữu mảnh đất nào cả! Tiếc quá!`, '#94a3b8', () => {
                addLog(`🎁 💨 Quà hụt: Không có đất đối thủ để tịch thu.`);
                endTurn();
            });
        }
    } 
    else if (chosenAction === "go_forward") {
        showSingleNotification("🚀 DỊCH CHUYỂN TIẾN", `Sức mạnh phản lực phóng bạn **Tiến lên phía trước 2 ô**!`, '#38bdf8', () => {
            addLog(`🎁 🚀 <strong>${p.name}</strong> được đẩy tiến thêm 2 ô.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            moveStepByStep(2, 0, 0, true, () => {
                evaluateTargetCell(); 
            });
        });
    } 
    else if (chosenAction === "go_backward") {
        showSingleNotification("⏳ DỊCH CHUYỂN LÙI", `Bạn dẫm phải vết nứt thời gian, bị **Lùi lại phía sau 2 ô**!`, '#f43f5e', () => {
            addLog(`🎁 ⏳ <strong>${p.name}</strong> bị kéo lùi về sau 2 ô.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            moveStepByStep(-2, 0, 0, true, () => {
                evaluateTargetCell(); 
            });
        });
    } 
    else if (chosenAction === "skip_turn") {
        p.skipNextTurn = true;
        showSingleNotification("💤 HỘP QUÀ CHÓNG MẶT", `Bạn trúng thuốc ngủ! Bạn sẽ bị **Khóa lượt xúc** (mất lượt) ở vòng kế tiếp.`, '#eab308', () => {
            addLog(`🎁 ❌ Hình phạt: <strong>${p.name}</strong> bị dính trạng thái mất lượt xúc ở vòng sau.`);
            updateUI();
            if (typeof syncGameToRemote === 'function') syncGameToRemote();
            endTurn();
        });
    }
}
