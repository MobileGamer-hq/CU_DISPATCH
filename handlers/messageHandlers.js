const {sendMessage} = require("../utilities/messages");
const admin = require("../utilities/firebase");
const {deleteUser} = require("../utilities/database");
module.exports = (bot, app) => {

    const pendingMessages = {}; // Stores temporary message state for admins

    bot.onText(/\/send_message/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Check if the sender is an admin
        const isAdmin = await admin
            .database()
            .ref("admins")
            .child(userId)
            .once("value");
        if (!isAdmin.exists()) {
            return bot.sendMessage(
                chatId,
                "❌ You are not authorized to use this command."
            );
        }

        pendingMessages[userId] = true;
        await bot.sendMessage(
            chatId,
            "📝 Please type the message you want to send to all users:"
        );
    });

// Listen for replies (after command was triggered)
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Skip if it's a command or no pending message for this admin
        if (msg.text && (!pendingMessages[userId] || msg.text.startsWith("/")))
            return;

        const messageToSend = msg.text;

        try {
            const usersSnapshot = await admin.database().ref("users").once("value");
            const users = usersSnapshot.val();

            if (!users) {
                bot.sendMessage(chatId, "🚫 No users found in the database.");
                delete pendingMessages[userId];
                return;
            }

            const userIds = Object.keys(users);
            let successCount = 0;
            let failCount = 0;

            for (const uid of userIds) {
                if (uid) {
                    try {
                        await sendMessage(bot, uid, messageToSend);
                        successCount++;
                    } catch (err) {
                        console.error(
                            `❌ Failed to send to ${users[uid].first_name}:`,
                            err.message
                        );
                        failCount++;
                        await deleteUser(uid)
                    }
                }
            }

            bot.sendMessage(
                chatId,
                `✅ Message sent to ${successCount} users.\n❌ Failed to send to ${failCount} users.`
            );
        } catch (error) {
            console.error("🔥 Error sending messages:", error);
            bot.sendMessage(chatId, "❌ An error occurred while sending messages.");
        }

        delete pendingMessages[userId]; // Reset state
    });
};