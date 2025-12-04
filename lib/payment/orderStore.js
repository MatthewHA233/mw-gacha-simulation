/**
 * 订单存储（内存版本）
 * 生产环境建议使用数据库（MongoDB/PostgreSQL）或 Vercel KV (Redis)
 */

// 内存存储（重启后丢失，仅用于开发测试）
const orders = new Map()

/**
 * 创建订单
 * @param {Object} orderData - 订单数据
 * @returns {Object} 订单对象
 */
export function createOrder(orderData) {
  const order = {
    ...orderData,
    status: 'pending', // pending | paid | failed | expired
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  orders.set(orderData.out_trade_no, order)
  console.log(`[订单创建] ${orderData.out_trade_no}`, order)

  return order
}

/**
 * 获取订单
 * @param {string} out_trade_no - 商家订单号
 * @returns {Object|null} 订单对象
 */
export function getOrder(out_trade_no) {
  return orders.get(out_trade_no) || null
}

/**
 * 更新订单状态
 * @param {string} out_trade_no - 商家订单号
 * @param {string} status - 新状态
 * @param {Object} extraData - 额外数据（如平台订单号）
 * @returns {Object|null} 更新后的订单
 */
export function updateOrderStatus(out_trade_no, status, extraData = {}) {
  const order = orders.get(out_trade_no)

  if (!order) {
    console.error(`[订单更新失败] 订单不存在: ${out_trade_no}`)
    return null
  }

  const updatedOrder = {
    ...order,
    ...extraData,
    status,
    updatedAt: new Date().toISOString(),
  }

  orders.set(out_trade_no, updatedOrder)
  console.log(`[订单更新] ${out_trade_no} -> ${status}`, updatedOrder)

  return updatedOrder
}

/**
 * 获取所有订单（调试用）
 * @returns {Array} 订单数组
 */
export function getAllOrders() {
  return Array.from(orders.values())
}

/**
 * 清空所有订单（调试用）
 */
export function clearAllOrders() {
  orders.clear()
  console.log('[订单清空] 所有订单已清空')
}
