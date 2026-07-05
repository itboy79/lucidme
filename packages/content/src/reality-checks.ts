/**
 * Reality check prompts (§S5-1).
 *
 * Carica `prompts.json` (60 prompt italiani, 15 per categoria). Restituisce
 * copie difensive (immutabilità dall'esterno). Lo shuffle/selection avviene nel
 * `prompt-pool` dell'app (§S5-2), non qui: qui solo accesso al pool statico.
 */
import prompts from '../reality-checks/prompts.json' with { type: 'json' };

export type RCPromptCategory = 'mani' | 'testo' | 'domanda' | 'ambiente';

export interface RCPrompt {
  id: string;
  text: string;
  category: RCPromptCategory;
}

const data = prompts as RCPrompt[];

/** Tutti i 60 prompt (copia difensiva). */
export function getRealityCheckPrompts(): RCPrompt[] {
  return data.map((p) => ({ ...p }));
}
