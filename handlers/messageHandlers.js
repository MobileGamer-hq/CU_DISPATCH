const { sendMessage } = require("../utilities/messages");
const admin = require("../utilities/firebase");
const { deleteUser } = require("../utilities/database");

module.exports = (bot, app) => {
    const pendingMessages = {}; // Stores state for admins

    bot.onText(/\/send_message/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // ✅ Check admin
        const isAdminSnap = await admin.database().ref("admins").child(userId).once("value");
        if (!isAdminSnap.exists()) {
            return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
        }

        // ✅ Ask message text
        pendingMessages[userId] = { step: "awaiting_message" };
        await bot.sendMessage(chatId, "📝 Please type the message you want to send to all users:");
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const state = pendingMessages[userId];

        // Ignore if not in message flow or is a command
        if (!state || (msg.text && msg.text.startsWith("/"))) return;

        // ✅ Step 1: Get message text
        if (state.step === "awaiting_message" && msg.text) {
            state.message = msg.text;
            state.step = "ask_image";
            return bot.sendMessage(chatId, "🖼 Do you want to send this message *with an image*? (yes/no)", {
                parse_mode: "Markdown",
            });
        }

        // ✅ Step 2: Ask if image is wanted
        if (state.step === "ask_image" && msg.text) {
            const reply = msg.text.trim().toLowerCase();
            if (reply === "yes") {
                state.step = "awaiting_image";
                return bot.sendMessage(chatId, "📤 Please upload the image you want to include.");
            } else if (reply === "no") {
                state.step = "ready";
                return broadcastMessage(bot, chatId, userId, state.message);
            } else {
                return bot.sendMessage(chatId, "⚠️ Please reply with *yes* or *no*.", {
                    parse_mode: "Markdown",
                });
            }
        }

        // ✅ Step 3: Receive image
        if (state.step === "awaiting_image" && msg.photo) {
            const fileId = msg.photo[msg.photo.length - 1].file_id; // largest resolution
            state.image = fileId;
            state.step = "ready";
            return broadcastMessage(bot, chatId, userId, state.message, state.image);
        }
    });

    async function broadcastMessage(bot, chatId, userId, messageText, image = null) {
        try {
            const usersSnap = await admin.database().ref("users").once("value");
            const users = usersSnap.val();

            if (!users) {
                await bot.sendMessage(chatId, "🚫 No users found in the database.");
                delete pendingMessages[userId];
                return;
            }

            const userIds = Object.keys(users);
            let successCount = 0;
            let failCount = 0;

            for (const uid of userIds) {
                try {
                    if (image) {
                        await bot.sendPhoto(uid, image, { caption: messageText, parse_mode: "Markdown" });
                    } else {
                        await sendMessage(bot, uid, messageText);
                    }
                    successCount++;
                } catch (err) {
                    console.error(`❌ Failed to send to ${uid}:`, err.message);
                    failCount++;
                    await deleteUser(uid);
                }
            }

            await bot.sendMessage(
                chatId,
                `✅ Broadcast complete!\n\n📤 Sent to: ${successCount} users\n⚠️ Failed: ${failCount} users`
            );
        } catch (err) {
            console.error("🔥 Error broadcasting message:", err);
            await bot.sendMessage(chatId, "❌ An error occurred while broadcasting.");
        }

        delete pendingMessages[userId]; // cleanup
    }
};
