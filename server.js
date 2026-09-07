import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

// مدل گیم‌نت
const UserSchema = new mongoose.Schema({
  username: String,      // نام گیم‌نت
  password: String,      // پسورد گیم‌نت
  systems: Object,       // همه سیستم‌ها
  lastUpdate: String     // آخرین آپدیت
});

const User = mongoose.model("User", UserSchema);

//
// 🔥 POST — نرم‌افزار سیستم‌ها را ارسال می‌کند
//
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { password, systems } = req.body;

  const user = await User.findOne({ username });

  // اگر یوزر هست ولی پسورد اشتباهه
  if (user && user.password !== password) {
    return res.status(403).json({ error: "Wrong password" });
  }

  // ذخیره یا آپدیت
  await User.findOneAndUpdate(
    { username },
    {
      password,
      systems,
      lastUpdate: new Date().toISOString()   // 🔥 اینجا زمان آپدیت ذخیره می‌شود
    },
    { upsert: true }
  );

  res.json({ ok: true });
});

//
// 🔥 GET — سایت سیستم‌ها + آخرین آپدیت را می‌گیرد
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

  // 🔥 اینجا آخرین آپدیت برمی‌گردد
  res.json({
    systems: user.systems || {},
    lastUpdate: user.lastUpdate || null
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));