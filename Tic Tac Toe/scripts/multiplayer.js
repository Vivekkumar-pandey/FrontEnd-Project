/**
 * multiplayer.js — PeerJS WebRTC wrapper for online PvP
 *
 * Provides room creation/joining with a 6-character code.
 * Moves sync peer-to-peer — no backend needed.
 */

/* global Peer */

let peer = null;
let conn = null;
let isHost = false;
let roomCode = '';
let onMoveCallback = null;
let onStatusCallback = null;
let onDisconnectCallback = null;

/**
 * Generate a random 6-character alphanumeric room code.
 */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

/**
 * Fire status update to the UI.
 */
function emitStatus(status, message) {
    if (onStatusCallback) onStatusCallback(status, message);
}

/**
 * Set up data connection handlers.
 */
function setupConnection(connection) {
    conn = connection;

    conn.on('open', () => {
        emitStatus('connected', 'Connected! Game starting…');
    });

    conn.on('data', (data) => {
        if (data.type === 'move' && onMoveCallback) {
            onMoveCallback(data.index);
        }
        if (data.type === 'restart') {
            if (onMoveCallback) {
                // Signal game.js to restart the round
                onMoveCallback(-1); // -1 = restart signal
            }
        }
        if (data.type === 'leave') {
            // Signal game.js that the opponent left the room
            emitStatus('disconnected', 'Opponent left the room.');
            if (onDisconnectCallback) onDisconnectCallback(true);
        }
    });

    conn.on('close', () => {
        emitStatus('disconnected', 'Opponent disconnected.');
        if (onDisconnectCallback) onDisconnectCallback();
    });

    conn.on('error', (err) => {
        emitStatus('error', `Connection error: ${err.message || err}`);
    });
}

/**
 * Create a room and wait for an opponent to join.
 * @returns {string} The room code.
 */
export function createRoom() {
    return new Promise((resolve, reject) => {
        roomCode = generateCode();
        isHost = true;

        emitStatus('waiting', `Room code: ${roomCode} — Waiting for opponent…`);

        try {
            peer = new Peer('ttt-' + roomCode, {
                debug: 0,
            });
        } catch (e) {
            emitStatus('error', 'Failed to create room. PeerJS may not be loaded.');
            reject(e);
            return;
        }

        peer.on('open', () => {
            resolve(roomCode);
        });

        peer.on('connection', (connection) => {
            setupConnection(connection);
        });

        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                // Code collision — retry with new code
                peer.destroy();
                roomCode = generateCode();
                peer = new Peer('ttt-' + roomCode, { debug: 0 });
                peer.on('open', () => resolve(roomCode));
                peer.on('connection', (connection) => setupConnection(connection));
                peer.on('error', (e) => {
                    emitStatus('error', `Room error: ${e.type}`);
                    reject(e);
                });
            } else {
                emitStatus('error', `Room error: ${err.type}`);
                reject(err);
            }
        });
    });
}

/**
 * Join an existing room by code.
 * @param {string} code
 */
export function joinRoom(code) {
    return new Promise((resolve, reject) => {
        roomCode = code.toUpperCase().trim();
        isHost = false;

        emitStatus('connecting', 'Connecting to room…');

        try {
            peer = new Peer(undefined, { debug: 0 });
        } catch (e) {
            emitStatus('error', 'Failed to connect. PeerJS may not be loaded.');
            reject(e);
            return;
        }

        peer.on('open', () => {
            const connection = peer.connect('ttt-' + roomCode, { reliable: true });
            setupConnection(connection);

            // Timeout if connection doesn't open
            const timeout = setTimeout(() => {
                if (!conn || conn.open !== true) {
                    emitStatus('error', 'Could not find room. Check the code and try again.');
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

            connection.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        peer.on('error', (err) => {
            emitStatus('error', `Join error: ${err.type}. Check the room code.`);
            reject(err);
        });
    });
}

/**
 * Send a move to the remote player.
 * @param {number} index — Cell index (0-8)
 */
export function sendMove(index) {
    if (conn && conn.open) {
        conn.send({ type: 'move', index });
    }
}

/**
 * Send a restart signal to the remote player.
 */
export function sendRestart() {
    if (conn && conn.open) {
        conn.send({ type: 'restart' });
    }
}

/**
 * Send a leave signal to the remote player.
 */
export function sendLeave() {
    if (conn && conn.open) {
        conn.send({ type: 'leave' });
    }
}

/**
 * Set the callback for when a remote move is received.
 * @param {function(number)} cb — called with cell index, or -1 for restart
 */
export function onRemoteMove(cb) {
    onMoveCallback = cb;
}

/**
 * Set the callback for status updates.
 * @param {function(string, string)} cb — called with (status, message)
 */
export function onStatus(cb) {
    onStatusCallback = cb;
}

/**
 * Set the callback for disconnection.
 * @param {function} cb
 */
export function onDisconnect(cb) {
    onDisconnectCallback = cb;
}

/**
 * Whether this client is the room host (plays as X).
 */
export function getIsHost() {
    return isHost;
}

/**
 * Get the current room code.
 */
export function getRoomCode() {
    return roomCode;
}

/**
 * Check if currently connected to a peer.
 */
export function isConnected() {
    return conn && conn.open;
}

/**
 * Disconnect and clean up.
 * @param {boolean} notifyRemote — Whether to message the remote peer before closing
 */
export function disconnect(notifyRemote = false) {
    if (notifyRemote && conn && conn.open) {
        conn.send({ type: 'leave' });
    }
    if (conn) {
        conn.close();
        conn = null;
    }
    if (peer) {
        peer.destroy();
        peer = null;
    }
    isHost = false;
    roomCode = '';
    emitStatus('disconnected', 'Disconnected from room.');
}

// Ensure peer connection closes gracefully on refresh/close
window.addEventListener('beforeunload', () => {
    if (peer && !peer.destroyed) {
        if (conn && conn.open) {
            conn.send({ type: 'leave' });
        }
        peer.destroy();
    }
});
