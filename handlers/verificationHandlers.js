const admin = require("../utilities/firebase");
const { validateMatricNumber, validateLevel } = require("../utilities/verification");
const { isUserAdmin, deleteUser } = require("../utilities/database");

// ✅ Temporary in-memory store (instead of app.locals)
const tempStore = {
    invalidUsers: [],
};

module.exports = (bot, app) => {
    // ✅ Verify a single user
    bot.onText(/\/verify_user\s+(\d+)/, async (msg, match) => {
        const callerChatId = msg.chat.id;
        const callerId = msg.from.id.toString();
        const targetUserId = match[1].toString();

        try {
            const isAdmin = await isUserAdmin(callerId);
            if (!isAdmin)
                return bot.sendMessage(callerChatId, "🚫 You are not authorized to run this command.");
        } catch (err) {
            console.error("Error checking admin:", err);
            return bot.sendMessage(callerChatId, "❌ Unable to verify admin status. Try again later.");
        }

        try {
            const userRef = admin.database().ref(`users/${targetUserId}`);
            const snap = await userRef.once("value");

            if (!snap.exists())
                return bot.sendMessage(callerChatId, `⚠️ No user found with Telegram ID ${targetUserId}.`);

            const user = snap.val();
            const matric = user.matric_number || "";
            const level = user.level;
            const problems = [];

            if (!matric) problems.push("Missing matric number");
            else if (!validateMatricNumber(matric))
                problems.push(`Invalid matric format: "${matric}" (expected e.g. 23CK033439)`);

            if (!level) problems.push("Missing level");
            else if (!validateLevel(level))
                problems.push(`Invalid level: "${level}" (must be 100, 200, 300, 400, 500)`);

            if (problems.length === 0) {
                return bot.sendMessage(
                    callerChatId,
                    `✅ User ${targetUserId} is valid.\n\nName: ${user.first_name || "N/A"} ${user.last_name || ""}\nMatric: ${matric}\nLevel: ${level}`
                );
            }

            await bot.sendMessage(
                callerChatId,
                `⚠️ Issues for user ${targetUserId}:\n- ${problems.join("\n- ")}`
            );

            // Try DMing user
            try {
                await bot.sendMessage(
                    targetUserId,
                    `Hello ${user.first_name || ""},\n\nAn admin checked your account and found:\n- ${problems.join(
                        "\n- "
                    )}\n\nPlease update your info using /start.`
                );
            } catch (err) {
                console.warn(`Could not DM user ${targetUserId}:`, err.message);
                bot.sendMessage(
                    callerChatId,
                    `⚠️ Could not DM user ${targetUserId}. They may have blocked the bot or their chat ID is invalid.`
                );
            }
        } catch (err) {
            console.error("Error verifying user:", err);
            bot.sendMessage(callerChatId, "❌ Error verifying user. Try again later.");
        }
    });

    // ✅ Verify all users
    bot.onText(/\/verify_users$/, async (msg) => {
        const callerChatId = msg.chat.id;
        const callerId = msg.from.id.toString();

        try {
            const isAdmin = await isUserAdmin(callerId);
            if (!isAdmin)
                return bot.sendMessage(callerChatId, "🚫 You are not authorized to run this command.");
        } catch (err) {
            console.error("Error checking admin:", err);
            return bot.sendMessage(callerChatId, "❌ Unable to verify admin status. Try again later.");
        }

        try {
            const usersSnap = await admin.database().ref("users").once("value");
            if (!usersSnap.exists()) return bot.sendMessage(callerChatId, "⚠️ No users in database.");

            const users = usersSnap.val();
            const invalidUsers = [];

            for (const uid of Object.keys(users)) {
                const u = users[uid];
                const matric = u.matric_number || "";
                const level = u.level;

                const matricOk = validateMatricNumber(matric);
                const levelOk = validateLevel(level);

                if (!matricOk || !levelOk) {
                    invalidUsers.push({
                        uid,
                        username: u.username || "",
                        name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "N/A",
                        matric: matric || "N/A",
                        level: level || "N/A",
                        issues: [
                            !matricOk ? "matric invalid/missing" : null,
                            !levelOk ? "level invalid/missing" : null,
                        ].filter(Boolean),
                    });
                }
            }

            if (invalidUsers.length === 0) {
                return bot.sendMessage(callerChatId, "✅ All users are valid!");
            }

            let message = `⚠️ Found ${invalidUsers.length} user(s) with problems:\n\n`;
            for (const [i, user] of invalidUsers.entries()) {
                message += `${i + 1}. ${user.name} (ID: ${user.uid})\n   Matric: ${user.matric}\n   Level: ${user.level}\n   Issues: ${user.issues.join(", ")}\n\n`;
                if (message.length > 3500) {
                    await bot.sendMessage(callerChatId, message);
                    message = "";
                }
            }

            if (message.trim()) await bot.sendMessage(callerChatId, message);

            const inlineKeyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "⚠️ Send Warnings", callback_data: "warn_invalid_users" },
                            { text: "🗑 Purge Users", callback_data: "purge_invalid_users" },
                        ],
                    ],
                },
            };

            await bot.sendMessage(
                callerChatId,
                "What would you like to do with the invalid users?",
                inlineKeyboard
            );

            tempStore.invalidUsers = invalidUsers;
        } catch (err) {
            console.error("Error in /verify_users:", err);
            bot.sendMessage(callerChatId, "❌ Error verifying users. Try again later.");
        }
    });

    // ⚠️ Handle warning or purge actions
    bot.on("callback_query", async (query) => {
        const action = query.data;
        const chatId = query.message.chat.id;
        const invalidUsers = tempStore.invalidUsers || [];

        if (invalidUsers.length === 0)
            return bot.sendMessage(chatId, "⚠️ No invalid users stored. Run /verify_users again.");

        if (action === "warn_invalid_users") {
            for (const user of invalidUsers) {
                try {
                    await bot.sendMessage(
                        user.uid,
                        `⚠️ Hello ${user.name},\n\nYour account has the following issues:\n- ${user.issues.join(
                            "\n- "
                        )}\n\nPlease correct them using /start.`
                    );
                } catch (err) {
                    console.warn(`Could not warn user ${user.uid}:`, err.message);
                }
            }

            await bot.sendMessage(chatId, `✅ Sent warnings to ${invalidUsers.length} user(s).`);
        }

        if (action === "purge_invalid_users") {
            const ref = admin.database().ref("users");
            const purged = [];

            for (const user of invalidUsers) {
                try {
                    // await deleteUser(user.uid);
                    purged.push(user.uid);
                } catch (err) {
                    console.error(`Error purging ${user.uid}:`, err);
                }
            }

            await admin.database().ref("logs/purges").push({
                timestamp: Date.now(),
                adminId: chatId,
                purgedUsers: purged,
            });

            await bot.sendMessage(chatId, `🗑 Purged ${purged.length} invalid user(s) from database.`);
        }
    });

    // ✅ Direct manual admin commands
    bot.onText(/\/warn_user\s+(\d+)/, async (msg, match) => {
        const callerId = msg.from.id.toString();
        const chatId = msg.chat.id;
        const targetUserId = match[1].toString();

        const isAdmin = await isUserAdmin(callerId);
        if (!isAdmin) return bot.sendMessage(chatId, "🚫 You are not authorized.");

        try {
            const userSnap = await admin.database().ref(`users/${targetUserId}`).once("value");
            if (!userSnap.exists())
                return bot.sendMessage(chatId, "⚠️ User not found in database.");

            const user = userSnap.val();
            await bot.sendMessage(
                targetUserId,
                `⚠️ Hello ${user.first_name || ""}, an admin has warned you due to invalid or missing information.\nPlease update your data using /start.`
            );

            await bot.sendMessage(chatId, `✅ Warning sent to ${user.first_name || "User"} (${targetUserId}).`);
        } catch (err) {
            console.error("Error sending warning:", err);
            bot.sendMessage(chatId, "❌ Failed to warn user.");
        }
    });

    bot.onText(/\/purge_user\s+(\d+)/, async (msg, match) => {
        const callerId = msg.from.id.toString();
        const chatId = msg.chat.id;
        const targetUserId = match[1].toString();

        const isAdmin = await isUserAdmin(callerId);
        if (!isAdmin) return bot.sendMessage(chatId, "🚫 You are not authorized.");

        try {
            // await deleteUser(targetUserId);

            await admin.database().ref("logs/purges").push({
                timestamp: Date.now(),
                adminId: chatId,
                purgedUsers: [targetUserId],
            });

            await bot.sendMessage(chatId, `🗑 User ${targetUserId} has been removed from the database.`);
        } catch (err) {
            console.error("Error purging user:", err);
            bot.sendMessage(chatId, "❌ Failed to purge user.");
        }
    });
};
