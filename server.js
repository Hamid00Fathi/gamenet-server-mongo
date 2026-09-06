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

const StatusSchema = new mongoose.Schema({
  username: String,
  systems: Object,
  lastUpdate: String
});

const Status = mongoose.model("Status", StatusSchema);

app.post("/status/:username", async (req, res) => {
  const username = req.params.username;
  const data = req.body;

  await Status.findOneAndUpdate(
    { username },
    { ...data },
    { upsert: true }
  );

  res.json({ ok: true });
});

app.get("/status/:username", async (req, res) => {
  const username = req.params.username;
  const data = await Status.findOne({ username });

  res.json(data || {});
});

app.listen(3000, () => console.log("Server running on port 3000"));
