const admin = require("../utilities/firebase");
const {isUserAdmin} = require("../utilities/database");

module.exports = (bot, app) => {
    const db = admin.database();

    // Store user states temporarily
    app.userStates = app.userStates || {};
    app.userTempData = app.userTempData || {};

    // 📘 View FAQs
    bot.onText(/\/faq/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const snapshot = await db.ref("faqs").once("value");
            const faqs = snapshot.val();

            if (!faqs) {
                return bot.sendMessage(chatId, "❓ No FAQs available at the moment.");
            }

            let faqMessage = "❓ *Frequently Asked Questions*\n\n";

            Object.values(faqs).forEach((item, index) => {
                faqMessage += `*Q${index + 1}:* ${item.question}\n`;
                faqMessage += `*A:* ${item.answer}\n\n`;
            });

            bot.sendMessage(chatId, faqMessage, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Error fetching FAQs:", error);
            bot.sendMessage(chatId, "❌ Failed to load FAQs. Please try again later.");
        }
    });

    // ✏️ Add FAQ (Admin only)
    bot.onText(/\/add_faq/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();

        const isAdmin = await isUserAdmin(userId);

        if (!isAdmin) {
            return bot.sendMessage(chatId, "🚫 You are not authorized to use this command.");
        }

        await bot.sendMessage(chatId, "📝 Enter the FAQ question:");
        app.userStates[chatId] = "awaiting_faq_question";
    });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = msg.from.id.toString();

        if (!app.userStates[chatId]) return;

        switch (app.userStates[chatId]) {
            case "awaiting_faq_question":
                app.userTempData[chatId] = { question: text };
                app.userStates[chatId] = "awaiting_faq_answer";
                await bot.sendMessage(chatId, "💬 Great! Now enter the answer:");
                break;

            case "awaiting_faq_answer":
                const { question } = app.userTempData[chatId];
                const answer = text;

                try {
                    const newFaqRef = db.ref("faqs").push();
                    await newFaqRef.set({ question, answer });

                    await bot.sendMessage(chatId, "✅ FAQ added successfully!");
                } catch (err) {
                    console.error("Error saving FAQ:", err);
                    await bot.sendMessage(chatId, "⚠️ Failed to save FAQ. Try again later.");
                }

                delete app.userStates[chatId];
                delete app.userTempData[chatId];
                break;
        }
    });
};
