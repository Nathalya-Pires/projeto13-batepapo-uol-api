import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

let db;

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
  const hour = dayjs().format("HH:mm:ss");

  try {
    const existName = await db.collection("participants").findOne({ name });

    if (existName)
      return res.status(409).send("Já existe um participante com este nome");

    await db
      .collection("participants")
      .insertOne({ name, lastStatus: Date.now() });
    res.sendStatus(201);
    await db.collection("messages").insertOne({
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

const PORT = 5000;

server.listen(PORT, () => console.log(`Conectado na porta ${PORT}`));
