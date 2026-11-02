import { setTimeout as sleep } from 'node:timers/promises';
import { AttachmentBuilder, MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { PlayHexApiError, type PlayHexApi } from '../playhex/PlayHexApi.ts';
import type { GameAnalyze, ImportResult } from '../playhex/types.ts';
import { RateLimiter } from '../rateLimit.ts';
import { createAnalyzeMessage, GRAPH_FILENAME, summarizeExternalGame, summarizePlayHexGame, type GameSummary } from './analyzeEmbed.ts';

export const analyzeCommand = new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Analyze a Hex game with Katahex')
    .addStringOption(option => option
        .setName('game')
        .setDescription('Game link (PlayHex, Little Golem, HexWorld, AbstractPlay...), SGF, or moves')
        .setRequired(true)
        .setMaxLength(6000),
    )
;

const POLL_INTERVAL_MS = 3000;

/**
 * Discord interaction token is valid for 15 minutes, keep some margin to post the result.
 */
const ANALYZE_TIMEOUT_MS = 13 * 60_000;

const rateLimiter = new RateLimiter([
    { max: 3, windowMs: 60_000 },
    { max: 20, windowMs: 86_400_000 },
]);

class AnalyzeTimeoutError extends Error {}
class AnalyzeFailedError extends Error {}

/**
 * Request analyze, then wait until it ends.
 *
 * @throws {AnalyzeTimeoutError}
 * @throws {AnalyzeFailedError}
 */
const waitAnalyze = async (api: PlayHexApi, game: ImportResult): Promise<void> => {
    const timeoutAt = Date.now() + ANALYZE_TIMEOUT_MS;
    let analyze: null | GameAnalyze = await api.requestAnalyze(game);

    while (analyze === null || analyze.endedAt === null) {
        if (Date.now() > timeoutAt) {
            throw new AnalyzeTimeoutError();
        }

        await sleep(POLL_INTERVAL_MS);

        analyze = await api.getAnalyze(game);
    }

    if (analyze.analyze === null) {
        throw new AnalyzeFailedError();
    }
};

const getSummary = async (api: PlayHexApi, game: ImportResult): Promise<GameSummary> => {
    return game.kind === 'game'
        ? summarizePlayHexGame(await api.getGame(game.publicId), api.gameUrl(game))
        : summarizeExternalGame(await api.getExternalGame(game.publicId), api.gameUrl(game))
    ;
};

const errorMessage = (e: unknown, game: null | ImportResult, api: PlayHexApi): null | string => {
    if (e instanceof AnalyzeTimeoutError) {
        return `⏳ Analysis is taking longer than expected. Result will be available here: ${game ? api.gameUrl(game) : api.playhexUrl}`;
    }

    if (e instanceof AnalyzeFailedError) {
        return '❌ Analysis failed. Try again later.';
    }

    if (e instanceof PlayHexApiError) {
        switch (e.status) {
            case 400: return `❌ ${e.message}`;
            case 429: return '⏳ PlayHex is busy, try again in a minute.';
            case 503: return '😴 No AI is available to analyze games right now, try again later.';
        }
    }

    return null;
};

export const handleAnalyzeCommand = async (interaction: ChatInputCommandInteraction, api: PlayHexApi): Promise<void> => {
    const retryInMs = rateLimiter.consume(interaction.user.id);

    if (retryInMs !== null) {
        await interaction.reply({
            content: `⏳ Too many analyses, try again <t:${Math.ceil((Date.now() + retryInMs) / 1000)}:R>.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.deferReply();

    const source = interaction.options.getString('game', true);
    let game: null | ImportResult = null;

    try {
        game = await api.importSource(source);

        await interaction.editReply(`🔍 Analyzing game with Katahex... ${api.gameUrl(game)}`);

        await waitAnalyze(api, game);

        const [summary, graph] = await Promise.all([
            getSummary(api, game),
            api.getGraphPng(game),
        ]);

        await interaction.editReply({
            content: '',
            ...createAnalyzeMessage(summary),
            files: [new AttachmentBuilder(graph, { name: GRAPH_FILENAME })],
        });
    } catch (e) {
        const message = errorMessage(e, game, api);

        if (message === null) {
            console.error('Error while analyzing game', { source: source.substring(0, 200), game }, e);
        }

        await interaction.editReply({
            content: message ?? '❌ Something went wrong, try again later.',
            embeds: [],
            components: [],
        });
    }
};
