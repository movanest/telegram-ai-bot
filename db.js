const { MongoClient } = require('mongodb');
const config = require('./config');

const client = new MongoClient(config.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
});

let db = null;

async function connectDB() {
    if (db) return db;

    try {
        await client.connect();
        db = client.db(config.MONGO_DB);
        console.log(`[MongoDB] Connected to ${config.MONGO_DB}`);

        // Create useful indexes (improves performance & prevents duplicates)
        const users = db.collection('users');
        await users.createIndex({ userId: 1 }, { unique: true });
        await users.createIndex({ telegramUsername: 1 }, { sparse: true });

        const history = db.collection('history');
        await history.createIndex({ userId: 1, timestamp: -1 });

        return db;
    } catch (err) {
        console.error('[MongoDB] Connection failed:', err.message);
        throw err;
    }
}

/**
 * Get or create user document
 * @param {Object} telegramUser - ctx.from object
 * @returns {Promise<Object>} user document
 */
async function getOrCreateUser(telegramUser) {
    const users = (await connectDB()).collection('users');
    const userId = telegramUser.id;

    let user = await users.findOne({ userId });

    if (!user) {
        user = {
            userId,
            telegramUsername: telegramUser.username ? `@${telegramUser.username}` : null,
            firstName: telegramUser.first_name || 'Unknown',
            lastName: telegramUser.last_name || null,
            age: null,
            country: null,
            profileAsked: false,
            nameLocked: false,          // ← prevents future auto name changes
            createdAt: new Date(),
            lastSeen: new Date(),
        };

        await users.insertOne(user);
        console.log(`[DB] New user created: ${userId} (${user.firstName})`);
    } else {
        // Update last seen time
        await users.updateOne(
            { userId },
            { $set: { lastSeen: new Date() } }
        );
    }

    return user;
}

/**
 * Update user fields (age, name, country, etc.)
 * @param {number} userId
 * @param {Object} updates
 */
async function updateUserProfile(userId, updates) {
    const users = (await connectDB()).collection('users');
    await users.updateOne(
        { userId },
        { $set: { ...updates, lastSeen: new Date() } }
    );
    console.log(`[DB] Updated profile for ${userId}:`, Object.keys(updates));
}

/**
 * Save a message (user or bot) to history
 * @param {number} userId
 * @param {string} text
 * @param {boolean} fromUser
 */
async function saveMessage(userId, text, fromUser = true) {
    const history = (await connectDB()).collection('history');
    await history.insertOne({
        userId,
        text: text.substring(0, 2000), // prevent very long messages from breaking DB
        fromUser,
        timestamp: new Date(),
    });
}

/**
 * Get recent conversation history (oldest to newest)
 * @param {number} userId
 * @param {number} limit - how many messages max
 * @returns {Promise<Array>} messages sorted oldest → newest
 */
async function getRecentHistory(userId, limit = 10) {
    const history = (await connectDB()).collection('history');
    const docs = await history
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

    return docs.reverse(); // return in chronological order
}

module.exports = {
    connectDB,
    getOrCreateUser,
    updateUserProfile,
    saveMessage,
    getRecentHistory,
};
