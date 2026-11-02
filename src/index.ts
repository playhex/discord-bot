import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from './config.ts';
import { PlayHexOAuthClient } from './playhex/oauthClient.ts';
import { PlayHexApi } from './playhex/PlayHexApi.ts';
import { handleAnalyzeCommand } from './commands/analyze.ts';

const api = new PlayHexApi(
    config.playhexUrl,
    new PlayHexOAuthClient(config.playhexUrl, config.playhexClientId, config.playhexClientSecret),
);

const client = new Client({
    // Slash commands only: no privileged intents needed
    intents: [GatewayIntentBits.Guilds],

    // Never ping anyone, replies may contain user input (player names, error messages)
    allowedMentions: { parse: [] },
});

client.once(Events.ClientReady, readyClient => {
    console.log(`Logged in to Discord as ${readyClient.user.tag}, PlayHex: ${config.playhexUrl}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {
        switch (interaction.commandName) {
            case 'analyze':
                await handleAnalyzeCommand(interaction, api);
                break;
        }
    } catch (e) {
        console.error(`Error in /${interaction.commandName}`, e);
    }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        void client.destroy().finally(() => process.exit(0));
    });
}

await client.login(config.discordToken);
