import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

const userSchema = joi.object({
  name: joi.string().min(3).max(20).required(),
});
const messageSchema = joi.object({
  to: joi.string().min(3).max(20).required(),
  text: joi.string().min(1).required(),
  type: joi.valid("private_message", "message").required(),
});

try {
  await mongoClient.connect();
  db = mongoClient.db();
} catch (error) {
  console.log(error);
}

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validate = userSchema.validate(req.body, { abortEarly: false });
  const hour = dayjs().format("HH:mm:ss");

  if (validate.error) {
    return res.sendStatus(422);
  }

  try {
    const existName = await db.collection("participants").findOne({ name });

    if (existName)
      return res.status(409).send("Já existe um participante com este nome");

    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });

    db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: hour,
    });
    return res.sendStatus(201);
  } catch (error) {
    return res.sendStatus(500);
  }
});

server.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("participants").find().toArray();
    res.send(users);
  } catch (error) {
    return res.sendStatus(500);
  }
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const validate = messageSchema.validate(req.body, { abortEarly: false });
  const hour = dayjs().format("HH:mm:ss");

  if (validate.error) {
    return res.sendStatus(422);
  }

  try {
    const existUser = await db
      .collection("participants")
      .findOne({ name: user });

    if (existUser) {
      await db
        .collection("messages")
        .insertOne({ from: user, to, text, type, time: hour });
      return res.sendStatus(201);
    } else {
      res.sendStatus(422);
    }
  } catch (error) {
    return res.sendStatus(500);
  }
});

server.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;

  try {
    const msg = await db
      .collection("messages")
      .find({
        $or: [
          { type: "status" },
          { type: "message" },
          { type: "private_message", from: user },
          { type: "private_message", to: user },
        ],
      })
      .toArray();

    const msgFront = msg.slice(-limit);
    
    if (limit === undefined) {
      return res.send(msgFront);
    }

    if (isNaN(limit) || limit < 1) {
      return res.sendStatus(422);
    } else {
      res.send(msgFront);
    }
  } catch (error) {
    return res.sendStatus(500);
  }
});

server.post("/status", async (req, res) => {
  const { user } = req.headers;

  try {
    const existsParticipante = await db
      .collection("participants")
      .findOne({ name: user });

    if (existsParticipante) {
      await db
        .collection("participants")
        .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
      return res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

async function removeUsers() {
  const time = Date.now() - 10000;
  const hour = dayjs().format("HH:mm:ss");

  const inactive = await db
    .collection("participants")
    .find({ lastStatus: { $lt: time } })
    .toArray();

  for (let i = 0; i < inactive.length; i++) {
    db.collection("messages").insertOne({
      from: inactive[i].name,
      to: "Todos",
      text: "sai da sala...",
      type: "status",
      time: hour,
    });
    db.collection("participants").deleteOne({ name: inactive[i].name });
  }
}

setInterval(removeUsers, 15000);

const PORT = 5000;

server.listen(PORT, () => console.log(`Conectado na porta ${PORT}`));
