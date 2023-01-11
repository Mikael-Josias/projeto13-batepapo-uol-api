import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

//==================== DATABASE ====================\\

let db;

const mongoClient = new MongoClient("mongodb://127.0.0.1:27017");
mongoClient.connect()
    .then(() => {
        db = mongoClient.db("herois");
        console.log("Conexão realizada com Sucesso!");
    })
    .catch(() => {
        console.log("Não foi possivel se conectar ao Banco de Dados!");
    });

//==================== SERVER ====================\\

const server = express();
server.use(cors());
server.use(express.json());


server.listen(5000, () => {
    console.log("Server Inicializado 🚀!!!");
});