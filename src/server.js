import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MongoClient = new MongoClient(process.env.DATABASE_URL);

let db;

try {
  await MongoClient.connect();
  db = MongoClient.db();
} catch (error) {
  console.log(error);
}

const server = express();
server.use(cors());
server.use(express.json());

// server.post("/participants", async (req, res) => {
//     const {name} = req.body;

// })



const PORT = 5000;

server.listen(PORT, () => console.log("Conectado na porta" + { PORT }));
