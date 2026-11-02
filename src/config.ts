const required = (name: string): string => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing env var ${name}, see .env.dist`);
    }

    return value;
};

export const config = {
    discordClientId: required('DISCORD_CLIENT_ID'),
    discordToken: required('DISCORD_TOKEN'),
    discordDevGuildId: process.env.DISCORD_DEV_GUILD_ID || null,

    playhexUrl: (process.env.PLAYHEX_URL || 'https://playhex.org').replace(/\/+$/, ''),
    playhexClientId: required('PLAYHEX_CLIENT_ID'),
    playhexClientSecret: required('PLAYHEX_CLIENT_SECRET'),
};
