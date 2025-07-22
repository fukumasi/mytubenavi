-- supabase/policies/rls_policies.sql

-- 1. RLS を有効化
ALTER TABLE public.api_settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_stats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_updates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_slots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_booking_analytics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filter_usage          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_likes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_matches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_matching_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_matching_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skips                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_verification          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ratings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtuber_profiles          ENABLE ROW LEVEL SECURITY;

-- 2. ポリシー定義
CREATE POLICY admin_manage_profile_updates ON public.profile_updates FOR * TO 16479 USING ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))
)));
CREATE POLICY user_read_own_profile_updates ON public.profile_updates FOR r TO 16479 USING ((profile_id = auth.uid()));
CREATE POLICY "Users can view their own conversations" ON public.conversations FOR r TO 0 USING (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
CREATE POLICY "Users can view their own history" ON public.view_history FOR r TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own history" ON public.view_history FOR w TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view all comments" ON public.comments FOR r TO 16479 USING (true);
CREATE POLICY "Users can manage their own comments" ON public.comments FOR * TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR r TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage their own favorites" ON public.favorites FOR * TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own interests" ON public.user_interests FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR r TO 0 USING (true);
CREATE POLICY "Users can update their own interests" ON public.user_interests FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR w TO 0 USING ((auth.uid() = id));
CREATE POLICY "Anyone can view YouTuber profiles" ON public.youtuber_profiles FOR r TO 0 USING (true);
CREATE POLICY "Users can delete their own interests" ON public.user_interests FOR d TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view channel stats" ON public.channel_stats FOR r TO 0 USING (true);
CREATE POLICY "Only system can modify channel stats" ON public.channel_stats FOR * TO 0 USING (false);
CREATE POLICY "Only authenticated users can read API settings" ON public.api_settings FOR r TO 16479 USING (true);
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR * TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage their notification preferences" ON public.notification_preferences FOR * TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR w TO 0 USING (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
CREATE POLICY "Users can view their own messages" ON public.messages FOR r TO 0 USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));
CREATE POLICY "Anyone can view genres" ON public.genres FOR r TO 16478,16479 USING (true);
CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR r TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can view promotion slots" ON public.promotion_slots FOR r TO 16479 USING (true);
CREATE POLICY "Enable read access for all users" ON public.video_ratings FOR r TO 0 USING (true);
CREATE POLICY "Enable update for users on their own ratings" ON public.video_ratings FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Allow public access to public files" ON public.files FOR r TO 0 USING (((public = true) OR (owner = auth.uid())));
CREATE POLICY "Allow users to update their own files" ON public.files FOR w TO 16479 USING ((owner = auth.uid()));
CREATE POLICY "Allow users to delete their own files" ON public.files FOR d TO 16479 USING ((owner = auth.uid()));
CREATE POLICY "Users can update their own messages" ON public.messages FOR w TO 0 USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));
CREATE POLICY "Users can view their own matching scores" ON public.user_matching_scores FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Service role can manage matching scores" ON public.user_matching_scores FOR * TO 0 USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can view their own logins" ON public.user_logins FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own logins" ON public.user_logins FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR w TO 0 USING ((user_id = auth.uid()));
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR d TO 0 USING ((user_id = auth.uid()));
CREATE POLICY "Allow select for own notifications" ON public.notifications FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Enable read access for all users" ON public.user_verification FOR r TO 0 USING (true);
CREATE POLICY "Enable update access for users based on user_id" ON public.user_verification FOR w TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can manage own preferences" ON public.notification_preferences FOR * TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own reactions" ON public.user_reactions FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own reactions" ON public.user_reactions FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own reactions" ON public.user_reactions FOR d TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own connections" ON public.connections FOR r TO 0 USING (((auth.uid() = user_id) OR (auth.uid() = connected_user_id)));
CREATE POLICY "Users can update connection status" ON public.connections FOR w TO 0 USING (((auth.uid() = user_id) OR (auth.uid() = connected_user_id)));
CREATE POLICY "Users can delete their own connections" ON public.connections FOR d TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own matching preferences" ON public.user_matching_preferences FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own matching preferences" ON public.user_matching_preferences FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own likes" ON public.user_likes FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own skips" ON public.user_skips FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own payments" ON public.premium_payments FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "YouTubers can update their own profile" ON public.youtuber_profiles FOR w TO 0 USING ((auth.uid() = id));
CREATE POLICY "Users can view their own bookings" ON public.slot_bookings FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own bookings" ON public.slot_bookings FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own likes" ON public.user_likes FOR d TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can read their own points" ON public.user_points FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view analytics for their bookings" ON public.slot_booking_analytics FOR r TO 0 USING ((EXISTS (
  SELECT 1
    FROM slot_bookings
   WHERE ((slot_bookings.id = slot_booking_analytics.booking_id) AND (slot_bookings.user_id = auth.uid()))
)));
CREATE POLICY "Admins can manage all booking analytics" ON public.slot_booking_analytics FOR * TO 0 USING ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))
)));
CREATE POLICY "Enable update for admin users" ON public.promotion_slots FOR w TO 16479 USING ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))
)));
CREATE POLICY "System can update points" ON public.user_points FOR w TO 0 USING (true);
CREATE POLICY "Users can read their own transactions" ON public.point_transactions FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR w TO 16479 USING ((EXISTS (
  SELECT 1
    FROM profiles profiles_1
   WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text))
)));
CREATE POLICY "Admins can select profile updates" ON public.profile_updates FOR r TO 16479 USING ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))
)));
CREATE POLICY "Users can view their own filter usage" ON public.user_filter_usage FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own matches" ON public.user_matches FOR r TO 0 USING (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR r TO 0 USING ((user_id = auth.uid()));
CREATE POLICY "Enable delete access for users based on user_id" ON public.user_verification FOR d TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Enable read access for users based on user_id" ON public.user_verification FOR r TO 16479 USING ((auth.uid() = user_id));
CREATE POLICY "Users can read their own verification" ON public.user_verification FOR r TO 0 USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own verification" ON public.user_verification FOR w TO 0 USING ((auth.uid() = user_id));
CREATE POLICY user_read_own_premium_payments ON public.premium_payments FOR r TO 16479 USING ((user_id = auth.uid()));
CREATE POLICY "Enable delete for youtuber users" ON public.promotion_slots FOR d TO 16479 USING ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'youtuber'::text))
)));
CREATE POLICY "繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡閠・・縺ｿ繝輔ぃ繧､繝ｫ" ON public.message_attachments FOR r TO 0 USING ((EXISTS (
  SELECT 1
    FROM messages m
    JOIN conversations c ON (m.conversation_id = c.id)
   WHERE ((m.id = message_attachments.message_id) AND ((c.user1_id = auth.uid()) OR (c.user2_id = auth.uid())))
)));
-- WITH CHECK ポリシー定義
ALTER TABLE public.view_history                   ADD POLICY "Users can insert their own history_with_check" FOR a TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.comments                       ADD POLICY "Users can manage their own comments_with_check" FOR * TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.favorites                      ADD POLICY "Users can manage their own favorites_with_check" FOR * TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_interests                 ADD POLICY "Users can insert their own interests_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.conversations                  ADD POLICY "Users can insert their own conversations_with_check" FOR a TO 0 WITH CHECK (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
ALTER TABLE public.notifications                   ADD POLICY "Allow insert notifications_with_check" FOR a TO 0 WITH CHECK ((auth.uid() IS NOT NULL));
ALTER TABLE public.profiles                        ADD POLICY "Users can insert their own profile_with_check" FOR a TO 0 WITH CHECK (((auth.uid() = id) OR (auth.role() = 'service_role'::text)));
ALTER TABLE public.notification_preferences        ADD POLICY "System can create notification preferences_with_check" FOR a TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.video_ratings                   ADD POLICY "Enable insert for authenticated users_with_check" FOR a TO 0 WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = user_id)));
ALTER TABLE public.video_ratings                   ADD POLICY "Enable update for users on their own ratings_with_check" FOR w TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.files                           ADD POLICY "Allow authenticated users to upload files_with_check" FOR a TO 16479 WITH CHECK (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text) AND (owner = auth.uid())));
ALTER TABLE public.files                           ADD POLICY "Allow users to update their own files_with_check" FOR w TO 16479 WITH CHECK ((owner = auth.uid()));
ALTER TABLE public.messages                        ADD POLICY "Users can insert their own messages_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = sender_id));
ALTER TABLE public.user_logins                     ADD POLICY "Users can insert their own logins_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.notifications                   ADD POLICY "Allow users to create specific notifications_with_check" FOR a TO 16479 WITH CHECK (((user_id = auth.uid()) OR (type = ANY (ARRAY['match'::text,'like'::text,'connection_request'::text,'connection_accepted'::text,'connection_rejected'::text,'message'::text]))));
ALTER TABLE public.user_verification                ADD POLICY "Enable insert access for authenticated users only_with_check" FOR a TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_verification                ADD POLICY "Enable update access for users based on user_id_with_check" FOR w TO 16479 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_reactions                   ADD POLICY "Users can insert their own reactions_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.connections                      ADD POLICY "Users can insert their own connections_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_matching_preferences        ADD POLICY "Users can insert their own matching preferences_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.notifications                    ADD POLICY "Allow authenticated users to create notifications_with_check" FOR a TO 16479 WITH CHECK (true);
ALTER TABLE public.user_skips                       ADD POLICY "Users can insert their own skips_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_likes                       ADD POLICY "Users can insert their own likes_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.youtuber_profiles                ADD POLICY "Users can create YouTuber profile once_with_check" FOR a TO 0 WITH CHECK (((auth.uid() = id) AND (NOT EXISTS (
  SELECT 1
    FROM youtuber_profiles y
   WHERE (y.id = auth.uid())
))));
ALTER TABLE public.slot_bookings                    ADD POLICY "Users can insert their own bookings_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.promotion_slots                  ADD POLICY "Enable insert for authenticated users_with_check" FOR a TO 16479 WITH CHECK (true);
ALTER TABLE public.promotion_slots                  ADD POLICY "Enable insert for youtuber users_with_check" FOR a TO 16479 WITH CHECK ((EXISTS (
  SELECT 1
    FROM profiles
   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'youtuber'::text))
)));
ALTER TABLE public.user_points                      ADD POLICY "Users can create their own points_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.point_transactions               ADD POLICY "Users can insert their own transactions_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.point_transactions               ADD POLICY "System can insert transactions_with_check" FOR a TO 0 WITH CHECK (true);
ALTER TABLE public.user_filter_usage                ADD POLICY "Users can insert their own filter usage_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.user_matches                     ADD POLICY "Users can insert matches they are part of_with_check" FOR a TO 0 WITH CHECK (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));
ALTER TABLE public.notifications                    ADD POLICY "Users can create any notifications_with_check" FOR a TO 0 WITH CHECK (true);
ALTER TABLE public.notifications                    ADD POLICY "Allow insert for authenticated users_with_check" FOR a TO 0 WITH CHECK ((auth.uid() IS NOT NULL));
ALTER TABLE public.user_verification                ADD POLICY "Users can insert their own verification_with_check" FOR a TO 0 WITH CHECK ((auth.uid() = user_id));
ALTER TABLE public.profile_updates                  ADD POLICY user_insert_own_profile_updates_with_check FOR a TO 16479 WITH CHECK (((profile_id = auth.uid()) AND (updated_by = auth.uid())));
ALTER TABLE public.premium_payments                 ADD POLICY user_insert_own_premium_payments_with_check FOR a TO 16479 WITH CHECK ((user_id = auth.uid()));
ALTER TABLE public.premium_payments                 ADD POLICY "Users can insert their own payments_with_check" FOR a TO 16479 WITH CHECK ((user_id = auth.uid()));
ALTER TABLE public.slot_booking_analytics           ADD POLICY "Users can insert analytics for their bookings_with_check" FOR a TO 16479 WITH CHECK (((EXISTS (
  SELECT 1
    FROM slot_bookings
   WHERE ((slot_bookings.id = slot_booking_analytics.booking_id) AND (slot_bookings.user_id = auth.uid()))
)) OR EXISTS (
  SELECT 1
    FROM profiles
   WHERE (profiles.id = auth.uid())
)));
ALTER TABLE public.message_attachments               ADD POLICY "Users can manage message attachments_with_check" FOR a TO 0 WITH CHECK ((EXISTS (
  SELECT 1
    FROM messages m
    JOIN conversations c ON (m.conversation_id = c.id)
   WHERE ((m.id = message_attachments.message_id) AND ((m.sender_id = auth.uid()) OR (c.user1_id = auth.uid()) OR (c.user2_id = auth.uid())))
)));
