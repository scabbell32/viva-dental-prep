-- Add mode column to quiz_attempts to distinguish weekly vs review sessions.
-- Review attempts are stored for engagement tracking but excluded from readiness math.
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'weekly'
  CHECK (mode IN ('weekly', 'review'));

-- Update readiness_scores view to exclude review sessions.
-- Readiness must reflect fresh weekly performance, not rehearsed repeats.
CREATE OR REPLACE VIEW public.readiness_scores AS
SELECT
  candidate_id,
  track,
  ROUND(
    SUM(score::numeric / total_questions * 100 * weight) / SUM(weight),
    1
  ) AS score_pct,
  COUNT(*) AS attempts_in_window
FROM (
  SELECT
    candidate_id,
    track,
    score,
    total_questions,
    completed_at,
    7 - EXTRACT(day FROM (now() - completed_at))::int AS weight
  FROM public.quiz_attempts
  WHERE completed_at >= now() - INTERVAL '7 days'
    AND mode = 'weekly'
) weighted
WHERE weight > 0
GROUP BY candidate_id, track;
