-- ============================================================
-- 会员系统 V2：激活码 + 可选密码 + 宽松设备绑定
-- 序列号在支付成功后才生成，格式 MW-XXXXXXXX（8位字母数字）
-- ============================================================

-- 1. memberships 表（核心表）
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_code VARCHAR(20) UNIQUE NOT NULL,       -- MW-A3X7K9P2
  password_hash TEXT DEFAULT NULL,                    -- 可空，用户可选设置
  display_name VARCHAR(50) DEFAULT NULL,              -- 可选自定义名
  is_active BOOLEAN DEFAULT false,                    -- 支付成功后变 true
  membership_type VARCHAR(20),                        -- monthly | yearly
  membership_start_at TIMESTAMPTZ,
  membership_expire_at TIMESTAMPTZ,
  total_spent_cents INTEGER DEFAULT 0,
  devices JSONB DEFAULT '[]'::jsonb,                  -- [{device_id, last_active_at}] 最多3个
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_memberships_activation_code ON public.memberships(activation_code);
CREATE INDEX IF NOT EXISTS idx_memberships_is_active ON public.memberships(is_active);

-- 2. payment_orders 表（支付订单）
-- activation_code 在支付成功后由 notify 回调填入
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES public.memberships(id),
  out_trade_no VARCHAR(64) UNIQUE NOT NULL,
  trade_no VARCHAR(64),
  order_type VARCHAR(20) DEFAULT 'subscription',
  membership_type VARCHAR(20),                        -- monthly | yearly（冗余存储，方便回调读取）
  duration_days INTEGER,                              -- 会员天数（冗余存储）
  activation_code VARCHAR(20),                        -- 支付成功后生成的序列号
  amount INTEGER NOT NULL,
  description TEXT,
  pay_type VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  jump_url TEXT,
  pay_time TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_out_trade_no ON public.payment_orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_membership_id ON public.payment_orders(membership_id);

-- 3. subscriptions 表（审计记录）
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID REFERENCES public.memberships(id),
  subscription_type VARCHAR(20) NOT NULL,
  price_cents INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_membership_id ON public.subscriptions(membership_id);

-- 4. RLS 策略（服务端通过 service_role key 访问，跳过 RLS）
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 允许 service_role 完全访问
CREATE POLICY "Service role full access" ON public.memberships
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payment_orders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);
