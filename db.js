// db.js
const { MongoClient } = require('mongodb');
const config = require('./config');

const client = new MongoClient(config.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db = null;

async function connectDB() {
    if (db) return db;
    try {
        await client.connect();
        db = client.db(config.MONGO_DB);
        console.log(`[MongoDB] Connected to ${config.MONGO_DB}`);
        
        // Create indexes (good practice)
        await db.collection('users').createIndex({ userId: 1 }, { unique: true });
        await db.collection('history').createIndex({ userId: 1, timestamp: -1 });
        
        return db;
    } catch (err) {
        console.error('[MongoDB] Connection failed:', err);
        throw err;
    }
}

// Get or create user + update name/age/etc when provided
async function getOrCreateUser(user) {
    const users = (await connectDB()).collection('users');
    const userId = user.id;

    let userDoc = await users.findOne({ userId });

    if (!userDoc) {
        userDoc = {
            userId,
            telegramUsername: user.username ? `@${user.username}` : null,
            firstName: user.first_name || 'Unknown',
            lastName: user.last_name || null,
            createdAt: new Date(),
            lastSeen: new Date(),
            // We'll fill these later: age, country, etc.
        };
        await users.insertOne(userDoc);
        console.log(`[DB] New user saved: ${userId}`);
    } else {
        await users.updateOne(
            { userId },
            { $set: { lastSeen: new Date() } }
        );
    }

    return userDoc;
}

// Save message to history
async function saveMessage(userId, messageText, isFromUser = true) {
    const history = (await connectDB()).collection('history');
    await history.insertOne({
        userId,
        text: messageText,
        fromUser: isFromUser,
        timestamp: new Date(),
    });
}

// Get recent history (last 8–12 messages for context)
async function getRecentHistory(userId, limit = 10) {
    const history = (await connectDB()).collection('history');
    const docs = await history
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

    return docs.reverse(); // oldest → newest
}

// Update user profile (age, country, etc.)
async function updateUserProfile(userId, updates) {
    const users = (await connectDB()).collection('users');
    await users.updateOne(
        { userId },
        { $set: updates }
    );
}

module.exports = {
    connectDB,
    getOrCreateUser,
    saveMessage,
    getRecentHistory,
    updateUserProfile,
};
