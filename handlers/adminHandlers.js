const {sendMessage} = require("../utilities/messages");
const {getUserByMatricNumber, addAdminByMatricNumber} = require("../utilities/database");
const admin = require("../utilities/firebase");
const {escapeMarkdown} = require("../utilities/methods"); // assuming you have one

module.exports = (bot, app) => {

    // 🟢 Add an admin by matric number
    bot.onText(/\/add_admin (\S+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const matricNumber = match[1]?.trim();

        if (!matricNumber) {
            return bot.sendMessage(chatId, "⚠️ Please provide a matric number. Usage: /add_admin MATRIC_NUMBER");
        }

        try {
            const db = admin.database();
            const userId = msg.from.id.toString();

            // Only allow current admins
            const adminSnapshot = await db.ref("admins").child(userId).once("value");
            if (!adminSnapshot.exists()) {
                return bot.sendMessage(chatId, "⚠️ You are not authorized to add admins.");
            }

            // Add admin by matric number
            const addedUser = await addAdminByMatricNumber(matricNumber);

            if (!addedUser) {
                return bot.sendMessage(chatId, "⚠️ No user found with this matric number.");
            }

            // Notify current admin
            await bot.sendMessage(
                chatId,
                `✅ Admin added successfully:\n\n👤 Name: ${addedUser.first_name} ${addedUser.last_name}\n🎓 Matric: ${addedUser.matric_number}`
            );

            // Notify the newly added admin
            if (addedUser.chatId) {
                await bot.sendMessage(
                    addedUser.chatId,
                    `🎉 Congratulations! You have been made an admin. You can now use admin commands to manage the bot.`
                );
            }

        } catch (error) {
            console.error("❌ Error adding admin:", error);
            bot.sendMessage(chatId, "❌ An error occurred while adding the admin.");
        }
    });

// 🧹 Clear bot chat logs (owner only)
    bot.onText(/\/clear_chats/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Restrict access
        if (userId !== 6311922657) {
            return bot.sendMessage(chatId, "❌ You are not authorized to run this command.");
        }

        try {
            const ref = admin.database().ref("botChats");
            const snapshot = await ref.once("value");

            if (!snapshot.exists()) {
                return bot.sendMessage(chatId, "✅ No messages found to clean up.");
            }

            const deletions = [];

            snapshot.forEach((child) => {
                const data = child.val();
                const key = child.key;

                const deleteTask = (async () => {
                    try {
                        // Validate chat and message IDs
                        if (!data.chat_id || !data.message_id) {
                            console.warn(`⚠️ Skipping invalid entry: ${key}`);
                            await ref.child(key).remove();
                            return;
                        }

                        await bot.deleteMessage(data.chat_id, data.message_id);
                        await ref.child(key).remove();
                        console.log(`✅ Deleted message ${data.message_id} from chat ${data.chat_id}`);
                    } catch (err) {
                        if (err.response && err.response.body) {
                            console.error(
                                `❌ Telegram Error (${data.chat_id}, ${data.message_id}):`,
                                err.response.body.description
                            );
                        } else {
                            console.error("❌ Unknown Error Deleting Message:", err);
                        }

                        // If message/chat not found — remove it anyway to keep DB clean
                        if (
                            err.response?.body?.description?.includes("chat not found") ||
                            err.response?.body?.description?.includes("message to delete not found")
                        ) {
                            await ref.child(key).remove();
                            console.log(`🧹 Cleaned invalid record for chat ${data.chat_id}`);
                        }
                    }
                })();

                deletions.push(deleteTask);
            });

            await Promise.all(deletions);
            bot.sendMessage(chatId, "✅ Finished cleaning up!");
        } catch (error) {
            console.error("❌ Error clearing chats:", error);
            bot.sendMessage(chatId, "❌ An error occurred while cleaning up chats.");
        }
    });


    // 🗑️ Remove user by matric number
    bot.onText(/\/remove_user (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const matricNumber = match[1]?.trim();

        if (!matricNumber) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/remove_user MATRIC_NUMBER`", {parse_mode: "Markdown"});
        }

        try {
            const db = admin.database();
            const usersRef = db.ref("users");

            const snapshot = await usersRef
                .orderByChild("matric_number")
                .equalTo(matricNumber)
                .once("value");

            const users = snapshot.val();

            if (users) {
                const userId = Object.keys(users)[0];
                await usersRef.child(userId).remove();

                await bot.sendMessage(
                    chatId,
                    `✅ Successfully removed user with matric number *${matricNumber}*`,
                    {parse_mode: "Markdown"}
                );
                console.log(`🗑️ Removed user ${userId} with matric number ${matricNumber}`);
            } else {
                bot.sendMessage(chatId, `⚠️ No user found with matric number *${matricNumber}*`, {
                    parse_mode: "Markdown",
                });
            }
        } catch (error) {
            console.error("❌ Error removing user:", error);
            bot.sendMessage(chatId, "❌ An error occurred while trying to remove the user.");
        }
    });

    // 🔍 Find a user by matric number
    bot.onText(/\/find (\S+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const matricNumber = match[1];

        await bot.sendMessage(chatId, "🔍 Searching for user...");

        try {
            const user = await getUserByMatricNumber(matricNumber);
            if (!user) return bot.sendMessage(chatId, `⚠️ No user found with matric number: ${matricNumber}`);

            const userData = Object.values(user)[0];
            const info = `
👤 *User Info*
*Name:* ${userData.first_name} ${userData.last_name}
*Username:* @${userData.username || "N/A"}
*Matric Number:* ${userData.matric_number}
*Level:* ${userData.level}
🕒 *Joined:* ${new Date(userData.joinedAt).toLocaleString()}
`;

            await bot.sendMessage(chatId, info, {parse_mode: "Markdown"});
        } catch (error) {
            console.error("Error finding user:", error);
            bot.sendMessage(chatId, "❌ Error fetching user details.");
        }
    });

    // 📊 View user analytics
    bot.onText(/\/users/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const usersRef = admin.database().ref("users");
            const snapshot = await usersRef.once("value");
            const users = snapshot.val();

            if (!users) return bot.sendMessage(chatId, "❌ No users found in the database.");

            const totalUsers = Object.keys(users).length;
            const levelStats = {};

            Object.values(users).forEach((user) => {
                const level = user.level || "Unknown";
                levelStats[level] = (levelStats[level] || 0) + 1;
            });

            let message = `📊 *User Analytics*\n👥 *Total Users:* ${totalUsers}\n\n🎓 *Levels Breakdown:*\n`;
            for (const level in levelStats) {
                message += `- ${level}: ${levelStats[level]}\n`;
            }

            await bot.sendMessage(chatId, message, {parse_mode: "Markdown"});
        } catch (error) {
            console.error("Error fetching users:", error);
            bot.sendMessage(chatId, "❌ An error occurred while fetching user analytics.");
        }
    });

    // 👥 View all registered users
    bot.onText(/\/view_users/, async (msg) => {
        const chatId = msg.chat.id;

        try {
            const usersRef = admin.database().ref("users");
            const snapshot = await usersRef.once("value");
            const users = snapshot.val();

            if (!users) return bot.sendMessage(chatId, "❌ No users found.");

            const MAX_LENGTH = 4000;
            let userListMessage = "*👥 List of Users:*\n\n";
            const batches = [];

            for (const userId of Object.keys(users)) {
                const user = users[userId];
                const info = `*🆔 ID:* \`${userId}\`
*👤 Name:* ${escapeMarkdown(`${user.first_name} ${user.last_name}`)}
*🏫 Matric:* \`${user.matric_number}\`
*🎓 Level:* \`${user.level}\`
*🗓 Joined:* \`${new Date(user.joinedAt).toLocaleString()}\`
*🖥 Username:* \`${user.username || "N/A"}\`
*🤖 Is Bot:* \`${user.is_bot ? "Yes" : "No"}\`\n\n`;

                if (userListMessage.length + info.length >= MAX_LENGTH) {
                    batches.push(userListMessage);
                    userListMessage = "";
                }

                userListMessage += info;
            }

            if (userListMessage.length > 0) batches.push(userListMessage);

            for (const batch of batches) {
                await sendMessage(bot, chatId, batch, {parse_mode: "MarkdownV2"});
            }
        } catch (error) {
            console.error("Error viewing users:", error);
            bot.sendMessage(chatId, "❌ Error fetching user list.");
        }
    });
};
