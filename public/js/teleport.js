// ===== CẬP NHẬT NÚT DỊCH CHUYỂN =====
function updateTeleportUI() {
    const btn = document.getElementById('teleport-btn');
    const display = document.getElementById('teleport-cooldown-display');
    if (!btn || !display) return;
    
    const player = players[myPlayerNumber];
    if (!player) return;
    
    const isMyTurn = (currentTurn === myPlayerNumber);
    const canTeleport = player.teleportAvailable && player.teleportCooldown === 0 && isMyTurn;
    
    btn.disabled = !canTeleport;
    
    if (player.teleportCooldown > 0) {
        display.textContent = `⏳ ${player.teleportCooldown} lượt`;
        display.style.color = '#facc15';
    } else if (player.teleportAvailable) {
        display.textContent = '✅ Sẵn sàng';
        display.style.color = '#34d399';
    } else {
        display.textContent = '⏳ Hồi chiêu...';
        display.style.color = '#94a3b8';
    }
    
    // Nếu đang trong chế độ chọn ô, highlight
    if (window.teleportSelecting) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}
// ===== MỞ BẢNG CHỌN Ô DỊCH CHUYỂN =====
function openTeleportSelector() {
    const player = players[myPlayerNumber];
    if (!player) return;
    if (player.teleportCooldown > 0 || !player.teleportAvailable) {
        alert('⏳ Kỹ năng đang hồi chiêu!');
        return;
    }
    if (currentTurn !== myPlayerNumber) {
        alert('⚠️ Chưa tới lượt của bạn!');
        return;
    }
    if (window.gameEnding) {
        alert('⛔ Trận đấu đã kết thúc!');
        return;
    }
    
    // Tìm các ô đất của người chơi
    const ownedCells = [];
    for (let i = 1; i < TOTAL_CELLS; i++) {
        if (cellsData[i].owner === myPlayerNumber) {
            ownedCells.push(i);
        }
    }
    
    if (ownedCells.length === 0) {
        alert('❌ Bạn chưa sở hữu ô đất nào để dịch chuyển!');
        return;
    }
    
    // Đánh dấu đang ở chế độ chọn
    window.teleportSelecting = true;
    updateTeleportUI();
    
    // Highlight các ô đất của mình
    ownedCells.forEach(pos => {
        const cell = document.getElementById(`cell-${pos}`);
        if (cell) {
            cell.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.8)';
            cell.style.border = '3px solid #8b5cf6';
            cell.style.cursor = 'pointer';
            cell.style.position = 'relative';
            // Thêm label "Dịch chuyển"
            const label = document.createElement('div');
            label.textContent = '🌀 DỊCH CHUYỂN';
            label.style.cssText = `
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: #8b5cf6;
                color: white;
                font-size: 9px;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 10;
                white-space: nowrap;
            `;
            cell.appendChild(label);
            // Lưu sự kiện click
            cell.dataset.teleportTarget = pos;
            cell.onclick = () => executeTeleport(parseInt(cell.dataset.teleportTarget));
        }
    });
    
    // Thêm nút hủy
    const cancelBtn = document.createElement('div');
    cancelBtn.id = 'teleport-cancel';
    cancelBtn.textContent = '❌ Hủy dịch chuyển';
    cancelBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 10px 24px;
        border-radius: 12px;
        font-weight: bold;
        cursor: pointer;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
    `;
    cancelBtn.onclick = closeTeleportSelector;
    document.body.appendChild(cancelBtn);
}
// ===== ĐÓNG CHẾ ĐỘ CHỌN Ô =====
function closeTeleportSelector() {
    window.teleportSelecting = false;
    
    // Reset all cells
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) {
            cell.style.boxShadow = '';
            cell.style.border = '';
            cell.style.cursor = '';
            cell.onclick = null;
            // Xóa label
            const label = cell.querySelector('div:last-child');
            if (label && label.textContent === '🌀 DỊCH CHUYỂN') {
                label.remove();
            }
        }
    }
    
    // Xóa nút hủy
    const cancelBtn = document.getElementById('teleport-cancel');
    if (cancelBtn) cancelBtn.remove();
    
    updateTeleportUI();
}
// ===== THỰC HIỆN DỊCH CHUYỂN =====
function executeTeleport(targetPos) {
    const player = players[myPlayerNumber];
    if (!player) return;
    if (player.teleportCooldown > 0 || !player.teleportAvailable) {
        alert('⏳ Kỹ năng đang hồi chiêu!');
        closeTeleportSelector();
        return;
    }
    
    if (cellsData[targetPos].owner !== myPlayerNumber) {
        alert('❌ Ô này không thuộc về bạn!');
        return;
    }
    
    const oldPos = player.pos;
    player.pos = targetPos;
    
    player.teleportAvailable = false;
    player.teleportCooldown = player.teleportMaxCooldown;
    
    
    if (typeof showSkinEffectText === 'function') {
        showSkinEffectText(
            '🌀 DỊCH CHUYỂN',
            `${player.name} đã dịch chuyển!`,
            '#8b5cf6',
            '#7c3aed',
            '🌀'
        );
    }
    
    // 🎵 PHÁT ÂM THANH TELEPORT (THAY VÌ RUN)
    if (audioGame && audioGame.teleport) {
        audioGame.teleport.currentTime = 0;
        audioGame.teleport.volume = 0.8;
        audioGame.teleport.play().catch(() => {});
    }
    
    if (socket && socket.connected) {
        socket.emit('syncTeleport', {
            playerId: myPlayerNumber,
            targetPos: targetPos,
            oldPos: oldPos,
            cooldown: player.teleportCooldown,
            available: player.teleportAvailable
        });
    }
    
    closeTeleportSelector();
    updateUI();
    updateTeleportUI();
    
    if (targetPos !== 0) {
        applyCellEffectForPlayer(myPlayerNumber);
    }
}