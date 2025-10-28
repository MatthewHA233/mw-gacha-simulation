import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, ArrowLeft, LogIn } from 'lucide-react'

export default function HoriznAdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // 管理员密码（可以从环境变量读取）
  const ADMIN_PASSWORD = import.meta.env.VITE_HORIZN_ADMIN_PASSWORD || 'admin123'

  useEffect(() => {
    document.title = 'HORIZN 管理员登录'
    return () => {
      document.title = '现代战舰抽奖模拟器'
    }
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 模拟验证延迟（更真实的体验）
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // 设置管理员权限标记（使用 sessionStorage，关闭浏览器后失效）
        sessionStorage.setItem('horizn_admin_auth', 'true')
        // 重定向到 HORIZN 主页
        navigate('/horizn')
      } else {
        setError('密码错误，请重试')
        setPassword('')
        setIsLoading(false)
      }
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          <div className="p-6 sm:p-8 md:p-10">
            {/* Logo和标题 */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
                <img
                  src="/horizn.png"
                  alt="HORIZN"
                  className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover mx-auto ring-4 ring-blue-500/30"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight flex items-center justify-center gap-2">
                <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                HORIZN 管理员
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                请输入管理员密码以查看详细数据
              </p>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 sm:py-3.5 bg-gray-700/50 text-white rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-gray-500"
                    autoFocus
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-3.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>验证中...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>登录</span>
                  </>
                )}
              </button>
            </form>

            {/* 返回链接 */}
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <a
                href="/horizn"
                className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>返回普通模式</span>
              </a>
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            管理员权限仅在本次会话有效
          </p>
        </div>
      </div>
    </div>
  )
}
