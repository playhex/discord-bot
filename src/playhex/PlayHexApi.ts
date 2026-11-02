import type { PlayHexOAuthClient } from './oauthClient.ts';
import type { ExternalGame, GameAnalyze, ImportResult, PlayHexGame } from './types.ts';

export class PlayHexApiError extends Error
{
    readonly status: number;

    constructor(status: number, message: string)
    {
        super(message);
        this.status = status;
    }
}

/**
 * "game" => /api/games, "external-game" => /api/external-games
 */
const gamesPath = (kind: ImportResult['kind']): string => kind === 'game' ? 'games' : 'external-games';

export class PlayHexApi
{
    readonly playhexUrl: string;
    private oauthClient: PlayHexOAuthClient;

    constructor(playhexUrl: string, oauthClient: PlayHexOAuthClient)
    {
        this.playhexUrl = playhexUrl;
        this.oauthClient = oauthClient;
    }

    /**
     * Import a game from any source (url, SGF...), or find it if already imported or played on PlayHex.
     */
    async importSource(source: string): Promise<ImportResult>
    {
        return await this.json<ImportResult>('POST', '/api/external-games/import', { source });
    }

    /**
     * Request analyze if not yet done or requested. Returns current analyze state.
     */
    async requestAnalyze(game: ImportResult): Promise<GameAnalyze>
    {
        return await this.json<GameAnalyze>('PUT', `/api/${gamesPath(game.kind)}/${game.publicId}/analyze`);
    }

    async getAnalyze(game: ImportResult): Promise<null | GameAnalyze>
    {
        return await this.json<null | GameAnalyze>('GET', `/api/${gamesPath(game.kind)}/${game.publicId}/analyze`);
    }

    async getGraphPng(game: ImportResult): Promise<Buffer>
    {
        const response = await this.request('GET', `/api/${gamesPath(game.kind)}/${game.publicId}/analyze/graph.png`);

        return Buffer.from(await response.arrayBuffer());
    }

    async getGame(publicId: string): Promise<PlayHexGame>
    {
        return await this.json<PlayHexGame>('GET', `/api/games/${publicId}`);
    }

    async getExternalGame(publicId: string): Promise<ExternalGame>
    {
        return await this.json<ExternalGame>('GET', `/api/external-games/${publicId}`);
    }

    /**
     * Page where game can be replayed and analyzed interactively.
     */
    gameUrl(game: ImportResult): string
    {
        return `${this.playhexUrl}/${gamesPath(game.kind)}/${game.publicId}`;
    }

    private async json<T>(method: string, path: string, body?: unknown): Promise<T>
    {
        const response = await this.request(method, path, body);

        if (response.status === 204) {
            return null as T;
        }

        return await response.json() as T;
    }

    /**
     * @throws {PlayHexApiError} On non 2xx response
     */
    private async request(method: string, path: string, body?: unknown, retry = true): Promise<Response>
    {
        const response = await fetch(this.playhexUrl + path, {
            method,
            headers: {
                'Authorization': `Bearer ${await this.oauthClient.getAccessToken()}`,
                'Accept': 'application/json',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        // Token revoked or expired earlier than expected: retry once with a new one
        if (response.status === 401 && retry) {
            this.oauthClient.invalidate();

            return await this.request(method, path, body, false);
        }

        if (!response.ok) {
            const text = await response.text();
            let message = text;

            try {
                const parsed = JSON.parse(text);
                message = parsed.message ?? parsed.error_description ?? text;
            } catch {
                // not json, keep raw text
            }

            throw new PlayHexApiError(response.status, message);
        }

        return response;
    }
}
