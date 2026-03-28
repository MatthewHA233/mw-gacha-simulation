'use client'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">出错了</h2>
        <p className="text-slate-400 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}