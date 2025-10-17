// utilities/sendMessage.js

const admin = require("./firebase"); // Import the firebase admin SDK
const { getUserIds } = require("./database"); // only getUserIds comes from database

async function sendMessage(bot, chatId, message, options = {parse_mode: "Markdown",}) {
    try {
        const sentMessage = await bot.sendMessage(chatId, message, options);

        // Save to your database
        const db = admin.database();
        const key = `${chatId}_${sentMessage.message_id}`;
        await db.ref("botChats").child(key).set({
            chat_id: chatId,
            message_id: sentMessage.message_id,
            timestamp: Date.now(),
        });

        console.log(`✅ Message sent & stored for ${chatId}`);
        return sentMessage;
    } catch (err) {
        console.error("❌ Error sending or storing message:", err.message);
        throw err
    }
}

async function sendMessageToAll(bot, message, options = {parse_mode: "Markdown",}) {
    try {
        const userIds = await getUserIds(); // fetch all registered users
        console.log(`📤 Sending message to ${userIds.length} users...`);

        for (const id of userIds) {
            try {
                await sendMessage(bot, id, message, options);
            } catch (error) {
                console.error(`⚠️ Failed to send to ${id}:`, error.message);
            }
        }

        console.log("✅ Broadcast complete.");
    } catch (error) {
        console.error("❌ Error sending messages to all users:", error.message);
    }
}

module.exports = { sendMessage, sendMessageToAll };
