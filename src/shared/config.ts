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
  /**
   * How long each thing that happens stays on screen before the next one, in
   * ms. Moves by the other player get more time than your own.
   */
  pace: {
    play: { mine: 250, theirs: 650 },
    speech: { mine: 700, theirs: 1300 },
    /** The rival's quiero, no quiero or son buenas, which hand the turn back. */
    answer: 2000,
    trick: 1000,
    score: 900,
    roundEnd: 1900,
    deal: 700,
    /** Lessons play everything this many times slower, so a beginner can follow it. */
    lesson: 1.8,
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
