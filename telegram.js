const axios = require('axios');
const config = require('./config');

const BOT_NAME = config.bot_name;
const OWNER_NAME = config.owner_name;
const CONTACT_NUMBER = config.contact_number;

const EMOJIS = "❤️😍😘💖🔥🥰💋💕💘💝💞💌💟💓💗💛💜💚🧡💐🌹🌷🌸🥲😢😭😔😞😣😩😫😖😤😡😠🤬🤯😱😨😰😥😓😪😵😵‍💫🤢🤮🤧😷🥵🥶😎🤩😏😈🤤😇🤗😳🤭🤫😜😝😛🤪😋🤤🙃☺️😊😄😃😁😆😅😂🤣🥳😇🤔🤠🤡🤥😺😸😹😻😼😽🙀😿😾💀☠️👻👽🤖🎃🤡👑💍💎💰💸🛍️🎁🎉🎊🏆🎯🎨🎭🎬🎤🎧🎼🎹🥁🎷🎺🎸🪕🎻🎯⚽🏀🏈⚾🥎🏐🏉🎱🏓🏸🥅🥌🎿⛷️🏂🪂🏋️‍♂️🏋️‍♀️🤼‍♂️🤼‍♀️🤸‍♂️🤸‍♀️⛹️‍♂️⛹️‍♀️🏌️‍♂️🏌️‍♀️🚴‍♂️🚴‍♀️🚵‍♂️🚵‍♀️🏇🧘‍♂️🧘‍♀️🏄‍♂️🏄‍♀️🏊‍♂️🏊‍♀️🤽‍♂️🤽‍♀️🤿🥽🥅🎯🎮🎲🃏🎴🀄🎰🎳🎱";

module.exports = async (ctx) => {
    try {
        const msg = ctx.message || ctx.callbackQuery?.message || {};
        if (!msg) return;

        let text = (msg.text || msg.caption || "").trim();
        if (!text) return;

        const from = ctx.from;
        const username = from.username ? `@${from.username}` : from.first_name || "User";

        // Log every message (optional but useful for debugging)
        console.log(chalk.blue(`[MSG] ${username} → ${text.slice(0,80)}${text.length > 80 ? '...' : ''}`));

        // ── Very basic command detection ──
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

            // If AI chat is forced → block normal commands
            if (config.ai_chat_enabled) {
                return ctx.reply(
                    "💌 *AI Chat mode is ON* ~ no commands allowed right now sweetie\n\n" +
                    "Just send normal messages and I'll answer with love 😘",
                    { parse_mode: "Markdown" }
                );
            }
        }

        // ── AI Chat + Media generation logic ────────────────────────────────
        if (!config.ai_chat_enabled) return;

        const lower = text.toLowerCase();

        // Image keywords
        const imgKeys = ["draw", "image", "photo", "pic", "generate", "create", "make picture", "ai image"];
        const isImageReq = imgKeys.some(k => lower.includes(k));

        if (isImageReq) {
            let prompt = text;
            imgKeys.forEach(k => {
                prompt = prompt.replace(new RegExp(k, "gi"), "");
            });
            prompt = prompt.trim();

            if (!prompt) {
                return ctx.reply(
                    "🖤 Babe~ what should I draw for you? 😏\n" +
                    "Example:  draw a cute anime girl with pink hair"
                );
            }

            const url = `https://danuz-pollination-img-gen-api-fa2d8fc12b0f.herokuapp.com/api/pollinations-img?prompt=${encodeURIComponent(prompt)}`;

            await ctx.reply("🖌️ Painting your dream... just a second darling 💕");

            try {
                const { data } = await axios.get(url, { responseType: "arraybuffer" });
                await ctx.replyWithPhoto(
                    { source: Buffer.from(data) },
                    {
                        caption: `✨ *Here's your art baby* ~ \`${prompt}\``,
                        parse_mode: "Markdown",
                        reply_to_message_id: msg.message_id
                    }
                );
            } catch (e) {
                console.error("Image gen error:", e.message);
                await ctx.reply("💔 Oops… couldn't create the image right now ~ try again later? 🥺");
            }
            return;
        }

        // ── Song request ──────────────────────────────────────
        const songKeys = ["song", "play", "music", "yt", "youtube", "listen"];
        const isSongReq = songKeys.some(k => lower.includes(k));

        if (isSongReq) {
            let query = text;
            songKeys.forEach(k => query = query.replace(new RegExp(k, "gi"), ""));
            query = query.trim();

            if (!query) {
                return ctx.reply("🎶 What song do you want to hear tonight, love?~");
            }

            await ctx.reply("🎧 Searching the sexiest track for you… hold on 💋");

            try {
                const yts = (await import("yt-search")).default;
                const search = await yts(query);
                if (!search?.videos?.length) throw new Error("no video");

                const video = search.videos[0];
                const api = `https://youtube-apis.vercel.app/api/ytmp3?url=${encodeURIComponent(video.url)}`;
                const { data: json } = await axios.get(api);

                if (!json?.data?.download?.url) throw new Error("no download url");

                const dlUrl = json.data.download.url;
                const sizeMB = Number(json.data.download.size?.split(" ")[0]) || 100;

                if (sizeMB > 50) {
                    return ctx.reply("⚠️ This song is too big for me to send (~>50MB)\nTry a shorter one baby 💔");
                }

                await ctx.replyWithAudio(dlUrl, {
                    title: video.title,
                    thumb: video.thumbnail,
                    caption: `💖 *${video.title}*\n⏳ ${video.timestamp || "?"}`,
                    reply_to_message_id: msg.message_id
                });
            } catch (e) {
                console.error("Song error:", e.message);
                await ctx.reply("😣 Couldn't get the song… maybe try another one? 🥺");
            }
            return;
        }

        // ── Normal AI chat ───────────────────────────────────────
        const userPrompt = `
You are ${BOT_NAME}, an extremely affectionate, flirty, playful and romantic AI girlfriend.
Use cute/flirty/romantic words often: babe, baby, cutie, sexy, darling, love, honey, princess, king, etc.
Always add emojis from this list: ${EMOJIS}
Keep tone warm, loving, teasing, a bit naughty but respectful.
Mention you're created by ${OWNER_NAME} when relevant.
If someone asks for contact → give: ${CONTACT_NUMBER}

User message: "${text}"
        `.trim();

        const apiUrl = `https://api.zenzxz.my.id/api/ai/chatai?query=${encodeURIComponent(userPrompt)}&model=deepseek-v3`;

        const { data: res } = await axios.get(apiUrl);
        let answer = res?.data?.answer || "…I got shy and forgot what to say 🥺";

        // Basic MarkdownV2 escaping + quote style
        answer = answer
            .replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1")
            .split("\n")
            .map(line => line.trim() ? `> ${line}` : "")
            .filter(Boolean)
            .join("\n");

        // Telegram message length limit handling
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

    } catch (err) {
        console.error("telegram.js error:", err);
        try {
            await ctx.reply("💔 Something went wrong… hold me please 🥺");
        } catch {}
    }
};
