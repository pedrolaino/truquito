/** Tunable numbers for the whole app, kept in one place. */
export const config = {
  bot: {
    /** Pause before a bot acts, so it feels like a person thinking. */
    minDelayMs: 600,
    maxDelayMs: 1400,
    /** Chance that the medium bot calls truco or envido with a weak hand. */
    bluffChance: 0.15,
    /** Opponent hands the hard bot samples per decision. */
    hardSamples: 40,
  },
  room: {
    /** How long a disconnected player has to come back before losing. */
    reconnectGraceMs: 2 * 60_000,
    /** Rooms with no activity for this long are deleted. */
    idleTtlMs: 24 * 60 * 60_000,
    maxNameLength: 20,
    maxMessageBytes: 1024,
    /** Per connection: at most this many messages in the window. */
    messageBurst: 60,
    messageWindowMs: 10_000,
    /** Per client IP and Worker isolate: rooms created in the window. */
    createBurst: 10,
    createWindowMs: 60_000,
  },
} as const
