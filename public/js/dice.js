// ===== QUAY XÚC XẮC 3D ONLINE =====
function rollDice3D() {
    // 🔥 KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
    if (window.gameEnding) {
        console.log("⛔ Game đã kết thúc, không thể tung xúc xắc!");
        return;
    }
    
    // Nếu game chưa bắt đầu hoặc đang trong hiệu ứng di chuyển thì chặn bấm
    if(!gameStarted || isMoving) {
        console.log("⏳ Game chưa bắt đầu hoặc đang di chuyển");
        return;
    }
    
    // KHÓA CỨNG: Chỉ có người chơi có lượt mới được gửi lệnh tung xúc xắc
    if (typeof myPlayerNumber !== 'undefined' && myPlayerNumber !== currentTurn) {
        console.log("⛔ Không phải lượt của bạn!");
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
    // 🔥 KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
    if (window.gameEnding) {
        console.log("⛔ Game đã kết thúc, bỏ qua kết quả xúc xắc!");
        return;
    }
    
    // Cả 2 tab cùng khóa nút chặn bấm bậy bạ trong lúc đổ xúc xắc
    isMoving = true;
    document.getElementById('roll-btn').disabled = true;
    playSFX(audioGame.dice);
    // Chạy hiệu ứng xoay 3D
    executeDiceAnimation(data.d1, data.d2);
});

// LẮNG NGHE KẾT QUẢ TỪ SERVER TRẢ VỀ (Dùng chung cho cả 2 máy người chơi)
socket.off('diceRolledResult').on('diceRolledResult', (data) => {
    // Cả 2 tab cùng khóa nút chặn bấm bậy bạ trong lúc đổ xúc xắc
    isMoving = true;
    document.getElementById('roll-btn').disabled = true;
    playSFX(audioGame.dice);
    // Chạy hiệu ứng xoay 3D
    executeDiceAnimation(data.d1, data.d2);
});
// ===== QUAY XÚC XẮC 3D ONLINE =====
function rollDice3D() {
    // 🔥 KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
    if (window.gameEnding) {
        console.log("⛔ Game đã kết thúc, không thể tung xúc xắc!");
        return;
    }
    
    // Nếu game chưa bắt đầu hoặc đang trong hiệu ứng di chuyển thì chặn bấm
    if(!gameStarted || isMoving) {
        console.log("⏳ Game chưa bắt đầu hoặc đang di chuyển");
        return;
    }
    
    // KHÓA CỨNG: Chỉ có người chơi có lượt mới được gửi lệnh tung xúc xắc
    if (typeof myPlayerNumber !== 'undefined' && myPlayerNumber !== currentTurn) {
        console.log("⛔ Không phải lượt của bạn!");
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
    // 🔥 KIỂM TRA GAME ĐÃ KẾT THÚC CHƯA
    if (window.gameEnding) {
        console.log("⛔ Game đã kết thúc, bỏ qua kết quả xúc xắc!");
        return;
    }
    
    // Cả 2 tab cùng khóa nút chặn bấm bậy bạ trong lúc đổ xúc xắc
    isMoving = true;
    document.getElementById('roll-btn').disabled = true;
    playSFX(audioGame.dice);
    // Chạy hiệu ứng xoay 3D
    executeDiceAnimation(data.d1, data.d2);
});

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
    if (window._pendingDiceSkin) {
        updateDiceSkin();
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
            // ================================================================
            // 🆕 KIỂM TRA HẮC ÁM TRUY SÁT - CHỈ KHI CHỦ NHÂN TUNG XÚC XẮC
            // ================================================================
            const totalSteps = d1 + d2;
            let isChaseCaught = false;
            
            // ✅ CHỈ CHẠY KHI NGƯỜI TUNG XÚC XẮC LÀ CHỦ NHÂN CỦA BẢN THỂ HẮC ÁM
            if (window.darkChaseActive && currentTurn === window.darkChaseOwner) {
                // Người chơi đang có Hắc Ám Truy Sát đang hoạt động VÀ đang tới lượt của họ
                isChaseCaught = updateDarkChase(totalSteps);
                
                if (isChaseCaught) {
                    // ✅ ĐÃ BẮT ĐƯỢC ĐỐI THỦ
                    // Dừng xử lý, không di chuyển nữa
                    isMoving = false;
                    document.getElementById('roll-btn').disabled = false;
                    
                    // Kiểm tra game over
                    if (players[1].money < 0) {
                        gameOver(2, "money");
                        return;
                    }
                    if (players[2].money < 0) {
                        gameOver(1, "money");
                        return;
                    }
                    
                    // Reset trạng thái skill
                    skillUsedThisTurn = false;
                    endTurn();
                    return;
                }
            } else if (window.darkChaseActive && currentTurn !== window.darkChaseOwner) {
                // 🆕 ĐỐI THỦ ĐANG TUNG XÚC XẮC - KHÔNG DI CHUYỂN BẢN THỂ
                // Nhưng vẫn hiển thị log để đối thủ biết mình đang bị truy đuổi
                if (myPlayerNumber === window.darkChaseTarget) {
                    // Đây là máy của đối thủ (người bị truy đuổi)
                    const distance = Math.abs(window.darkChasePos - players[window.darkChaseTarget].pos);
                    const minDist = Math.min(distance, TOTAL_CELLS - distance);
                    addLog(`🚨 ${players[window.darkChaseTarget].name} đang bị truy đuổi! Khoảng cách: ${minDist} ô (còn ${window.darkChaseTurns} lượt)`);
                    
                    // Cảnh báo khi đến gần
                    if (minDist <= 2) {
                        const turnTxt = document.getElementById('turn-txt');
                        if (turnTxt) {
                            turnTxt.style.background = '#ef4444';
                            turnTxt.style.animation = 'chaserWarning 0.3s infinite alternate';
                            turnTxt.innerHTML = `🚨 CẢNH BÁO! HẮC ÁM CÁCH BẠN ${minDist} Ô!`;
                        }
                        if (audioGame && audioGame.danger) {
                            playSFX(audioGame.danger);
                        }
                    }
                }
            }

            // ================================================================
            // 💣 KIỂM TRA BOM (THÊM VÀO)
            // ================================================================
            if (window.bombData && window.bombData.active && currentTurn === window.bombData.targetId) {
                // Giảm số lượt còn lại
                window.bombData.turnsLeft--;
                addLog(`💣 Bom còn ${window.bombData.turnsLeft} lượt xúc xắc của ${players[currentTurn].name}`);
                
                // Cập nhật đồng bộ
                if (socket && socket.connected) {
                    socket.emit('syncBombCountdown', {
                        targetId: window.bombData.targetId,
                        turnsLeft: window.bombData.turnsLeft
                    });
                }
                
                // Nếu hết lượt, đánh dấu để kiểm tra sau khi di chuyển
                if (window.bombData.turnsLeft <= 0) {
                    window.bombCheckAfterMove = true;
                }
            }

            // ================================================================
            // CODE CŨ (GIỮ NGUYÊN)
            // ================================================================
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
                // 🆕 KIỂM TRA NẾU ĐÃ BẮT ĐƯỢC THÌ KHÔNG DI CHUYỂN NỮA
                if (!isChaseCaught) {
                    // Lưu vị trí trước khi tung xúc xắc
                    lastPositionBeforeRoll = players[currentTurn].pos;

                    moveStepByStep(d1 + d2, d1, d2);
                }
            } else {
                addLog(`🎲 <strong>${players[currentTurn].name}</strong> di chuyển <strong>${d1 + d2} ô</strong>...`);
            }
            if (currentTurn === myPlayerNumber) {
                reduceTeleportCooldown(currentTurn);
            }
        }, 500);
    }, 600);
}
// ===== GIẢM COOLDOWN TELEPORT =====
function reduceTeleportCooldown(playerId) {
    const player = players[playerId];
    if (!player) return;
    
    if (player.teleportCooldown > 0) {
        player.teleportCooldown--;
        if (player.teleportCooldown === 0) {
            player.teleportAvailable = true;
            addLog(`🌀 ${player.name} đã hồi chiêu Dịch Chuyển!`);
        }
    }
    updateTeleportUI();
}

// Gọi sau khi tung xúc xắc thành công (trong executeDiceAnimation hoặc moveStepByStep)
// Thêm vào sau khi di chuyển xong:
if (currentTurn === myPlayerNumber) {
    reduceTeleportCooldown(currentTurn);
}
// ===== ÁP DỤNG SKIN CHO XÚC XẮC =====
function applyDiceSkin(skinId) {
    console.log('🔄 applyDiceSkin - skinId:', skinId);
    const cube1 = document.getElementById('cube1');
    const cube2 = document.getElementById('cube2');
    if (!cube1 || !cube2) {
        console.warn('⚠️ Cube not found');
        return;
    }
    cube1.className = 'cube';
    cube2.className = 'cube';
    if (skinId === 'dice_ice') {
        cube1.classList.add('dice-ice');
        cube2.classList.add('dice-ice');
    } else if (skinId === 'dice_rainbow') {
        cube1.classList.add('dice-rainbow');
        cube2.classList.add('dice-rainbow');
    } else if (skinId === 'dice_vietnam') {
        cube1.classList.add('dice-vietnam');
        cube2.classList.add('dice-vietnam');
        console.log('🇻🇳 Đã thêm class dice-vietnam');
    }
    console.log('✅ Cube1 class:', cube1.className);
}

// ===== LẤY SKIN XÚC XẮC HIỆN TẠI =====
function getCurrentDiceSkin() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return 'dice_default';
    return user.diceSkin || 'dice_default';
}

function updateDiceSkin() {
    const user = getShopUser();
    if (!user) return;
    
    const diceSkinId = user.diceSkin || 'dice_default';
    const cube1 = document.getElementById('cube1');
    const cube2 = document.getElementById('cube2');
    if (!cube1 || !cube2) return;

    // Xóa class skin cũ
    cube1.className = 'cube';
    cube2.className = 'cube';

    // Áp dụng skin mới
    if (diceSkinId === 'dice_ice') {
        cube1.classList.add('dice-ice');
        cube2.classList.add('dice-ice');
    } else if (diceSkinId === 'dice_rainbow') {
        cube1.classList.add('dice-rainbow');
        cube2.classList.add('dice-rainbow');
    } else if (diceSkinId === 'dice_vietnam') {  // THÊM DÒNG NÀY
        cube1.classList.add('dice-vietnam');
        cube2.classList.add('dice-vietnam');
    }
    // dice_default không có class đặc biệt → mặc định
}

// ===== MUA SKIN XÚC XẮC =====
function buyDiceSkin(skinId) {
    const user = getShopUser();
    if (!user) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    
    const skin = SKIN_LIST.find(s => s.id === skinId);
    if (!skin) {
        alert('Không tìm thấy skin!');
        return;
    }
    
    if (!user.ownedDice) user.ownedDice = [];
    if (user.ownedDice.includes(skinId)) {
        alert('Bạn đã sở hữu skin này!');
        return;
    }
    
    const currentCoin = user.coin || user.coins || 0;
    if (currentCoin < skin.price) {
        alert(`❌ Không đủ coin! Cần ${skin.price} Coin. Bạn có ${currentCoin} Coin.`);
        return;
    }
    
    user.coin = currentCoin - skin.price;
    user.coins = user.coin;
    user.ownedDice.push(skinId);
    user.diceSkin = skinId;
    
    saveShopUser(user);
    loadShop();
    updateDiceSkin();
    
    alert(`🎉 Đã mua thành công ${skin.name}!`);
}