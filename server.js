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

// مدل دیتابیس
const StatusSchema = new mongoose.Schema({
  username: String,
  systems: Object,
  lastUpdate: String
});

const Status = mongoose.model("Status", StatusSchema);

// دریافت داده از نرم‌افزار پایتونی و ذخیره در Mongo
app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const systems = req.body;

  await Status.findOneAndUpdate(
    { username },
    { systems, lastUpdate: new Date().toISOString() },
    { upsert: true }
  );

  res.json({ ok: true });
});

app.get("/status/:username", async (req, res) => {
  const username = req.params.username;
  const data = await Status.findOne({ username });

  res.json(data?.systems || {});
});

// ارسال داده به سایت (فقط systems)
app.get("/status/:username", async (req, res) => {
  const username = req.params.username;
  const data = await Status.findOne({ username });

  res.json(data?.systems || {});
});

app.listen(3000, () => console.log("Server running on port 3000"));