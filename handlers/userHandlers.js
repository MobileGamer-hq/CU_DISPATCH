module.exports = (bot, app) => {
    const {userStates, userTempData} = app;
    const {addUser, getUser} = require("../utilities/database");
    const admin = require("../utilities/firebase");

    // /start & /join
    bot.onText(/\/(start|join)/, (msg) => {
        const chatId = msg.chat.id;

        bot.sendMessage(chatId, "👋 Hi! What's your *first name*?", {
            parse_mode: "Markdown",
        });

        userStates[chatId] = "awaiting_first_name";
        userTempData[chatId] = {};
    });

    // registration flow
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        if (!userStates[chatId]) return;

        switch (userStates[chatId]) {
            case "awaiting_first_name":
                userTempData[chatId].first_name = text;
                userStates[chatId] = "awaiting_last_name";
                bot.sendMessage(chatId, "Now your *last name*?", {parse_mode: "Markdown"});
                break;

            case "awaiting_last_name":
                userTempData[chatId].last_name = text;
                userStates[chatId] = "awaiting_matric";
                bot.sendMessage(chatId, "📚 Enter your *matric number*:", {parse_mode: "Markdown"});
                break;

            case "awaiting_matric":
                userTempData[chatId].matric_number = text;
                userStates[chatId] = "awaiting_level";
                bot.sendMessage(chatId, "🎓 What level are you in?", {parse_mode: "Markdown"});
                break;

            case "awaiting_level":
                userTempData[chatId].level = text;
                const userData = {
                    ...userTempData[chatId],
                    username: msg.from.username || "",
                    is_bot: msg.from.is_bot || false,
                };

                const success = await addUser(msg.from.id.toString(), userData);
                if (success) {
                    bot.sendMessage(chatId, `✅ Registration complete!\nWelcome *${userData.first_name}*!`, {
                        parse_mode: "Markdown",
                    });
                } else {
                    bot.sendMessage(chatId, "⚠️ Registration failed. Try again later.");
                }

                delete userStates[chatId];
                delete userTempData[chatId];
                break;
        }
    });

    // /view_info
    bot.onText(/\/view_info/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const userData = await getUser(userId);
        if (!userData)
            return bot.sendMessage(chatId, "😕 No data found. Use /start first.");

        const info = `
🧾 *Your Info:*
*First:* ${userData.first_name}
*Last:* ${userData.last_name}
*Matric:* ${userData.matric_number}
*Level:* ${userData.level}
`;
        bot.sendMessage(chatId, info, {parse_mode: "Markdown"});
    });
};
