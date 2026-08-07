let registerMode = false;

const API = "/api";

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

const emailInput = document.getElementById("login-email");

tabLogin.onclick = ()=>{

    registerMode=false;

    emailInput.style.display="none";

    document
    .getElementById("login-display-name")
    .style.display="none";

    document.getElementById("login-btn").innerText="Đăng nhập";

    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");

};

tabRegister.onclick = ()=>{

    registerMode=true;

    emailInput.style.display="block";

    document
    .getElementById("login-display-name")
    .style.display="block";

    document.getElementById("login-btn").innerText="Đăng ký";

    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");

};
const loginBtn = document.getElementById("login-btn");

loginBtn.onclick = async ()=>{

    const username = document.getElementById("login-username").value.trim();
    const display_name =
    document
    .getElementById("login-display-name")
    .value
    .trim();

    const email = document.getElementById("login-email").value.trim();

    const password = document.getElementById("login-password").value;

    const msg = document.getElementById("login-message");

    if(registerMode){

        //------------------------
        // ĐĂNG KÝ
        //------------------------

        const res = await fetch("/api/register",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                username,
                display_name,

                email,

                password

            })

        });

        const data = await res.json();

        msg.innerText = data.message;

        if(data.success){

            msg.style.color="#22c55e";

        }else{

            msg.style.color="#ef4444";

        }

    }else{

        //------------------------
        // ĐĂNG NHẬP
        //------------------------

        const res = await fetch("/api/login",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                username,

                password

            })

        });

        const data = await res.json();

        // ✅ CODE ĐÚNG
        if(data.success){
            const serverUser = data.user;
            
            // Gộp dữ liệu từ server với các trường skin
            const userData = {
                id: serverUser.id,
                username: serverUser.username,
                display_name: serverUser.display_name,
                level: serverUser.level,
                exp: serverUser.exp,
                points: serverUser.points,
                coin: serverUser.coin,
                rank: serverUser.rank,
                // 🆕 Lấy từ server (đã được API trả về)
                ownedSkins: serverUser.owned_skins || ['skin_default'],
                skin: serverUser.current_skin || 'skin_default',
                ownedDice: serverUser.owned_dice || [],
                ownedBoard: serverUser.owned_board || []
            };
            
            localStorage.setItem("currentUser", JSON.stringify(userData));
            localStorage.setItem("user", JSON.stringify(userData));
            // ===== 🆕 GỬI THÔNG TIN USER LÊN SERVER =====
            if (typeof socket !== 'undefined' && socket && socket.connected) {
                socket.emit('setUserInfo', {
                    userId: userData.id || userData.username,
                    username: userData.username
                });
                console.log('📤 Đã gửi thông tin user lên server:', userData.username);
            } else {
                console.warn('⚠️ Socket chưa sẵn sàng, sẽ gửi sau...');
                // Nếu socket chưa sẵn sàng, thử gửi sau 1 giây
                setTimeout(() => {
                    if (typeof socket !== 'undefined' && socket && socket.connected) {
                        socket.emit('setUserInfo', {
                            userId: userData.id || userData.username,
                            username: userData.username
                        });
                        console.log('📤 Đã gửi thông tin user lên server (delay):', userData.username);
                    }
                }, 1000);
            }
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("lobby-screen").style.display = "flex";

            initLobby(userData);
        

        }else{

            msg.innerText=data.message;

            msg.style.color="#ef4444";

        }

    }

};
    function initLobby(user){
        console.log("🔧 Init Lobby với user:", user);
        
        // ===== HIỂN THỊ LOBBY NGAY =====
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("lobby-screen").style.display = "flex";
        
        // ===== HIỂN THỊ NGAY DỮ LIỆU CŨ (ĐỂ KHÔNG BỊ TRẮNG) =====
        renderLobbyUI(user);
        
        // ===== GỌI API ĐỂ LẤY DỮ LIỆU MỚI NHẤT =====
        fetch(`/api/user/${user.username}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.success !== false) {
                    // Cập nhật dữ liệu mới từ database
                    const updatedUser = {
                        ...user,
                        id: data.id || user.id,
                        username: data.username || user.username,
                        display_name: data.display_name || user.display_name,
                        level: data.level || 1,
                        exp: data.exp || 0,
                        points: data.points || 0,
                        rank: data.rank || "Bùn",
                        coin: data.coin || 0,
                        avatar: data.avatar || "default",
                        ownedSkins: data.owned_skins || ['skin_default'],
                        skin: data.current_skin || 'skin_default',
                        ownedDice: data.owned_dice || [],
                        diceSkin: data.dice_skin || 'dice_default',
                        ownedBoard: data.owned_board || []
                    };
                    
                    // Lưu lại localStorage với dữ liệu mới
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    
                    // Cập nhật UI với dữ liệu mới
                    renderLobbyUI(updatedUser);
                    console.log("✅ Đã cập nhật dữ liệu từ database:", updatedUser);
                    
                    // 🆕 ÁP DỤNG SKIN XÚC XẮC SAU KHI LOAD XONG
                    if (typeof updateDiceSkin === 'function') {
                        updateDiceSkin();
                    }
                } else {
                    console.log("⚠️ Không lấy được dữ liệu từ database, giữ dữ liệu cũ");
                }
            })
            .catch(err => {
                console.error('❌ Lỗi lấy dữ liệu user:', err);
                // Giữ dữ liệu cũ, không làm gì
            });
    }

    // ===== RENDER UI LOBBY =====
    function renderLobbyUI(userData) {
        // ===== 🆕 LÀM SẠCH SKIN =====
        if (userData.skin && typeof userData.skin === 'string') {
            userData.skin = userData.skin.replace(/^['"]|['"]$/g, '');
        }
        
        // ===== CẬP NHẬT THÔNG TIN =====
        const rankMap = {
            "Bùn": "bun.jpg",
            "Sắt": "sat.jpg",
            "Đồng": "dong.jpg",
            "Bạc": "bac.jpg",
            "Vàng": "vang.jpg",
            "Kim Cương": "kimcuong.jpg",
            "Hali": "hali.jpg"
        };
        
        const rankIcon = document.getElementById('lobby-rank-icon');
        if (rankIcon) {
            rankIcon.src = "assets/ranks/" + (rankMap[userData.rank] || "bun.jpg");
        }
        
        const nameEl = document.getElementById('lobby-user-name');
        if (nameEl) {
            nameEl.textContent = userData.display_name || userData.username || "Người chơi";
        }
        
        const levelEl = document.getElementById('lobby-user-level');
        if (levelEl) {
            levelEl.textContent = userData.level || 1;
        }
        
        const coinEl = document.getElementById('lobby-user-coin');
        if (coinEl) {
            coinEl.textContent = userData.coin || userData.coins || 0;
        }

        // Cập nhật input username
        const usernameInput = document.getElementById("username-input");
        if (usernameInput) {
            usernameInput.value = userData.display_name || userData.username || "Người chơi";
            usernameInput.disabled = true;
        }

        // ===== KIỂM TRA VÀ KHỞI TẠO ownedSkins =====
        if (!userData.ownedSkins) {
            userData.ownedSkins = ['skin_default'];
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData));
        }

        // ===== 🆕 THÊM: CẬP NHẬT SKIN KHI VÀO LOBBY =====
        if (typeof updatePlayerSkin === 'function') {
            setTimeout(() => {
                updatePlayerSkin();
                console.log("✅ Đã áp dụng skin trong lobby");
            }, 500);
        }

        // ===== HIỂN THỊ SẢNH =====
        // Đã hiển thị ở đầu hàm initLobby
        
        // 🔥 HIỂN THỊ 4 NÚT, ẨN TẤT CẢ NỘI DUNG
        document.getElementById('lobby-grid').style.display = 'grid';
        document.getElementById('arena-content').style.display = 'none';
        document.getElementById('shop-content').style.display = 'none';
        document.getElementById('chat-content').style.display = 'none';
        document.getElementById('equipment-content').style.display = 'none';
        document.getElementById('userinfo-content').style.display = 'none';
        document.getElementById('leaderboard-content').style.display = 'none';
        
        console.log("✅ Đã khởi tạo sảnh thành công!");
        console.log("👤 User:", userData);
        console.log("🎨 Owned skins:", userData.ownedSkins);
        console.log("🎨 Current skin:", userData.skin || 'skin_default');
        console.log("🎲 Dice skin:", userData.diceSkin || 'dice_default');
        
        // Cập nhật UI quà theo level
        if (typeof updateRewardUI === 'function') {
            updateRewardUI();
        }
        if (typeof updateGiftBadge === 'function') {
            updateGiftBadge();
        }
    }

// ===== THÊM VÀO CUỐI FILE auth.js =====

// ===== SKIN DATA =====
const SKIN_LIST = [
    { id: 'skin_default', name: 'Mặc định', icon: '🏃‍♂️', price: 0, desc: 'Quân cờ cơ bản', rarity: 'common' },
    { id: 'skin_dragon', name: 'Rồng thần', icon: '🐉', price: 10000, desc: 'Rồng bay uy nghi', rarity: 'legendary', 
      sound: 'dragon', effect: 'dragon_fire' },
    { id: 'skin_phoenix', name: 'Phượng hoàng', icon: '🐦‍🔥', price: 5000, desc: 'Phượng hoàng bất tử', rarity: 'legendary',
      sound: 'phoenix', effect: 'phoenix_feather' },
    { id: 'skin_unicorn', name: 'Kỳ lân', icon: '🦄', price: 7500, desc: 'Kỳ lân huyền thoại', rarity: 'legendary',
      sound: 'horse', effect: 'unicorn_magic' },
    { id: 'skin_ninja', name: 'Ninja', icon: '🥷', price: 3000, desc: 'Ninja bí ẩn', rarity: 'rare' },
    { id: 'skin_wizard', name: 'Phù thủy', icon: '🧙', price: 1000, desc: 'Phù thủy quyền năng', rarity: 'uncommon' },
    { id: 'skin_robot', name: 'Robot', icon: '🤖', price: 2000, desc: 'Người máy tương lai', rarity: 'rare' },
    { id: 'skin_car', name: 'Ô tô', icon: '🚗', price: 1500, desc: 'Xe hơi tốc độ', rarity: 'common' },
    { id: 'skin_level30', name: 'Thiên sứ', icon: '👼', price: 0, desc: 'Phần thưởng đặc biệt khi đạt cấp 30!', rarity: 'rare' },
    // 🆕 SKIN XÚC XẮC
    { id: 'dice_default', name: 'Xúc xắc mặc định', icon: '🎲', price: 0, desc: 'Xúc xắc cơ bản', rarity: 'common', category: 'dice' },
    { id: 'dice_ice', name: '🧊 Xúc xắc băng giá', icon: '🎲', price: 2000, desc: 'Xúc xắc băng giá với màu xanh dương', rarity: 'rare', category: 'dice' },
    { id: 'dice_rainbow', name: '🌈 Xúc xắc cầu vồng', icon: '🎲', price: 3000, desc: 'Xúc xắc cầu vồng rực rỡ sắc màu', rarity: 'legendary', category: 'dice' },
    { id: 'dice_vietnam', name: '🇻🇳 Xúc xắc Việt Nam', icon: '🎲', price: 5000, desc: 'Cờ đỏ sao vàng rực rỡ', rarity: 'legendary', category: 'dice' }
];
// ===== SHOP FUNCTIONS =====
let shopFilter = 'all';

function getShopUser() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return null;
    
    // ✅ Đảm bảo có các trường cần thiết
    if (!user.ownedSkins) {
        user.ownedSkins = ['skin_default'];
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }
    if (!user.skin) {
        user.skin = 'skin_default';
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }
    // 🆕 THÊM DICE
    if (!user.ownedDice) {
        user.ownedDice = [];
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }
    if (!user.diceSkin) {
        user.diceSkin = 'dice_default';
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }
    
    return user;
}

function saveShopUser(user) {
    // Lưu vào localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    
    // ✅ GỬI LÊN SERVER ĐỂ LƯU VÀO DATABASE
    if (user.id) {
        fetch('/api/update-skin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                owned_skins: user.ownedSkins || ['skin_default'],
                current_skin: user.skin || 'skin_default',
                owned_dice: user.ownedDice || [],
                dice_skin: user.diceSkin || 'dice_default',
                coin: user.coin || user.coins || 0 // 🆕 THÊM COIN
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Đã lưu skin và coin lên database!');
            } else {
                console.error('❌ Lỗi lưu skin:', data.message);
            }
        })
        .catch(err => {
            console.error('❌ Lỗi kết nối:', err);
        });
    }
}
function updatePlayerSkin() {
    const user = getShopUser();
    if (!user) {
        console.log("⚠️ Không có user để áp dụng skin");
        return;
    }
    
    // ===== 🛡️ ĐẢM BẢO SKIN KHÔNG BỊ MẤT =====
    // Nếu window.players chưa có hoặc bị mất skin, khôi phục từ localStorage
    if (!window.players) {
        window.players = {};
    }
    
    // Khôi phục skin cho player hiện tại (nếu bị mất)
    if (!window.players[1]) {
        window.players[1] = { skin: 'skin_default' };
    }
    if (!window.players[2]) {
        window.players[2] = { skin: 'skin_default' };
    }
    
    // Nếu skin của player hiện tại bị undefined hoặc rỗng, lấy từ user
    if (myPlayerNumber === 1 && (!window.players[1].skin || window.players[1].skin === 'undefined')) {
        window.players[1].skin = user.skin || 'skin_default';
        console.log(`🔄 Khôi phục skin cho P1: ${window.players[1].skin}`);
    }
    if (myPlayerNumber === 2 && (!window.players[2].skin || window.players[2].skin === 'undefined')) {
        window.players[2].skin = user.skin || 'skin_default';
        console.log(`🔄 Khôi phục skin cho P2: ${window.players[2].skin}`);
    }
    
    // Lấy skin của cả 2 người
    let player1SkinId = window.players[1]?.skin || user.skin || 'skin_default';
    let player2SkinId = window.players[2]?.skin || 'skin_default';
    
    // Nếu player 2 không có skin, gán mặc định
    if (!player2SkinId || player2SkinId === 'undefined') {
        player2SkinId = 'skin_default';
    }
    
    const SKIN_LIST = window.SKIN_LIST || [
        { id: 'skin_default', name: 'Mặc định', icon: '🏃‍♂️' },
        { id: 'skin_dragon', name: 'Rồng thần', icon: '🐉' },
        { id: 'skin_phoenix', name: 'Phượng hoàng', icon: '🦅' },
        { id: 'skin_unicorn', name: 'Kỳ lân', icon: '🦄' },
        { id: 'skin_ninja', name: 'Ninja', icon: '🥷' },
        { id: 'skin_wizard', name: 'Phù thủy', icon: '🧙' },
        { id: 'skin_robot', name: 'Robot', icon: '🤖' },
        { id: 'skin_car', name: 'Ô tô', icon: '🚗' }
    ];
    
    // Áp dụng skin cho Player 1
    const skin1 = SKIN_LIST.find(s => s.id === player1SkinId);
    if (skin1) {
        console.log(`🎨 Áp dụng skin cho Player 1: ${skin1.name} (${skin1.icon})`);
        let count = 0;
        for (let i = 0; i < 36; i++) {
            const slot = document.getElementById(`slot-p1-${i}`);
            if (slot) {
                const avatar = slot.querySelector('.p-avatar');
                if (avatar) {
                    avatar.textContent = skin1.icon;
                    count++;
                }
            }
        }
        console.log(`✅ Đã cập nhật ${count}/36 ô cho Player 1 với skin ${skin1.name}`);
    } else {
        // Fallback nếu skin không tìm thấy
        console.warn(`⚠️ Không tìm thấy skin ${player1SkinId}, dùng mặc định`);
        for (let i = 0; i < 36; i++) {
            const slot = document.getElementById(`slot-p1-${i}`);
            if (slot) {
                const avatar = slot.querySelector('.p-avatar');
                if (avatar) {
                    avatar.textContent = '🏃‍♂️';
                }
            }
        }
    }
    
    // Áp dụng skin cho Player 2
    const skin2 = SKIN_LIST.find(s => s.id === player2SkinId);
    if (skin2) {
        console.log(`🎨 Áp dụng skin cho Player 2: ${skin2.name} (${skin2.icon})`);
        let count = 0;
        for (let i = 0; i < 36; i++) {
            const slot = document.getElementById(`slot-p2-${i}`);
            if (slot) {
                const avatar = slot.querySelector('.p-avatar');
                if (avatar) {
                    avatar.textContent = skin2.icon;
                    count++;
                }
            }
        }
        console.log(`✅ Đã cập nhật ${count}/36 ô cho Player 2 với skin ${skin2.name}`);
    } else {
        // Fallback nếu skin không tìm thấy
        console.warn(`⚠️ Không tìm thấy skin ${player2SkinId}, dùng mặc định`);
        for (let i = 0; i < 36; i++) {
            const slot = document.getElementById(`slot-p2-${i}`);
            if (slot) {
                const avatar = slot.querySelector('.p-avatar');
                if (avatar) {
                    avatar.textContent = '🏃‍♂️';
                }
            }
        }
    }
}
function applySkinToGame(skinId) {
    const skin = SKIN_LIST.find(s => s.id === skinId);
    if (!skin) return;
    
    for (let i = 0; i < 36; i++) {
        const slot = document.getElementById(`slot-p1-${i}`);
        if (slot) {
            const avatar = slot.querySelector('.p-avatar');
            if (avatar) avatar.textContent = skin.icon;
        }
    }
}

function buySkin(skinId) {
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
    
    if (!user.ownedSkins) user.ownedSkins = ['skin_default'];
    if (user.ownedSkins.includes(skinId)) {
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
    user.ownedSkins.push(skinId);
    user.skin = skinId;
    
    saveShopUser(user);
    applySkinToGame(skinId);
    loadShop();
    loadEquipment();
    
    alert(`🎉 Đã mua thành công skin ${skin.name}!`);
}

function loadShop() {
    const container = document.getElementById('shop-items');
    if (!container) {
        console.error("❌ Không tìm thấy shop-items!");
        return;
    }
    
    const user = getShopUser();
    const currentCoin = user?.coin || user?.coins || 0;
    
    const coinEl = document.getElementById('shop-coin');
    if (coinEl) coinEl.textContent = currentCoin;
    
    container.innerHTML = '';
    
    // ============================================================
    // 🔥 FILTER 'all' - HIỂN THỊ TẤT CẢ (NHÂN VẬT + XÚC XẮC)
    // ============================================================
    if (shopFilter === 'all') {
        // ---------- 1. SKIN NHÂN VẬT ----------
        SKIN_LIST.forEach(skin => {
            if (skin.id === 'skin_level30') return;
            if (skin.category === 'dice') return;
            
            const isOwned = user?.ownedSkins?.includes(skin.id) || false;
            const isEquipped = user?.skin === skin.id;
            const canAfford = currentCoin >= skin.price;
            const isFree = skin.price === 0;
            
            if (skin.id === 'skin_default' && isOwned && !isEquipped) return;
            
            const div = document.createElement('div');
            div.style.cssText = `
                background: ${isEquipped ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.5)'};
                border: ${isEquipped ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                border-radius: 10px;
                padding: 12px 8px;
                text-align: center;
                cursor: ${isOwned || canAfford || isFree ? 'pointer' : 'default'};
                opacity: ${isFree || canAfford || isOwned ? 1 : 0.5};
                transition: all 0.3s;
                position: relative;
            `;
            
            const equippedBadge = isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#facc15;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐANG DÙNG</div>' : '';
            const ownedBadge = isOwned && !isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#34d399;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐÃ CÓ</div>' : '';
            
            div.innerHTML = `
                ${equippedBadge}
                ${ownedBadge}
                <div style="font-size: 36px;">${skin.icon}</div>
                <div style="color: #f8fafc; font-weight: bold; font-size: 13px;">${skin.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${skin.desc}</div>
                <div style="color: #facc15; font-size: 13px; margin-top: 4px;">
                    ${isFree ? '🎁 FREE' : `${skin.price} Coin`}
                </div>
                <div style="font-size: 10px; margin-top: 2px; color: ${isOwned ? '#34d399' : '#94a3b8'};">
                    ${isOwned ? (isEquipped ? '✅ Đang dùng' : '✔️ Đã sở hữu') : (canAfford || isFree ? '💰 Mua ngay' : '❌ Chưa đủ coin')}
                </div>
            `;
            
            if (isOwned) {
                div.onclick = () => {
                    if (isEquipped) return;
                    const userData = getShopUser();
                    if (userData) {
                        userData.skin = skin.id;
                        saveShopUser(userData);
                        loadShop();
                        updatePlayerSkin();
                        loadEquipment();
                        alert(`✅ Đã chuyển sang skin ${skin.name}!`);
                    }
                };
            } else if (canAfford || isFree) {
                div.onclick = () => {
                    if (skin.id === 'skin_default') return;
                    if (confirm(`Mua skin ${skin.name} với giá ${skin.price} Coin?`)) {
                        buySkin(skin.id);
                    }
                };
            }
            
            container.appendChild(div);
        });
        
        // ---------- 2. SKIN XÚC XẮC ----------
        const divider = document.createElement('div');
        divider.style.cssText = `
            grid-column: 1 / -1;
            color: #facc15;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            padding: 12px 0 8px 0;
            border-top: 1px solid rgba(255,255,255,0.1);
            margin-top: 8px;
        `;
        divider.textContent = '🎲 XÚC XẮC';
        container.appendChild(divider);
        
        SKIN_LIST.filter(s => s.category === 'dice' && s.id !== 'dice_default').forEach(skin => {
            const isOwned = user?.ownedDice?.includes(skin.id) || false;
            const isEquipped = user?.diceSkin === skin.id;
            const canAfford = currentCoin >= skin.price;
            
            let miniClass = 'default';
            if (skin.id === 'dice_ice') miniClass = 'ice';
            else if (skin.id === 'dice_rainbow') miniClass = 'rainbow';
            else if (skin.id === 'dice_vietnam') miniClass = 'vietnam';
            
            const div = document.createElement('div');
            div.style.cssText = `
                background: ${isEquipped ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.5)'};
                border: ${isEquipped ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                border-radius: 10px;
                padding: 12px 8px;
                text-align: center;
                cursor: ${isOwned || canAfford ? 'pointer' : 'default'};
                opacity: ${canAfford || isOwned ? 1 : 0.5};
                transition: all 0.3s;
                position: relative;
            `;
            
            const equippedBadge = isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#facc15;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐANG DÙNG</div>' : '';
            const ownedBadge = isOwned && !isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#34d399;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐÃ CÓ</div>' : '';
            
            div.innerHTML = `
                ${equippedBadge}
                ${ownedBadge}
                <div class="mini-dice ${miniClass}">6</div>
                <div style="color: #f8fafc; font-weight: bold; font-size: 13px; margin-top: 4px;">${skin.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${skin.desc}</div>
                <div style="color: #facc15; font-size: 13px; margin-top: 4px;">
                    ${skin.price} Coin
                </div>
                <div style="font-size: 10px; margin-top: 2px; color: ${isOwned ? '#34d399' : '#94a3b8'};">
                    ${isOwned ? (isEquipped ? '✅ Đang dùng' : '✔️ Đã sở hữu') : (canAfford ? '💰 Mua ngay' : '❌ Chưa đủ coin')}
                </div>
            `;
            
            if (isOwned) {
                div.onclick = () => {
                    if (isEquipped) return;
                    const userData = getShopUser();
                    if (userData) {
                        userData.diceSkin = skin.id;
                        saveShopUser(userData);
                        loadShop();
                        updateDiceSkin();
                        alert(`✅ Đã chuyển sang ${skin.name}!`);
                    }
                };
            } else if (canAfford) {
                div.onclick = () => {
                    if (confirm(`Mua ${skin.name} với giá ${skin.price} Coin?`)) {
                        buyDiceSkin(skin.id);
                    }
                };
            }
            
            container.appendChild(div);
        });
    
    // ============================================================
    // 🔥 FILTER 'skins' - CHỈ NHÂN VẬT
    // ============================================================
    } else if (shopFilter === 'skins') {
        SKIN_LIST.forEach(skin => {
            if (skin.id === 'skin_level30') return;
            if (skin.category === 'dice') return;
            
            const isOwned = user?.ownedSkins?.includes(skin.id) || false;
            const isEquipped = user?.skin === skin.id;
            const canAfford = currentCoin >= skin.price;
            const isFree = skin.price === 0;
            
            if (skin.id === 'skin_default' && isOwned && !isEquipped) return;
            
            const div = document.createElement('div');
            div.style.cssText = `
                background: ${isEquipped ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.5)'};
                border: ${isEquipped ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                border-radius: 10px;
                padding: 12px 8px;
                text-align: center;
                cursor: ${isOwned || canAfford || isFree ? 'pointer' : 'default'};
                opacity: ${isFree || canAfford || isOwned ? 1 : 0.5};
                transition: all 0.3s;
                position: relative;
            `;
            
            const equippedBadge = isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#facc15;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐANG DÙNG</div>' : '';
            const ownedBadge = isOwned && !isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#34d399;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐÃ CÓ</div>' : '';
            
            div.innerHTML = `
                ${equippedBadge}
                ${ownedBadge}
                <div style="font-size: 36px;">${skin.icon}</div>
                <div style="color: #f8fafc; font-weight: bold; font-size: 13px;">${skin.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${skin.desc}</div>
                <div style="color: #facc15; font-size: 13px; margin-top: 4px;">
                    ${isFree ? '🎁 FREE' : `${skin.price} Coin`}
                </div>
                <div style="font-size: 10px; margin-top: 2px; color: ${isOwned ? '#34d399' : '#94a3b8'};">
                    ${isOwned ? (isEquipped ? '✅ Đang dùng' : '✔️ Đã sở hữu') : (canAfford || isFree ? '💰 Mua ngay' : '❌ Chưa đủ coin')}
                </div>
            `;
            
            if (isOwned) {
                div.onclick = () => {
                    if (isEquipped) return;
                    const userData = getShopUser();
                    if (userData) {
                        userData.skin = skin.id;
                        saveShopUser(userData);
                        loadShop();
                        updatePlayerSkin();
                        loadEquipment();
                        alert(`✅ Đã chuyển sang skin ${skin.name}!`);
                    }
                };
            } else if (canAfford || isFree) {
                div.onclick = () => {
                    if (skin.id === 'skin_default') return;
                    if (confirm(`Mua skin ${skin.name} với giá ${skin.price} Coin?`)) {
                        buySkin(skin.id);
                    }
                };
            }
            
            container.appendChild(div);
        });
    
    // ============================================================
    // 🔥 FILTER 'dice' - CHỈ XÚC XẮC
    // ============================================================
    } else if (shopFilter === 'dice') {
        SKIN_LIST.filter(s => s.category === 'dice' && s.id !== 'dice_default').forEach(skin => {
            const isOwned = user?.ownedDice?.includes(skin.id) || false;
            const isEquipped = user?.diceSkin === skin.id;
            const canAfford = currentCoin >= skin.price;
            
            let miniClass = 'default';
            if (skin.id === 'dice_ice') miniClass = 'ice';
            else if (skin.id === 'dice_rainbow') miniClass = 'rainbow';
            else if (skin.id === 'dice_vietnam') miniClass = 'vietnam';
            
            const div = document.createElement('div');
            div.style.cssText = `
                background: ${isEquipped ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.5)'};
                border: ${isEquipped ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                border-radius: 10px;
                padding: 12px 8px;
                text-align: center;
                cursor: ${isOwned || canAfford ? 'pointer' : 'default'};
                opacity: ${canAfford || isOwned ? 1 : 0.5};
                transition: all 0.3s;
                position: relative;
            `;
            
            const equippedBadge = isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#facc15;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐANG DÙNG</div>' : '';
            const ownedBadge = isOwned && !isEquipped ? '<div style="position:absolute;top:-5px;right:-5px;background:#34d399;color:#000;font-size:9px;padding:1px 6px;border-radius:8px;font-weight:bold;">ĐÃ CÓ</div>' : '';
            
            div.innerHTML = `
                ${equippedBadge}
                ${ownedBadge}
                <div class="mini-dice ${miniClass}">6</div>
                <div style="color: #f8fafc; font-weight: bold; font-size: 13px; margin-top: 4px;">${skin.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${skin.desc}</div>
                <div style="color: #facc15; font-size: 13px; margin-top: 4px;">
                    ${skin.price} Coin
                </div>
                <div style="font-size: 10px; margin-top: 2px; color: ${isOwned ? '#34d399' : '#94a3b8'};">
                    ${isOwned ? (isEquipped ? '✅ Đang dùng' : '✔️ Đã sở hữu') : (canAfford ? '💰 Mua ngay' : '❌ Chưa đủ coin')}
                </div>
            `;
            
            if (isOwned) {
                div.onclick = () => {
                    if (isEquipped) return;
                    const userData = getShopUser();
                    if (userData) {
                        userData.diceSkin = skin.id;
                        saveShopUser(userData);
                        loadShop();
                        updateDiceSkin();
                        alert(`✅ Đã chuyển sang ${skin.name}!`);
                    }
                };
            } else if (canAfford) {
                div.onclick = () => {
                    if (confirm(`Mua ${skin.name} với giá ${skin.price} Coin?`)) {
                        buyDiceSkin(skin.id);
                    }
                };
            }
            
            container.appendChild(div);
        });
        
        if (SKIN_LIST.filter(s => s.category === 'dice' && s.id !== 'dice_default').length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #64748b; padding: 30px 10px;';
            empty.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 10px;">🎲</div>
                <div style="font-size: 14px;">Chưa có skin xúc xắc nào</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">Sẽ có thêm trong tương lai!</div>
            `;
            container.appendChild(empty);
        }
    
    // ============================================================
    // 🔥 FILTER KHÁC
    // ============================================================
    } else {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 10px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🚧</div>
                <div style="font-size: 16px; font-weight: bold; color: #f8fafc;">Đang phát triển</div>
                <div style="font-size: 13px; margin-top: 5px;">Chức năng này sẽ sớm ra mắt!</div>
                <div style="font-size: 12px; color: #facc15; margin-top: 10px;">🌟 Sắp có thêm nhiều sản phẩm mới</div>
            </div>
        `;
    }
}
function filterShop(category) {
    shopFilter = category;
    document.querySelectorAll('.shop-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    console.log(`🔍 Filter shop: ${category}`);
    if (typeof loadShop === 'function') {
        loadShop();
    }
}

function loadEquipment() {
    const user = getShopUser();
    if (!user) {
        const skinList = document.getElementById('equip-skin-list');
        if (skinList) skinList.innerHTML = '<div class="equip-empty">Vui lòng đăng nhập!</div>';
        return;
    }
    
    // ===== SKIN NHÂN VẬT =====
    const skinContainer = document.getElementById('equip-skin-list');
    if (skinContainer) {
        skinContainer.innerHTML = '';
        
        const ownedSkins = user.ownedSkins || ['skin_default'];
        const currentSkin = user.skin || 'skin_default';
        
        // Lọc skin nhân vật (không phải dice)
        const filteredSkins = ownedSkins.filter(id => {
            const skin = SKIN_LIST.find(s => s.id === id);
            return skin && skin.category !== 'dice';
        });
        
        // Cập nhật số lượng
        const skinCount = document.getElementById('skin-count');
        if (skinCount) skinCount.textContent = `(${filteredSkins.length})`;
        
        if (filteredSkins.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: #64748b; padding: 20px;';
            empty.textContent = 'Chưa có skin nhân vật';
            skinContainer.appendChild(empty);
        } else {
            filteredSkins.forEach(skinId => {
                const skin = SKIN_LIST.find(s => s.id === skinId);
                if (!skin) return;
                
                const isActive = currentSkin === skinId;
                
                const div = document.createElement('div');
                div.style.cssText = `
                    background: ${isActive ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.4)'};
                    border: ${isActive ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                    border-radius: 10px;
                    padding: 12px 8px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    position: relative;
                    min-height: 80px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                `;
                
                div.innerHTML = `
                    <span style="font-size: 32px; display: block; margin-bottom: 4px;">${skin.icon}</span>
                    <span style="color: ${isActive ? '#facc15' : '#f8fafc'}; font-size: 12px; font-weight: ${isActive ? 'bold' : 'normal'};">${skin.name}</span>
                    ${isActive ? '<span style="font-size: 10px; color: #facc15; margin-top: 2px;">✅ Đang dùng</span>' : ''}
                `;
                
                div.onmouseover = function() {
                    if (!isActive) {
                        this.style.border = '1px solid rgba(56, 189, 248, 0.3)';
                        this.style.background = 'rgba(15, 23, 42, 0.7)';
                    }
                };
                div.onmouseout = function() {
                    if (!isActive) {
                        this.style.border = '1px solid rgba(255,255,255,0.08)';
                        this.style.background = 'rgba(15, 23, 42, 0.4)';
                    }
                };
                
                div.onclick = function() {
                    if (isActive) return;
                    
                    const userData = getShopUser();
                    if (userData) {
                        userData.skin = skinId;
                        saveShopUser(userData);
                        
                        loadEquipment();
                        updatePlayerSkin();
                        
                        if (document.getElementById('shop-content').style.display === 'block') {
                            loadShop();
                        }
                        
                        if (typeof showNotification === 'function') {
                            showNotification(`✅ Đã chuyển sang ${skin.name}`, 'success', 1500);
                        }
                    }
                };
                
                skinContainer.appendChild(div);
            });
        }
    }
    
    // ===== XÚC XẮC =====
    const diceContainer = document.getElementById('equip-dice-list');
    if (diceContainer) {
        const diceSection = document.getElementById('equip-dice-section');
        if (diceSection) {
            diceSection.style.display = 'block';
        }
        
        diceContainer.innerHTML = '';
        
        const ownedDice = user.ownedDice || ['dice_default'];
        const currentDice = user.diceSkin || 'dice_default';
        
        // Đảm bảo dice_default luôn có
        if (!ownedDice.includes('dice_default')) {
            ownedDice.unshift('dice_default');
        }
        
        // Cập nhật số lượng
        const diceCount = document.getElementById('dice-count');
        if (diceCount) diceCount.textContent = `(${ownedDice.length})`;
        
        ownedDice.forEach(skinId => {
            const skin = SKIN_LIST.find(s => s.id === skinId);
            if (!skin) return;
            
            const isActive = currentDice === skinId;
            
            // Xác định class mini dice
            let miniClass = 'default';
            if (skin.id === 'dice_ice') miniClass = 'ice';
            else if (skin.id === 'dice_rainbow') miniClass = 'rainbow';
            else if (skin.id === 'dice_vietnam') miniClass = 'vietnam';
            
            const div = document.createElement('div');
            div.style.cssText = `
                background: ${isActive ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.4)'};
                border: ${isActive ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.08)'};
                border-radius: 10px;
                padding: 12px 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                position: relative;
                min-height: 80px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            `;
            
            div.innerHTML = `
                <div class="mini-dice ${miniClass}" style="width: 40px; height: 40px; font-size: 18px; margin: 0 auto 4px auto; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 2px solid #0f172a; box-shadow: inset 0 0 8px rgba(0,0,0,0.15);">6</div>
                <span style="color: ${isActive ? '#facc15' : '#f8fafc'}; font-size: 12px; font-weight: ${isActive ? 'bold' : 'normal'};">${skin.name}</span>
                ${isActive ? '<span style="font-size: 10px; color: #facc15; margin-top: 2px;">✅ Đang dùng</span>' : ''}
            `;
            
            div.onmouseover = function() {
                if (!isActive) {
                    this.style.border = '1px solid rgba(56, 189, 248, 0.3)';
                    this.style.background = 'rgba(15, 23, 42, 0.7)';
                }
            };
            div.onmouseout = function() {
                if (!isActive) {
                    this.style.border = '1px solid rgba(255,255,255,0.08)';
                    this.style.background = 'rgba(15, 23, 42, 0.4)';
                }
            };
            
            div.onclick = function() {
                if (isActive) return;
                
                const userData = getShopUser();
                if (userData) {
                    userData.diceSkin = skinId;
                    saveShopUser(userData);
                    
                    loadEquipment();
                    updateDiceSkin();
                    
                    if (document.getElementById('shop-content').style.display === 'block') {
                        loadShop();
                    }
                    
                    if (typeof showNotification === 'function') {
                        showNotification(`✅ Đã chuyển sang ${skin.name}`, 'success', 1500);
                    }
                }
            };
            
            diceContainer.appendChild(div);
        });
    }
}
// ===== SHOW FUNCTIONS =====
function showEquipment() {
    console.log("🎒 Mở trang bị");
    
    // Ẩn grid
    document.getElementById('lobby-grid').style.display = 'none';
    
    // Ẩn TẤT CẢ các content khác
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    
    // Hiển thị trang bị
    document.getElementById('equipment-content').style.display = 'flex';
    
    if (typeof loadEquipment === 'function') {
        loadEquipment();
    }
}

function showShop() {
    console.log("🛒 Mở cửa hàng");
    
    // Ẩn grid
    document.getElementById('lobby-grid').style.display = 'none';
    
    // Ẩn TẤT CẢ các content khác
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none'; // ✅ THÊM DÒNG NÀY
    document.getElementById('userinfo-content').style.display = 'none';
    
    // Hiển thị shop
    document.getElementById('shop-content').style.display = 'block';
    
    // Reset filter về 'all'
    shopFilter = 'all';
    document.querySelectorAll('.shop-category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === 'all');
    });
    
    if (typeof loadShop === 'function') {
        loadShop();
    }
}

function showArena() {
    console.log("⚔️ Mở đấu trường");
    
    // 🔥 Ẩn grid (5 nút chức năng)
    document.getElementById('lobby-grid').style.display = 'none';
    
    // Ẩn TẤT CẢ các content khác
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    
    // Hiển thị đấu trường
    document.getElementById('arena-content').style.display = 'block';
}
function showChatRooms() {
    console.log("💬 Mở phòng chat");
    
    document.getElementById('lobby-grid').style.display = 'none';
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'block';
    
    if (typeof loadChatRooms === 'function') {
        loadChatRooms();
    }
}

function showUserInfo() {
    console.log("👤 Mở thông tin");
    
    document.getElementById('lobby-grid').style.display = 'none';
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'block';
    
    // 🔥 GỌI HÀM loadUserInfo ĐỂ LẤY DỮ LIỆU MỚI
    if (typeof loadUserInfo === 'function') {
        loadUserInfo();
    } else {
        console.warn("⚠️ Hàm loadUserInfo chưa được định nghĩa!");
    }
}
// ===== 🆕 BẢNG XẾP HẠNG =====
function showLeaderboard() {
    console.log("🏆 Mở bảng xếp hạng");
    
    // Ẩn grid
    document.getElementById('lobby-grid').style.display = 'none';
    
    // Ẩn TẤT CẢ các content khác
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    
    // Hiển thị bảng xếp hạng
    document.getElementById('leaderboard-content').style.display = 'block';
    
    // Load dữ liệu
    loadLeaderboard();
}

async function loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">⏳ Đang tải dữ liệu...</div>';
    
    try {
        // 🔥 GIỚI HẠN 10 NGƯỜI
        const response = await fetch('/api/leaderboard?limit=10');
        const result = await response.json();
        
        if (!result.success) {
            container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">❌ Lỗi: ${result.message}</div>`;
            return;
        }
        
        if (result.data.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">📭 Chưa có người chơi nào!</div>';
            return;
        }
        
        // Lấy current user để highlight
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        let currentUserRank = null;
        let currentUserData = null;
        
        // Tìm vị trí của current user trong toàn bộ dữ liệu (gọi API riêng để lấy rank thực tế)
        try {
            const allResponse = await fetch('/api/leaderboard?limit=100');
            const allResult = await allResponse.json();
            if (allResult.success) {
                allResult.data.forEach((player, index) => {
                    if (currentUser && (player.username === currentUser.username || player.id === currentUser.id)) {
                        currentUserRank = index + 1;
                        currentUserData = player;
                    }
                });
            }
        } catch (e) {
            console.warn('Không thể lấy rank thực tế:', e);
        }
        
        let html = '';
        
        // ============================================
        // 🏆 PODIUM - TOP 3
        // ============================================
        const top3 = result.data.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        const podiumColors = ['#facc15', '#94a3b8', '#cd7f32'];
        const podiumHeights = ['120px', '90px', '60px'];
        
        html += `
            <div style="display: flex; justify-content: center; align-items: flex-end; gap: 15px; padding: 20px 5px 10px 5px; margin-bottom: 15px; background: linear-gradient(180deg, rgba(30, 27, 75, 0.5), rgba(15, 23, 42, 0.3)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
        `;
        
        // Sắp xếp podium: 2nd - 1st - 3rd
        const podiumOrder = [1, 0, 2];
        podiumOrder.forEach((idx) => {
            const player = top3[idx];
            if (!player) return;
            const rank = idx + 1;
            const isCurrent = currentUser && (player.username === currentUser.username || player.id === currentUser.id);
            
            html += `
                <div style="display: flex; flex-direction: column; align-items: center; width: 80px; ${rank === 1 ? 'margin-bottom: 10px;' : ''}">
                    <div style="font-size: 32px; margin-bottom: 2px;">${medals[idx]}</div>
                    <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; margin: 0 auto 4px auto; border: 3px solid ${podiumColors[idx]}; background: #1e293b;">
                    <img class="rank-img-big" src="assets/ranks/${player.rank_icon}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                </div>
                    <div style="
                        font-size: 12px; 
                        font-weight: bold; 
                        color: #f8fafc; 
                        text-align: center; 
                        max-width: 70px; 
                        overflow: hidden; 
                        text-overflow: ellipsis; 
                        white-space: nowrap;
                        ${isCurrent ? 'color: #facc15;' : ''}
                    ">
                        ${player.display_name}
                        ${isCurrent ? '👑' : ''}
                    </div>
                    <div style="font-size: 11px; color: ${podiumColors[idx]}; font-weight: bold;">${player.rank_name}</div>
                    <div style="font-size: 13px; color: #facc15; font-weight: bold;">${player.points} RP</div>
                    <div style="
                        width: 60px; 
                        height: ${podiumHeights[idx]}; 
                        background: linear-gradient(180deg, ${podiumColors[idx]}55, ${podiumColors[idx]}22);
                        border-radius: 6px 6px 0 0;
                        margin-top: 4px;
                        border: 1px solid ${podiumColors[idx]}33;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        padding-bottom: 4px;
                        font-size: 11px;
                        color: #94a3b8;
                    ">
                        #${rank}
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        // ============================================
        // 📋 DANH SÁCH CÁC VỊ TRÍ CÒN LẠI (TOP 4 - 10)
        // ============================================
        const remaining = result.data.slice(3);
        
        if (remaining.length > 0) {
            html += `
                <div style="max-height: 300px; overflow-y: auto; padding-right: 5px;">
            `;
            
            remaining.forEach((player, index) => {
                const rank = index + 4;
                const isCurrent = currentUser && (player.username === currentUser.username || player.id === currentUser.id);
                const bgColor = isCurrent ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.2)';
                const border = isCurrent ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.05)';
                
                html += `
                    <div style="
                        display: grid; 
                        grid-template-columns: 40px 35px 1fr 60px 50px 40px; 
                        gap: 5px; 
                        padding: 6px 10px; 
                        background: ${bgColor}; 
                        border-radius: 6px; 
                        margin-bottom: 3px; 
                        border: ${border}; 
                        align-items: center; 
                        font-size: 12px; 
                        color: ${isCurrent ? '#f8fafc' : '#cbd5e1'};
                    ">
                        <div style="text-align: center; font-weight: bold; color: ${isCurrent ? '#facc15' : '#94a3b8'}; font-size: 11px;">
                            #${rank}
                        </div>
                        <div style="text-align: center;">
                            <img class="rank-img" src="assets/ranks/${player.rank_icon}" style="width: 22px; height: 22px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); object-fit: cover;">
                        </div>
                        <div style="font-weight: ${isCurrent ? 'bold' : 'normal'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px;">
                            ${player.display_name}
                            ${isCurrent ? ' 👑' : ''}
                        </div>
                        <div style="text-align: center; font-weight: bold; color: ${player.rank_name === 'Hali' ? '#facc15' : player.rank_name === 'Kim Cương' ? '#38bdf8' : '#94a3b8'}; font-size: 10px;">
                            ${player.rank_name}
                        </div>
                        <div style="text-align: center; font-weight: bold; color: #facc15; font-size: 12px;">
                            ${player.points}
                        </div>
                        <div style="text-align: center; color: #38bdf8; font-size: 11px;">
                            ${player.level}
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
            `;
        }
        
        // ============================================
        // 👤 DÒNG RIÊNG CHO BẢN THÂN (NẾU KHÔNG CÓ TRONG TOP 10)
        // ============================================
        if (currentUserData && currentUserRank !== null && currentUserRank > 10) {
            const player = currentUserData;
            const rank = currentUserRank;
            
            html += `
                <div style="margin-top: 12px; border-top: 2px solid rgba(250, 204, 21, 0.3); padding-top: 10px;">
                    <div style="
                        display: grid; 
                        grid-template-columns: 40px 35px 1fr 60px 50px 40px; 
                        gap: 5px; 
                        padding: 10px 10px; 
                        background: rgba(250, 204, 21, 0.2); 
                        border-radius: 8px; 
                        border: 2px solid #facc15; 
                        align-items: center; 
                        font-size: 13px; 
                        color: #f8fafc;
                        box-shadow: 0 0 20px rgba(250, 204, 21, 0.15);
                    ">
                        <div style="text-align: center; font-weight: bold; color: #facc15;">
                            #${rank}
                        </div>
                        <div style="text-align: center;">
                            <img src="assets/ranks/${player.rank_icon}" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #facc15; object-fit: cover;">
                        </div>
                        <div style="font-weight: bold; color: #facc15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${player.display_name} 👑 (Bạn)
                        </div>
                        <div style="text-align: center; font-weight: bold; color: ${player.rank_name === 'Hali' ? '#facc15' : player.rank_name === 'Kim Cương' ? '#38bdf8' : '#94a3b8'}; font-size: 11px;">
                            ${player.rank_name}
                        </div>
                        <div style="text-align: center; font-weight: bold; color: #facc15; font-size: 13px;">
                            ${player.points}
                        </div>
                        <div style="text-align: center; color: #38bdf8; font-size: 12px;">
                            ${player.level}
                        </div>
                    </div>
                </div>
            `;
        } else if (currentUserData && currentUserRank !== null && currentUserRank <= 10) {
            // Nếu bản thân đã có trong top 10, thêm dòng thông báo nhỏ
            html += `
                <div style="margin-top: 12px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                    🏆 Bạn đang đứng ở vị trí <span style="color: #facc15; font-weight: bold;">#${currentUserRank}</span> trên bảng xếp hạng!
                </div>
            `;
        }      
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Lỗi load bảng xếp hạng:', error);
        container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">❌ Lỗi kết nối server!</div>`;
    }
}

function refreshLeaderboard() {
    loadLeaderboard();
}
// ===== HIỂN THỊ THÔNG TIN NGƯỜI CHƠI =====
async function loadUserInfo() {
    console.log("👤 Đang tải thông tin user...");
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        console.warn("⚠️ Không tìm thấy user trong localStorage");
        // Hiển thị thông báo lỗi
        const container = document.getElementById('userinfo-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 20px;">
                    ❌ Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!
                </div>
                <button class="back-btn" onclick="backToLobby()">⬅️ Quay lại</button>
            `;
        }
        return;
    }
    
    // 🔥 GỌI API ĐỂ LẤY DỮ LIỆU MỚI NHẤT TỪ DATABASE
    try {
        const response = await fetch(`/api/user/${user.username}`);
        const data = await response.json();
        
        if (data && data.success !== false) {
            // Cập nhật lại localStorage với dữ liệu mới
            const updatedUser = {
                ...user,
                id: data.id || user.id,
                username: data.username || user.username,
                display_name: data.display_name || user.display_name,
                level: data.level || 1,
                exp: data.exp || 0,
                points: data.points || 0,
                rank: data.rank || "Bùn",
                coin: data.coin || 0,
                avatar: data.avatar || "default",
                ownedSkins: data.owned_skins || ['skin_default'],
                skin: data.current_skin || 'skin_default',
                ownedDice: data.owned_dice || [],
                ownedBoard: data.owned_board || []
            };
            
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Cập nhật UI
            renderUserInfo(updatedUser);
            console.log("✅ Đã cập nhật thông tin từ database:", updatedUser);
        } else {
            // Fallback: dùng dữ liệu cũ
            renderUserInfo(user);
            console.warn("⚠️ Không lấy được dữ liệu từ database, dùng dữ liệu cũ");
        }
    } catch (err) {
        console.error('❌ Lỗi lấy thông tin user:', err);
        // Fallback: dùng dữ liệu cũ
        renderUserInfo(user);
    }
}

// ===== RENDER THÔNG TIN USER =====
function renderUserInfo(user) {
    console.log("🎨 Render thông tin user:", user);
    
    const rankImages = {
        "Bùn": "bun.jpg",
        "Sắt": "sat.jpg",
        "Đồng": "dong.jpg",
        "Bạc": "bac.jpg",
        "Vàng": "vang.jpg",
        "Kim Cương": "kimcuong.jpg",
        "Hali": "hali.jpg"
    };
    const fileName = rankImages[user.rank] || "bun.jpg";
    
    const avatar = document.getElementById('userinfo-avatar');
    const name = document.getElementById('userinfo-name');
    const level = document.getElementById('userinfo-level');
    const coin = document.getElementById('userinfo-coin');
    const rank = document.getElementById('userinfo-rank');
    const exp = document.getElementById('userinfo-exp');
    
    if (avatar) avatar.src = "assets/ranks/" + fileName;
    if (name) name.textContent = user.display_name || user.username || "Người chơi";
    if (level) level.textContent = user.level || 1;
    if (coin) coin.textContent = user.coin || 0;
    if (rank) rank.textContent = user.rank || "Bùn";
    if (exp) exp.textContent = user.exp || 0;
    
    console.log(`✅ Đã hiển thị thông tin: Rank ${user.rank}, Level ${user.level}, Coin ${user.coin}`);
}
function backToLobby() {
    console.log("🔙 Quay về lobby");
    
    // 🔥 Hiển thị lại grid (5 nút chức năng)
    document.getElementById('lobby-grid').style.display = 'grid';
    
    // Ẩn tất cả nội dung
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    document.getElementById('leaderboard-content').style.display = 'none';
}
// ===== TỰ ĐỘNG ĐĂNG NHẬP KHI REFRESH TRANG =====
window.onload = function() {
    const user = localStorage.getItem("currentUser");
    if (user) {
        const u = JSON.parse(user);
        
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("lobby-screen").style.display = "flex";
        
        initLobby(u);
        
        // 🆕 GỌI UPDATE DICE SKIN NGAY
        if (typeof updateDiceSkin === 'function') {
            setTimeout(() => {
                updateDiceSkin();
            }, 300);
        }
    } else {
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("lobby-screen").style.display = "none";
    }
};
// ===== QUÀ THEO CẤP =====
const LEVEL_REWARDS = {
    5:  { type: 'coin', amount: 1000 },
    10: { type: 'coin', amount: 1000 },
    15: { type: 'coin', amount: 1000 },
    20: { type: 'coin', amount: 1000 },
    25: { type: 'coin', amount: 1000 },
    30: { type: 'skin', skinId: 'skin_level30' }
};

// Lấy danh sách level đã nhận từ server
async function fetchClaimedLevels(userId) {
    try {
        const res = await fetch(`/api/rewards/${userId}`);
        const data = await res.json();
        return data.success ? data.claimed : [];
    } catch (err) {
        console.error('❌ Lỗi lấy quà đã nhận:', err);
        return [];
    }
}

// Kiểm tra có quà chưa nhận không (để hiển thị badge)
async function checkUnclaimedRewards() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return false;
    const claimed = await fetchClaimedLevels(user.id);
    const claimedSet = new Set(claimed);
    for (let lv = 5; lv <= 30; lv += 5) {
        if (user.level >= lv && !claimedSet.has(lv)) return true;
    }
    return false;
}

// Cập nhật badge trên nút hộp quà
async function updateGiftBadge() {
    const badge = document.getElementById('gift-badge');
    if (!badge) return;
    const hasUnclaimed = await checkUnclaimedRewards();
    if (hasUnclaimed) {
        badge.style.display = 'flex';
        badge.textContent = '✨';
    } else {
        badge.style.display = 'none';
    }
}

// ===== HIỂN THỊ POPUP QUÀ =====
async function openRewardPopup() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Vui lòng đăng nhập!');
        return;
    }

    const popup = document.getElementById('reward-popup');
    const overlay = document.getElementById('reward-overlay');
    const list = document.getElementById('reward-list');

    const claimedLevels = await fetchClaimedLevels(user.id);
    const claimedSet = new Set(claimedLevels);

    // ===== TÍNH TOÁN LEVEL & EXP =====
    const level = user.level || 1;
    const exp = user.exp || 0;
    const expPerLevel = 1000;
    const currentExp = exp % expPerLevel;
    const expPercent = (currentExp / expPerLevel) * 100;
    const nextLevel = level + 1;

    // ===== TẠO HTML =====
    let html = `
        <!-- Thông tin Level & EXP -->
        <div style="
            background: rgba(15,23,42,0.6);
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 15px;
            border: 1px solid rgba(250,204,21,0.2);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="color: #f8fafc; font-weight: bold; font-size: 15px;">
                    🏅 Level <span style="color: #facc15;">${level}</span>
                </span>
                <span style="color: #94a3b8; font-size: 13px;">
                    ${currentExp} / ${expPerLevel} EXP
                </span>
            </div>
            <div style="
                width: 100%;
                height: 6px;
                background: #1e293b;
                border-radius: 10px;
                overflow: hidden;
            ">
                <div style="
                    width: ${expPercent}%;
                    height: 100%;
                    background: linear-gradient(90deg, #38bdf8, #facc15);
                    border-radius: 10px;
                    transition: width 0.5s ease;
                "></div>
            </div>
            <div style="color: #94a3b8; font-size: 11px; margin-top: 4px; text-align: right;">
                ⏳ ${expPerLevel - currentExp} EXP đến cấp ${nextLevel}
            </div>
        </div>
        <div style="color: #94a3b8; font-size: 13px; margin-bottom: 10px;">
            🎁 Chọn cấp để nhận quà:
        </div>
    `;

    // Danh sách quà theo cấp
    for (let lv = 5; lv <= 30; lv += 5) {
        const reward = LEVEL_REWARDS[lv];
        if (!reward) continue;
        const isClaimed = claimedSet.has(lv);
        const canClaim = user.level >= lv && !isClaimed;
        const rewardText = reward.type === 'coin' 
            ? `💰 ${reward.amount} Coin` 
            : '🎖️ Skin đặc biệt';

        html += `
            <div class="reward-item" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                margin-bottom: 8px;
                background: ${isClaimed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(15, 23, 42, 0.5)'};
                border-radius: 10px;
                border-left: 4px solid ${isClaimed ? '#22c55e' : canClaim ? '#facc15' : '#475569'};
                transition: all 0.2s;
            ">
                <div>
                    <strong style="color: ${isClaimed ? '#22c55e' : canClaim ? '#facc15' : '#94a3b8'}; font-size: 16px;">
                        🏅 Cấp ${lv}
                    </strong>
                    <span style="color: #94a3b8; font-size: 13px; margin-left: 8px;">
                        ${rewardText}
                    </span>
                </div>
                ${isClaimed ? 
                    '<span style="color: #22c55e; font-size: 13px;">✅ Đã nhận</span>' :
                    canClaim ? 
                    `<button onclick="claimLevelReward(${lv})" class="claim-btn" style="
                        background: #facc15;
                        color: #0f172a;
                        border: none;
                        padding: 6px 18px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: 0.2s;
                    ">Nhận</button>` :
                    `<span style="color: #64748b; font-size: 12px;">🔒 Chưa đạt</span>`
                }
            </div>
        `;
    }

    list.innerHTML = html;
    popup.style.display = 'block';
    overlay.style.display = 'block';
}
function closeRewardPopup() {
    document.getElementById('reward-popup').style.display = 'none';
    document.getElementById('reward-overlay').style.display = 'none';
}

// Nhận quà
async function claimLevelReward(level) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    if (user.level < level) {
        alert('Bạn chưa đạt cấp này!');
        return;
    }

    const claimed = await fetchClaimedLevels(user.id);
    if (claimed.includes(level)) {
        alert('Bạn đã nhận quà này rồi!');
        return;
    }

    const reward = LEVEL_REWARDS[level];
    if (!reward) return;

    // Cập nhật local
    if (reward.type === 'coin') {
        user.coin = (user.coin || 0) + reward.amount;
        user.coins = user.coin;
    } else if (reward.type === 'skin') {
        if (!user.ownedSkins) user.ownedSkins = ['skin_default'];
        if (!user.ownedSkins.includes(reward.skinId)) {
            user.ownedSkins.push(reward.skinId);
            user.skin = reward.skinId;
        } else {
            alert('Bạn đã sở hữu skin này rồi!');
            return;
        }
    }
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));

    // Gửi lên server
    try {
        const res = await fetch('/api/rewards/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, level: level })
        });
        const data = await res.json();
        if (!data.success) {
            alert('❌ ' + data.message);
            return;
        }
        alert(`✅ Nhận quà cấp ${level} thành công!`);
    } catch (err) {
        alert('❌ Lỗi kết nối server!');
        console.error(err);
        return;
    }

    // Cập nhật UI
    if (typeof updateLobbyUI === 'function') updateLobbyUI(user);
    if (typeof updatePlayerSkin === 'function') updatePlayerSkin();
    updateGiftBadge();
    openRewardPopup(); // refresh
}

// Gán sự kiện
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('gift-box-btn').addEventListener('click', openRewardPopup);
    document.getElementById('close-reward-popup').addEventListener('click', closeRewardPopup);
    document.getElementById('reward-overlay').addEventListener('click', closeRewardPopup);
    updateGiftBadge();
});

