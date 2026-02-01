// index.js
const chalk = require("chalk");

const settings = require("./settings");           // contains telegram_token, switch_bot.telegram, etc.

async function tele() {
    if (!settings.switch_bot?.telegram) {
        console.log(chalk.red('[INFO] Telegram bot is OFF ❌, skipping startup.'));
        return;
    }

    console.log(chalk.green('[INFO] Telegram bot is ON ✅'));

    const { Telegraf } = require("@sh/tg");

    // If you later want multiple tokens: const tokens = [settings.telegram_token, ...other];
    const tokens = [settings.telegram_token].filter(Boolean);

    if (tokens.length === 0) {
        console.log(chalk.red("[ERROR] No Telegram token found in settings!"));
        process.exit(1);
    }

    const clients = tokens.map(token => new Telegraf(token));

    clients.forEach(client => {
        // Middleware / handler
        client.use(async (ctx, next) => {
            try {
                await require("./telegram.js")(ctx, client);
            } catch (err) {
                console.error(chalk.red("[Handler error]"), err);
            }
            await next();
        });

        // Start polling
        client.launch()
            .catch(err => {
                console.error(chalk.red("[Launch failed]"), err);
            });
    });

    // Graceful shutdown
    process.once("SIGINT", () => {
        clients.forEach(c => c.stop("SIGINT"));
        console.log(chalk.yellow("Telegram bot stopped (SIGINT)"));
    });

    process.once("SIGTERM", () => {
        clients.forEach(c => c.stop("SIGTERM"));
        console.log(chalk.yellow("Telegram bot stopped (SIGTERM)"));
    });

    console.log(chalk.green("TGBOT ONLINE"));
    return clients;
}

// Run
(async () => {
    await tele();
})().catch(err => {
    console.error(chalk.red("[Startup error]"), err);
    process.exit(1);
});
