// ===== KHỞI TẠO HỆ THỐNG ÂM THANH CỤC BỘ =====
const audioGame = {
    danger: new Audio("audio/danger.mp3"),
    bgm: new Audio("audio/nhacnen.mp3"),
    dice: new Audio('audio/dice.mp3'),       
    run: new Audio('audio/run.mp3'),         
    buyLand: new Audio('audio/muadat.mp3'),   
    loseMoney: new Audio('audio/mattien.mp3'), 
    lightning: new Audio('audio/thunder.mp3')  
};

// ===== CẤU HÌNH ÂM LƯỢNG =====
audioGame.bgm.loop = true;
audioGame.bgm.volume = 0.35;
audioGame.danger.volume = 0.9;
audioGame.dice.volume = 0.8;
audioGame.run.volume = 0.6; 
audioGame.buyLand.volume = 0.9;
audioGame.loseMoney.volume = 0.8;
audioGame.lightning.volume = 1.0; 

// ===== PRE-LOAD ÂM THANH =====
Object.values(audioGame).forEach(track => { 
    if (track) track.preload = 'auto'; 
});

// ===== HÀM PHỤ TRỢ PHÁT ÂM THANH CẢN NHANH =====
function playSFX(audioTrack) {
    if (audioTrack) {
        audioTrack.pause();
        audioTrack.currentTime = 0.001;
        audioTrack.play().catch(e => console.log("Chờ tương tác người dùng:", e));
    }
}

// ===== BẪY THEO DÕI BIẾN ĐỘNG TIỀN (MONEY WATCHER) =====
let lastCheckedMoney = { 1: null, 2: null };

function startMoneyWatcher() {
    setInterval(() => {
        if (typeof players === 'undefined' || !players[1] || !players[2]) return;
        if (typeof currentTurn === 'undefined' || !currentTurn) return; 
        
        let activePlayerId = currentTurn; 
        let currentMoney = players[activePlayerId].money;
        
        if (lastCheckedMoney[activePlayerId] === null) {
            lastCheckedMoney[activePlayerId] = currentMoney;
            let inactiveId = activePlayerId === 1 ? 2 : 1;
            lastCheckedMoney[inactiveId] = players[inactiveId].money;
            return;
        }
        
        if (currentMoney !== lastCheckedMoney[activePlayerId]) {
            let difference = currentMoney - lastCheckedMoney[activePlayerId];
            lastCheckedMoney[activePlayerId] = currentMoney; 
            
            let inactiveId = activePlayerId === 1 ? 2 : 1;
            lastCheckedMoney[inactiveId] = players[inactiveId].money;
            
            // Loại trừ trường hợp cộng tiền lương khi đi qua ô START (+300$)
            if (difference === 300 && players[activePlayerId].pos === 0) return; 
            
            // Tiền tăng
            if (difference > 0) {
                playSFX(audioGame.buyLand);
            } 
            // Tiền giảm
            else if (difference < 0) {
                let currentPos = players[activePlayerId].pos;
                if (typeof cellsData !== 'undefined' && cellsData[currentPos]) {
                    let cellOwner = cellsData[currentPos].owner;
                    if (cellOwner && cellOwner !== activePlayerId) {
                        playSFX(audioGame.loseMoney); // Phạt vào nhà đối thủ
                    } else {
                        playSFX(audioGame.buyLand); // Tự mua/nâng cấp
                    }
                } else {
                    playSFX(audioGame.buyLand);
                }
            }
        }
    }, 100); 
}

// ===== KÍCH HOẠT WATCHER =====
startMoneyWatcher();
