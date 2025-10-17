const admin = require("../utilities/firebase");
const path = require("path");
const fs = require("fs");

module.exports = (bot, app) => {
    const db = admin.database();
    const addEventSessions = {}; // 🔹 Track user upload sessions

    // ============================================================
    // 📋 VIEW LOST & FOUND ITEMS
    // ============================================================
    const handleViewLostAndFound = async (chatId) => {
        try {
            const snapshot = await db.ref("lost_and_found").once("value");
            const items = snapshot.val();

            if (!items) {
                return bot.sendMessage(
                    chatId,
                    "📭 No lost and found items available at the moment."
                );
            }

            let message = "🔍 *Lost and Found Items:*\n\n";
            let itemCount = 0;

            Object.values(items).forEach((item) => {
                itemCount++;
                message += `*Item ${itemCount}:*\n📝 Description: ${item.description}\n\n`;
            });

            bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Error fetching lost and found items:", error);
            bot.sendMessage(
                chatId,
                "❌ Couldn't load lost and found items. Please try again."
            );
        }
    };

    // Commands to view items
    bot.onText(/\/view_lost_and_found/, (msg) =>
        handleViewLostAndFound(msg.chat.id)
    );
    bot.onText(/\/lost_and_found/, (msg) =>
        handleViewLostAndFound(msg.chat.id)
    );

    // ============================================================
    // 📨 SUBMIT LOST OR FOUND ITEM
    // ============================================================
    bot.onText(/\/submit_lost_and_found/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        addEventSessions[userId] = { step: "awaiting_item_picture" };

        bot.sendMessage(chatId, "📸 Please send a picture of the lost or found item.");
    });

    // ============================================================
    // 📸 HANDLE PICTURE UPLOAD
    // ============================================================
    bot.on("photo", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const session = addEventSessions[userId];

        if (!session || session.step !== "awaiting_item_picture") return;

        // Get the largest version of the image
        const photo = msg.photo[msg.photo.length - 1].file_id;
        session.itemPicture = photo;
        session.step = "awaiting_item_description";

        bot.sendMessage(chatId, "📝 Please provide a description of the item.");
    });

    // ============================================================
    // ✏️ HANDLE ITEM DESCRIPTION
    // ============================================================
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;
        const session = addEventSessions[userId];

        // Only continue if user is in description phase
        if (!session || session.step !== "awaiting_item_description") return;
        if (!text) return bot.sendMessage(chatId, "⚠️ Please provide a valid description.");

        try {
            session.itemDescription = text;

            // Save item to Firebase
            const newItem = {
                userId,
                picture: session.itemPicture,
                description: session.itemDescription,
                timestamp: Date.now(),
            };

            await db.ref("lost_and_found").push(newItem);

            bot.sendMessage(chatId, "✅ Your lost/found item has been submitted!");

            // Notify admins
            const adminsSnapshot = await db.ref("admins").once("value");
            const admins = adminsSnapshot.val();

            if (admins) {
                const itemMessage = `📢 *New Lost/Found Item Submitted:*\n\n📝 Description: ${newItem.description}\n\n📸 Picture: ${
                    newItem.picture
                        ? `[Click to View](https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${newItem.picture})`
                        : "No picture provided"
                }\n👤 Submitted by User ID: ${userId}`;

                for (const adminId of Object.keys(admins)) {
                    bot.sendMessage(adminId, itemMessage, { parse_mode: "Markdown" });
                }
            }

            delete addEventSessions[userId];
        } catch (error) {
            console.error("Error saving lost/found item:", error);
            bot.sendMessage(chatId, "❌ Failed to submit item. Please try again later.");
        }
    });
};
