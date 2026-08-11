"""Create two A4 portrait cheat sheets and print-ready PDFs."""

from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "cheatsheets"
PDF_DIR = ROOT / "output" / "pdf"
FONT_REGULAR = r"C:\Windows\Fonts\YuGothM.ttc"
FONT_BOLD = r"C:\Windows\Fonts\YuGothB.ttc"
W, H = 2480, 3508

INK = "#17233b"
PAPER = "#fffaf1"
WHITE = "#ffffff"
LINE = "#d8deea"
MUTED = "#667085"
NAVY = "#173d66"
BLUE = "#4169e1"
TEAL = "#119d91"
CORAL = "#eb5330"
YELLOW = "#f5be3d"
PALE_BLUE = "#eef3ff"
PALE_TEAL = "#e8f7f4"
PALE_CORAL = "#fff0ec"
PALE_YELLOW = "#fff8df"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def rounded(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=2, radius=28):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, size, fill=INK, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=fill, anchor=anchor)


def fit_lines(value: str, max_chars: int) -> list[str]:
    lines: list[str] = []
    for paragraph in value.split("\n"):
        lines.extend(wrap(paragraph, max_chars, break_long_words=False) or [""])
    return lines


def multiline(draw, xy, value, size, fill=INK, bold=False, max_chars=24, gap=12):
    x, y = xy
    line_height = size + gap
    for line in fit_lines(value, max_chars):
        text(draw, (x, y), line, size, fill, bold)
        y += line_height
    return y


def section_title(draw, x, y, number, title_text, color=CORAL):
    draw.ellipse((x, y, x + 70, y + 70), fill=color)
    text(draw, (x + 35, y + 35), str(number), 34, WHITE, True, "mm")
    text(draw, (x + 92, y + 3), title_text, 43, INK, True)


def chip(draw, x, y, label, fill=PALE_BLUE, color=BLUE):
    bbox = draw.textbbox((0, 0), label, font=font(27, True))
    width = bbox[2] - bbox[0] + 42
    rounded(draw, (x, y, x + width, y + 52), fill, None, radius=22)
    text(draw, (x + 21, y + 11), label, 27, color, True)
    return width


def code_box(draw, box, code, accent=BLUE, size=27):
    rounded(draw, box, "#16233b", None, radius=20)
    x1, y1, x2, _ = box
    draw.rectangle((x1, y1, x1 + 12, box[3]), fill=accent)
    multiline(draw, (x1 + 32, y1 + 22), code, size, "#f8fafc", False, 52, 9)


def paint_mark(draw, number, center, target_box):
    cx, cy = center
    draw.rounded_rectangle(target_box, radius=16, outline=CORAL, width=9)
    draw.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), fill=CORAL)
    text(draw, (cx, cy), str(number), 34, WHITE, True, "mm")


def header(page, title_text, subtitle, label):
    draw = ImageDraw.Draw(page)
    draw.rectangle((0, 0, W, 270), fill=INK)
    text(draw, (120, 62), title_text, 74, WHITE, True)
    text(draw, (124, 157), subtitle, 31, "#d9e2f2")
    rounded(draw, (1990, 72, 2340, 185), CORAL, None, radius=38)
    text(draw, (2165, 128), label, 37, WHITE, True, "mm")
    return draw


def footer(draw, page_number):
    draw.line((120, 3400, 2360, 3400), fill=LINE, width=3)
    text(draw, (120, 3424), "NORTH HIGH-TECH HTML + CSS COURSE", 24, MUTED, True)
    text(draw, (2360, 3424), f"A4 CHEAT SHEET  {page_number}/2", 24, MUTED, True, "ra")


def cover_crop(image_path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    target_ratio = size[0] / size[1]
    ratio = image.width / image.height
    if ratio > target_ratio:
        crop_w = int(image.height * target_ratio)
        left = (image.width - crop_w) // 2
        image = image.crop((left, 0, left + crop_w, image.height))
    else:
        crop_h = int(image.width / target_ratio)
        top = (image.height - crop_h) // 2
        image = image.crop((0, top, image.width, top + crop_h))
    return image.resize(size, Image.Resampling.LANCZOS)


def contain_image(image_path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, WHITE)
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    result.paste(image, (x, y))
    return result


def make_ui_sheet() -> Path:
    page = Image.new("RGB", (W, H), PAPER)
    draw = header(
        page,
        "UIデザイン チートシート",
        "迷ったら「目立つ順・そろえる・反応を返す」を確認しよう",
        "UI",
    )

    # Generated illustration with Paint-style annotations.
    hero_box = (1110, 330, 2340, 1110)
    rounded(draw, hero_box, WHITE, LINE, 4, 30)
    hero = cover_crop(ASSET_DIR / "ui-devices-generated.png", (1190, 740))
    page.paste(hero, (1130, 350))
    paint_mark(draw, 1, (1135, 460), (1290, 390, 1980, 540))
    paint_mark(draw, 2, (2250, 630), (1460, 520, 2110, 760))
    paint_mark(draw, 3, (2250, 845), (1430, 740, 2140, 940))
    paint_mark(draw, 4, (1135, 980), (1340, 900, 2030, 1040))

    section_title(draw, 120, 342, 1, "画面を見る順番")
    legend = [
        ("1", "ヘッダー / ナビ", "今いる場所と移動先が分かる？"),
        ("2", "ファーストビュー", "一番伝えたい内容が最初に見える？"),
        ("3", "カード / 一覧", "同じ役割の情報が同じ形になっている？"),
        ("4", "フォーム / 操作", "押せる・入力できることが伝わる？"),
    ]
    y = 445
    for n, name, note in legend:
        draw.ellipse((130, y, 184, y + 54), fill=CORAL)
        text(draw, (157, y + 27), n, 28, WHITE, True, "mm")
        text(draw, (210, y - 2), name, 33, INK, True)
        text(draw, (210, y + 42), note, 25, MUTED)
        y += 150

    # Five principles.
    section_title(draw, 120, 1185, 2, "UIの基本5原則")
    principles = [
        ("優先順位", "大切なものほど大きく、上へ。", CORAL, PALE_CORAL),
        ("一貫性", "同じ役割は、色・形・言葉をそろえる。", BLUE, PALE_BLUE),
        ("操作の手がかり", "リンクやボタンを押せる見た目にする。", TEAL, PALE_TEAL),
        ("フィードバック", "押した・送れた・失敗したをすぐ伝える。", YELLOW, PALE_YELLOW),
        ("アクセシビリティ", "色だけに頼らず、文字や形でも伝える。", NAVY, "#edf1f5"),
    ]
    y = 1290
    for i, (name, note, accent, bg) in enumerate(principles):
        col = i % 2
        row = i // 2
        x = 120 + col * 1130
        yy = y + row * 205
        width = 1080 if i < 4 else 2210
        rounded(draw, (x, yy, x + width, yy + 162), bg, None, radius=26)
        draw.rectangle((x, yy, x + 12, yy + 162), fill=accent)
        text(draw, (x + 36, yy + 24), name, 34, INK, True)
        text(draw, (x + 36, yy + 83), note, 27, MUTED)

    # Components.
    section_title(draw, 120, 1920, 3, "よく使うUI部品")
    cards = [
        ("ボタン", "動詞で書く", "送信する / 保存する"),
        ("リンク", "移動先を伝える", "メニューを見る"),
        ("入力欄", "labelを付ける", "メールアドレス"),
        ("カード", "同じ構造をそろえる", "画像 + 見出し + 説明"),
    ]
    for i, (name, rule, sample) in enumerate(cards):
        x = 120 + i * 565
        rounded(draw, (x, 2025, x + 515, 2328), WHITE, LINE, 3, 28)
        draw.rounded_rectangle((x + 34, 2060, x + 155, 2180), radius=22, fill=[CORAL, BLUE, TEAL, YELLOW][i])
        text(draw, (x + 181, 2060), name, 34, INK, True)
        text(draw, (x + 34, 2202), rule, 26, MUTED)
        rounded(draw, (x + 34, 2252, x + 478, 2307), PALE_BLUE, None, radius=15)
        text(draw, (x + 52, 2265), sample, 23, BLUE, True)

    # Type / spacing / color.
    section_title(draw, 120, 2425, 4, "数字で迷わないための目安")
    columns = [
        ("文字", ["本文 16px前後", "行間 1.6-1.8", "1行 35-45文字"], BLUE),
        ("余白", ["4 / 8 / 16 / 24 / 32", "関連するものは近く", "章の間は大きく"], TEAL),
        ("色", ["本文は十分に濃く", "強調色は1-2色", "コントラストを確認"], CORAL),
    ]
    for i, (name, lines, accent) in enumerate(columns):
        x = 120 + i * 755
        rounded(draw, (x, 2532, x + 700, 2827), WHITE, LINE, 3, 26)
        chip(draw, x + 30, 2560, name, PALE_BLUE if i == 0 else PALE_TEAL if i == 1 else PALE_CORAL, accent)
        for j, line in enumerate(lines):
            draw.ellipse((x + 38, 2645 + j * 55, x + 54, 2661 + j * 55), fill=accent)
            text(draw, (x + 75, 2634 + j * 55), line, 27, INK)

    # Checklist.
    section_title(draw, 120, 2922, 5, "提出前チェック")
    checks = [
        "□ 一番大切な内容が3秒で分かる",
        "□ ボタン・リンク・入力欄を見分けられる",
        "□ PCとスマートフォンの両方で確認した",
        "□ キーボード操作時のフォーカスが見える",
        "□ 色だけで状態や違いを伝えていない",
        "□ エラー時に「何を直すか」が分かる",
    ]
    for i, label in enumerate(checks):
        x = 140 + (i % 2) * 1120
        y = 3020 + (i // 2) * 95
        text(draw, (x, y), label, 29, INK, i < 2)

    footer(draw, 1)
    output = ASSET_DIR / "ui-cheatsheet-a4.png"
    page.save(output, dpi=(300, 300), optimize=True)
    return output


def mini_box_model(draw, x, y):
    draw.rounded_rectangle((x, y, x + 520, y + 410), radius=22, fill="#ffe4d9", outline=CORAL, width=4)
    text(draw, (x + 18, y + 12), "margin", 25, CORAL, True)
    draw.rounded_rectangle((x + 55, y + 70, x + 465, y + 365), radius=18, fill="#fff1b8", outline=YELLOW, width=4)
    text(draw, (x + 72, y + 79), "border", 23, "#9b6a00", True)
    draw.rounded_rectangle((x + 115, y + 135, x + 405, y + 320), radius=15, fill="#ccefe8", outline=TEAL, width=4)
    text(draw, (x + 130, y + 144), "padding", 23, TEAL, True)
    draw.rounded_rectangle((x + 175, y + 198, x + 345, y + 282), radius=12, fill=BLUE)
    text(draw, (x + 260, y + 240), "content", 22, WHITE, True, "mm")


def make_css_sheet() -> Path:
    page = Image.new("RGB", (W, H), PAPER)
    draw = header(
        page,
        "CSSレイアウト チートシート",
        "まず通常の流れ、次にFlex / Grid。positionは必要なときだけ",
        "CSS",
    )

    section_title(draw, 120, 342, 1, "レイアウトの選び方")
    choices = [
        ("縦に積む", "通常の流れ", "display: block"),
        ("一方向に並べる", "Flexbox", "display: flex"),
        ("行と列で並べる", "Grid", "display: grid"),
        ("重ねる / 固定する", "Position", "position: absolute"),
    ]
    y = 450
    for i, (goal, method, code) in enumerate(choices):
        x = 120
        rounded(draw, (x, y, x + 910, y + 132), WHITE, LINE, 3, 22)
        draw.ellipse((x + 24, y + 28, x + 100, y + 104), fill=[NAVY, TEAL, BLUE, CORAL][i])
        text(draw, (x + 62, y + 66), str(i + 1), 30, WHITE, True, "mm")
        text(draw, (x + 125, y + 18), goal, 29, INK, True)
        text(draw, (x + 125, y + 67), f"{method}  /  {code}", 24, MUTED)
        y += 155

    # Generated image with painted notes.
    hero_box = (1085, 330, 2340, 1115)
    rounded(draw, hero_box, WHITE, LINE, 4, 30)
    hero = cover_crop(ASSET_DIR / "css-layout-generated.png", (1215, 745))
    page.paste(hero, (1105, 350))
    paint_mark(draw, 1, (1110, 440), (1160, 390, 1695, 690))
    paint_mark(draw, 2, (2285, 440), (1740, 390, 2270, 690))
    paint_mark(draw, 3, (1110, 975), (1160, 720, 1695, 1055))
    paint_mark(draw, 4, (2285, 975), (1740, 720, 2270, 1055))

    # Box model.
    section_title(draw, 120, 1190, 2, "Box Model: 外から margin / border / padding / content")
    mini_box_model(draw, 135, 1300)
    code_box(
        draw,
        (700, 1300, 1510, 1710),
        ".card {\n  width: 320px;\n  margin: 24px;\n  border: 2px solid;\n  padding: 16px;\n  box-sizing: border-box;\n}",
        TEAL,
        28,
    )
    rounded(draw, (1560, 1300, 2335, 1710), PALE_YELLOW, None, radius=24)
    text(draw, (1600, 1335), "覚え方", 34, INK, True)
    tips = [
        "margin = 外側の余白",
        "padding = 内側の余白",
        "border-box = 指定幅にpaddingを含める",
        "DevToolsで色分け表示を確認する",
    ]
    for i, value in enumerate(tips):
        text(draw, (1600, 1410 + i * 68), f"• {value}", 27, INK)

    # Flex / Grid: diagrams adapted from the MDN basic-concepts guides.
    section_title(draw, 120, 1805, 3, "FlexboxとGrid")
    rounded(draw, (120, 1910, 1195, 2445), WHITE, LINE, 3, 28)
    chip(draw, 155, 1942, "Flexbox: 一方向", PALE_TEAL, TEAL)
    flex_main = contain_image(ASSET_DIR / "mdn-flex-main-axis.png", (970, 145))
    flex_cross = contain_image(ASSET_DIR / "mdn-flex-cross-axis.png", (970, 145))
    page.paste(flex_main, (170, 2010))
    page.paste(flex_cross, (170, 2160))
    text(draw, (155, 2320), "主軸に並べる → justify-content", 24, INK, True)
    text(draw, (155, 2362), "交差軸にそろえる → align-items", 24, INK, True)
    text(draw, (155, 2404), "親に display: flex; を指定", 22, TEAL, True)

    rounded(draw, (1265, 1910, 2340, 2445), WHITE, LINE, 3, 28)
    chip(draw, 1300, 1942, "Grid: 行と列", PALE_BLUE, BLUE)
    grid_lines = contain_image(ASSET_DIR / "mdn-grid-lines.png", (475, 285))
    grid_area = contain_image(ASSET_DIR / "mdn-grid-area.png", (475, 285))
    page.paste(grid_lines, (1300, 2015))
    page.paste(grid_area, (1815, 2015))
    text(draw, (1300, 2310), "線番号で置く", 23, INK, True)
    text(draw, (1815, 2310), "複数セルを領域にする", 23, INK, True)
    text(draw, (1300, 2360), "列: grid-template-columns: repeat(3, 1fr);", 22, BLUE, True)
    text(draw, (1300, 2404), "すき間: gap / 親に display: grid;", 22, BLUE, True)

    # Responsive.
    section_title(draw, 120, 2505, 4, "レスポンシブ: 狭い画面から考える")
    code_box(
        draw,
        (120, 2610, 1430, 2970),
        ".cards {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 16px;\n}\n\n@media (min-width: 768px) {\n  .cards { grid-template-columns: repeat(3, 1fr); }\n}",
        CORAL,
        27,
    )
    rounded(draw, (1490, 2610, 2340, 2970), PALE_CORAL, None, radius=24)
    text(draw, (1530, 2640), "崩れないための3ルール", 32, INK, True)
    responsive_tips = [
        "1. width: 100%だけに頼らない",
        "2. img { max-width: 100%; }",
        "3. 固定幅よりmin() / max-width",
        "4. 320pxから途中の幅も確認",
    ]
    for i, value in enumerate(responsive_tips):
        text(draw, (1530, 2710 + i * 58), value, 26, INK)

    # Debug checklist.
    section_title(draw, 120, 3065, 5, "レイアウトが崩れたら")
    checks = [
        "□ 親要素のdisplayを確認",
        "□ width + paddingがはみ出していない",
        "□ gapとmarginを二重に使っていない",
        "□ position:absoluteの基準親を確認",
        "□ DevToolsで不要なCSSをOFFにする",
        "□ 320 / 768 / 1024pxで再確認",
    ]
    for i, label in enumerate(checks):
        x = 140 + (i % 2) * 1120
        y = 3158 + (i // 2) * 70
        text(draw, (x, y), label, 27, INK, i < 2)

    text(
        draw,
        (120, 3338),
        "図の出典: Mozilla Contributors『フレックスボックスの基本概念』『グリッドレイアウトの基本概念』CC BY-SA 2.5以降",
        16,
        MUTED,
    )
    text(
        draw,
        (120, 3365),
        "developer.mozilla.org/ja/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts  |  developer.mozilla.org/ja/docs/Web/CSS/Guides/Grid_layout/Basic_concepts  ※縮尺・解説を追加",
        14,
        MUTED,
    )

    footer(draw, 2)
    output = ASSET_DIR / "css-layout-cheatsheet-a4.png"
    page.save(output, dpi=(300, 300), optimize=True)
    return output


def write_pdf(image_paths: list[Path], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output), pagesize=A4)
    page_w, page_h = A4
    for path in image_paths:
        pdf.drawImage(str(path), 0, 0, width=page_w, height=page_h)
        pdf.showPage()
    pdf.save()


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    ui = make_ui_sheet()
    css = make_css_sheet()
    write_pdf([ui], PDF_DIR / "ui-cheatsheet-a4.pdf")
    write_pdf([css], PDF_DIR / "css-layout-cheatsheet-a4.pdf")
    write_pdf([ui, css], PDF_DIR / "web-design-cheatsheets-a4.pdf")
    print(f"WROTE {ui}")
    print(f"WROTE {css}")
    print(f"WROTE {PDF_DIR / 'web-design-cheatsheets-a4.pdf'}")


if __name__ == "__main__":
    main()
