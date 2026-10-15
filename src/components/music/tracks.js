import { CDN_BASE_URL } from '../../utils/constants'
import { COVER_FILES } from './coverFiles'

/**
 * 背景音乐歌单（2026-10-15）：游戏主界面的 9 首，wav 原样不转码，放 CDN 的 audio/ 目录。
 * 来源 = MW资源/探索游戏BGM.py 解包的「主界面音乐」（Klepacki 那 3 首是修了脚本的路径分隔符后才提出来的）；
 * 「战斗音乐」「地图BGM」两类不放进来。
 * public/audio 里有本地副本，但 public/* 不进 git，线上只认 CDN —— 新增曲目要先传 OSS。
 * 顺序号主定：万圣节 2025 → 阅兵 → 万圣节旧版 → 主题曲 → 三个版本的主题曲 → 改装界面；第一首是默认曲目。
 */
export const BGM_TRACKS = [
  { id: 'halloween2025', title: '万圣节 2025', file: 'ModernWarships_Menu_Halloween2025_OST.wav' },
  { id: 'parade', title: '阅兵', file: 'ModernWarships_Menu_Parade_OST.wav' },
  { id: 'halloween', title: '万圣节 · 旧版', file: 'ModernWarships_Menu_halloween_OST.wav' },
  { id: 'main', title: '主题曲', file: 'ModernWarships_Main_Theme_OST.wav' },
  { id: 'orchestral', title: '主题曲 · 交响版', file: 'ModernWarships_Main_Theme_Orchestral_OST.wav' },
  { id: 'main_klepacki', title: '主题曲 · Klepacki 版', file: 'ModernWarships_MainTheme_02_OST.wav' },
  { id: 'main_old', title: '主题曲 · 旧版', file: 'ModernWarships_Main_Theme_Old_OST.wav' },
  { id: 'customize1', title: '改装界面 1', file: 'ModernWarships_CustomizeTheme_01_OST.wav' },
  { id: 'customize2', title: '改装界面 2', file: 'ModernWarships_CustomizeTheme_02_OST.wav' },
]

/**
 * 唱片封面：CDN audio/covers/<曲目 id>.<内容指纹>.jpg，256×256，由 scripts/make_bgm_covers.py 生成（同时写 coverFiles.js）。
 * 文件名带指纹，换图就是换地址：CDN 和网站 Service Worker 的永久缓存都照旧，不用刷新。
 * 主界面音乐跟着「港口」外观走，能对上港口的用港口预览图（porticons）：
 *   万圣节 2025 = port_halloween2025   万圣节 · 旧版 = port_halloween
 *   阅兵 = 港口「阅兵式」port_birthday2025（Fleet Review，最早出现在 2026-03 旗舰 la102）
 * 主题曲 = 当前游戏启动画面 SplashScreen（比默认港口好看）。
 * 对不上港口的按曲子出现的时期挑：交响版 = 2024-11 周年庆 al24，Klepacki 版 = 2025-05 Rhythm of Fury，
 *   旧版 = 2022-11 最早的通行证主视觉，改装界面 1 / 2 = 2026-01 Beats of War / 2026-07 通行证。
 */
export const trackCover = (track) => `${CDN_BASE_URL}/audio/covers/${COVER_FILES[track.id]}`
