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

        // 🆕 THÊM CÁC TRƯỜNG MỚI: owned_skins, current_skin, owned_dice, owned_board
        const { error } = await supabase
            .from("users")
            .insert({
                username,
                display_name: display_name || username,
                email,
                password_hash: hash,
                level: 1,
                exp: 0,
                points: 0,
                rank: "Bùn",
                coin: 1000,
                avatar: "default",
                // 🆕 CÁC TRƯỜNG MỚI
                owned_skins: ['skin_default'],
                current_skin: 'skin_default',
                owned_dice: [],
                owned_board: []
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

        // Xóa password_hash trước khi gửi về client
        delete user.password_hash;

        // 🆕 TRẢ VỀ USER VỚI CÁC TRƯỜNG MỚI
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                level: user.level,
                exp: user.exp,
                points: user.points,
                rank: user.rank,
                coin: user.coin,
                avatar: user.avatar,
                // 🆕 CÁC TRƯỜNG MỚI
                owned_skins: user.owned_skins || ['skin_default'],
                current_skin: user.current_skin || 'skin_default',
                owned_dice: user.owned_dice || [],
                owned_board: user.owned_board || []
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ========================
// 3. CẬP NHẬT KẾT QUẢ SAU TRẬN ĐẤU
// ========================
router.post("/update-result", async (req, res) => {
    console.log("📥 update-result nhận:", req.body);
    try {
        const { id, userId, level, exp, points, rank, coins, coin, win } = req.body;

        // 🔥 HỖ TRỢ CẢ id VÀ userId
        const userIdParam = id || userId;

        if (!userIdParam) {
            return res.status(400).json({
                success: false,
                message: "Thiếu userId!"
            });
        }

        // 1. Lấy thông tin user hiện tại từ DB
        const { data: user, error: fetchErr } = await supabase
            .from("users")
            .select("*")
            .eq("id", userIdParam)
            .single();

        if (fetchErr || !user) {
            console.log("❌ Không tìm thấy user với id:", userIdParam);
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
        else if (win !== undefined) {
            let currentExp = user.exp || 0;
            let currentCoin = user.coin || 0;
            let currentPoints = user.points || 0;

            if (win) {
                currentExp += 150;
                currentCoin += 50;
                currentPoints += 25;
            } else {
                currentExp += 50;
                currentCoin += 25;
                currentPoints = Math.max(0, currentPoints - 20);
            }

            let currentLevel = Math.floor(currentExp / 1000) + 1;

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
        } else {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu cập nhật (points/exp hoặc win)"
            });
        }

        console.log("📝 Dữ liệu chuẩn bị UPDATE vào Supabase:", updatedData);
        console.log("📝 User ID:", userIdParam);

        // 2. Cập nhật vào Supabase
        const { error: updateErr } = await supabase
            .from("users")
            .update(updatedData)
            .eq("id", userIdParam);

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
        console.error("❌ Lỗi update-result:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

// ========================
// 4. 🆕 CẬP NHẬT SKIN
// ========================
router.post("/update-skin", async (req, res) => {
    try {
        const { userId, owned_skins, current_skin } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Thiếu userId!"
            });
        }

        console.log("📝 Cập nhật skin cho user:", userId);
        console.log("   owned_skins:", owned_skins);
        console.log("   current_skin:", current_skin);

        const { data, error } = await supabase
            .from("users")
            .update({
                owned_skins: owned_skins || ['skin_default'],
                current_skin: current_skin || 'skin_default'
            })
            .eq("id", userId)
            .select();

        if (error) {
            console.log("❌ Lỗi cập nhật skin:", error.message);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        console.log("✅ Cập nhật skin thành công!");

        res.json({
            success: true,
            message: "Cập nhật skin thành công!",
            user: data[0]
        });

    } catch (err) {
        console.error("❌ Lỗi:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
// ========================
// 5. LẤY THÔNG TIN USER (BAO GỒM RANK)
// ========================
router.get("/user/:username", async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Thiếu username!"
            });
        }

        console.log(`📥 Lấy thông tin user: "${username}"`);

        // 🔥 TÌM THEO CẢ username VÀ display_name
        const { data: user, error } = await supabase
            .from("users")
            .select("id, username, display_name, level, exp, points, rank, coin, avatar, owned_skins, current_skin, owned_dice, owned_board")
            .or(`username.eq.${username},display_name.eq.${username}`)
            .maybeSingle();

        if (error || !user) {
            console.log(`❌ Không tìm thấy user: "${username}"`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người dùng"
            });
        }

        console.log(`✅ Đã lấy thông tin user "${username}", rank: ${user.rank}`);

        res.json({
            success: true,
            id: user.id,
            username: user.username,
            display_name: user.display_name || user.username,
            level: user.level || 1,
            exp: user.exp || 0,
            points: user.points || 0,
            rank: user.rank || "Bùn",
            coin: user.coin || 0,
            avatar: user.avatar || "default",
            owned_skins: user.owned_skins || ['skin_default'],
            current_skin: user.current_skin || 'skin_default',
            owned_dice: user.owned_dice || [],
            owned_board: user.owned_board || []
        });

    } catch (err) {
        console.error("❌ Lỗi lấy user:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
router.get("/user-id/:id", async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`📥 Lấy user theo ID hoặc username: ${id}`);

        // 🔥 CÁCH 1: TÌM THEO ID TRƯỚC, NẾU KHÔNG CÓ THÌ TÌM THEO USERNAME
        let { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        // Nếu không tìm thấy theo ID, thử tìm theo username
        if (!user) {
            const { data: userByUsername, error: error2 } = await supabase
                .from("users")
                .select("*")
                .eq("username", id)
                .maybeSingle();
            
            if (error2 || !userByUsername) {
                console.log(`❌ Không tìm thấy user: ${id}`);
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy người chơi"
                });
            }
            user = userByUsername;
        }

        if (error || !user) {
            console.log(`❌ Không tìm thấy user: ${id}`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy người chơi"
            });
        }

        console.log(`✅ Tìm thấy user: ${user.username} (ID: ${user.id})`);
        res.json(user);

    } catch (err) {
        console.error("❌ Lỗi lấy user:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
// ========================
// 6. 🆕 BẢNG XẾP HẠNG RANK
// ========================
router.get("/leaderboard", async (req, res) => {
    try {
        const { limit = 10 } = req.query; // Mặc định lấy top 10

        console.log(`📊 Lấy bảng xếp hạng top ${limit}`);

        const { data: users, error } = await supabase
            .from("users")
            .select("id, username, display_name, rank, points, level, exp, coin")
            .order("points", { ascending: false })  // Sắp xếp theo điểm giảm dần
            .limit(parseInt(limit));

        if (error) {
            console.error("❌ Lỗi lấy bảng xếp hạng:", error.message);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        // Thêm số thứ tự và rank icon
        const rankIcons = {
            "Bùn": "bun.jpg",
            "Sắt": "sat.jpg",
            "Đồng": "dong.jpg",
            "Bạc": "bac.jpg",
            "Vàng": "vang.jpg",
            "Kim Cương": "kimcuong.jpg",
            "Hali": "hali.jpg"
        };

        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            display_name: user.display_name || user.username,
            rank_name: user.rank || "Bùn",
            rank_icon: rankIcons[user.rank] || "bun.jpg",
            points: user.points || 0,
            level: user.level || 1,
            coin: user.coin || 0,
            exp: user.exp || 0
        }));

        console.log(`✅ Đã lấy ${leaderboard.length} người chơi top đầu`);

        res.json({
            success: true,
            data: leaderboard,
            total: leaderboard.length
        });

    } catch (err) {
        console.error("❌ Lỗi bảng xếp hạng:", err.message);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
module.exports = router;