import { REST, Routes } from 'discord.js';
import { config } from './config.ts';
import { analyzeCommand } from './commands/analyze.ts';

/**
 * Registers slash commands on Discord. To run once commands change.
 * Globally, or only in DISCORD_DEV_GUILD_ID guild (instant update, for development).
 */
const commands = [analyzeCommand.toJSON()];
const rest = new REST().setToken(config.discordToken);

const route = config.discordDevGuildId
    ? Routes.applicationGuildCommands(config.discordClientId, config.discordDevGuildId)
    : Routes.applicationCommands(config.discordClientId)
;

await rest.put(route, { body: commands });

console.log(`Registered ${commands.length} command(s) ${config.discordDevGuildId ? `in guild ${config.discordDevGuildId}` : 'globally'}.`);
