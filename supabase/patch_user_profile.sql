-- ============================================================
-- 补丁：独立用户表 + memberships 关联
-- 一个用户账号可绑定多个激活码
-- ============================================================

-- 1. 创建 users 表
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_id VARCHAR(100) UNIQUE NOT NULL,   -- 手机号/邮箱/自定义账号
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. memberships 表新增 user_id 外键（可空，绑定后填入）
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON public.memberships(user_id) WHERE user_id IS NOT NULL;

-- 3. 如果之前加了 login_id 列，清理掉（已迁移到 users 表）
-- ALTER TABLE public.memberships DROP COLUMN IF EXISTS login_id;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on users"
  ON public.users FOR ALL
  USING (true) WITH CHECK (true);
