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
// ĐĂNG KÝ
// ========================
router.post("/register", async (req, res) => {

    try{

        const { username, display_name, email, password } = req.body;

        if(!username || !email || !password){

            return res.status(400).json({
                success:false,
                message:"Thiếu dữ liệu"
            });

        }

        // kiểm tra username

        const { data:userExist } = await supabase
            .from("users")
            .select("*")
            .eq("username", username)
            .maybeSingle();

        if(userExist){

            return res.status(400).json({
                success:false,
                message:"Tên đăng nhập đã tồn tại"
            });

        }

        // kiểm tra email

        const { data:emailExist } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if(emailExist){

            return res.status(400).json({
                success:false,
                message:"Email đã tồn tại"
            });

        }

        const hash = await bcrypt.hash(password,10);

        const { error } = await supabase
            .from("users")
            .insert({

                username,
                display_name,

                email,

                password_hash:hash,

                level:1,

                exp:0,

                rank:"Đồng",

                coin:1000,

                avatar:"default"

            });

        if(error){

            return res.status(500).json(error);

        }

        res.json({

            success:true,

            message:"Đăng ký thành công, hãy sang đăng nhập"

        });

    }catch(err){

        res.status(500).json(err);

    }

});
// ========================
// ĐĂNG NHẬP
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

        const ok = await bcrypt.compare(
            password,
            user.password_hash
        );

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

    }
    catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});
// ========================
// CẬP NHẬT SAU TRẬN ĐẤU
// ========================

router.post("/update-result", async (req,res)=>{

    try{

        const{

            id,
            win

        }=req.body;

        const {data:user}=await supabase

            .from("users")

            .select("*")

            .eq("id",id)

            .single();

        if(!user){

            return res.json({
                success:false
            });

        }

        let exp=user.exp;
        let coin=user.coin;
        let level=user.level;

        if(win){

            exp+=50;
            coin+=200;

        }else{

            exp+=20;
            coin+=80;

        }

        while(exp>=100){

            exp-=100;
            level++;

        }

        let rank="Đồng";

        if(level>=30)
            rank="Kim Cương";

        else if(level>=20)
            rank="Bạch Kim";

        else if(level>=15)
            rank="Vàng";

        else if(level>=10)
            rank="Bạc";

        await supabase

        .from("users")

        .update({

            exp,

            coin,

            level,

            rank

        })

        .eq("id",id);

        res.json({

            success:true,

            exp,

            coin,

            level,

            rank

        });

    }catch(err){

        res.json({

            success:false,

            message:err.message

        });

    }

});
module.exports = router;