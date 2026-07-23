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

    console.log(user);

    document.getElementById("username-input").value =
        user.display_name || user.username;

    document.getElementById("username-input").disabled=true;
    document
    .getElementById("logout-btn")
    .onclick=()=>{

        localStorage.removeItem("currentUser");

        location.reload();

    }
    document.getElementById("user-level").innerText = user.level;

        const rankMap = {
        "Bùn": "bun.jpg",
        "Sắt": "sat.jpg",
        "Đồng": "dong.jpg",
        "Bạc": "bac.jpg",
        "Vàng": "vang.jpg",
        "Kim Cương": "kimcuong.jpg",
        "Hali": "hali.jpg"
    };

    const rankIcon = document.getElementById("user-rank-icon");

    if (rankIcon) {
        rankIcon.src = "assets/ranks/" + (rankMap[user.rank] || "bun.jpg");
    }
    document.getElementById("user-coin").innerText = user.coin;
    document.getElementById("user-panel").style.display="block";

    document.getElementById("user-display").innerText=user.display_name;
}
window.onload=()=>{

    const user=localStorage.getItem("currentUser");

    if(user){

        const u=JSON.parse(user);

        document.getElementById("login-screen").style.display="none";

        document.getElementById("lobby-screen").style.display="flex";

        initLobby(u);

    }

}