const {sendMessage} = require("../utilities/messages");
const {adminCommands, userCommands} = require("../data/commands");
module.exports = (bot, app) => {
    const {userStates, userTempData} = app;
    const {addUser, getUser} = require("../utilities/database");
    const admin = require("../utilities/firebase");

    // /start & /join
    bot.onText(/\/(start|join)/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage( chatId, "👋 Hi! What's your *first name*?", {
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
                await bot.sendMessage(chatId, "Now your *last name*?", {parse_mode: "Markdown"});
                break;

            case "awaiting_last_name":
                userTempData[chatId].last_name = text;
                userStates[chatId] = "awaiting_matric";
                await bot.sendMessage(chatId, "📚 Enter your *matric number*:", {parse_mode: "Markdown"});
                break;

            case "awaiting_matric":
                userTempData[chatId].matric_number = text;
                userStates[chatId] = "awaiting_level";
                await bot.sendMessage( chatId, "🎓 What level are you in? eg 100", {parse_mode: "Markdown"});
                break;

            case "awaiting_level":
                userTempData[chatId].level = text;
                const userData = {
                    ...userTempData[chatId], username: msg.from.username || "", is_bot: msg.from.is_bot || false,
                };

                const success = await addUser(msg.from.id.toString(), userData);
                if (success) {
                    await bot.sendMessage( chatId, `✅ Registration complete!\nWelcome *${userData.first_name}*!`, {
                        parse_mode: "Markdown",
                    });
                } else {
                    await bot.sendMessage( chatId, "⚠️ Registration failed. Try again later.");
                }

                delete userStates[chatId];
                delete userTempData[chatId];

                try {
                    // Fetch admin list from Firebase
                    const snapshot = await admin.database().ref("admins").once("value");
                    const adminList = snapshot.val() || {};
                    const isAdmin = adminList[chatId];

                    // Check if the user is an admin and update the bot's commands accordingly
                    if (isAdmin) {
                        await bot.setMyCommands([...adminCommands, ...userCommands]);
                        return bot.sendMessage(
                            chatId,
                            "🔐 Welcome Admin! You now have access to admin commands."
                        );
                    } else {
                        await bot.setMyCommands(userCommands);
                        return bot.sendMessage(
                            chatId,
                            "👋 Use /help to explore what I can do."
                        );
                    }
                } catch (err) {
                    console.error("Failed to fetch admin list:", err);
                    return bot.sendMessage(
                        chatId,
                        "⚠️ An error occurred while checking your role."
                    );
                }

                break;
        }
    });

    // /view_info
    bot.onText(/\/view_info/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const userData = await getUser(userId);
        if (!userData) return await bot.sendMessage(chatId, "😕 No data found. Use /start first.");

        const info = `
🧾 *Your Info:*
*First:* ${userData.first_name}
*Last:* ${userData.last_name}
*Matric:* ${userData.matric_number}
*Level:* ${userData.level}
`;
        await sendMessage(chatId, info, {parse_mode: "Markdown"});
    });



    // /edit_info
    bot.onText(/\/edit_info/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const userData = await getUser(userId);
        if (!userData) {
            return await bot.sendMessage( chatId, "😕 No data found. Use /start first to register.");
        }

        await bot.sendMessage( chatId,
            "✏️ What would you like to edit?\nChoose one:\n\n1️⃣ First Name\n2️⃣ Last Name\n3️⃣ Matric Number\n4️⃣ Level",
            { parse_mode: "Markdown" }
        );

        app.userStates[chatId] = "awaiting_edit_choice";
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = msg.from.id.toString();

        if (!app.userStates[chatId]) return;

        switch (app.userStates[chatId]) {
            case "awaiting_edit_choice":
                let field = null;

                if (["1", "first name"].includes(text.toLowerCase())) field = "first_name";
                else if (["2", "last name"].includes(text.toLowerCase())) field = "last_name";
                else if (["3", "matric", "matric number"].includes(text.toLowerCase())) field = "matric_number";
                else if (["4", "level"].includes(text.toLowerCase())) field = "level";

                if (!field) {
                    return await sendMessage(bot, chatId, "⚠️ Please choose 1, 2, 3, or 4.");
                }

                app.userTempData[chatId] = { field };
                app.userStates[chatId] = "awaiting_new_value";
                await bot.sendMessage(chatId, `✍️ Enter your new *${field.replace("_", " ")}*:`, { parse_mode: "Markdown" });
                break;

            case "awaiting_new_value":
                const newValue = text.trim();
                const { field: fieldToUpdate } = app.userTempData[chatId];

                try {
                    const db = require("../utilities/firebase").database();
                    await db.ref(`users/${userId}/${fieldToUpdate}`).set(newValue);

                    await bot.sendMessage( chatId, `✅ Your *${fieldToUpdate.replace("_", " ")}* has been updated to: *${newValue}*`, { parse_mode: "Markdown" });

                    const updatedUser = await getUser(userId);
                    const info = `
🧾 *Updated Info:*
*First:* ${updatedUser.first_name}
*Last:* ${updatedUser.last_name}
*Matric:* ${updatedUser.matric_number}
*Level:* ${updatedUser.level}
`;
                    await sendMessage(bot, chatId, info, { parse_mode: "Markdown" });

                } catch (err) {
                    console.error("Error updating user info:", err);
                    await bot.sendMessage( chatId, "⚠️ Failed to update info. Try again later.");
                }

                delete app.userStates[chatId];
                delete app.userTempData[chatId];
                break;
        }
    });

};
