/**
 * In memory rate limit by key (Discord user id), with several windows,
 * e.g 3 per minute and 20 per day.
 */
export class RateLimiter
{
    private hits = new Map<string, number[]>();

    private limits: { max: number, windowMs: number }[];

    constructor(limits: { max: number, windowMs: number }[])
    {
        this.limits = limits;
    }

    /**
     * Consumes one hit if allowed.
     *
     * @returns Null if allowed, else milliseconds before next allowed hit.
     */
    consume(key: string, now = Date.now()): null | number
    {
        const longestWindowMs = Math.max(...this.limits.map(limit => limit.windowMs));
        const hits = (this.hits.get(key) ?? []).filter(hit => hit > now - longestWindowMs);

        for (const { max, windowMs } of this.limits) {
            const inWindow = hits.filter(hit => hit > now - windowMs);

            if (inWindow.length >= max) {
                return inWindow[inWindow.length - max] + windowMs - now;
            }
        }

        hits.push(now);
        this.hits.set(key, hits);

        return null;
    }
}
