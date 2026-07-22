require("dotenv").config();

console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SUPABASE_SECRET_KEY =", process.env.SUPABASE_SECRET_KEY ? "OK" : "MISSING");

const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// ========================
// 1. ĐĂNG KÝ
// ========================
router.post("/register", async (req, res) => {
    try {
        const { username, display_name, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu"
            });
        }

        // Kiểm tra username
        const { data: userExist } = await supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .maybeSingle();

        if (userExist) {
            return res.status(400).json({
                success: false,
                message: "Tên đăng nhập đã tồn tại"
            });
        }

        // Kiểm tra email
        const { data: emailExist } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (emailExist) {
            return res.status(400).json({
                success: false,
                message: "Email đã tồn tại"
            });
        }

        const hash = await bcrypt.hash(password, 10);

        // Khởi tạo tài khoản mới chuẩn Rank Bùn và 0 điểm
        const { error } = await supabase
            .from("users")
            .insert({
                username,
                display_name: display_name || username,
                email,
                password_hash: hash,
                level: 1,
                exp: 0,
                points: 0,        // Mới tạo tài khoản -> 0 RP
                rank: "Bùn",     // Mới tạo tài khoản -> Rank Bùn (thay vì Đồng)
                coin: 1000,
                avatar: "default"
            });

        if (error) {
            return res.status(500).json(error);
        }

        res.json({
            success: true,
            message: "Đăng ký thành công, hãy sang đăng nhập"
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ========================
// 2. ĐĂNG NHẬP
// ========================
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu"
            });
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .maybeSingle();

        if (error || !user) {
            return res.status(400).json({
                success: false,
                message: "Sai tên đăng nhập"
            });
        }

        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) {
            return res.status(400).json({
                success: false,
                message: "Sai mật khẩu"
            });
        }

        delete user.password_hash;

        res.json({
            success: true,
            user
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ========================
// 3. CẬP NHẬT KẾT QUẢ SAU TRẬN ĐẤU (FIX CHUẨN 100%)
// ========================
router.post("/update-result", async (req, res) => {
    try {
        // Hứng tất cả các kiểu đặt tên tham số (coin/coins, points, win...)
        const { id, level, exp, points, rank, coins, coin, win } = req.body;

        // 1. Lấy thông tin user hiện tại từ DB
        const { data: user, error: fetchErr } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchErr || !user) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người chơi"
            });
        }

        let updatedData = {};

        // TH1: Nếu Client/Socket gửi TRỰC TIẾP các chỉ số đã tính
        if (points !== undefined || exp !== undefined) {
            updatedData = {
                level: level !== undefined ? level : user.level,
                exp: exp !== undefined ? exp : user.exp,
                points: points !== undefined ? points : (user.points || 0),
                rank: rank !== undefined ? rank : (user.rank || "Bùn"),
                coin: coins !== undefined ? coins : (coin !== undefined ? coin : user.coin)
            };
        } 
        // TH2: Nếu chỉ truyền biến { win: true / false } -> Server tự tính
        else {
            let currentExp = user.exp || 0;
            let currentCoin = user.coin || 0;
            let currentPoints = user.points || 0;

            if (win) {
                currentExp += 150;      // Thắng: +150 EXP
                currentCoin += 50;      // Thắng: +50 Coin
                currentPoints += 25;    // Thắng: +25 RP
            } else {
                currentExp += 50;       // Thua: +50 EXP
                currentCoin += 25;      // Thua: +25 Coin
                currentPoints = Math.max(0, currentPoints - 20); // Thua: -20 RP (không âm)
            }

            // Tính Level mới (Cứ 1000 EXP lên 1 Cấp)
            let currentLevel = Math.floor(currentExp / 1000) + 1;

            // Tính Rank theo mốc RP chuẩn
            let currentRank = "Bùn";
            if (currentPoints >= 600) currentRank = "Hali";
            else if (currentPoints >= 500) currentRank = "Kim Cương";
            else if (currentPoints >= 400) currentRank = "Vàng";
            else if (currentPoints >= 300) currentRank = "Bạc";
            else if (currentPoints >= 200) currentRank = "Đồng";
            else if (currentPoints >= 100) currentRank = "Sắt";

            updatedData = {
                level: currentLevel,
                exp: currentExp,
                points: currentPoints,
                rank: currentRank,
                coin: currentCoin
            };
        }

        console.log("📝 Dữ liệu chuẩn bị UPDATE vào Supabase:", updatedData);

        // 2. Cập nhật vào Supabase
        const { error: updateErr } = await supabase
            .from("users")
            .update(updatedData)
            .eq("id", id);

        if (updateErr) {
            console.log("❌ Lỗi Supabase Update:", updateErr.message);
            return res.status(500).json({ success: false, error: updateErr.message });
        }

        console.log("✅ Cập nhật Database thành công!");

        res.json({
            success: true,
            data: updatedData
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});


module.exports = router;