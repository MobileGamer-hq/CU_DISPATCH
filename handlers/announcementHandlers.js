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

        if (!isAdmin.exists()) {
            return bot.sendMessage(chatId, "❌ You are not authorized to use this command.");
        }

        pendingAnnouncements[userId] = true;
        await bot.sendMessage(
            chatId,
            "📢 Please type the announcement message you'd like to send to all users:"
        );
    });

    // Step 2: Listen for admin reply after command
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        // Ignore commands or unrelated messages
        if (msg.text && (!pendingAnnouncements[userId] || msg.text.startsWith("/")))
            return;

        const announcementText = msg.text;
        const db = admin.database();

        try {
            // Save announcement in DB
            const newAnnouncement = {
                message: announcementText,
                from: msg.from.username || msg.from.first_name || "Admin",
                timestamp: Date.now(),
            };

            await db.ref("announcements").push(newAnnouncement);

            await bot.sendMessage(chatId, "✅ Announcement saved successfully.\n📨 Sending to all users...");

            // Fetch all users
            const usersSnapshot = await db.ref("users").once("value");
            const users = usersSnapshot.val();

            if (!users) {
                bot.sendMessage(chatId, "⚠️ No users found in the database.");
                delete pendingAnnouncements[userId];
                return;
            }

            const userIds = Object.keys(users);
            let successCount = 0;
            let failCount = 0;

            const formattedAnnouncement =
                `📢 *Announcement from ${newAnnouncement.from}:*\n\n${newAnnouncement.message}`;

            // Send to all users
            for (const uid of userIds) {
                const user = users[uid];
                const recipientId = user.chatId || uid; // Use stored chatId or UID fallback

                if (recipientId) {
                    try {
                        await sendMessage(bot, recipientId, formattedAnnouncement, { parse_mode: "Markdown" });
                        successCount++;
                    } catch (err) {
                        console.error(`❌ Failed to send to ${user.first_name || "user"}:`, err.message);
                        failCount++;
                        await deleteUser(uid)
                    }
                }
            }

            bot.sendMessage(
                chatId,
                `✅ Announcement sent to ${successCount} users.\n❌ Failed to send to ${failCount} users.`
            );
        } catch (error) {
            console.error("🔥 Error sending announcement:", error);
            bot.sendMessage(chatId, "❌ An error occurred while sending announcements.");
        }

        delete pendingAnnouncements[userId]; // Reset admin state
    });

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
