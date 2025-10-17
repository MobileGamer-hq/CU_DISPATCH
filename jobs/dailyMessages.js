
// Function to send random message to a user
import {eveningMessages, midDayMessages, morningMessages} from "../data/messages";

function sendRandomMessage(chatId, messageList) {
    const randomIndex = Math.floor(Math.random() * messageList.length);
    const message = messageList[randomIndex];
    bot.sendMessage(chatId, message);
}

// Fetch users from Firebase
async function getUsersFromFirebase() {
    const usersRef = admin.database().ref("users");
    const usersSnapshot = await usersRef.once("value");
    return usersSnapshot.val(); // Return users object
}

cron.schedule("* * * * *", () => {
    console.log("🕐 Cron heartbeat: ", new Date().toString());
});

// Send random morning message at 8 AM
cron.schedule("0 7 * * *", async () => {
    console.log("Sending morning messages to all users...");
    const users = await getUsersFromFirebase();
    if (users) {
        Object.keys(users).forEach((userId) => {
            sendRandomMessage(userId, morningMessages);
        });
    }
});

// Send random midday message at 12 PM
cron.schedule("0 11 * * *", async () => {
    console.log("Sending midday messages to all users...");
    const users = await getUsersFromFirebase();
    if (users) {
        Object.keys(users).forEach((userId) => {
            sendRandomMessage(userId, midDayMessages);
        });
    }
});

// Send random evening message at 8 PM
cron.schedule("0 19 * * *", async () => {
    console.log("Sending evening messages to all users...");
    const users = await getUsersFromFirebase();
    if (users) {
        Object.keys(users).forEach((userId) => {
            sendRandomMessage(userId, eveningMessages);
        });
    }
});

cron.schedule("0 1 * * *", async () => {
    console.log("🧹 Running scheduled cleanup...");

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
                console.log(
                    `✅ Deleted message ${data.message_id} from chat ${data.chat_id}`
                );
            } catch (err) {
                console.error("❌ Failed to delete message:", err);
            }
        })();

        deletions.push(deleteTask);
    });

    await Promise.all(deletions);
});