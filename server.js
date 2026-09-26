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
  systems: Object,
  lastUpdate: String,
  expireDate: String,

  // لایسنس آفلاین
  licenseKey: String,
  licenseType: { type: String, default: "online" }, // online یا offline
  licenseActive: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// ===============================
// لاگین نرم‌افزار (فقط چک یوزرنیم + پسورد)
// ===============================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  if (user.password !== password) {
    return res.status(403).json({ ok: false, error: "Wrong password" });
  }

  res.json({ ok: true });
});

// ===============================
// چک یوزرنیم وجود دارد یا نه
// ===============================
app.get("/check/:username", async (req, res) => {
  const username = req.params.username;
  const exists = await User.findOne({ username });
  res.json({ exists: !!exists });
});


app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ ok: false, error: "Missing fields" });
  }

  const exists = await User.findOne({ username });
  if (exists) {
    return res.json({ ok: false, error: "User exists" });
  }

  // ساخت لایسنس‌کی حرفه‌ای
  function generateLicenseKey() {
    const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GN-${part()}-${part()}-${part()}`;
  }

  const licenseKey = generateLicenseKey();

  const user = new User({
    username,
    password,
    systems: {},
    lastUpdate: new Date().toISOString(),
    expireDate: null,

    // لایسنس حرفه‌ای
    licenseKey,
    licenseType: "online",
    licenseActive: false
  });

  await user.save();

  res.json({ ok: true, licenseKey });
});

// ===============================
// آپدیت وضعیت سیستم‌ها (فقط برای سایت)
// ===============================
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { systems, lastUpdate } = req.body;

  const user = await User.findOne({ username });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // فقط آپدیت سیستم‌ها
  const isEmptySystems =
    !systems ||
    (typeof systems === "object" && Object.keys(systems).length === 0);

  if (!isEmptySystems) {
    user.systems = systems;
  }

  user.lastUpdate = lastUpdate || new Date().toISOString();

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
// آپدیت تاریخ اشتراک
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

// ===============================
// وضعیت لایسنس برای نرم‌افزار
// ===============================
app.get("/license/status/:username", async (req, res) => {
  const username = req.params.username;
  const user = await User.findOne({ username });

  if (!user) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    licenseKey: user.licenseKey,
    licenseType: user.licenseType,
    licenseActive: user.licenseActive
  });
});

// ===============================
// چک لایسنس هنگام فعال‌سازی آفلاین مود
// ===============================
app.post("/license/verify", async (req, res) => {
  const { username, key } = req.body;

  const user = await User.findOne({ username });

  if (!user) return res.json({ valid: false });

  if (user.licenseKey === key) {
    user.licenseType = "offline";
    user.licenseActive = true;
    await user.save();

    return res.json({ valid: true });
  }

  res.json({ valid: false });
});

// اجرای سرور
app.listen(3000, () => console.log("Server running on port 3000"));