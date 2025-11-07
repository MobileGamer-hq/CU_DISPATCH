const { sendMessage } = require("../utilities/messages");
const admin = require("../utilities/firebase");
const {deleteUser, isUserAdmin} = require("../utilities/database");

module.exports = (bot, app) => {

    const pendingAnnouncements = {}; // Track admin announcement states

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
