/**
 * Gets an access token for the bot itself (OAuth client_credentials grant),
 * not on behalf of a player.
 * Token is cached until it expires, then a new one is requested.
 */
export class PlayHexOAuthClient
{
    private accessToken: null | { value: string, expiresAt: number } = null;

    private pending: null | Promise<string> = null;

    private playhexUrl: string;
    private clientId: string;
    private clientSecret: string;
    private scope: string;

    constructor(playhexUrl: string, clientId: string, clientSecret: string, scope = 'games:analyze')
    {
        this.playhexUrl = playhexUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
    }

    async getAccessToken(): Promise<string>
    {
        // Renew 1 minute before expiration
        if (this.accessToken !== null && this.accessToken.expiresAt > Date.now() + 60_000) {
            return this.accessToken.value;
        }

        this.pending ??= this.requestAccessToken().finally(() => this.pending = null);

        return await this.pending;
    }

    /**
     * Forget current token, e.g when api says it is no longer valid.
     */
    invalidate(): void
    {
        this.accessToken = null;
    }

    private async requestAccessToken(): Promise<string>
    {
        const response = await fetch(`${this.playhexUrl}/oidc/token`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${encodeURIComponent(this.clientId)}:${encodeURIComponent(this.clientSecret)}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({ grant_type: 'client_credentials', scope: this.scope }),
        });

        if (!response.ok) {
            throw new Error(`Could not get PlayHex access token: ${response.status} ${await response.text()}`);
        }

        const { access_token, expires_in } = await response.json() as { access_token: string, expires_in: number };

        this.accessToken = {
            value: access_token,
            expiresAt: Date.now() + expires_in * 1000,
        };

        return access_token;
    }
}
