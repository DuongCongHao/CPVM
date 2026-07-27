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
    // ===== 🆕 LÀM SẠCH SKIN =====
    if (user.skin && typeof user.skin === 'string') {
        user.skin = user.skin.replace(/^['"]|['"]$/g, '');
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
        rankIcon.src = "assets/ranks/" + (rankMap[user.rank] || "bun.jpg");
    }
    
    const nameEl = document.getElementById('lobby-user-name');
    if (nameEl) {
        nameEl.textContent = user.display_name || user.username || "Người chơi";
    }
    
    const levelEl = document.getElementById('lobby-user-level');
    if (levelEl) {
        levelEl.textContent = user.level || 1;
    }
    
    const coinEl = document.getElementById('lobby-user-coin');
    if (coinEl) {
        coinEl.textContent = user.coin || user.coins || 0;
    }

    // Cập nhật input username
    const usernameInput = document.getElementById("username-input");
    if (usernameInput) {
        usernameInput.value = user.display_name || user.username || "Người chơi";
        usernameInput.disabled = true;
    }

    // ===== KIỂM TRA VÀ KHỞI TẠO ownedSkins =====
    if (!user.ownedSkins) {
        user.ownedSkins = ['skin_default'];
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
    }

    // ===== 🆕 THÊM: CẬP NHẬT SKIN KHI VÀO LOBBY =====
    // Cập nhật skin hiển thị trong lobby (nếu có hàm)
    if (typeof updatePlayerSkin === 'function') {
        // Đợi DOM load xong mới áp dụng
        setTimeout(() => {
            updatePlayerSkin();
            console.log("✅ Đã áp dụng skin trong lobby");
        }, 500);
    }

    // ===== HIỂN THỊ SẢNH =====
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "flex";
    
    // 🔥 HIỂN THỊ 4 NÚT, ẨN TẤT CẢ NỘI DUNG
    document.getElementById('lobby-grid').style.display = 'grid';
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('equipment-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    
    console.log("✅ Đã khởi tạo sảnh thành công!");
    console.log("👤 User:", user);
    console.log("🎨 Owned skins:", user.ownedSkins);
    console.log("🎨 Current skin:", user.skin || 'skin_default');
}

window.onload = function() {
    const user = localStorage.getItem("currentUser");
    if (user) {
        const u = JSON.parse(user);
        initLobby(u);
    }
};
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
                current_skin: user.skin || 'skin_default'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Đã lưu skin lên database!');
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
    
    // ✅ LẤY SKIN CỦA PLAYER 1 TỪ window.players (DỮ LIỆU TỪ SERVER)
    // Nếu chưa có, mới dùng user.skin
    let player1SkinId = 'skin_default';
    let player2SkinId = 'skin_default';
    
    if (window.players && window.players[1]) {
        player1SkinId = window.players[1].skin || user.skin || 'skin_default';
    } else {
        player1SkinId = user.skin || 'skin_default';
    }
    
    if (window.players && window.players[2]) {
        player2SkinId = window.players[2].skin || 'skin_default';
    }
    
    const SKIN_LIST = window.SKIN_LIST || [
        { id: 'skin_default', name: 'Mặc định', icon: '🏃‍♂️' },
        { id: 'skin_dragon', name: 'Rồng thần', icon: '🐉' },
        { id: 'skin_phoenix', name: 'Phượng hoàng', icon: '🦅' },
        { id: 'skin_unicorn', name: 'Kỳ lân', icon: '🦄' }, // 🆕 THÊM DÒNG NÀY
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
    
    // 🔥 QUAN TRỌNG: Khi filter là 'all', hiển thị tất cả skin
    // Khi filter là 'skins', hiển thị skin
    // Các filter khác hiển thị thông báo "Đang phát triển"
    
    if (shopFilter === 'all' || shopFilter === 'skins') {
        // Hiển thị skin
        SKIN_LIST.forEach(skin => {
            const isOwned = user?.ownedSkins?.includes(skin.id) || false;
            const isEquipped = user?.skin === skin.id;
            const canAfford = currentCoin >= skin.price;
            const isFree = skin.price === 0;
            
            // Ẩn skin default nếu đã có và không phải đang dùng
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
    } else {
        // Các category khác (dice, board, skills) -> hiển thị thông báo
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

// ===== EQUIPMENT FUNCTIONS =====
function loadEquipment() {
    const user = getShopUser();
    if (!user) {
        const skinList = document.getElementById('equip-skin-list');
        if (skinList) skinList.innerHTML = '<div style="color:#64748b;font-size:13px;">Vui lòng đăng nhập!</div>';
        return;
    }
    
    // ===== LOAD SKIN =====
    const skinContainer = document.getElementById('equip-skin-list');
    if (skinContainer) {
        skinContainer.innerHTML = '';
        
        // Lấy danh sách skin đã sở hữu
        const ownedSkins = user.ownedSkins || ['skin_default'];
        const currentSkin = user.skin || 'skin_default';
        
        ownedSkins.forEach(skinId => {
            const skin = SKIN_LIST.find(s => s.id === skinId);
            if (!skin) return;
            
            const isActive = currentSkin === skinId;
            
            const div = document.createElement('div');
            div.className = `equip-item-card ${isActive ? 'active' : ''}`;
            div.innerHTML = `
                <span class="icon">${skin.icon}</span>
                <span class="name">${skin.name}</span>
                ${isActive ? '<span class="badge">✅ Đang dùng</span>' : ''}
            `;
            
            div.onclick = function() {
                if (isActive) return;
                
                // Đổi skin
                const userData = getShopUser();
                if (userData) {
                    userData.skin = skinId;
                    saveShopUser(userData);
                    
                    // Cập nhật UI
                    loadEquipment();
                    updatePlayerSkin();
                    
                    // Cập nhật shop nếu đang mở
                    if (document.getElementById('shop-content').style.display === 'block') {
                        loadShop();
                    }
                    
                    // Thông báo
                    if (typeof showNotification === 'function') {
                        showNotification(`✅ Đã chuyển sang skin ${skin.name}!`, 'success', 2000);
                    }
                }
            };
            
            skinContainer.appendChild(div);
        });
    }
    
    // ===== LOAD XÚC XẮC (sau này) =====
    // if (user.ownedDice && user.ownedDice.length > 0) {
    //     document.getElementById('equip-dice-section').style.display = 'block';
    //     // ... code hiển thị xúc xắc
    // }
    
    // ===== LOAD BÀN CỜ (sau này) =====
    // if (user.ownedBoard && user.ownedBoard.length > 0) {
    //     document.getElementById('equip-board-section').style.display = 'block';
    //     // ... code hiển thị bàn cờ
    // }
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
    document.getElementById('equipment-content').style.display = 'block';
    
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
    
    if (typeof loadUserInfo === 'function') {
        loadUserInfo();
    }
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
}