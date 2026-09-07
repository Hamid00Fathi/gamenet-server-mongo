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

// مدل: هر گیم‌نت یک داکیومنت دارد
const UserSchema = new mongoose.Schema({
  username: String,      // نام گیم‌نت
  password: String,      // پسورد گیم‌نت
  systems: Object,       // همه سیستم‌ها
  lastUpdate: String
});

const User = mongoose.model("User", UserSchema);

// آپدیت سیستم‌ها + چک پسورد گیم‌نت (نرم‌افزار پایتونی از این استفاده می‌کند)
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { password, systems } = req.body;

  const user = await User.findOne({ username });

  // اگر یوزر هست ولی پسورد اشتباهه
  if (user && user.password !== password) {
    return res.status(403).json({ error: "Wrong password" });
  }

  // اگر یوزر نیست یا پسورد درسته → ذخیره/آپدیت
  await User.findOneAndUpdate(
    { username },
    { password, systems, lastUpdate: new Date().toISOString() },
    { upsert: true }
  );

  res.json({ ok: true });
});

// گرفتن سیستم‌ها برای سایت (بدون پسورد، چون سایت خودش چک می‌کند)
app.get("/status/:username", async (req, res) => {
  const username = req.params.username;

  const user = await User.findOne({ username });

  res.json(user?.systems || {});
});

app.listen(3000, () => console.log("Server running on port 3000"));