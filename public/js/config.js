// ===== THIẾT LẬP BÀN ĐẤU =====
const mapCoords = [];
for(let i=0; i<6; i++) mapCoords.push({r: 1, c: i+1}); 
for(let i=1; i<6; i++) mapCoords.push({r: i+1, c: 6}); 
for(let i=4; i>=0; i--) mapCoords.push({r: 6, c: i+1}); 
for(let i=4; i>=1; i--) mapCoords.push({r: i+1, c: 1}); 

const TOTAL_CELLS = 20;

// ===== DỮ LIỆU ÔØ ĐẤT =====
let cellsData = Array(TOTAL_CELLS).fill(null).map((_, i) => ({
    id: i,
    owner: null,
    price: i === 0 ? 0 : 100,
    hasGift: false
}));

// ===== THÔNG TIN NGƯỜI CHƠI =====
let players = {
    1: { pos: 0, money: 1000, name: "P1 (Đỏ)", rounds: 0, skipNextTurn: false, skill:null },
    2: { pos: 0, money: 1000, name: "P2 (Xanh)", rounds: 0, skipNextTurn: false, skill:null }
};

// ===== BIẾN TRẠNG THÁI GAME =====
let currentTurn = null;
let myPlayerNumber = null;
let pendingAction = null;
let isMoving = false; 
let extraTurnGranted = false;
let totalRoundsMilestone = 0;
let gameStarted = false;
let determineTurnData = { p1Roll: null, p2Roll: null, currentPlayer: 1 };

// ===== KHỞI TẠO CÁC Ô ĐẶC BIỆT (SỬA FIX) =====
let spiderWebIndex = 15; // 🔥 MẶC ĐỊNH: Mạng nhện ở ô số 15 (offline chơi sẽ dùng)
let lightningIndex = null; // Thiên tai (sẽ được cập nhật từ Server khi startGame)

// ===== CẤU HÌNH QUAY XÚC XẮC =====
const cubeRotations = {
    1: "rotateX(0deg) rotateY(0deg)",
    2: "rotateX(0deg) rotateY(-90deg)",
    3: "rotateX(-90deg) rotateY(0deg)",
    4: "rotateX(90deg) rotateY(0deg)",
    5: "rotateX(0deg) rotateY(90deg)",
    6: "rotateX(180deg) rotateY(0deg) rotateZ(180deg)"
};
