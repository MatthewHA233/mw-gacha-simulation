/**
 * 支付签名工具
 * 文档地址：https://open.h5zhifu.com/api/h5
 */

import crypto from 'crypto'

/**
 * 生成签名
 * @param {Object} params - 请求参数对象
 * @param {string} appSecret - 应用密钥
 * @returns {string} 签名字符串
 */
export function generateSign(params, appSecret) {
  // 1. 过滤掉 sign 字段和空值
  const filteredParams = Object.keys(params)
    .filter(key => key !== 'sign' && params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort() // 2. 按字母顺序排序
    .reduce((obj, key) => {
      obj[key] = params[key]
      return obj
    }, {})

  // 3. 拼接成 key=value&key=value 格式
  const signString = Object.keys(filteredParams)
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&')

  // 4. 在末尾追加 &key=APP_SECRET
  const stringToSign = `${signString}&key=${appSecret}`

  console.log('[签名生成] 待签名字符串:', stringToSign)

  // 5. MD5 加密并转大写
  const sign = crypto
    .createHash('md5')
    .update(stringToSign, 'utf8')
    .digest('hex')
    .toUpperCase()

  return sign
}

/**
 * 验证签名
 * @param {Object} params - 回调参数对象
 * @param {string} appSecret - 应用密钥
 * @returns {boolean} 签名是否有效
 */
export function verifySign(params, appSecret) {
  const receivedSign = params.sign

  if (!receivedSign) {
    console.error('[签名验证] 缺少 sign 字段')
    return false
  }

  const calculatedSign = generateSign(params, appSecret)

  console.log('[签名验证] 接收签名:', receivedSign)
  console.log('[签名验证] 计算签名:', calculatedSign)

  return receivedSign === calculatedSign
}

/**
 * 为请求参数添加签名
 * @param {Object} params - 请求参数
 * @param {string} appSecret - 应用密钥
 * @returns {Object} 包含签名的参数对象
 */
export function addSign(params, appSecret) {
  const sign = generateSign(params, appSecret)
  return {
    ...params,
    sign
  }
}
