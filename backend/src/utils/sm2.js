// Implémentation de secours de l'algorithme SM-2, strictement identique à
// revision-engine/main.py. N'est utilisée QUE si le micro-service Python est
// injoignable, pour que la fonctionnalité de révision ne tombe jamais en panne.
function computeSM2({ quality, repetitions = 0, easeFactor = 2.5, interval = 0 }) {
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    ease_factor: Math.round(easeFactor * 1000) / 1000,
    interval,
    next_review_date: nextReviewDate.toISOString(),
    mastered: interval >= 21
  };
}

module.exports = { computeSM2 };
