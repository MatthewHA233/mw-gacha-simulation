/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    // 断点同时要求最小高度（2026-10-15，口径见 src/utils/phoneLayout.js）：手机真横屏宽度能过 768、高度只有三四百，
    // 应当和伪横屏一样走手机样式，否则整站套上电脑尺寸撑爆。项目里没用 max-* 变体，raw 断点不影响。
    screens: {
      sm: { raw: '(min-width: 640px) and (min-height: 500px)' },
      md: { raw: '(min-width: 768px) and (min-height: 500px)' },
      lg: { raw: '(min-width: 1024px) and (min-height: 500px)' },
      xl: { raw: '(min-width: 1280px) and (min-height: 500px)' },
      '2xl': { raw: '(min-width: 1536px) and (min-height: 500px)' },
    },
    extend: {
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
