"""背景音乐唱片封面：从 MW资源 / public/assets 里按曲子出现的时期挑图，裁成 256×256 的 jpg，并出一张圆形预览。

用法: python -I scripts/make_bgm_covers.py
  → public/audio/covers/<曲目 id>.<内容指纹>.jpg + public/audio/covers_preview.jpg（public/* 不进 git）
  → src/components/music/coverFiles.js（曲目 id → 文件名，进 git）
键名 = src/components/music/tracks.js 里的曲目 id。裁切框是源图像素坐标 (left, top, right, bottom)，
改框后重跑看预览；预览里中间那个黑点是唱片轴孔，主体别放在它底下。
文件名带内容指纹：换图 = 换地址，CDN 缓存和网站 Service Worker 的永久缓存都不用刷。
生成后把 covers/ 下的新文件传到 OSS mw-gacha-simulation/audio/covers/（Content-Type image/jpeg，可永久缓存）。
"""
import hashlib
import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
A = REPO / "public" / "assets"
M = Path(r"D:\Users\Administrator\AppData\Local\ModernWarships\MW资源")
OUT = REPO / "public" / "audio" / "covers"
MAPPING = REPO / "src" / "components" / "music" / "coverFiles.js"
SIZE = 256

COVERS = {
    # 主界面音乐跟着「港口」外观走：能对上港口的直接用港口预览图（porticons，画面 390×298，裁 280 方块避开斜面边框）
    # 港口 port_halloween2025（la109 出现）：青色幽灵船
    "halloween2025": (A / "contentseparated_assets_porticons/port_halloween2025.png", (57, 12, 337, 292)),
    # 主题曲用当前游戏启动画面（主题曲就在这个画面播放），号主定：比默认港口好看
    "main": (M / "主题背景图/2026_08/SplashScreen_4096x2048.png", (950, 448, 2550, 2048)),
    # 2024-11 周年庆 al24：海神 + 航母
    "orchestral": (A / "contentseparated_assets_ui_eventhub/event_al24_widget.png", (228, 0, 412, 184)),
    # 2025-05 Rhythm of Fury（音乐主题活动）：吉他骷髅
    "main_klepacki": (A / "contentseparated_assets_activities/activity_gacha_rf25_background.png", (400, 0, 1400, 1000)),
    # 2022-11 最早的通行证主视觉：风暴里的隐身舰
    "main_old": (M / "主题背景图/2022_11/BattlePass_November_Purchase_2048x1152.png", (470, 240, 1370, 1140)),
    # 2026-01 Beats of War：霓虹城市
    "customize1": (A / "contentseparated_assets_activities/lootbox_activity_la100_widget.png", (128, 0, 384, 256)),
    # 2026-07 通行证：彩色烟带的舰船
    "customize2": (M / "主题背景图/2026_07/BattlePass_July_Purchase_1920x1080.png", (560, 0, 1640, 1080)),
    # 港口「阅兵式」port_birthday2025（Fleet Review，最早出现在 2026-03 旗舰 la102）
    "parade": (A / "contentseparated_assets_porticons/port_birthday2025.png", (80, 122, 360, 402)),
    # 港口 port_halloween（旧万圣节港口）
    "halloween": (A / "contentseparated_assets_porticons/port_halloween.png", (90, 12, 370, 292)),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.jpg"):   # 都是本脚本生成的，按这次的结果重写
        old.unlink()
    font = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 18)
    sheet = Image.new("RGB", (len(COVERS) * 180, 210), (24, 22, 30))
    draw = ImageDraw.Draw(sheet)
    files = {}
    for i, (key, (src, box)) in enumerate(COVERS.items()):
        im = Image.open(src).convert("RGBA")
        flat = Image.new("RGBA", im.size, (20, 18, 28, 255))
        flat.alpha_composite(im)
        cover = flat.crop(box).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        buf = io.BytesIO()
        cover.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
        data = buf.getvalue()
        files[key] = f"{key}.{hashlib.md5(data).hexdigest()[:8]}.jpg"
        (OUT / files[key]).write_bytes(data)
        # 圆形预览（中间画出轴孔，看构图有没有被孔挡住主体）
        thumb = cover.resize((160, 160), Image.LANCZOS)
        mask = Image.new("L", (160, 160), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, 159, 159), fill=255)
        x = i * 180 + 10
        sheet.paste(thumb, (x, 10), mask)
        draw.ellipse((x + 72, 82, x + 88, 98), fill=(10, 10, 14))
        draw.text((x, 178), key, fill=(255, 220, 90), font=font)
        print(files[key], len(data) // 1024, "KB")
    sheet.save(OUT.parent / "covers_preview.jpg", quality=88)
    lines = [f"  {key}: '{name}'," for key, name in files.items()]
    MAPPING.write_text(
        "// 由 scripts/make_bgm_covers.py 生成，别手改。曲目 id → CDN audio/covers/ 下的文件名（带内容指纹，换图 = 换地址）\n"
        "export const COVER_FILES = {\n" + "\n".join(lines) + "\n}\n",
        encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
