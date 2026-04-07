-- ============================================================
-- Performance indexes for scalability
--
-- This migration adds indexes on columns frequently used in
-- WHERE, ORDER BY, and JOIN clauses across the application.
-- Identified from query patterns in src/lib/.
-- ============================================================

-- voice_posts: filter by author + active status + order by created_at
-- Used by: getVoicePostsForAuthor, getPublicVoicePostsForAuthor,
--          getFollowingFeed (.in author_id), countForCategory, badges streak
CREATE INDEX IF NOT EXISTS idx_voice_posts_author_id_created_at
  ON public.voice_posts (author_id, created_at DESC);

-- voice_posts: public feed filters on expires_at + created_at ordering
-- Used by: getPublicFeed, RLS policy "voice posts are public while active"
CREATE INDEX IF NOT EXISTS idx_voice_posts_expires_at
  ON public.voice_posts (expires_at)
  WHERE expires_at IS NOT NULL;

-- voice_posts: feed ordering by created_at descending (all posts)
-- Used by: getPublicFeed, getFollowingFeed, getRecentVoicePosts
CREATE INDEX IF NOT EXISTS idx_voice_posts_created_at_desc
  ON public.voice_posts (created_at DESC);

-- voice_posts: lookup by question_id for enrichment joins
-- Used by: enrichVoicePosts (question content lookup)
CREATE INDEX IF NOT EXISTS idx_voice_posts_question_id
  ON public.voice_posts (question_id)
  WHERE question_id IS NOT NULL;

-- reactions: lookup by voice_post_id for reaction aggregation
-- Used by: enrichVoicePosts, getPublicFeed, getFollowingFeed,
--          getVoiceRankings, countForCategory (reaction)
CREATE INDEX IF NOT EXISTS idx_reactions_voice_post_id
  ON public.reactions (voice_post_id);

-- follows: count followers for a given user (following_id)
-- Used by: getFollowStats (followers count), countForCategory (follower)
CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON public.follows (following_id);

-- follows: list who a user follows + count following
-- Used by: getFollowStats (following count), getFollowingFeed,
--          isFollowingProfile
-- Note: composite PK (follower_id, following_id) already covers this,
-- but an explicit index ensures the planner uses it for follower_id-only lookups.
CREATE INDEX IF NOT EXISTS idx_follows_follower_id
  ON public.follows (follower_id);

-- questions: filter by recipient + order by created_at
-- Used by: getQuestionsForRecipient, countForCategory (question),
--          RLS policy "questions are viewable by recipient"
CREATE INDEX IF NOT EXISTS idx_questions_recipient_id_created_at
  ON public.questions (recipient_id, created_at DESC);

-- user_badges: lookup earned badges by user
-- Used by: getBadgesForUser, checkAndAwardBadges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
  ON public.user_badges (user_id);

-- badges: filter by category for badge checking
-- Used by: checkAndAwardBadges
CREATE INDEX IF NOT EXISTS idx_badges_category
  ON public.badges (category);

-- profiles: lookup by username (unique constraint may already create this,
-- but explicit index ensures it exists regardless of constraint implementation)
-- Used by: getProfileByUsername
CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles (username)
  WHERE username IS NOT NULL;
