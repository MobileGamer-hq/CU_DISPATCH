const {sendMessage} = require("../utilities/messages");
const {adminCommands, userCommands} = require("../data/commands");
module.exports = (bot, app) => {
    const {userStates, userTempData} = app;
    const {addUser, getUser} = require("../utilities/database");
    const admin = require("../utilities/firebase");

    // /start & /join
    bot.onText(/\/(start|join)/, async (msg) => {
        const chatId = msg.chat.id;

        await bot.sendMessage(chatId, "👋 Hi! What's your *first name*?", {
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
                await bot.sendMessage(chatId, "📚 Enter your *Matric or Reg number*:", {parse_mode: "Markdown"});
                break;

            case "awaiting_matric":
                userTempData[chatId].matric_number = text;
                userStates[chatId] = "awaiting_level";
                await bot.sendMessage(chatId, "🎓 What level are you in? eg 100", {parse_mode: "Markdown"});
                break;

            case "awaiting_level":
                userTempData[chatId].level = text;
                const userData = {
                    ...userTempData[chatId], username: msg.from.username || "", is_bot: msg.from.is_bot || false,
                };

                const success = await addUser(msg.from.id.toString(), userData);
                if (success) {
                    await bot.sendMessage(chatId, `✅ Registration complete!\nWelcome *${userData.first_name}*!`, {
                        parse_mode: "Markdown",
                    });
                    try {
                        await bot.sendMessage(
                            6311922657,
                            `👤 New user Created, *${userData.first_name}*, ${userData.matric_number}`,
                            {
                                parse_mode: "Markdown",
                            }
                        );
                    } catch (err) {
                        console.log(err);
                    }
                } else {
                    await bot.sendMessage(chatId, "⚠️ Registration failed. Try again later.");
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
        await sendMessage(bot, chatId, info, {parse_mode: "Markdown"});
    });


    // /edit_info
    // /edit_info or /update_info
    bot.onText(/\/(edit_info|update_info)/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const userData = await getUser(userId);
        if (!userData) {
            return await bot.sendMessage(
                chatId,
                "😕 No data found. Use /start first to register."
            );
        }

        // Inline buttons for choosing what to edit
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "📝 First Name", callback_data: "edit_first_name"},
                        {text: "📝 Last Name", callback_data: "edit_last_name"},
                    ],
                    [
                        {text: "🎓 Matric Number", callback_data: "edit_matric_number"},
                        {text: "📚 Level", callback_data: "edit_level"},
                    ],
                ],
            },
        };

        await bot.sendMessage(
            chatId,
            "✏️ What would you like to edit?\nSelect an option below:",
            options
        );
    });

// Handle button clicks
    bot.on("callback_query", async (query) => {
        const chatId = query.message.chat.id;
        const userId = query.from.id.toString();
        const data = query.data;

        const fieldMap = {
            edit_first_name: "first_name",
            edit_last_name: "last_name",
            edit_matric_number: "matric_number",
            edit_level: "level",
        };

        const field = fieldMap[data];
        if (!field) return;

        app.userTempData[chatId] = {field};
        app.userStates[chatId] = "awaiting_new_value";

        await bot.sendMessage(
            chatId,
            `✍️ Enter your new *${field.replace("_", " ")}*:`,
            {parse_mode: "Markdown"}
        );

        // Acknowledge the button press
        await bot.answerCallbackQuery(query.id);
    });

// Handle new input after user chooses a field
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const text = msg.text?.trim();

        if (app.userStates[chatId] !== "awaiting_new_value") return;

        const {field} = app.userTempData[chatId];
        if (!field) return;

        try {
            const db = require("../utilities/firebase").database();
            await db.ref(`users/${userId}/${field}`).set(text);

            await bot.sendMessage(
                chatId,
                `✅ Your *${field.replace("_", " ")}* has been updated to: *${text}*`,
                {parse_mode: "Markdown"}
            );

            const updatedUser = await getUser(userId);
            const info = `
🧾 *Updated Info:*
*First:* ${updatedUser.first_name}
*Last:* ${updatedUser.last_name}
*Matric:* ${updatedUser.matric_number}
*Level:* ${updatedUser.level}
        `;

            await bot.sendMessage(chatId, info, {parse_mode: "Markdown"});
        } catch (err) {
            console.error("Error updating user info:", err);
            await bot.sendMessage(chatId, "⚠️ Failed to update info. Try again later.");
        }

        delete app.userStates[chatId];
        delete app.userTempData[chatId];
    });

};
