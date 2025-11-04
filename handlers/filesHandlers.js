const path = require("path");
const fs = require("fs");
module.exports = (bot, app) => {
    bot.onText(/\/handbook/, async (msg) => {
        const chatId = msg.chat.id;

        const fileName = "handbook.pdf";
        const filePath = path.join(__dirname, "../files", fileName);
        // console.log("File Path: ", filePath);

        try {
            await bot.sendMessage(chatId, "📤 Sending your selected timetable...");
            await bot.sendDocument(chatId, fs.createReadStream(filePath));
        } catch (err) {
            console.error("Error sending timetable:", err);
            await bot.sendMessage(chatId, "⚠️ Sorry, I couldn’t find that file. Please contact the admin.");
        }
    });
};