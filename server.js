import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("Mongo Error:", err));

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  systems: Object,
  lastUpdate: String
});

const User = mongoose.model("User", UserSchema);

app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const { password, systems, lastUpdate } = req.body;

  const user = await User.findOne({ username });

  if (user && user.password !== password) {
    return res.status(403).json({ error: "Wrong password" });
  }

  await User.findOneAndUpdate(
    { username },
    {
      password,
      systems,
      lastUpdate: lastUpdate || new Date().toISOString()
    },
    { upsert: true }
  );

  res.json({ ok: true });
});

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

app.listen(3000, () => console.log("Server running on port 3000"));
