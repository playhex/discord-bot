/**
 * Subset of PlayHex api responses used by the bot.
 */

export type Outcome = null | 'path' | 'resign' | 'time' | 'forfeit';

export type ImportResult = {
    kind: 'game' | 'external-game';
    publicId: string;
};

/**
 * Only whether it is finished is needed, chart is rendered by PlayHex.
 */
export type GameAnalyze = {
    analyze: null | unknown[];
    startedAt: string;
    endedAt: null | string;
};

export type PlayHexGame = {
    publicId: string;
    boardsize: number;
    moves: string[];
    winner: null | 0 | 1;
    outcome: Outcome;
    ranked: boolean;
    endedAt: null | string;
    gameToPlayers: {
        player: {
            publicId: string;
            pseudo: string;
            slug: string;
            isBot?: boolean;
        };
    }[];
    ratings?: {
        category: string;
        rating: number;
        player?: { publicId: string };
    }[];
};

export type ExternalGame = {
    publicId: string;
    boardsize: number;
    moves: string[];
    player0Name: string;
    player1Name: string;
    player0Rating: null | string;
    player1Rating: null | string;
    winner: null | 0 | 1;
    outcome: Outcome;
    endedAt: null | string;
    source: null | string;
    sourceUrl: null | string;
    event: null | string;
};
