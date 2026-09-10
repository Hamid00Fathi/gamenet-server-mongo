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
  username: { type: String, unique: true },
  password: String,
  systems: Object,      // آخرین وضعیت سیستم‌ها
  lastUpdate: String,   // آخرین زمان آپدیت
  expireDate: String    // تاریخ پایان اشتراک
});

const User = mongoose.model("User", UserSchema);

// ===============================
// چک یوزرنیم وجود دارد یا نه
// ===============================
app.get("/check/:username", async (req, res) => {
  const username = req.params.username;
  const exists = await User.findOne({ username });
  res.json({ exists: !!exists });
});

// ===============================
// ثبت یا آپدیت وضعیت سیستم‌ها از نرم‌افزار
// ===============================
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { password, systems, lastUpdate } = req.body;

  let user = await User.findOne({ username });

  // اگر کاربر هست و پسورد اشتباه است
  if (user && user.password !== password) {
    return res.status(403).json({ error: "Wrong password" });
  }

  // اگر کاربر نیست → ساخت کاربر جدید
  if (!user) {
    user = new User({
      username,
      password,
      systems: systems || {},                         // آخرین وضعیت سیستم‌ها
      lastUpdate: lastUpdate || new Date().toISOString(),
      expireDate: null
    });

    await user.save();
    return res.json({ ok: true, created: true });
  }

  // اگر کاربر هست → آپدیت فقط آخرین وضعیت
  user.password = password;
  user.systems = systems || user.systems || {};
  user.lastUpdate = lastUpdate || new Date().toISOString();
  // expireDate دست نمی‌زنیم

  await user.save();

  res.json({ ok: true, updated: true });
});

// ===============================
// گرفتن وضعیت سیستم‌ها برای سایت
// ===============================
app.get("/status/:username", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });

  if (!user) {
    return res.json({
      systems: {},
      lastUpdate: null
    });
  }

  // همیشه آخرین وضعیت ذخیره‌شده را برگردان
  res.json({
    systems: user.systems || {},
    lastUpdate: user.lastUpdate || null
  });
});

// ===============================
// حذف همه کاربران (برای تست)
// ===============================
app.get("/status/delete_all", async (req, res) => {
  try {
    await User.deleteMany({});
    res.json({ ok: true, message: "تمام کاربران حذف شدند" });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

// ===============================
// چک وضعیت اشتراک
// ===============================
app.get("/subscription/:username", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });

  if (!user || !user.expireDate) {
    return res.json({ active: false, expireDate: null });
  }

  const now = new Date();
  const expire = new Date(user.expireDate);

  res.json({
    active: expire > now,
    expireDate: user.expireDate
  });
});

// ===============================
// آپدیت تاریخ اشتراک (مثلاً از پنل مدیریت)
// ===============================
app.post("/subscription/update/:username", async (req, res) => {
  const username = req.params.username;
  const { expireDate } = req.body;

  await User.findOneAndUpdate(
    { username },
    { expireDate }
  );

  res.json({ ok: true });
});

// اجرای سرور
app.listen(3000, () => console.log("Server running on port 3000"));