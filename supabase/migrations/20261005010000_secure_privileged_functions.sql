-- Trigger functions execute automatically; clients must not call them directly.
revoke all on function public.create_trial_subscription_for_user() from public, anon, authenticated;
revoke all on function public.capture_signup_legal_consent() from public, anon, authenticated;

-- RLS policies need this helper only for signed-in users.
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;
