-- ============================================
-- HORIZN 月度数据 RPC：月份列表 + 月度时间线
-- ============================================

-- 清理旧签名（含所有 overload），避免「function name is not unique」
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT
            n.nspname AS schemaname,
            p.proname AS funcname,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('horizn_get_monthly_activity', 'horizn_get_available_months')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s);', r.schemaname, r.funcname, r.args);
    END LOOP;
END $$;

-- 建议索引：若 RPC 仍超时，请先确认这些索引存在
--（若已存在会直接跳过；若不存在，创建可能需要一些时间）
CREATE INDEX IF NOT EXISTS horizn_scan_runs_session_time_idx
    ON public.horizn_scan_runs (session_time);

CREATE INDEX IF NOT EXISTS horizn_activity_records_session_time_idx
    ON public.horizn_activity_records (session_time);

-- 1) 获取有数据的月份列表（按时间倒序）
CREATE OR REPLACE FUNCTION horizn_get_available_months()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH months AS (
        SELECT
            to_char(timezone('Asia/Shanghai', session_time), 'YYYYMM') AS year_month,
            MIN(timezone('Asia/Shanghai', session_time)::date) AS start_date,
            MAX(timezone('Asia/Shanghai', session_time)::date) AS end_date,
            COUNT(*) AS scan_count
        FROM horizn_scan_runs
        GROUP BY 1
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'year_month', year_month,
                'start_date', start_date,
                'end_date', end_date,
                'scan_count', scan_count
            )
            ORDER BY year_month DESC
        ),
        '[]'::jsonb
    )
    FROM months;
$$;

COMMENT ON FUNCTION public.horizn_get_available_months() IS '返回有扫描数据的月份列表（含起止日期与扫描次数），按时间倒序';

GRANT EXECUTE ON FUNCTION public.horizn_get_available_months() TO anon, authenticated;


-- 2) 获取指定月份的完整时间线数据（周活/赛季），面向前端条形图动画
-- p_max_sessions：最多拉取多少个时间点，防止超时；默认 200
CREATE OR REPLACE FUNCTION horizn_get_monthly_activity(
    p_year_month text DEFAULT NULL,  -- 格式：YYYYMM；为空时使用当前月份
    p_max_sessions int DEFAULT 200
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET statement_timeout = '30s'
AS $$
    WITH params AS (
        SELECT
            COALESCE(NULLIF(trim(p_year_month), ''), to_char(timezone('Asia/Shanghai', now()), 'YYYYMM')) AS ym,
            GREATEST(10, COALESCE(p_max_sessions, 200)) AS max_sessions
    ),
    bounds AS (
        SELECT
            -- 以“上海时区的月初 00:00”作为起点，转换为 timestamptz，便于走 session_time 索引
            (to_date(ym || '01', 'YYYYMMDD')::timestamp AT TIME ZONE 'Asia/Shanghai') AS start_ts,
            ((to_date(ym || '01', 'YYYYMMDD') + INTERVAL '1 month')::timestamp AT TIME ZONE 'Asia/Shanghai') AS end_ts,
            max_sessions
        FROM params
    ),
    sessions AS (
        SELECT DISTINCT sr.session_time
        FROM public.horizn_scan_runs sr
        CROSS JOIN bounds b
        WHERE sr.session_time >= b.start_ts
          AND sr.session_time < b.end_ts
        ORDER BY sr.session_time DESC
        LIMIT (SELECT max_sessions FROM bounds)
    ),
    session_entries AS (
        SELECT
            ar.session_time,
            jsonb_agg(
                jsonb_build_object(
                    'player_id', ar.player_id,
                    'weekly_activity', COALESCE(ar.weekly_activity, 0),
                    'season_activity', COALESCE(ar.season_activity, 0)
                )
                ORDER BY ar.player_id
            ) AS entries
        FROM public.horizn_activity_records ar
        INNER JOIN sessions s ON s.session_time = ar.session_time
        GROUP BY ar.session_time
    )
    SELECT jsonb_build_object(
        'id_mapping', '{}'::jsonb,
        'sessions', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'session_time', session_time,
                        'entries', entries
                    )
                    ORDER BY session_time
                )
                FROM session_entries
            ),
            '[]'::jsonb
        )
    );
$$;

COMMENT ON FUNCTION public.horizn_get_monthly_activity(text, int) IS '获取指定月份（YYYYMM）的周活/赛季完整时间线数据（仅时间线；成员映射请走 horizn_get_members 缓存）';

GRANT EXECUTE ON FUNCTION public.horizn_get_monthly_activity(text, int) TO anon, authenticated;
