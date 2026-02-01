const chalk = require('chalk');
const { Telegraf } = require('@sh/tg');
const config = require('./config');
const telegramHandler = require('./telegram.js');

async function startTelegramBot() {
    const token = config.telegram_token;

    if (!token || token === "YOUR_BOT_TOKEN_HERE" || token.trim() === '') {
        console.log(chalk.red('[ERROR] Telegram token is missing or invalid in config.js'));
        process.exit(1);
    }

    console.log(chalk.green('[INFO] Starting Telegram bot...'));

    // Create bot instance
    const bot = new Telegraf(token);

    // Register middleware / command handler
    bot.use(async (ctx, next) => {
        try {
            await telegramHandler(ctx, bot);
        } catch (err) {
            console.error(chalk.red('[Telegram Handler Error]'), err);
        }
        return next();
    });

    // Graceful shutdown
    const stopBot = () => {
        console.log(chalk.yellow('\n[INFO] Stopping Telegram bot...'));
        bot.stop('SIGTERM/SIGINT');
        process.exit(0);
    };

    process.once('SIGINT', stopBot);
    process.once('SIGTERM', stopBot);

    try {
        await bot.launch();
        console.log(chalk.green('[SUCCESS] Telegram bot is ONLINE ✅'));
        console.log(chalk.cyan(`→ Bot username: @${bot.botInfo?.username || 'unknown'}`));
    } catch (err) {
        console.error(chalk.red('[ERROR] Bot launch failed:'), err.message);
        process.exit(1);
    }

    return bot;
}

// Start the bot
startTelegramBot().catch(err => {
    console.error(chalk.red('[FATAL] Startup error:'), err);
    process.exit(1);
});
