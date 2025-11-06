const { sendMessage } = require("../utilities/messages");
const admin = require("../utilities/firebase");
const {deleteUser, isUserAdmin} = require("../utilities/database");

module.exports = (bot, app) => {

    const pendingAnnouncements = {}; // Track admin announcement states

    // 🟢 Step 1: Start announcement process
    bot.onText(/\/send_announcement/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Check if user is admin
        const isAdmin = isUserAdmin(chatId)

        if (!isAdmin) {
            return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
        }

        pendingAnnouncements[userId] = true;
        await bot.sendMessage(
            chatId,
            "📢 Please type the announcement message you'd like to send to all users:"
        );
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const state = pendingMessages[userId];

        // Ignore if not in message flow or is a command
        if (!state || (msg.text && msg.text.startsWith("/"))) return;

        // ✅ Step 1: Get message text
        if (state.step === "awaiting_message" && msg.text) {
            const announcementText = msg.text;
            state.message = `📢 *Announcement*\n${announcementText}`;
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

            try{
                // Save announcement in DB
                const newAnnouncement = {
                    message: announcementText,
                    from: msg.from.username || msg.from.first_name || "Admin",
                    timestamp: Date.now(),
                };

                await db.ref("announcements").push(newAnnouncement);

                await bot.sendMessage(chatId, "✅ Announcement saved successfully.\n📨 Sending to all users...");
            }catch (e) {
                console.error(e);
            }
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

            bot.sendMessage(
                chatId,
                `✅ Announcement sent to ${successCount} users.\n❌ Failed to send to ${failCount} users.`
            );
        } catch (err) {
            console.error("🔥 Error broadcasting message:", err);
            await bot.sendMessage(chatId, "❌ An error occurred while broadcasting.");
        }

        delete pendingMessages[userId]; // cleanup
    }

    // 🟣 Step 3: Let users view recent announcements
    bot.onText(/\/announcements/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const snapshot = await admin
                .database()
                .ref("announcements")
                .orderByChild("timestamp")
                .limitToLast(10)
                .once("value");

            const announcements = snapshot.val();

            if (!announcements) {
                return bot.sendMessage(chatId, "⚠️ No announcements found.");
            }

            let announcementsText = "📢 *Latest Announcements:*\n\n";
            const keys = Object.keys(announcements).reverse();

            for (const key of keys) {
                const ann = announcements[key];
                const date = new Date(ann.timestamp);
                const formattedDate = date.toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });

                announcementsText += `📅 *${formattedDate}*\n👤 From: *${ann.from || "Admin"}*\n${ann.message}\n\n`;
            }

            await sendMessage(bot, chatId, announcementsText, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("❌ Error fetching announcements:", error);
            bot.sendMessage(chatId, "❌ Could not retrieve announcements. Try again later.");
        }
    });
};
