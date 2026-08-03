# TODO

## Swap should be pattern-matched, not rotation-queue-based (dictated 2026-08-02)

Problems with the current swap behavior:

1. The rotation pool doesn't reset until every exercise in it has been cycled,
   so reselecting an exercise just toggles between the 2 remaining options.
   Sometimes neither is doable (equipment taken, bar feels wrong, etc.).
2. Desired: swap to a *semantically equivalent* movement — row for row, hinge
   for hinge, vertical press for vertical press — not just "next unused item
   in the queue."

Proposed design:

- Tag each exercise with a movement pattern (horizontal row / vertical pull /
  hinge / knee-dominant / vertical press / ...) plus equipment. On swap, offer
  any exercise sharing the pattern tag, ranked by least-recently-used,
  regardless of rotation state.
- Keep the rotation queue for default programming; make swap a separate query.

Implementation notes:

- `data/exercises.json` already carries `pattern` and `equipment` fields, but
  the current `pattern` taxonomy is coarse (squat/bench/deadlift/ohp/pull/core/
  conditioning). The proposal needs a finer movement-pattern axis — e.g. all
  rows and pulldowns are `pattern: "pull"` today, so horizontal row vs vertical
  pull would need a new tag (or a `subpattern` field) rather than a new value
  of `pattern`, since `pattern` also drives anchor rotation and the
  no-consecutive-repeat constraint in `lib/generator.ts`.
- Swap becomes: candidates = same movement tag, minus today's picks, sorted by
  LRU over full history; ignore the rotation-queue "unused" state entirely.
