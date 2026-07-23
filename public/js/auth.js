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

        if(data.success){

            localStorage.setItem(
                "currentUser",
                JSON.stringify(data.user)
            );

            document.getElementById("login-screen").style.display="none";

            document.getElementById("lobby-screen").style.display="flex";

            initLobby(data.user);

        }else{

            msg.innerText=data.message;

            msg.style.color="#ef4444";

        }

    }

};
function initLobby(user){
    console.log("🔧 Init Lobby với user:", user);

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

    // ===== HIỂN THỊ SẢNH =====
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("lobby-screen").style.display = "flex";
    
    // 🔥 HIỂN THỊ 4 NÚT, ẨN TẤT CẢ NỘI DUNG
    document.getElementById('lobby-grid').style.display = 'grid';
    document.getElementById('arena-content').style.display = 'none';
    document.getElementById('shop-content').style.display = 'none';
    document.getElementById('chat-content').style.display = 'none';
    document.getElementById('userinfo-content').style.display = 'none';
    
    console.log("✅ Đã khởi tạo sảnh thành công!");
}

window.onload = function() {
    const user = localStorage.getItem("currentUser");
    if (user) {
        const u = JSON.parse(user);
        initLobby(u);
    }
};
