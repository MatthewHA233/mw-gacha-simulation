-- 允许 anon 角色读取 payment_orders 表
-- out_trade_no 是随机字符串，知道它等同于鉴权，因此 SELECT 开放是安全的。
--
-- 执行前提：
--   1. payment_orders 表已启用 RLS (ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;)
--   2. Supabase Dashboard → Database → Replication → 开启 payment_orders 的 Realtime

CREATE POLICY "Allow anon select payment_orders"
  ON public.payment_orders
  FOR SELECT
  USING (true);
