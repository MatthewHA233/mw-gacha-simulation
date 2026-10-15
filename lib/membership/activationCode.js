/**
 * 通行证密钥（兑换码）MW-XXXXXXXX：支付回调和管理员赠送共用同一套格式。
 * 字符集排除易混淆的 0/O/1/I/L，31 个字符 × 8 位。
 */
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateActivationCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return `MW-${code}`
}

/** 生成一个库里还没有的码（最多试 20 次）；20 次都撞上返回 null，查库出错直接抛出 */
export async function generateUniqueActivationCode(supabase) {
  for (let i = 0; i < 20; i++) {
    const code = generateActivationCode()
    const { data, error } = await supabase
      .from('memberships')
      .select('id')
      .eq('activation_code', code)
      .maybeSingle()
    if (error) throw error
    if (!data) return code
  }
  return null
}
