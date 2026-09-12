/** Demo copy for the README cue-card hero. Invented coaching lines, not quotations. */

export const CUE_HERO_HEADLINE = "Your cues. One index card.";
export const CUE_HERO_TODAY = "2026-08-11";
export const CUE_HERO_YEAR = "2026";

export const CUE_HERO_FILES = {
  golfCues: "atomics/exercise/Golf/Cues.md",
  golfToday: `atomics/exercise/Golf/${CUE_HERO_YEAR}/${CUE_HERO_TODAY}.md`,
  gymCues: "atomics/exercise/Gym/Cues.md",
};

/** Unique golf reminders so the year fan is a full pack, not one repeated card. */
export const GOLF_SHOWCASE_CUES = [
  "Finish tall, belt buckle to the target",
  "Soft hands on every chip",
  "Commit to the line and let it roll",
  "Eyes quiet through impact",
  "Weight stays on the lead side",
  "Grip pressure at four out of ten",
  "Quiet lower body on the putt",
  "Hold the finish until it lands",
  "Brush the grass, don't dig",
  "One more club, easier swing",
  "See the shot, then swing",
  "Long putts die at the hole",
  "Keep the trail elbow soft",
  "Stay in the shot after contact",
  "Pick a small target, then forget it",
];

export function focusForCue(cue) {
  if (/putt/i.test(cue)) return "Putting";
  if (/chip|brush|grass/i.test(cue)) return "Short game";
  if (/tempo|finish|grip|elbow/i.test(cue)) return "Tempo";
  return "Impact";
}

export function focusForExtras(extras) {
  const cue = extras[0];
  return cue ? [focusForCue(cue)] : [];
}

/**
 * Today's note gets the first three showcase cues (plus the shared repeat).
 * The twelve most recent earlier dates each get one unique cue.
 */
export function golfShowcaseByDate(golfDates, today = CUE_HERO_TODAY) {
  const extras = new Map();
  extras.set(today, GOLF_SHOWCASE_CUES.slice(0, 3));
  const prior = golfDates.filter((date) => date < today).slice(-12);
  prior.forEach((date, index) => {
    const cue = GOLF_SHOWCASE_CUES[index + 3];
    if (cue) extras.set(date, [cue]);
  });
  return extras;
}
