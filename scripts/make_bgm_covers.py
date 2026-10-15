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
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageStat

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
    # 2025-11 通行证主视觉：落日下的驱逐舰（号主 2026-10-15 从候选里挑的，原先 al24 海神图不好看）
    "orchestral": (M / "主题背景图/2025_11/BattlePass_November_Purchase_1920x1080.png", (480, 0, 1560, 1080)),
    # 2025-05 Rhythm of Fury（音乐主题活动）：吉他骷髅。原图是活动背景、故意压得很暗（平均亮度 34），提亮到和其它封面一档
    "main_klepacki": (A / "contentseparated_assets_activities/activity_gacha_rf25_background.png", (400, 0, 1400, 1000), 110),
    # 2022-11 最早的通行证主视觉：风暴里的隐身舰
    "main_old": (M / "主题背景图/2022_11/BattlePass_November_Purchase_2048x1152.png", (470, 240, 1370, 1140)),
    # 2026-01 通行证主视觉：雪山前的舰队（号主 2026-10-15 挑的，原先 la100 霓虹城市不好看）
    "customize1": (M / "主题背景图/2026_01/BattlePass_January_Purchase_1920x1080.png", (760, 0, 1840, 1080)),
    # 2026-07 通行证：彩色烟带的舰船
    "customize2": (M / "主题背景图/2026_07/BattlePass_July_Purchase_1920x1080.png", (560, 0, 1640, 1080)),
    # 港口「阅兵式」port_birthday2025（Fleet Review，最早出现在 2026-03 旗舰 la102）
    "parade": (A / "contentseparated_assets_porticons/port_birthday2025.png", (80, 122, 360, 402)),
    # 港口 port_halloween2026：紫色古堡（号主 2026-10-15 挑的，原先旧万圣节港口 port_halloween 不好看；
    # 和万圣节 2025 的青色幽灵船颜色错开）
    "halloween": (A / "contentseparated_assets_porticons/port_halloween2026.png", (57, 12, 337, 292)),
}


def _percentile(hist: list[int], q: float) -> int:
    total, acc = sum(hist), 0
    for value, count in enumerate(hist):
        acc += count
        if acc >= q * total:
            return value
    return 255


def brighten(img: Image.Image, target_mean: float) -> Image.Image:
    """暗图提亮：色阶拉伸（0.5% 暗部 → 0、99.5% 亮部 → 245）→ gamma 调到目标平均亮度 → 饱和度 ×1.15。
    三个通道用同一张查找表，色相不偏。"""
    hist = img.convert("L").histogram()
    lo, hi = _percentile(hist, 0.005), _percentile(hist, 0.995)
    span = max(1, hi - lo)
    img = img.point([min(255, max(0, round((i - lo) * 245 / span))) for i in range(256)] * 3)
    # gamma 二分到目标平均亮度（亮度的均值不是均值的幂，一次算不准）
    low, high = 0.2, 1.0
    for _ in range(20):
        gamma = (low + high) / 2
        trial = img.point([round(255 * (i / 255) ** gamma) for i in range(256)] * 3)
        if ImageStat.Stat(trial.convert("L")).mean[0] < target_mean:
            high = gamma
        else:
            low = gamma
    return ImageEnhance.Color(trial).enhance(1.15)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.jpg"):   # 都是本脚本生成的，按这次的结果重写
        old.unlink()
    font = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 18)
    sheet = Image.new("RGB", (len(COVERS) * 180, 210), (24, 22, 30))
    draw = ImageDraw.Draw(sheet)
    files = {}
    for i, (key, (src, box, *opts)) in enumerate(COVERS.items()):
        im = Image.open(src).convert("RGBA")
        flat = Image.new("RGBA", im.size, (20, 18, 28, 255))
        flat.alpha_composite(im)
        cover = flat.crop(box).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        if opts:   # 第三项 = 目标平均亮度：原图太暗时提亮
            cover = brighten(cover, opts[0])
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
