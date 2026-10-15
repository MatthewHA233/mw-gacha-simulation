/**
 * 背景音乐歌单（2026-10-15）：游戏主界面的 9 首，wav 原样不转码，放 CDN 的 audio/ 目录。
 * 来源 = MW资源/探索游戏BGM.py 解包的「主界面音乐」（Klepacki 那 3 首是修了脚本的路径分隔符后才提出来的）；
 * 「战斗音乐」「地图BGM」两类不放进来。
 * public/audio 里有本地副本，但 public/* 不进 git，线上只认 CDN —— 新增曲目要先传 OSS。
 * 第一首是默认曲目（原来唯一的那首）。
 */
export const BGM_TRACKS = [
  { id: 'halloween2025', title: '万圣节 2025', file: 'ModernWarships_Menu_Halloween2025_OST.wav' },
  { id: 'main', title: '主题曲', file: 'ModernWarships_Main_Theme_OST.wav' },
  { id: 'orchestral', title: '主题曲 · 交响版', file: 'ModernWarships_Main_Theme_Orchestral_OST.wav' },
  { id: 'main_klepacki', title: '主题曲 · Klepacki 版', file: 'ModernWarships_MainTheme_02_OST.wav' },
  { id: 'main_old', title: '主题曲 · 旧版', file: 'ModernWarships_Main_Theme_Old_OST.wav' },
  { id: 'customize1', title: '改装界面 1', file: 'ModernWarships_CustomizeTheme_01_OST.wav' },
  { id: 'customize2', title: '改装界面 2', file: 'ModernWarships_CustomizeTheme_02_OST.wav' },
  { id: 'parade', title: '阅兵', file: 'ModernWarships_Menu_Parade_OST.wav' },
  { id: 'halloween', title: '万圣节 · 旧版', file: 'ModernWarships_Menu_halloween_OST.wav' },
]
