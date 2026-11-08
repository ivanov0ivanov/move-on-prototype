/**
 * Step engine registry: maps a step `type` from goals.js to its mount function.
 */
import { mountFlashcards } from './flashcards.js';
import { mountCountdown } from './countdown.js';
import { mountBreathing } from './breathing.js';
import { mountSequence } from './sequence.js';
import { mountReading } from './reading.js';
import { mountCustom } from './custom.js';

export const ENGINES = {
  flashcards: mountFlashcards,
  countdown: mountCountdown,
  timer: mountCountdown,
  breathing: mountBreathing,
  sequence: mountSequence,
  reading: mountReading,
  custom: mountCustom,
};
