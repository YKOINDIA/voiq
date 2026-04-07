-- ============================================================
-- RPC: get_reaction_counts
--
-- Returns aggregated reaction counts per voice post, grouped
-- by sound_type. Used by the feed to avoid loading every
-- individual reaction row into application memory.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_reaction_counts(post_ids uuid[])
RETURNS TABLE(voice_post_id uuid, sound_type text, cnt bigint)
LANGUAGE sql STABLE
AS $$
  SELECT r.voice_post_id, r.sound_type, count(*) AS cnt
  FROM public.reactions r
  WHERE r.voice_post_id = ANY(post_ids)
  GROUP BY r.voice_post_id, r.sound_type;
$$;
