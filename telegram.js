module.exports = async (ctx, bot) => {
    const msg = ctx.message;
    if (!msg || !msg.text) return;

    const text = msg.text.trim();
    const command = text.split(' ')[0].toLowerCase();

    switch (command) {
        case '/start':
            await ctx.reply('Hello! Welcome to the bot 🚀');
            break;

        case '/help':
            await ctx.reply(
                'Available commands:\n' +
                '/start - start the bot\n' +
                '/help - show this message\n' +
                '/ping - check if bot is alive'
            );
            break;

        case '/ping':
            await ctx.reply('Pong! 🏓');
            break;

        // Add your other commands here
        // case '/something':
        //     await ctx.reply('Doing something...');
        //     break;

        default:
            // Optional: reply to unknown commands
            // if (text.startsWith('/')) {
            //     await ctx.reply('Unknown command. Try /help');
            // }
            break;
    }
};
