// jobs/dailyMessages.js
const cron = require("node-cron");
const admin = require("../utilities/firebase");
const {
    morningMessages,
    midDayMessages,
    eveningMessages,
} = require("../data/messages");

module.exports = function (bot, appInstance) {
    // Send random message
    function sendRandomMessage(chatId, list) {
        const randomIndex = Math.floor(Math.random() * list.length);
        const message = list[randomIndex];
        bot.sendMessage(chatId, message);
    }

    // Fetch users from Firebase
    async function getUsersFromFirebase() {
        const usersRef = admin.database().ref("users");
        const snapshot = await usersRef.once("value");
        return snapshot.val();
    }

    // Morning message (7AM)
    cron.schedule("0 7 * * *", async () => {
        console.log("🌅 Sending morning messages...");
        const users = await getUsersFromFirebase();
        if (users) Object.keys(users).forEach(id => sendRandomMessage(id, morningMessages));
    });

    // Midday message (12PM)
    cron.schedule("0 12 * * *", async () => {
        console.log("☀️ Sending midday messages...");
        const users = await getUsersFromFirebase();
        if (users) Object.keys(users).forEach(id => sendRandomMessage(id, midDayMessages));
    });

    // Evening message (8PM)
    cron.schedule("0 20 * * *", async () => {
        console.log("🌇 Sending evening messages...");
        const users = await getUsersFromFirebase();
        if (users) Object.keys(users).forEach(id => sendRandomMessage(id, eveningMessages));
    });


};
