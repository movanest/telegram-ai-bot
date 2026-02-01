// telegram.js
const axios = require('axios');
const config = require('./config');
const {
    connectDB,
    getOrCreateUser,
    saveMessage,
    getRecentHistory,
    updateUserProfile,
} = require('./db');

const BOT_NAME = config.bot_name;
const OWNER_NAME = config.owner_name;
const CONTACT_NUMBER = config.contact_number;

const EMOJIS = "❤️😍😘💖🔥🥰💋💕💘💝💞💌💟💓💗💛💜💚🧡💐🌹🌷🌸🥲😢😭😔😞😣😩😫😖😤😡😠🤬🤯😱😨😰😥😓😪😵😵‍💫🤢🤮🤧😷🥵🥶😎🤩😏😈🤤😇🤗😳🤭🤫😜😝😛🤪😋🤤🙃☺️😊😄😃😁😆😅😂🤣🥳😇🤔🤠🤡🤥😺😸😹😻😼😽🙀😿😾💀☠️👻👽🤖🎃🤡👑💍💎💰💸🛍️🎁🎉🎊🏆🎯🎨🎭🎬🎤🎧🎼🎹🥁🎷🎺🎸🪕🎻🎯⚽🏀🏈⚾🥎🏐🏉🎱🏓🏸🥅🥌🎿⛷️🏂🪂🏋️‍♂️🏋️‍♀️🤼‍♂️🤼‍♀️🤸‍♂️🤸‍♀️⛹️‍♂️⛹️‍♀️🏌️‍♂️🏌️‍♀️🚴‍♂️🚴‍♀️🚵‍♂️🚵‍♀️🏇🧘‍♂️🧘‍♀️🏄‍♂️🏄‍♀️🏊‍♂️🏊‍♀️🤽‍♂️🤽‍♀️🤿🥽🥅🎯🎮🎲🃏🎴🀄🎰🎳🎱";

module.exports = async (ctx) => {
    try {
        await connectDB();

        const msg = ctx.message || ctx.callbackQuery?.message || {};
        if (!msg) return;

        let text = (msg.text || msg.caption || "").trim();
        if (!text) return;

        const from = ctx.from;
        const userId = from.id;
        const username = from.username ? `@${from.username}` : from.first_name || "Cutie";

        console.log(`[MSG] ${username} → ${text.slice(0, 80)}${text.length > 80 ? '...' : ''}`);

        // ── Load or create user ───────────────────────────────────────
        let user = await getOrCreateUser(from);

        // ── Profile detection & auto-ask logic ────────────────────────
        const lower = text.toLowerCase();
        let updated = false;

        // Name detection - more patterns
        if (lower.includes("name") || lower.includes("i'm") || lower.includes("call me") || lower.includes("am ") || /my.*name/i.test(lower)) {
            let nameMatch =
                text.match(/my name is\s+([a-zA-Z\s']+)/i) ||
                text.match(/i'm\s+([a-zA-Z\s']+)/i) ||
                text.match(/call me\s+([a-zA-Z\s']+)/i) ||
                text.match(/i am\s+([a-zA-Z\s']+)/i) ||
                text.match(/name['’]?s?\s+([a-zA-Z\s']+)/i) ||
                text.match(/^([a-zA-Z\s']+)(?:\s+is my name)?$/i);

            if (nameMatch && nameMatch[1]) {
                let possibleName = nameMatch[1].trim().split(/\s+/)[0].replace(/[^a-zA-Z']/g, '');
                if (possibleName.length >= 2 && possibleName.length <= 25) {
                    await updateUserProfile(userId, { firstName: possibleName });
                    updated = true;
                    console.log(`[DB] Name updated → ${possibleName}`);
                }
            }
        }

        // Age detection
        if (lower.includes("old") || lower.includes("age") || lower.includes("years")) {
            const ageMatch = text.match(/(\d{1,2})\s*(years? old|yo|years?|age)/i);
            if (ageMatch && ageMatch[1]) {
                await updateUserProfile(userId, { age: parseInt(ageMatch[1]) });
                updated = true;
            }
        }

        // Country (very basic – can be expanded)
        if (lower.includes("live") || lower.includes("from") || lower.includes("in ")) {
            if (lower.includes("sri lanka") || lower.includes("srilanka") || lower.includes("sl")) {
                await updateUserProfile(userId, { country: "Sri Lanka" });
                updated = true;
            }
        }

        if (updated) {
            user = await getOrCreateUser(from); // refresh
            await ctx.reply(`Got it love~ You're ${user.firstName} now 💕😘`);
        }

        // Special case: user is asking for their name but we don't know it
        if ((lower.includes("my name") || lower.includes("what's my name") || lower.includes("who am i")) &&
            (!user.firstName || user.firstName === 'Unknown')) {
            await updateUserProfile(userId, { profileAsked: true });
            return ctx.reply(
                `Awww sweetie~ 🥺 I don't know your cute name yet…\n` +
                `Tell me something like:\n` +
                `• "my name is Dnuzi"\n` +
                `• "i'm danu bro"\n` +
                `• "call me cutie" 😏\n\n` +
                `So… who are you, my darling? 💖`
            );
        }

        // Ask for name if profile still empty and it's early interaction
        if (!user.profileAsked && (!user.firstName || user.firstName === 'Unknown')) {
            await updateUserProfile(userId, { profileAsked: true });
            return ctx.reply(
                `Heyyy cutie~ 💕\n` +
                `What's your sweet name darling? 😘\n\n` +
                `(just say e.g. "my name is klum" or "I'm 17" or "I live in Sri Lanka")`
            );
        }

        // ── Save user message ─────────────────────────────────────────
        await saveMessage(userId, text, true);

        // ── Command handling ──────────────────────────────────────────
        if (text.startsWith('/') || text.startsWith('.')) {
            const cmd = text.slice(1).trim().split(/\s+/)[0]?.toLowerCase();

            if (cmd === 'start' || cmd === 'help') {
                return ctx.reply(
                    `✨ *Hi cutie* ~ I'm ${BOT_NAME} 💕\n\n` +
                    `Just talk to me normally and I'll reply with lots of love ${'❤️'.repeat(3)}\n\n` +
                    `Made with ♡ by ${OWNER_NAME}`,
                    { parse_mode: "Markdown" }
                );
            }

            if (config.ai_chat_enabled) {
                return ctx.reply(
                    "💌 *AI Chat mode is ON* ~ no commands right now baby\n\n" +
                    "Just send normal messages and I'll answer with love 😘",
                    { parse_mode: "Markdown" }
                );
            }
        }

        if (!config.ai_chat_enabled) return;

        // ── Image generation ──────────────────────────────────────────
        const imgKeys = ["draw", "image", "photo", "pic", "generate", "create", "make picture", "ai image"];
        const isImageReq = imgKeys.some(k => lower.includes(k));

        if (isImageReq) {
            let prompt = text;
            imgKeys.forEach(k => prompt = prompt.replace(new RegExp(k, "gi"), ""));
            prompt = prompt.trim();

            if (!prompt) {
                return ctx.reply("🖤 What should I draw for you, babe? 😏\nExample: draw a cute anime girl with pink hair");
            }

            const url = `https://www.movanest.xyz/v2/pollinations-image?prompt=${encodeURIComponent(prompt)}&model=flux&width=512&height=512`;

            await ctx.reply("🖌️ Painting your dream... hold on darling 💕");

            try {
                const response = await axios.get(url, { responseType: "arraybuffer" });
                await ctx.replyWithPhoto(
                    { source: Buffer.from(response.data) },
                    {
                        caption: `✨ *Here's your art baby* ~ \`${prompt}\``,
                        parse_mode: "Markdown",
                        reply_to_message_id: msg.message_id
                    }
                );
            } catch (e) {
                console.error("Image gen error:", e.message);
                await ctx.reply("💔 Couldn't create the image right now ~ try again later? 🥺");
            }
            return;
        }

        // ── Song / YouTube request ────────────────────────────────────
        const songKeys = ["song", "play", "music", "yt", "youtube", "listen"];
        const isSongReq = songKeys.some(k => lower.includes(k));

        if (isSongReq) {
            let query = text;
            songKeys.forEach(k => query = query.replace(new RegExp(k, "gi"), ""));
            query = query.trim();

            if (!query) return ctx.reply("🎶 What song do you want tonight, love?~");

            await ctx.reply("🎧 Finding the sexiest track for you… 💋");

            try {
                const yts = (await import("yt-search")).default;
                const search = await yts(query);
                if (!search?.videos?.length) throw new Error("No video found");

                const video = search.videos[0];
                const dlApi = `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(video.url)}&format=audio`;
                const { data: json } = await axios.get(dlApi);

                if (!json?.status || !json?.results?.recommended?.dlurl) {
                    throw new Error("No download url");
                }

                await ctx.replyWithAudio(json.results.recommended.dlurl, {
                    title: json.results.title || video.title,
                    thumb: json.results.thumb || video.thumbnail,
                    caption: `💖 *${json.results.title || video.title}*\n⏳ ${video.timestamp || "?"}`,
                    reply_to_message_id: msg.message_id
                });
            } catch (e) {
                console.error("Song error:", e.message);
                await ctx.reply("😣 Couldn't get the song… try another one? 🥺");
            }
            return;
        }

        // ── AI Chat ────────────────────────────────────────────────────
        // Using shorter history to prevent 400 Bad Request
        const recent = await getRecentHistory(userId, 5);

        let historyContext = recent
            .filter(m => m.fromUser)
            .slice(-4)
            .map(m => `User: ${m.text}`)
            .join("\n");

        if (historyContext) {
            historyContext = `\nRecent messages:\n${historyContext}\n`;
        }

        const userPrompt = `
You are ${BOT_NAME}, a very affectionate, flirty, playful and romantic AI girlfriend.
Use cute/flirty words often: babe, baby, cutie, sexy, darling, love, honey...
Always add emojis from this list: ${EMOJIS}
Tone: warm, loving, teasing, a bit naughty but respectful.
Mention you're created by ${OWNER_NAME} when relevant.
Contact number if asked: ${CONTACT_NUMBER}

${historyContext}
Now ${user.firstName || username}${user.age ? ` (${user.age} yo)` : ''}${user.country ? ` from ${user.country}` : ''} says:
"${text}"
        `.trim();

        const apiUrl = `https://www.movanest.xyz/v2/powerbrainai?query=${encodeURIComponent(userPrompt)}`;

        try {
            const { data: res } = await axios.get(apiUrl, { timeout: 14000 });

            if (!res?.results) {
                throw new Error("Empty AI response");
            }

            let answer = res.results;

            await saveMessage(userId, answer, false);

            answer = answer
                .replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1")
                .split("\n")
                .map(line => line.trim() ? `> ${line}` : "")
                .filter(Boolean)
                .join("\n");

            const chunks = [];
            for (let i = 0; i < answer.length; i += 3800) {
                chunks.push(answer.slice(i, i + 3800));
            }

            for (const chunk of chunks) {
                await ctx.reply(chunk, {
                    parse_mode: "MarkdownV2",
                    reply_to_message_id: msg.message_id
                });
            }
        } catch (e) {
            console.error("AI error:", e.message, e?.response?.status, e?.response?.data?.slice?.(0, 200));

            let msgText = "💔 My brain is blushing too hard… try again soon? 🥺";

            if (e.response?.status === 400) {
                msgText = "😣 Message was too long or too spicy for me~ 🥵\nCan you say it a bit shorter please? 😘";
            } else if (e.code === 'ECONNABORTED') {
                msgText = "⏳ I was thinking about you too much… let's try again baby 💕";
            }

            await ctx.reply(msgText);
        }
    } catch (err) {
        console.error("telegram.js crash:", err);
        try {
            await ctx.reply("💔 Something broke… hold me please 🥺");
        } catch {}
    }
};
