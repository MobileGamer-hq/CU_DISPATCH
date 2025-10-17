const fs = require("fs");
const path = require("path");

module.exports = (bot, app) => {

    // /timetable command
    bot.onText(/\/timetable/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage(chatId, "📅 Which timetable would you like to view?", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📚 Academic Timetable", callback_data: "academic_timetable" }],
                    [{ text: "🗓️ Semester Timetable", callback_data: "semester_timetable" }],
                    [{ text: "📝 Exam Timetable", callback_data: "exam_timetable" }],
                ],
            },
        });
    });

    // Handle callback queries
    bot.on("callback_query", async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        let fileName = "";
        if (data === "academic_timetable") fileName = "academic_timetable.pdf";
        else if (data === "semester_timetable") fileName = "semester_timetable.pdf";
        else if (data === "exam_timetable") fileName = "exam_timetable.pdf";
        else return;

        const filePath = path.join(__dirname, "files", fileName);

        try {
            await bot.sendMessage(chatId, "📤 Sending your selected timetable...");
            await bot.sendDocument(chatId, fs.createReadStream(filePath));
        } catch (err) {
            console.error("Error sending timetable:", err);
            await bot.sendMessage(chatId, "⚠️ Sorry, I couldn’t find that file. Please contact the admin.");
        }

        await bot.answerCallbackQuery(callbackQuery.id);
    });
};
