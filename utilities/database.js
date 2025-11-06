// utilities/database.js
const admin = require("./firebase");
const {validateLevel, validateMatricNumber} = require("./verification"); // Import Firebase Admin SDK properly

// ========== USER FUNCTIONS ==========

// Get all user IDs
async function getUserIds() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("users").once("value");
        const users = snapshot.val();

        if (users) {
            const userIds = Object.keys(users);
            return userIds;
        } else {
            console.log("⚠️ No users found.");
            return [];
        }
    } catch (error) {
        console.error("❌ Error fetching user IDs:", error);
        return [];
    }
}

// Get a specific user by userId
async function getUser(userId) {
    try {
        const db = admin.database();
        const snapshot = await db.ref(`users/${userId}`).once("value");
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        return null;
    }
}

// Add a single user
async function addUser(userId, userInfo = {}) {
    try {
        if(validateLevel(userInfo.level) && validateMatricNumber(userInfo.matric_number)) {
            const db = admin.database();
            await db.ref(`users/${userId}`).set({
                ...userInfo,
                joinedAt: new Date().toISOString(),
            });
            console.log(`✅ User ${userId} added successfully.`);
            return true;
        }else{
            console.log("User credentials not accurate");
            return false;
        }
    } catch (error) {
        console.error(`❌ Error adding user ${userId}:`, error);
        return false;
    }
}

// Add multiple users
async function addMultipleUsers(users = []) {
    const results = [];
    for (const user of users) {
        const { userId, ...info } = user;
        const success = await addUser(userId, info);
        results.push({ userId, success });
    }
    return results;
}

// Get all users
async function getAllUsers() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("users").once("value");
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error("❌ Error fetching all users:", error);
        return {};
    }
}

// Delete a user
async function deleteUser(userId) {
    try {
        const db = admin.database();
        // await db.ref(`users/${userId}`).remove();
        console.log(`✅ User ${userId} deleted successfully.`);
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        throw error;
    }
}

// ========== ADMIN FUNCTIONS ==========

async function isUserAdmin(userId) {
    try {
        const snapshot = await admin.database().ref(`admins/${userId}`).once("value");
        return snapshot.exists();
    } catch (error) {
        console.error("❌ Error checking admin status:", error);
        return false;
    }
}

async function addAdmin(userId) {
    try {
        const db = admin.database();
        await db.ref(`admins/${userId}`).set(true);
        console.log(`✅ Admin ${userId} added successfully.`);
    } catch (error) {
        console.error("❌ Error adding admin:", error);
        throw error;
    }
}

async function getAllAdmins() {
    try {
        const db = admin.database();
        const snapshot = await db.ref("admins").once("value");
        return snapshot.exists() ? snapshot.val() : {};
    } catch (error) {
        console.error("❌ Error fetching all admins:", error);
        return {};
    }
}

async function removeAdmin(userId) {
    try {
        const db = admin.database();
        await db.ref(`admins/${userId}`).remove();
        console.log(`✅ Admin ${userId} removed successfully.`);
    } catch (error) {
        console.error("❌ Error removing admin:", error);
        throw error;
    }
}

// Get user by matric number
async function getUserByMatricNumber(matricNumber) {
    try {
        const db = admin.database();
        const snapshot = await db
            .ref("users")
            .orderByChild("matric_number")
            .equalTo(matricNumber)
            .once("value");

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("⚠️ No user found with that matric number.");
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching user by matric number:", error);
        return null;
    }
}

// Add admin by matric number
async function addAdminByMatricNumber(matricNumber) {
    try {
        const db = admin.database();
        const snapshot = await db
            .ref("users")
            .orderByChild("matric_number")
            .equalTo(matricNumber)
            .once("value");

        if (!snapshot.exists()) return null;

        const userData = snapshot.val();
        const userId = Object.keys(userData)[0];

        await db.ref(`admins/${userId}`).set(true);
        console.log(`✅ Admin added by matric number: ${matricNumber}`);

        return userData[userId];
    } catch (error) {
        console.error("❌ Error adding admin by matric number:", error);
        return null;
    }
}

// Send a message to all admins
async function sendToAllAdmins(message, chatId, bot) {
    try {
        const db = admin.database();
        const snapshot = await db.ref("admins").once("value");
        const admins = snapshot.exists() ? Object.keys(snapshot.val()) : [];

        if (admins.length === 0) {
            console.log("⚠️ No admins to send to.");
            await bot.sendMessage(chatId, "No admins found.");
            return;
        }

        for (const adminId of admins) {
            try {
                await bot.sendMessage(adminId, message);
            } catch (error) {
                console.error(`⚠️ Failed to send message to admin ${adminId}:`, error.message);
            }
        }

        await bot.sendMessage(chatId, "✅ Message sent to all admins!");
    } catch (error) {
        console.error("❌ Error sending message to all admins:", error);
    }
}

// ========== EXPORTS ==========
module.exports = {
    getUserIds,
    getUser,
    getAllUsers,
    addUser,
    addMultipleUsers,
    deleteUser,

    isUserAdmin,
    addAdmin,
    getAllAdmins,
    removeAdmin,
    sendToAllAdmins,

    getUserByMatricNumber,
    addAdminByMatricNumber,
};
