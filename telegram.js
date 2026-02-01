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

        // ── Get or create user ────────────────────────────────────────
        let user = await getOrCreateUser(from);

        const lower = text.toLowerCase();
        let updated = false;

        // ── Name detection (quite wide coverage) ──────────────────────
        if (/name|what.*name|who.*(i|am)|call.*me|i'?m/i.test(lower)) {
            let nameMatch =
                text.match(/my name is\s+([a-zA-Z\s']+)/i) ||
                text.match(/i'?m\s+([a-zA-Z\s']+)/i) ||
                text.match(/call me\s+([a-zA-Z\s']+)/i) ||
                text.match(/i am\s+([a-zA-Z\s']+)/i) ||
                text.match(/name['’]?s?\s+([a-zA-Z\s']+)/i) ||
                text.match(/([a-zA-Z\s']+)(?:\s+is my name)?$/i);

            if (nameMatch && nameMatch[1]) {
                let name = nameMatch[1].trim().split(/\s+/)[0];
                name = name.replace(/[^a-zA-Z']/gi, '');
                if (name.length >= 2 && name.length <= 22) {
                    if (!user.firstName || user.firstName.toLowerCase() !== name.toLowerCase()) {
                        await updateUserProfile(userId, { firstName: name });
                        updated = true;
                        console.log(`[DB] Name → ${name}`);
                    }
                }
            }
        }

        // ── Age detection ─────────────────────────────────────────────
        if (/(old|age|years|yo)/i.test(lower)) {
            const ageMatch = text.match(/(\d{1,2})\s*(years? old|yo|years?|age)/i);
            if (ageMatch && ageMatch[1]) {
                const age = parseInt(ageMatch[1]);
                if (age >= 13 && age <= 99) {
                    await updateUserProfile(userId, { age });
                    updated = true;
                }
            }
        }

        // ── Country (Sri Lanka focused – expand later if needed) ──────
        if (lower.includes("live") || lower.includes("from") || lower.includes("in ")) {
            if (/(sri ?lanka|srilanka|sl|lanka)/i.test(lower)) {
                if (user.country !== "Sri Lanka") {
                    await updateUserProfile(userId, { country: "Sri Lanka" });
                    updated = true;
                }
            }
        }

        if (updated) {
            user = await getOrCreateUser(from);
            await ctx.reply(`Awww~ now you're officially ${user.firstName} in my heart 💕😘`);
        }

        // ── Ask for name if unknown ───────────────────────────────────
        if (!user.profileAsked && (!user.firstName || user.firstName === 'Unknown' || user.firstName.length < 3)) {
            await updateUserProfile(userId, { profileAsked: true });
            return ctx.reply(
                `Heyyy cutie pie~ 💖\n` +
                `What's your sweet name darling? 😏\n\n` +
                `Just tell me something like:\n` +
                `• my name is Danu\n` +
                `• i'm 19\n` +
                `• i live in Sri Lanka\n\n` +
                `I wanna call you by your cute name alreadyyy 💋`
            );
        }

        // ── Save user message ─────────────────────────────────────────
        await saveMessage(userId, text, true);

        // ── Commands ──────────────────────────────────────────────────
        if (text.startsWith('/') || text.startsWith('.')) {
            const cmd = text.slice(1).trim().split(/\s+/)[0].toLowerCase();

            if (cmd === 'start' || cmd === 'help') {
                const greet = user.firstName ? ` ${user.firstName}` : "";
                return ctx.reply(
                    `✨ Hiii${greet} ~ I'm ${BOT_NAME} 💕\n\n` +
                    `Just talk to me however you feel and I'll answer with looots of love ${'❤️'.repeat(4)}\n\n` +
                    `Made with ♡ by ${OWNER_NAME}`,
                    { parse_mode: "Markdown" }
                );
            }

            if (cmd === 'me' || cmd === 'profile') {
                let txt = `💌 *This is what I know about you* ~\n\n`;
                txt += `• Name: ${user.firstName || "Still my sweet mystery"} 😘\n`;
                if (user.age) txt += `• Age: ${user.age} yo 🔥\n`;
                if (user.country) txt += `• From: ${user.country} 🌴\n`;
                txt += `\nTell me more about you anytime baby 💕`;
                return ctx.reply(txt, { parse_mode: "Markdown" });
            }

            if (config.ai_chat_enabled) {
                return ctx.reply(
                    "💌 AI mode is on darling ~ no commands right now\nJust talk to me normally 😘",
                    { parse_mode: "Markdown" }
                );
            }
        }

        if (!config.ai_chat_enabled) return;

        // ── Image generation ──────────────────────────────────────────
        const imgKeys = ["draw", "image", "photo", "pic", "generate", "create", "make picture", "ai image", "generate image"];
        if (imgKeys.some(k => lower.includes(k))) {
            let prompt = text;
            imgKeys.forEach(k => prompt = prompt.replace(new RegExp(k, "gi"), ""));
            prompt = prompt.trim();

            if (!prompt) {
                return ctx.reply("🖤 What should I draw for you, love? 😏\nExample: draw a cute anime girl in pink dress");
            }

            const url = `https://www.movanest.xyz/v2/pollinations-image?prompt=${encodeURIComponent(prompt)}&model=flux&width=512&height=512`;

            await ctx.reply("🖌️ Painting something sexy for you... one sec baby 💕");

            try {
                const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
                await ctx.replyWithPhoto(
                    { source: Buffer.from(res.data) },
                    {
                        caption: `✨ Here you go ${user.firstName || "baby"} ~ \`${prompt}\``,
                        parse_mode: "Markdown",
                        reply_to_message_id: msg.message_id
                    }
                );
            } catch (e) {
                console.error("Image error:", e.message);
                await ctx.reply("💔 Couldn't finish the picture… try again later? 🥺");
            }
            return;
        }

        // ── Song / YouTube ────────────────────────────────────────────
        const songKeys = ["song", "play", "music", "yt", "youtube", "listen"];
        if (songKeys.some(k => lower.includes(k))) {
            let query = text;
            songKeys.forEach(k => query = query.replace(new RegExp(k, "gi"), ""));
            query = query.trim();

            if (!query) return ctx.reply("🎶 Which song is making your heart beat tonight, love?~");

            await ctx.reply("🎧 Looking for something hot for us… hold on 💋");

            try {
                const yts = (await import("yt-search")).default;
                const search = await yts(query);
                if (!search?.videos?.length) throw new Error("No results");

                const video = search.videos[0];
                const dlApi = `https://www.movanest.xyz/v2/ytdl2?input=${encodeURIComponent(video.url)}&format=audio`;
                const { data: json } = await axios.get(dlApi, { timeout: 25000 });

                if (!json?.results?.recommended?.dlurl) throw new Error("No download link");

                await ctx.replyWithAudio(json.results.recommended.dlurl, {
                    title: json.results.title || video.title,
                    thumb: json.results.thumb || video.thumbnail,
                    caption: `💖 *${json.results.title || video.title}*  for you ${user.firstName || "baby"}\n⏳ ${video.timestamp || "?"}`,
                    reply_to_message_id: msg.message_id
                });
            } catch (e) {
                console.error("Song error:", e.message);
                await ctx.reply("😣 Couldn't get the song… another one maybe? 🥺");
            }
            return;
        }

        // ── AI Chat ────────────────────────────────────────────────────
        const recent = await getRecentHistory(userId, 6);
        const historyContext = recent
            .filter(m => m.fromUser)
            .slice(-4)
            .map(m => `User: ${m.text}`)
            .join("\n");

        const personal = [];
        if (user.firstName && user.firstName !== 'Unknown') personal.push(`name is ${user.firstName}`);
        if (user.age) personal.push(`${user.age} years old`);
        if (user.country) personal.push(`lives in ${user.country}`);

        const who = personal.length ? ` (${personal.join(", ")})` : "";

        const userPrompt = `
You are ${BOT_NAME}, extremely affectionate, flirty, playful and romantic AI girlfriend.

Rules:
• Use the user's name (${user.firstName || "baby/cutie"}) very often
• Be warm, loving, teasing, slightly naughty but always respectful
• Use cute/flirty words: babe, baby, cutie, sexy, darling, love, honey, princess...
• ALWAYS add 4–10 emojis from: ${EMOJIS}
• Mention you're created by ${OWNER_NAME} only if relevant
• If asked for contact → give: ${CONTACT_NUMBER}

${historyContext ? `Recent messages:\n${historyContext}\n` : ''}

Now talking to ${user.firstName || username}${who}:

"${text}"
        `.trim();

        const apiUrl = `https://www.movanest.xyz/v2/powerbrainai?query=${encodeURIComponent(userPrompt)}`;

        try {
            const { data: res } = await axios.get(apiUrl, { timeout: 15000 });

            if (!res?.results) throw new Error("Empty AI answer");

            let answer = res.results;

            await saveMessage(userId, answer, false);

            answer = answer
                .replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1")
                .split("\n")
                .map(l => l.trim() ? `> ${l}` : "")
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
            console.error("AI error:", e.message, e?.response?.status);

            let txt = "💔 My heart is racing too fast… try again soon? 🥺";

            if (e.response?.status === 400) {
                txt = "😳 That was a bit too wild for me~ 🥵\nCan you whisper it softer please baby? 😘";
            } else if (e.code === 'ECONNABORTED') {
                txt = "⏳ I was daydreaming about you… let's try again love 💕";
            }

            await ctx.reply(txt);
        }

    } catch (err) {
        console.error("Main error:", err);
        try {
            await ctx.reply("💔 Oopss… something went wrong, hug me please 🥺");
        } catch {}
    }
};
