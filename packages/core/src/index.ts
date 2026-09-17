// @lucidme/core — dominio puro. Nessun import da DOM, DB o UI.

// Build constants
export { CORE_VERSION } from './version.js';

// Entitlements (ticket S8-1)
export { can, FEATURE_MATRIX, PATH_FREE_DAYS, RC_DAILY_LIMIT } from './entitlements.js';
export type { Tier, Feature } from './entitlements.js';

// Privacy
export { SCRUB_FIELDS, isScrubField } from './privacy/scrub-fields.js';

// Crypto (hashing deterministico per seed organismi)
export { hashStr, seedHex } from './crypto/hash.js';

// Domain — emotion
export { EMOTIONS } from './domain/emotion.js';
export type { Emotion } from './domain/emotion.js';
export { isEmotion } from './domain/emotion.js';

// Domain — dream
export {
  createDream,
  dreamSeed,
  resolveTitle,
  firstWords,
  todayLocal,
  LUCIDITY_LEVELS,
  LUCIDITY_LABELS,
  TITLE_MAX,
  BODY_MAX,
  TITLE_FALLBACK_WORDS,
} from './domain/dream.js';
export type { Dream, CreateDreamInput, Lucidity } from './domain/dream.js';

// Domain — dream sign
export { normalizeSignLabel } from './domain/dream-sign.js';
export type { DreamSign } from './domain/dream-sign.js';

// Domain — errors
export { DomainError } from './domain/errors.js';
export type { DomainErrorCode } from './domain/errors.js';

// Analysis — sign detection
export { detectSigns, tokenize } from './analysis/sign-detection.js';
export type { SignHit, DetectSignsOptions } from './analysis/sign-detection.js';
export { STOPWORDS_IT } from './analysis/stopwords-it.js';

// Metrics — Lume (Step 6)
export {
  computeWeekly,
  lucidityRate,
  lucidityDelta,
  lucidCountInWeek,
  dreamCountInWeek,
  recallScoreForWeek,
  buildWordCountMap,
  currentStreak,
  rcResponseRateInWeek,
  mondayOf,
  addDays,
  toDateStr,
  isInWeek,
  eachMonday,
} from './metrics/index.js';
export type { WeeklyMetric, MetricRange, RealityCheckEvent } from './metrics/index.js';
