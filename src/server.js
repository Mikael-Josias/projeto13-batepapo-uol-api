import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import Joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

//==================== INTERFACES ====================\\

const schemaUser = Joi.object({
    name: Joi.string().min(3).max(15).required(),
});

const schemaMessage = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("message","private_message").required(),
});

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
    if (schemaUser.validate({name}).error) {
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

server.post("/messages", async (req, res) => {
    const {to, text, type} = req.body;
    const {user} = req.headers;

    //validar os dados vindos do body
    if (schemaMessage.validate({to, text, type}).error) {
        return res.status(422).send("Parametros da mensagem não opdem ser vazios!");
    }

    try {
        //verificar se o usuário existe;

        if (!await db.collection("participants").findOne({name: user})) {
            return res.status(422).send("Usuário não existe");
        }

        //salvando a mensagem
        const message = {
            from: user,
            to,
            text,
            type,
            time: dayjs().format("HH:mm:ss"),
        };

        await db.collection("messages").insertOne(message);

        res.status(201).send("Mesagem postada!");
    } catch (err) {
        console.log("Ops! Algo deu errado!");
    }

    res.send("OK");
});

server.get("/messages", async (req, res) => {
    const {limit} = req.query;
    const {user} = req.headers;

    try {
        const data = await db.collection("messages").find().toArray();
        const newData = [];

        //verifica se o usuário deveria ver as mensagens
        for (let i = 0; i < data.length; i++) {
            if (data[i].type === "message" || data[i].from === user || data[i].to === user) {
               newData.push(data[i]);
            }
        }

        //retorna até o número limite de mensagens
        newData.reverse().splice(limit, newData.length - 1);

        res.send(newData);
    } catch (err) {
        res.status(404).send("Houve um erro!");
    }
});

server.post("/status", async (req, res) => {
    const {user} = req.headers;

    try {
        //verifica se usuário está cadastrado
        if (!await db.collection("participants").findOne({name : user})) {
            return res.status(404).send("Usuário não foi encontrado");
        }

        //atualiza status
        const lastStatus = Date.now();
        
        const result = await db.collection("participants").updateOne({name: user}, {$set: {lastStatus}});

        result.modifiedCount === 0 ? res.send("Não foi alterado") : res.send("Usuário atualizado");
        
    } catch (err) {
        console.log(err);
        res.send("Houve um erro!");
    }
});

server.listen(5000, () => {
    console.log("Server Inicializado 🚀!!!");
});

//==================== DELETE OFFLINE USERS ====================\\

setInterval(deleteUser, 15000);

async function deleteUser(){
    const users = await db.collection("participants").find().toArray();

    try {
        for (let i = 0; i < users.length; i++) {
            if ((new Date().getTime() - new Date(users[i].lastStatus).getTime()) / 1000 > 10) {
                await db.collection("participants").deleteOne({_id: ObjectId(users[i]._id)});
            }
        }
    } catch (err) {
        console.log(err);
    }
}
