import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { ExternalGame, Outcome, PlayHexGame } from '../playhex/types.ts';

/**
 * Same colors as PlayHex: player 0 red, player 1 blue.
 */
const PLAYER_EMOJIS = ['🔴', '🔵'] as const;
const EMBED_COLOR = 0x0d6efd;

export const GRAPH_FILENAME = 'analysis.png';

/**
 * Game info displayed in Discord, whatever the source.
 */
export type GameSummary = {
    players: [{ name: string, rating: null | string }, { name: string, rating: null | string }];
    winner: null | 0 | 1;
    outcome: Outcome;
    boardsize: number;
    movesCount: number;
    endedAt: null | Date;

    /**
     * e.g "Little Golem", "PlayHex"
     */
    source: null | string;
    event: null | string;

    /**
     * Link to the game on PlayHex, to replay and explore moves.
     */
    playhexUrl: string;

    /**
     * Link to the game where it was played. Same as playhexUrl for PlayHex games.
     */
    originalUrl: null | string;
};

/**
 * Displayed instead of player name when unknown (e.g raw moves, or "?" for imported games without names).
 */
const DEFAULT_PLAYER_NAMES = ['Red', 'Blue'] as const;

const playerName = (name: undefined | null | string, index: 0 | 1): string => {
    const trimmed = name?.trim();

    return trimmed && trimmed !== '?' ? escapeMarkdown(trimmed) : DEFAULT_PLAYER_NAMES[index];
};

const ratingOf = (game: PlayHexGame, playerPublicId: string): null | string => {
    const rating = game.ratings?.find(rating => rating.category === 'overall' && rating.player?.publicId === playerPublicId);

    return rating ? String(Math.round(rating.rating)) : null;
};

export const summarizePlayHexGame = (game: PlayHexGame, gameUrl: string): GameSummary => {
    const player = (index: 0 | 1) => {
        const gameToPlayer = game.gameToPlayers[index];

        return {
            name: playerName(gameToPlayer?.player.pseudo, index),
            rating: gameToPlayer ? ratingOf(game, gameToPlayer.player.publicId) : null,
        };
    };

    return {
        players: [player(0), player(1)],
        winner: game.winner,
        outcome: game.outcome,
        boardsize: game.boardsize,
        movesCount: game.moves.length,
        endedAt: game.endedAt ? new Date(game.endedAt) : null,
        source: 'PlayHex',
        event: game.ranked ? 'Ranked' : null,
        playhexUrl: gameUrl,
        originalUrl: gameUrl,
    };
};

export const summarizeExternalGame = (externalGame: ExternalGame, externalGameUrl: string): GameSummary => ({
    players: [
        { name: playerName(externalGame.player0Name, 0), rating: externalGame.player0Rating },
        { name: playerName(externalGame.player1Name, 1), rating: externalGame.player1Rating },
    ],
    winner: externalGame.winner,
    outcome: externalGame.outcome,
    boardsize: externalGame.boardsize,
    movesCount: externalGame.moves.length,
    endedAt: externalGame.endedAt ? new Date(externalGame.endedAt) : null,
    source: externalGame.source,
    event: externalGame.event,
    playhexUrl: externalGameUrl,
    originalUrl: externalGame.sourceUrl,
});

const outcomeText = (outcome: Outcome): string => {
    switch (outcome) {
        case 'path': return 'by connection';
        case 'resign': return 'by resignation';
        case 'time': return 'on time';
        case 'forfeit': return 'by forfeit';
        default: return '';
    }
};

const playerText = (summary: GameSummary, index: 0 | 1): string => {
    const { name, rating } = summary.players[index];

    return `${PLAYER_EMOJIS[index]} **${name}**${rating ? ` (${rating})` : ''}`;
};

/**
 * Message posted once analyze is done: graph, game info, links.
 */
export const createAnalyzeMessage = (summary: GameSummary) => {
    const lines: string[] = [
        `${playerText(summary, 0)} vs ${playerText(summary, 1)}`,
    ];

    if (summary.winner !== null) {
        lines.push('', `🏆 **${summary.players[summary.winner].name}** wins ${outcomeText(summary.outcome)}`.trim());
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('Game analysis')
        .setDescription(lines.join('\n'))
        .addFields(
            { name: 'Board', value: `${summary.boardsize}×${summary.boardsize}`, inline: true },
            { name: 'Moves', value: String(summary.movesCount), inline: true },
        )
        .setImage(`attachment://${GRAPH_FILENAME}`)
        .setFooter({ text: 'Analyzed by Katahex Intuition on PlayHex' })
    ;

    const source = [summary.source, summary.event]
        .filter((text): text is string => !!text)
        .map(text => escapeMarkdown(text))
        .join(' · ');

    if (source) {
        embed.addFields({ name: 'Source', value: source, inline: true });
    }

    if (summary.originalUrl) {
        embed.setURL(summary.originalUrl);
    }

    if (summary.endedAt) {
        embed.setTimestamp(summary.endedAt);
    }

    const buttons = [
        new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Explore on PlayHex')
            .setURL(summary.playhexUrl),
    ];

    if (summary.originalUrl && summary.originalUrl !== summary.playhexUrl) {
        buttons.push(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(summary.source ? `See on ${summary.source}` : 'See original game')
            .setURL(summary.originalUrl),
        );
    }

    return {
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)],
    };
};
