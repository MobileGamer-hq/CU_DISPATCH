// bot.js
const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const admin = require("./utilities/firebase");
const { commands, adminCommands } = require("./data/commands");
const {
    getUser,
    addUser,
    getUserByMatricNumber,
    addAdminByMatricNumber,
} = require("./utilities/database");

class TelegramBotApp {
    constructor() {
        this.app = express();
        this.app.use(express.json());

        this.token = process.env.BOT_TOKEN;
        this.port = process.env.PORT || 3000;
        this.url = "https://cu-council-beta-bot.onrender.com";

        this.bot = new TelegramBot(this.token,  { polling: true });
        this.userStates = {};
        this.userTempData = {};
        this.contactSessions = {};

        this.configureRoutes();
        this.loadHandlers();
    }

    configureRoutes() {
        this.app.post(`/bot${this.token}`, (req, res) => {
            try {
                this.bot.processUpdate(req.body);
                res.sendStatus(200);
            } catch (err) {
                console.error(`Error: ${err}`);
                res.status(500).send(err);
            }
        });

        this.app.get("/", (req, res) => {
            // Set the webhook
            this.bot.setWebHook(`${this.url}/bot${this.token}`);
            res.send("Council bot is running!");
        });
    }

    loadHandlers() {
        const handlersPath = path.join(__dirname, "handlers");

        // Read all handler files and import them
        fs.readdirSync(handlersPath).forEach((file) => {
            if (file.endsWith(".js")) {
                const handler = require(path.join(handlersPath, file));

                // Each handler file exports a function that accepts (bot, appInstance)
                if (typeof handler === "function") {
                    handler(this.bot, this);
                    console.log(`✅ Loaded handler: ${file}`);
                }
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Bot server running on port ${this.port}`);
        });
    }
}

module.exports = TelegramBotApp;
