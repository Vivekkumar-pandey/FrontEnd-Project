/**
 * analytics.js — Lightweight custom event tracker
 *
 * Tracks game events in localStorage for local analysis.
 * No third-party services. Zero network requests.
 */

const ANALYTICS_KEY = 'ttt_analytics';
const MAX_EVENTS = 500;

/**
 * Record an analytics event.
 * @param {string} eventName
 * @param {object} [data]
 */
export function trackEvent(eventName, data = {}) {
    try {
        const events = getEvents();
        events.push({
            event: eventName,
            data,
            timestamp: Date.now(),
        });

        // Keep only the last MAX_EVENTS
        const trimmed = events.slice(-MAX_EVENTS);
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(trimmed));
    } catch {
        // Storage full or unavailable
    }
}

/**
 * Get all stored analytics events.
 * @returns {Array<{event: string, data: object, timestamp: number}>}
 */
export function getEvents() {
    try {
        const raw = localStorage.getItem(ANALYTICS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Get summary statistics from events.
 */
export function getAnalyticsSummary() {
    const events = getEvents();
    const starts = events.filter(e => e.event === 'game_start').length;
    const wins = events.filter(e => e.event === 'game_win').length;
    const losses = events.filter(e => e.event === 'game_loss').length;
    const draws = events.filter(e => e.event === 'game_draw').length;

    const durations = events
        .filter(e => e.event === 'game_end' && e.data?.duration)
        .map(e => e.data.duration);

    return {
        totalGames: starts,
        wins,
        losses,
        draws,
        avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        fastestWin: durations.length ? Math.min(...durations) : null,
    };
}

/**
 * Clear all analytics data.
 */
export function clearAnalytics() {
    localStorage.removeItem(ANALYTICS_KEY);
}
