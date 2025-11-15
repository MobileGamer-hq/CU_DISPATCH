const {
    morningMessages,
    midDayMessages,
    eveningMessages,
} = require("../data/messages");

module.exports = (bot, app) => {
    function sendRandomMessage(chatId, list) {
        const randomIndex = Math.floor(Math.random() * list.length);
        const message = list[randomIndex];
        bot.sendMessage(chatId, message);
    }

    bot.onText(/\/encourage/, async (msg) => {
        const chatId = msg.chat.id;

        const hour = new Date().getHours(); // 0 - 23

        let messageList;

        if (hour >= 5 && hour < 12) {
            messageList = morningMessages;   // Morning
        } else if (hour >= 12 && hour < 17) {
            messageList = midDayMessages;    // Afternoon
        } else {
            messageList = eveningMessages;   // Evening/Night
        }

        sendRandomMessage(chatId, messageList);
    });
};
