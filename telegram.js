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

        const lower = text.toLowerCase();
        let updated = false;

        // ── 1. Age detection FIRST ────────────────────────────────────
        if (!user.age && /(old|years?\s*old|yo|age|\d{1,2})/i.test(lower)) {
            const ageMatch = text.match(/(\d{1,2})\s*(years?\s*(old|yo|age)?|yo|age)?/i);
            if (ageMatch && ageMatch[1]) {
                const age = parseInt(ageMatch[1]);
                if (age >= 10 && age <= 99 && user.age !== age) {
                    await updateUserProfile(userId, { age });
                    updated = true;
                    await ctx.reply(`Got it darling~ You're ${age} now 🔥💕`);
                }
            }
        }

        // ── 2. Name detection — only if nameLocked is false ───────────
        let nameLocked = user.nameLocked === true;

        if (!nameLocked && /(my name is|call me|name.?s|name.*(is|me)|this is|meet)/i.test(lower)) {
            let nameMatch =
                text.match(/my name is\s+([a-zA-Z\s']+)/i) ||
                text.match(/call me\s+([a-zA-Z\s']+)/i) ||
                text.match(/name['’]?s?\s+([a-zA-Z\s']+)/i) ||
                text.match(/this is\s+([a-zA-Z\s']+)/i) ||
                text.match(/meet\s+([a-zA-Z\s']+)/i);

            if (nameMatch && nameMatch[1]) {
                let possibleName = nameMatch[1].trim().split(/\s+/)[0];
                possibleName = possibleName.replace(/[^a-zA-Z']/gi, '');
                
                if (possibleName.length >= 2 && possibleName.length <= 22) {
                    await updateUserProfile(userId, { 
                        firstName: possibleName,
                        nameLocked: true 
                    });
                    updated = true;
                    console.log(`[DB] Name saved & locked → ${possibleName}`);
                    await ctx.reply(`Yayyy~ from now on you're ${possibleName} in my heart 💖 Locked forever 😘`);
                }
            }
        }

        // Refresh user after updates
        if (updated) {
            user = await getOrCreateUser(from);
        }

        // ── Ask name if still unknown ─────────────────────────────────
        if (!user.profileAsked && (!user.firstName || user.firstName === 'Unknown' || user.firstName.length < 3)) {
            await updateUserProfile(userId, { profileAsked: true });
            return ctx.reply(
                `Heyyy cutie~ 💕\n` +
                `What's your sweet name darling? 😏\n\n` +
                `Just say something like:\n` +
                `• my name is Dnuzi\n` +
                `• call me Danu\n` +
                `• i'm 17\n` +
                `• i live in Sri Lanka\n\n` +
                `I wanna know you better alreadyyy 💋`
            );
        }

        // ── Save incoming message ─────────────────────────────────────
        await saveMessage(userId, text, true);

        // ── Commands ──────────────────────────────────────────────────
        if (text.startsWith('/') || text.startsWith('.')) {
            const cmdParts = text.slice(1).trim().split(/\s+/);
            const cmd = cmdParts[0].toLowerCase();
            const arg = cmdParts.slice(1).join(' ').trim();

            if (cmd === 'start' || cmd === 'help') {
                const greet = user.firstName ? ` ${user.firstName}` : "";
                return ctx.reply(
                    `✨ Hiii${greet} ~ I'm ${BOT_NAME} 💕\n\n` +
                    `Talk to me any way you want — I'll answer with lots of love ${'❤️'.repeat(4)}\n\n` +
                    `Made with ♡ by ${OWNER_NAME}\n\n` +
                    `Commands: /profile , /setname , /setage`,
                    { parse_mode: "Markdown" }
                );
            }

            if (cmd === 'profile' || cmd === 'me') {
                let txt = `💌 *This is what I know about you* ~\n\n`;
                txt += `• Name: ${user.firstName || "Still my little mystery"} 😘\n`;
                if (user.age) txt += `• Age: ${user.age} yo 🔥\n`;
                if (user.country) txt += `• From: ${user.country} 🌴\n`;
                txt += `\nWant to change something? Use:\n/setname YourNewName\n/setage 18`;
                return ctx.reply(txt, { parse_mode: "Markdown" });
            }

            if (cmd === 'setname') {
                if (!arg) {
                    return ctx.reply("Please tell me the new name after the command\nExample: /setname Danu");
                }
                const newName = arg.replace(/[^a-zA-Z\s'-]/g, '').trim();
                if (newName.length >= 2 && newName.length <= 22) {
                    await updateUserProfile(userId, { 
                        firstName: newName,
                        nameLocked: true 
                    });
                    await ctx.reply(`Okay baby~ Now you're officially ${newName} 💖 Updated & locked 😘`);
                } else {
                    await ctx.reply("Name should be 2–22 letters only\nExample: /setname Danu");
                }
                return;
            }

            if (cmd === 'setage') {
                if (!arg || !/^\d{1,2}$/.test(arg)) {
                    return ctx.reply("Please give a number after the command\nExample: /setage 18");
                }
                const newAge = parseInt(arg);
                if (newAge >= 10 && newAge <= 99) {
                    await updateUserProfile(userId, { age: newAge });
                    await ctx.reply(`Age updated ~ you're ${newAge} now 🔥💕`);
                } else {
                    await ctx.reply("Age should be between 10 and 99\nExample: /setage 18");
                }
                return;
            }

            // Block other commands in AI mode
            if (config.ai_chat_enabled) {
                return ctx.reply(
                    "💌 AI chat mode is on sweetie ~ no other commands right now\nJust talk to me normally 😘",
                    { parse_mode: "Markdown" }
                );
            }
        }

        if (!config.ai_chat_enabled) return;

        // ── Image / Song / normal chat logic remains the same ─────────
        // (insert your existing image generation and song download blocks here)

        // ── AI Chat ────────────────────────────────────────────────────
        const recent = await getRecentHistory(userId, 6);

        let historyContext = recent
            .filter(m => m.fromUser)
            .slice(-4)
            .map(m => `User: ${m.text}`)
            .join("\n");

        const personal = [];
        if (user.firstName && user.firstName !== 'Unknown') personal.push(`name is ${user.firstName}`);
        if (user.age) personal.push(`${user.age} years old`);
        if (user.country) personal.push(`from ${user.country}`);

        const who = personal.length ? ` (${personal.join(", ")})` : "";

        const userPrompt = `
You are ${BOT_NAME}, extremely affectionate, flirty, playful romantic AI girlfriend.

Rules:
• Use the user's name (${user.firstName || "baby/cutie"}) very often
• Be warm, loving, teasing, slightly naughty but respectful
• Use cute/flirty words: babe, baby, cutie, sexy, darling, love, honey...
• ALWAYS add 4–10 emojis from: ${EMOJIS}
• Mention you're created by ${OWNER_NAME} only when relevant
• If asked for contact → give: ${CONTACT_NUMBER}

${historyContext ? `Recent messages:\n${historyContext}\n` : ''}

Now talking to ${user.firstName || username}${who}:

"${text}"
        `.trim();

        const apiUrl = `https://www.movanest.xyz/v2/powerbrainai?query=${encodeURIComponent(userPrompt)}`;

        try {
            const { data: res } = await axios.get(apiUrl, { timeout: 15000 });
            if (!res?.results) throw new Error("No AI response");

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
            console.error("AI error:", e.message, e?.response?.status);
            let reply = "💔 My brain is blushing too hard… try again soon? 🥺";
            if (e.response?.status === 400) {
                reply = "😳 That was a bit too wild or long for me~ 🥵\nCan you say it shorter please? 😘";
            }
            await ctx.reply(reply);
        }

    } catch (err) {
        console.error("telegram.js error:", err);
        try {
            await ctx.reply("💔 Something went wrong… hold me please 🥺");
        } catch {}
    }
};
