import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import Joi from "joi";
import dotenv from "dotenv";
dotenv.config();

//==================== INTERFACES ====================\\

const schema = Joi.object({
    name: Joi.string().min(3).max(15).required(),
})

//==================== DATABASE ====================\\

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db();
    console.log("Conectado ao Banco de Dados!");
} catch (err) {
    console.log(err);    
}

//==================== SERVER ====================\\

const server = express();
server.use(cors());
server.use(express.json());

server.post("/participants", async (req, res) => {
    const {name} = req.body;

    //verifica se o nome é vazio
    if (schema.validate({name}).error) {
        return res.status(422).send("Usuário não pode ser vázio!");
    }

    try {
        //verifica se usuário já está cadastrado
        if (await db.collection("participants").findOne({name})) {
            return res.status(409).send("Usuário já está cadastrado!");
        }

        //cadastra o novo usuário
        const newUser = {
            name,
            lastStatus: Date.now(),
        }

        await db.collection("participants").insertOne(newUser);
    } catch (err) {
        console.log(err);
    }

    res.send("OK");
});

server.get("/participants", async (_, res) => {
    try {
        const data = await db.collection("participants").find().toArray();
        res.send(data);
    } catch (err) {
        res.status(500).send("Desculpe! Tivemos um erro em nosso servidor!");
    }
});

server.listen(5000, () => {
    console.log("Server Inicializado 🚀!!!");
});