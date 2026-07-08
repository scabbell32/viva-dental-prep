import { shuffle } from '@/lib/utils'

interface Groupable {
  case_set_id?: string | null
  sequence_order?: number | null
}

/**
 * Build a quiz deck from a candidate pool while respecting case-set groups.
 *
 * Each group contributes at most one contiguous run (a random window of
 * 2–maxPerGroup questions, in sequence_order) so a shared image/case is reused
 * by a few questions and never orphaned to a single one — but a large group
 * never dominates the quiz. A group of exactly 1 contributes its single
 * question (one image + one question is acceptable). Standalone questions (no
 * case_set_id) are picked individually.
 *
 * Groups are considered first; when standalones also exist, groups are capped at
 * ~60% of the deck so standalone questions still get airtime. Chapters with no
 * groups behave like a plain shuffle.
 *
 * Display order is not meaningful here — the client re-groups by case_set and
 * re-sorts by sequence_order before rendering; this only chooses the set.
 */
export function selectQuizQuestions<T extends Groupable>(
  pool: readonly T[],
  target: number,
  maxPerGroup = 3,
): T[] {
  const groups = new Map<string, T[]>()
  const standalones: T[] = []
  for (const q of pool) {
    if (q.case_set_id) {
      const arr = groups.get(q.case_set_id) ?? []
      arr.push(q)
      groups.set(q.case_set_id, arr)
    } else {
      standalones.push(q)
    }
  }

  // One random contiguous window per group.
  const groupBatches: T[][] = []
  for (const arr of groups.values()) {
    const sorted = [...arr].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
    const size = Math.min(maxPerGroup, sorted.length)
    const start = Math.floor(Math.random() * (sorted.length - size + 1))
    groupBatches.push(sorted.slice(start, start + size))
  }

  const deck: T[] = []

  // Phase 1 — groups first, capped so they don't crowd out standalones.
  const groupCap = standalones.length > 0 ? Math.ceil(target * 0.6) : target
  for (const batch of shuffle(groupBatches)) {
    if (deck.length >= groupCap) break
    if (deck.length + batch.length <= groupCap) deck.push(...batch)
  }

  // Phase 2 — standalones fill the rest.
  for (const q of shuffle(standalones)) {
    if (deck.length >= target) break
    deck.push(q)
  }

  return deck
}
