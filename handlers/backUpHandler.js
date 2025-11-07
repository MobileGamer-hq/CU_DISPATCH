const admin = require("../utilities/firebase");
const { createCollection, uploadData, getData} = require("../utilities/backupDatabase");

module.exports = (bot, app) => {
    bot.onText(/\/backup/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Restrict access
        if (userId !== 6311922657) {
            return bot.sendMessage(chatId, "❌ You are not authorized to run this command.");
        }

        try {
            bot.sendMessage(chatId, "🚀 Starting Backup...");

            // 🔹 Get entire Firebase Realtime Database
            const ref = admin.database().ref();
            const snapshot = await ref.once("value");

            if (!snapshot.exists()) {
                return bot.sendMessage(chatId, "✅ No data found to back up.");
            }

            const database = snapshot.val();
            const collections = Object.keys(database);
            console.log(collections)

            // 🔹 For each top-level key (like users, botChats, etc.)
            for (const collection of collections) {
                const data = database[collection];

                // Create the collection in your JSON DB
                const response = await createCollection(collection, {}); // initialize it (optional)
                bot.sendMessage(chatId, `📁 Backing up collection: ${collection}`);

                if(response !== null){
                    // 🔹 Upload each doc in that collection
                    for (const [docId, docData] of Object.entries(data)) {
                        await uploadData(collection, docId, docData);
                    }
                }
            }

            bot.sendMessage(chatId, "✅ Backup completed successfully!");
        } catch (err) {
            console.error("Backup error:", err);
            bot.sendMessage(chatId, "❌ An error occurred during backup.");
        }
    });

    // 🔹 Get total users command
    bot.onText(/\/get_backup/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        if (userId !== 6311922657) {
            return bot.sendMessage(chatId, "❌ You are not authorized to run this command.");
        }

        try {
            bot.sendMessage(chatId, "📦 Fetching user data...");

            // 🔸 Fetch from your backup API
            const response = await getData("users");
            if (!response || !response.data) {
                return bot.sendMessage(chatId, "⚠️ No user data found.");
            }

            // 🔸 Count the number of user documents
            const userCount = Object.keys(response.data).length;

            bot.sendMessage(
                chatId,
                `👥 Total number of users backed up: *${userCount}*`,
                { parse_mode: "Markdown" }
            );
        } catch (err) {
            console.error("Error fetching user count:", err);
            bot.sendMessage(chatId, "❌ Failed to fetch user data.");
        }
    });
};
