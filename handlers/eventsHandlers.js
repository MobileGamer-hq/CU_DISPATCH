const {sendMessage} = require("../utilities/messages");

module.exports = (bot, app) => {
    const events = [];
// Respond to /weekly_events command
    bot.onText(/\/weekly_events/, async (msg) => {
        const chatId = msg.chat.id;

        if (events.length === 0) {
            await bot.sendMessage(
                chatId,
                "⚠️ Events are still loading. Please try again in a few seconds."
            );
            return;
        }

        const weeklyEvents = getWeeklyEvents(events);

        if (weeklyEvents.length === 0) {
            await bot.sendMessage( chatId, "⚠️ No events found for this week.");
            return;
        }

        await bot.sendMessage( chatId, "🗓 Here are the events for this week:", {
            parse_mode: "Markdown",
        });

        for (const event of weeklyEvents) {
            const message = formatSingleEvent(event);
            await bot.sendMessage( chatId, message, {parse_mode: "Markdown"});
        }
    });

// Respond to /monthly_events command
    bot.onText(/\/monthly_events/, async (msg) => {
        const chatId = msg.chat.id;

        if (events.length === 0) {
            await bot.sendMessage(
                chatId,
                "⚠️ Events are still loading. Please try again in a few seconds."
            );
            return;
        }

        const monthlyEvents = getMonthlyEvents(events);

        if (monthlyEvents.length === 0) {
            await bot.sendMessage( chatId, "⚠️ No events found for this month.");
            return;
        }

        await bot.sendMessage(
            chatId,
            "Here are the upcoming events for this month:",
            {
                parse_mode: "Markdown",
            }
        );

        // Send each event one by one
        for (const event of monthlyEvents) {
            const message = formatSingleEvent(event);
            await sendMessage(bot, chatId, message, {parse_mode: "Markdown"});
        }
    });
};