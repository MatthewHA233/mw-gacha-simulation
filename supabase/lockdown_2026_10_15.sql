-- 2026-10-15 收紧抽奖模拟器五张表的公开 key 权限（云 Supabase lfuuncerhuczruzjshnd）
--
-- 之前 anon / authenticated 对这几张表有完整增删改查，策略又是「对所有人 USING (true)」：
-- 拿网页里自带的公开 key 就能列出全部订单里的兑换码、读用户密码哈希、自己造会员、调收入统计。
-- 这些表只该由服务端（service_role，本来就绕过 RLS）读写；浏览器唯一用到公开 key 的地方是
-- PendingPaymentWatcher 的「实时订阅加速」，它的主路径是轮询 /api/payment/query（服务端），收回后照常工作。
--
-- 只动模拟器自己的表；同库的 horizn_* 表属于地平线网站，不在此列，不要顺手改。

begin;

-- 1) 撤掉公开 key 的全部权限
revoke all on table
  public.memberships,
  public.users,
  public.payment_orders,
  public.subscriptions,
  public.admin_costs
from anon, authenticated;

-- 2) 删掉「对所有人开放」的策略（RLS 打开、没有策略 = 只有 service_role 能访问）
drop policy if exists "Service role full access" on public.memberships;
drop policy if exists "Service role full access" on public.payment_orders;
drop policy if exists "Allow anon select payment_orders" on public.payment_orders;
drop policy if exists "Service role full access" on public.subscriptions;
drop policy if exists "Service role full access on users" on public.users;

-- 3) admin_costs 原先连 RLS 都没开
alter table public.admin_costs enable row level security;

-- 4) 收入统计函数（SECURITY DEFINER）只留给服务端
revoke execute on function public.admin_revenue_stats(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_revenue_stats(integer, integer) to service_role;

commit;
