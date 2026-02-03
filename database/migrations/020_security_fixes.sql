-- Migration: Security Fixes
-- Addresses Supabase security advisor warnings
-- Applied: 2026-02-02

-- ============================================
-- 1. Enable RLS on tables missing it (ERROR level)
-- ============================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate_limits"
ON public.rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view follow_up_templates"
ON public.follow_up_templates FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Service role can manage follow_up_templates"
ON public.follow_up_templates FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================
-- 2. Fix functions with mutable search_path (WARN level)
-- Added SET search_path = public to all functions
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_client_health_score(client_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
DECLARE
    score INTEGER := 50;
    project_count INTEGER;
    active_project_count INTEGER;
    days_since_contact INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count FROM public.projects WHERE projects.client_id = calculate_client_health_score.client_id;
    SELECT COUNT(*) INTO active_project_count FROM public.projects WHERE projects.client_id = calculate_client_health_score.client_id AND status = 'active';
    SELECT EXTRACT(DAY FROM NOW() - COALESCE(last_contact_date, created_at)) INTO days_since_contact
    FROM public.clients WHERE id = calculate_client_health_score.client_id;

    IF project_count > 10 THEN score := score + 30;
    ELSIF project_count > 5 THEN score := score + 20;
    ELSIF project_count > 0 THEN score := score + 10;
    END IF;

    IF active_project_count > 0 THEN score := score + 20; END IF;

    IF days_since_contact < 7 THEN score := score + 15;
    ELSIF days_since_contact < 30 THEN score := score + 5;
    ELSIF days_since_contact > 90 THEN score := score - 20;
    ELSIF days_since_contact > 180 THEN score := score - 40;
    END IF;

    RETURN GREATEST(0, LEAST(100, score));
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
BEGIN
    DELETE FROM public.rate_limits WHERE reset_time < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_subscription(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (create_user_subscription.user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.subscriptions (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_usage_count(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  UPDATE public.subscriptions
  SET usage_count = usage_count + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND usage_count < monthly_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_change_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- ============================================
-- 3. Move extensions to extensions schema (WARN level)
-- ============================================

DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DROP EXTENSION IF EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA extensions;

-- ============================================
-- 4. MANUAL ACTION REQUIRED: Enable Leaked Password Protection
-- Go to: Supabase Dashboard > Authentication > Settings > Password Protection
-- Enable "Leaked password protection"
-- Docs: https://supabase.com/docs/guides/auth/password-security
-- ============================================
