const cron = require("node-cron");
const admin = require("../utilities/firebase");

module.exports = function (bot, appInstance) {
    // Cleanup task (1AM)
    cron.schedule("0 1 * * *", async () => {
        console.log("🧹 Running cleanup...");
        const ref = admin.database().ref("botChats");
        const snapshot = await ref.once("value");

        const deletions = [];

        snapshot.forEach((child) => {
            const data = child.val();
            const key = child.key;

            const deleteTask = (async () => {
                try {
                    await bot.deleteMessage(data.chat_id, data.message_id);
                    await ref.child(key).remove();
                    console.log(`✅ Deleted ${data.message_id} from ${data.chat_id}`);
                } catch (err) {
                    console.error("❌ Failed to delete:", err);
                }
            })();

            deletions.push(deleteTask);
        });

        await Promise.all(deletions);
    });
};