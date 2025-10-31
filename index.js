// const TelegramBotApp = require("./bot");
// const botApp = new TelegramBotApp();
// botApp.start();
// index.js

const TelegramBotApp = require("./bot");
const loadJobs = require("./jobs");

const app = new TelegramBotApp();
loadJobs(app.bot, app); // jobs use same bot instance
app.start();

//TODO:
/*
* FIX Timetable
* */