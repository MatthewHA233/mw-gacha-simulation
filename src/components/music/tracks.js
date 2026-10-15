/**
 * 背景音乐歌单（2026-10-15）：游戏主界面的 6 首，wav 原样不转码，放 CDN 的 audio/ 目录。
 * public/audio 里有本地副本，但 public/* 不进 git，线上只认 CDN —— 新增曲目要先传 OSS。
 * 第一首是默认曲目（原来唯一的那首）。
 */
export const BGM_TRACKS = [
  { id: 'halloween2025', title: '万圣节 2025', file: 'ModernWarships_Menu_Halloween2025_OST.wav' },
  { id: 'main', title: '主题曲', file: 'ModernWarships_Main_Theme_OST.wav' },
  { id: 'orchestral', title: '主题曲 · 交响版', file: 'ModernWarships_Main_Theme_Orchestral_OST.wav' },
  { id: 'main_old', title: '主题曲 · 旧版', file: 'ModernWarships_Main_Theme_Old_OST.wav' },
  { id: 'parade', title: '阅兵', file: 'ModernWarships_Menu_Parade_OST.wav' },
  { id: 'halloween', title: '万圣节 · 旧版', file: 'ModernWarships_Menu_halloween_OST.wav' },
]
