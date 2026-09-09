import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به دیتابیس
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// مدل کاربر
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },   // جلوگیری از تکراری بودن
  password: String,
  systems: Object,
  lastUpdate: String
});

const User = mongoose.model("User", UserSchema);

//
// 🔥 مسیر چک کردن یوزرنیم تکراری
//
app.get("/check/:username", async (req, res) => {
  const username = req.params.username;

  const exists = await User.findOne({ username });

  res.json({ exists: !!exists });
});

//
// 🔥 مسیر ثبت یا آپدیت وضعیت سیستم‌ها
//
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { password, systems, lastUpdate } = req.body;

  // چک تکراری بودن یوزرنیم
  const exists = await User.findOne({ username });

  // اگر کاربر وجود دارد ولی پسورد اشتباه است
  if (exists && exists.password !== password) {
    return res.status(403).json({ error: "Wrong password" });
  }

  // اگر کاربر وجود ندارد → ایجاد کاربر جدید
  if (!exists) {
    const newUser = new User({
      username,
      password,
      systems,
      lastUpdate: lastUpdate || new Date().toISOString()
    });

    await newUser.save();

    return res.json({ ok: true, created: true });
  }

  // اگر کاربر وجود دارد → آپدیت اطلاعات
  await User.findOneAndUpdate(
    { username },
    {
      password,
      systems,
      lastUpdate: lastUpdate || new Date().toISOString()
    }
  );

  res.json({ ok: true, updated: true });
});

//
// 🔥 مسیر گرفتن وضعیت سیستم‌ها
//
app.get("/status/:username", async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username });

  if (!user) {
    return res.json({
      systems: {},
      lastUpdate: null
    });
  }

  res.json({
    systems: user.systems || {},
    lastUpdate: user.lastUpdate || null
  });
});

//
// 🔥 حذف همه کاربران (برای تست)
//
app.get("/status/delete_all", async (req, res) => {
  try {
    await User.deleteMany({});
    res.json({ ok: true, message: "تمام کاربران حذف شدند" });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// اجرای سرور
app.listen(3000, () => console.log("Server running on port 3000"));