from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / "docs" / "demo" / "images"
SCREENSHOT_DIR = ROOT / "docs" / "demo" / "screenshots"
OUT_DIR = ROOT / "docs" / "demo"
ASSETS_DIR = ROOT.parent / ".cursor" / "projects" / "f-project-lc-code" / "assets"

STEPS = [
    ("01-main-editor.png", "1. 打开工作区与代码编辑"),
    ("02-agent-code-changes.png", "2. Agent 对话与代码改动块"),
    ("03-markdown-split.png", "3. Markdown 分屏预览"),
    ("04-conversation-history.png", "4. 多会话历史管理"),
    ("05-terminal-panel.png", "5. 内置终端面板"),
]

TARGET_W = 1280
FRAME_MS = 1800


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("msyh.ttc", "segoeui.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def resolve_image(name: str) -> Path | None:
    for base in (IMAGE_DIR, ASSETS_DIR, SCREENSHOT_DIR):
        candidate = base / name
        if candidate.exists():
            return candidate
    return None


def caption_bar(img: Image.Image, text: str) -> Image.Image:
    bar_h = 56
    canvas = Image.new("RGB", (img.width, img.height + bar_h), "#111827")
    canvas.paste(img, (0, bar_h))
    draw = ImageDraw.Draw(canvas)
    font = load_font(28)
    draw.rectangle((0, 0, img.width, bar_h), fill="#1f2937")
    draw.text((24, 14), text, fill="#f9fafb", font=font)
    return canvas


def normalize(img: Image.Image) -> Image.Image:
    ratio = TARGET_W / img.width
    height = max(1, int(img.height * ratio))
    return img.resize((TARGET_W, height), Image.Resampling.LANCZOS)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for filename, caption in STEPS:
        path = resolve_image(filename)
        if not path:
            print(f"SKIP missing: {filename}")
            continue
        img = Image.open(path).convert("RGB")
        img = normalize(img)
        frames.append(caption_bar(img, caption))

    window_shot = SCREENSHOT_DIR / "lc-code-window.png"
    if window_shot.exists():
        img = normalize(Image.open(window_shot).convert("RGB"))
        frames.insert(0, caption_bar(img, "0. 当前运行窗口实机截图"))

    if not frames:
        print("No frames found")
        return 1

  # loop back to first for smoother gif ending
    frames.append(frames[0].copy())

    gif_path = OUT_DIR / "lc-code-feature-demo.gif"
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
    )
    print(f"GIF: {gif_path}")

    contact_sheet_path = OUT_DIR / "lc-code-feature-sheet.png"
    sheet_h = sum(f.height for f in frames[:-1]) + 16 * (len(frames) - 2)
    sheet = Image.new("RGB", (TARGET_W, sheet_h), "#0b0f17")
    y = 0
    for frame in frames[:-1]:
        sheet.paste(frame, (0, y))
        y += frame.height + 16
    sheet.save(contact_sheet_path)
    print(f"SHEET: {contact_sheet_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
