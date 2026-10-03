from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "milo-and-the-little-cloud.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = landscape((11 * inch, 8.5 * inch))
ART_H = 4.55 * inch
MARGIN = 0.55 * inch

INK = colors.HexColor("#294452")
GREEN = colors.HexColor("#5D9F79")
DEEP_GREEN = colors.HexColor("#39745D")
CORAL = colors.HexColor("#E27D5F")
GOLD = colors.HexColor("#EFC86D")
CREAM = colors.HexColor("#FFFAF0")

styles = getSampleStyleSheet()
title_style = ParagraphStyle("title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=29, leading=32, textColor=INK, alignment=TA_CENTER, spaceAfter=8)
subtitle_style = ParagraphStyle("subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=16, textColor=DEEP_GREEN, alignment=TA_CENTER)
story_style = ParagraphStyle("story", parent=styles["BodyText"], fontName="Helvetica", fontSize=15, leading=21, textColor=INK, alignment=TA_LEFT)
toc_style = ParagraphStyle("toc", parent=styles["BodyText"], fontName="Helvetica", fontSize=14, leading=23, textColor=INK, alignment=TA_LEFT)
small_style = ParagraphStyle("small", parent=styles["BodyText"], fontName="Helvetica", fontSize=10, leading=14, textColor=DEEP_GREEN, alignment=TA_CENTER)


def rounded(c, x, y, w, h, radius, fill, stroke=None, width=1):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(width)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)


def draw_footer(c, page_number):
    c.setStrokeColor(colors.HexColor("#D9E8DD"))
    c.setLineWidth(0.7)
    c.line(MARGIN, 0.36 * inch, PAGE_W - MARGIN, 0.36 * inch)
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#66818A"))
    c.drawCentredString(PAGE_W / 2, 0.18 * inch, f"Milo and the Little Cloud  |  {page_number}")


def draw_sky(c, top_y, height, dry=False):
    c.setFillColor(colors.HexColor("#DFF4F5") if not dry else colors.HexColor("#F7E6C5"))
    c.rect(0, top_y - height, PAGE_W, height, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFF1A8"))
    c.circle(PAGE_W - 1.1 * inch, top_y - 0.7 * inch, 0.35 * inch, fill=1, stroke=0)


def draw_hills(c, bottom_y, dry=False):
    c.setFillColor(colors.HexColor("#86B98B") if not dry else colors.HexColor("#B9A56F"))
    p = c.beginPath()
    p.moveTo(0, bottom_y)
    p.curveTo(1.5 * inch, bottom_y + 0.6 * inch, 3 * inch, bottom_y - 0.1 * inch, 4.6 * inch, bottom_y + 0.45 * inch)
    p.curveTo(6.6 * inch, bottom_y + 1.05 * inch, 8.5 * inch, bottom_y + 0.1 * inch, PAGE_W, bottom_y + 0.7 * inch)
    p.lineTo(PAGE_W, 0)
    p.lineTo(0, 0)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#6A9D70") if not dry else colors.HexColor("#A28B5F"))
    c.rect(0, 0, PAGE_W, max(0, bottom_y), fill=1, stroke=0)


def draw_tree(c, x, y, scale=1, dry=False):
    u = inch * scale
    c.setFillColor(colors.HexColor("#8F5D45"))
    c.roundRect(x - 0.1 * u, y, 0.2 * u, 1.2 * u, 0.08 * u, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#4F8D6F") if not dry else colors.HexColor("#9E875C"))
    c.circle(x, y + 1.45 * u, 0.42 * u, fill=1, stroke=0)
    c.circle(x - 0.32 * u, y + 1.28 * u, 0.32 * u, fill=1, stroke=0)
    c.circle(x + 0.32 * u, y + 1.28 * u, 0.32 * u, fill=1, stroke=0)


def draw_milo(c, x, y, scale=1, waving=False):
    u = inch * scale
    c.setFillColor(colors.HexColor("#E77B4F"))
    c.ellipse(x - 0.46 * u, y, x + 0.46 * u, y + 0.68 * u, fill=1, stroke=0)
    c.wedge(x - 0.55 * u, y + 0.35 * u, x + 0.55 * u, y + 1.3 * u, 0, 180, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#F7C2A0"))
    c.wedge(x - 0.4 * u, y + 0.75 * u, x - 0.05 * u, y + 1.15 * u, 0, 180, fill=1, stroke=0)
    c.wedge(x + 0.05 * u, y + 0.75 * u, x + 0.4 * u, y + 1.15 * u, 0, 180, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFF0D2"))
    c.ellipse(x - 0.27 * u, y + 0.48 * u, x + 0.27 * u, y + 0.95 * u, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#513B32"))
    c.circle(x - 0.12 * u, y + 0.78 * u, 0.045 * u, fill=1, stroke=0)
    c.circle(x + 0.12 * u, y + 0.78 * u, 0.045 * u, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#513B32"))
    c.setLineWidth(2 * scale)
    c.arc(x - 0.1 * u, y + 0.59 * u, x + 0.1 * u, y + 0.74 * u, 200, 140)
    c.setStrokeColor(GREEN)
    c.setLineWidth(5 * scale)
    c.line(x - 0.38 * u, y + 0.44 * u, x + 0.38 * u, y + 0.44 * u)
    c.setFillColor(colors.HexColor("#8F5D45"))
    c.roundRect(x + 0.32 * u, y + 0.16 * u, 0.16 * u, 0.45 * u, 0.04 * u, fill=1, stroke=0)
    if waving:
        c.setStrokeColor(colors.HexColor("#E77B4F"))
        c.setLineWidth(6 * scale)
        c.line(x + 0.32 * u, y + 0.5 * u, x + 0.75 * u, y + 0.9 * u)


def draw_puff(c, x, y, scale=1, raining=False):
    u = inch * scale
    c.setFillColor(colors.HexColor("#FFFDF6"))
    c.setStrokeColor(colors.HexColor("#D7E8EE"))
    c.setLineWidth(2)
    c.circle(x - 0.33 * u, y + 0.1 * u, 0.27 * u, fill=1, stroke=1)
    c.circle(x, y + 0.22 * u, 0.34 * u, fill=1, stroke=1)
    c.circle(x + 0.32 * u, y + 0.1 * u, 0.27 * u, fill=1, stroke=1)
    c.roundRect(x - 0.55 * u, y - 0.12 * u, 1.1 * u, 0.38 * u, 0.18 * u, fill=1, stroke=1)
    c.setFillColor(colors.HexColor("#334C5C"))
    c.circle(x - 0.17 * u, y + 0.12 * u, 0.045 * u, fill=1, stroke=0)
    c.circle(x + 0.17 * u, y + 0.12 * u, 0.045 * u, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#334C5C"))
    c.setLineWidth(1.8)
    c.arc(x - 0.11 * u, y - 0.04 * u, x + 0.11 * u, y + 0.1 * u, 200, 140)
    if raining:
        c.setStrokeColor(colors.HexColor("#5AA7C4"))
        c.setLineWidth(1.5)
        for dx in (-0.3, 0, 0.3):
            c.line(x + dx * u, y - 0.2 * u, x + dx * u, y - 0.42 * u)


def draw_rainbow(c, x, y):
    for color, offset in [(colors.red, 0), (colors.orange, 7), (colors.yellow, 14), (colors.green, 21), (colors.blue, 28)]:
        c.setStrokeColor(color)
        c.setLineWidth(5)
        c.arc(x - 1.45 * inch, y - 0.65 * inch, x + 1.45 * inch, y + 1.85 * inch, 0, 180)


def draw_art(c, key):
    top = PAGE_H - 0.48 * inch
    bottom = top - ART_H
    dry = key == "dry"
    c.saveState()
    clip = c.beginPath()
    clip.rect(0, bottom, PAGE_W, ART_H)
    c.clipPath(clip, stroke=0, fill=0)
    draw_sky(c, top, ART_H, dry=dry)
    draw_hills(c, bottom + 0.35 * inch, dry=dry)
    for x in (0.8, 2.25, 9.6, 10.5):
        draw_tree(c, x * inch, bottom + 0.25 * inch, 0.65, dry=dry)
    if key == "discovery":
        draw_milo(c, 3.1 * inch, bottom + 0.4 * inch, 0.95, waving=True)
        draw_puff(c, 6.8 * inch, bottom + 2.4 * inch, 0.85)
        c.setStrokeColor(colors.HexColor("#8F5D45")); c.setLineWidth(12); c.line(6.1 * inch, bottom + 0.6 * inch, 7.5 * inch, bottom + 3.05 * inch)
    elif key == "wind":
        draw_milo(c, 3.1 * inch, bottom + 0.35 * inch, 0.9)
        draw_puff(c, 7 * inch, bottom + 2.6 * inch, 0.75)
        c.setStrokeColor(colors.HexColor("#95C8D0")); c.setLineWidth(4)
        for y in (bottom + 1.4 * inch, bottom + 2.0 * inch, bottom + 2.6 * inch):
            c.arc(4.3 * inch, y, 8.5 * inch, y + 0.55 * inch, 10, 160)
        c.setFillColor(colors.HexColor("#6E4A3A")); c.circle(8.2 * inch, bottom + 0.45 * inch, 0.28 * inch, fill=1, stroke=0)
        for x in (7.8, 8.2, 8.6):
            c.setFillColor(colors.HexColor("#783F94")); c.circle(x * inch, bottom + 0.72 * inch, 0.09 * inch, fill=1, stroke=0)
    elif key == "mountain":
        c.setFillColor(colors.HexColor("#7FAF91")); p = c.beginPath(); p.moveTo(2 * inch, bottom); p.lineTo(5.6 * inch, bottom + 3.2 * inch); p.lineTo(9.3 * inch, bottom); p.close(); c.drawPath(p, fill=1, stroke=0)
        draw_milo(c, 4.1 * inch, bottom + 0.45 * inch, 0.72)
        draw_puff(c, 5.7 * inch, bottom + 2.95 * inch, 0.7)
    elif key == "dry":
        draw_milo(c, 3.2 * inch, bottom + 0.4 * inch, 0.85)
        draw_puff(c, 7.0 * inch, bottom + 2.4 * inch, 0.75)
        for x in (5.0, 6.0, 8.6):
            c.setStrokeColor(colors.HexColor("#96794A")); c.setLineWidth(2); c.line(x * inch, bottom + 0.3 * inch, x * inch, bottom + 0.75 * inch)
            c.setStrokeColor(colors.HexColor("#C4A65C")); c.line(x * inch, bottom + 0.5 * inch, (x - 0.2) * inch, bottom + 0.75 * inch); c.line(x * inch, bottom + 0.5 * inch, (x + 0.2) * inch, bottom + 0.75 * inch)
    elif key == "rain":
        draw_milo(c, 3.3 * inch, bottom + 0.35 * inch, 0.85)
        draw_puff(c, 6.8 * inch, bottom + 2.45 * inch, 0.8, raining=True)
        c.setFillColor(colors.HexColor("#F2C86B")); c.circle(6.8 * inch, bottom + 0.65 * inch, 0.13 * inch, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#5AA7C4")); c.setLineWidth(2)
        for dx in (-0.35, 0, 0.35): c.line((6.8 + dx) * inch, bottom + 2.0 * inch, (6.8 + dx) * inch, bottom + 0.9 * inch)
    elif key == "rainbow":
        draw_milo(c, 3.0 * inch, bottom + 0.35 * inch, 0.8, waving=True)
        draw_puff(c, 7.6 * inch, bottom + 2.4 * inch, 0.75)
        draw_rainbow(c, 6.3 * inch, bottom + 1.3 * inch)
        for x in (4.7, 5.4, 8.6):
            c.setFillColor(colors.HexColor("#F6D67A")); c.circle(x * inch, bottom + 0.45 * inch, 0.12 * inch, fill=1, stroke=0)
    elif key == "friends":
        draw_milo(c, 3.1 * inch, bottom + 0.35 * inch, 0.78)
        draw_puff(c, 6.1 * inch, bottom + 2.1 * inch, 0.7)
        draw_puff(c, 8.2 * inch, bottom + 2.6 * inch, 1.05)
        draw_puff(c, 9.6 * inch, bottom + 2.1 * inch, 0.85)
    elif key == "ending":
        draw_milo(c, 3.2 * inch, bottom + 0.35 * inch, 0.8, waving=True)
        draw_puff(c, 6.2 * inch, bottom + 2.3 * inch, 0.78, raining=True)
        draw_puff(c, 8.4 * inch, bottom + 2.8 * inch, 0.52)
        draw_rainbow(c, 7 * inch, bottom + 1.25 * inch)
    else:
        draw_milo(c, 3.5 * inch, bottom + 0.35 * inch, 0.88, waving=True)
        draw_puff(c, 7.1 * inch, bottom + 2.55 * inch, 0.85)
    c.restoreState()
    rounded(c, MARGIN, bottom - 0.04 * inch, PAGE_W - 2 * MARGIN, ART_H + 0.08 * inch, 16, colors.transparent, colors.HexColor("#FFFFFF"), 1.4)


STORY = [
    ("discovery", "A tiny friend", "Milo finds Puff caught between two branches. Puff feels small and slow, so Milo promises to help.", "Who should help Puff?"),
    ("wind", "Try together", "At Windy Hill, the breeze lifts Puff and sends the little cloud toward a bush of purple berries. Plop!", "Which idea should we try?"),
    ("mountain", "Be brave", "Milo and Puff climb Sunbeam Mountain. They are scared, but they try together. Puff floats, then drifts gently down.", "What did Puff learn?"),
    ("dry", "A forest in need", "The sun grows hot. Flowers bend low, the river grows narrow, and the animals need water.", "Can a small cloud help?"),
    ("rain", "A little drop", "Puff remembers the thirsty flowers, rabbits, and frogs. One cool drop falls. Then another.", "What happens next?"),
    ("rainbow", "A big difference", "Gentle rain fills the stream and opens the flowers. Everyone dances beneath a little rainbow.", "How does the forest feel?"),
    ("friends", "Every gift matters", "The big clouds see what Puff has done. The sky needs every kind of cloud.", "Does Puff belong?"),
    ("ending", "Welcome, friend", "Milo and Puff visit the forest every morning. When a new cloud arrives, Puff makes room for one more friend.", "What will you do for a new friend?"),
]


def draw_paragraph(c, text, style, x, y_top, w, h):
    p = Paragraph(text, style)
    _, ph = p.wrap(w, h)
    p.drawOn(c, x, y_top - ph)
    return ph


def main():
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Milo and the Little Cloud")

    # Cover
    draw_art(c, "cover")
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.84))
    c.roundRect(1.1 * inch, 0.88 * inch, PAGE_W - 2.2 * inch, 1.2 * inch, 22, fill=1, stroke=0)
    draw_paragraph(c, "Milo and the Little Cloud", title_style, 1.3 * inch, 1.82 * inch, PAGE_W - 2.6 * inch, 0.5 * inch)
    draw_paragraph(c, "An interactive picture book about friendship, courage, and small changes", subtitle_style, 1.4 * inch, 1.22 * inch, PAGE_W - 2.8 * inch, 0.35 * inch)
    draw_footer(c, 1)
    c.showPage()

    # Table of contents
    c.setFillColor(CREAM); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    draw_paragraph(c, "Table of Contents", title_style, MARGIN, PAGE_H - 0.78 * inch, PAGE_W - 2 * MARGIN, 0.55 * inch)
    c.setStrokeColor(colors.HexColor("#D9E8DD")); c.setLineWidth(1); c.line(2.0 * inch, PAGE_H - 1.38 * inch, PAGE_W - 2.0 * inch, PAGE_H - 1.38 * inch)
    toc_y = PAGE_H - 1.85 * inch
    for idx, (_, title, _, _) in enumerate(STORY, start=3):
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 14); c.drawString(1.2 * inch, toc_y, title)
        c.setFillColor(DEEP_GREEN); c.setFont("Helvetica", 14); c.drawRightString(PAGE_W - 1.2 * inch, toc_y, str(idx))
        c.setStrokeColor(colors.HexColor("#C8DCD0")); c.setDash(2, 4); c.line(3.2 * inch, toc_y + 3, PAGE_W - 1.6 * inch, toc_y + 3); c.setDash()
        toc_y -= 0.46 * inch
    draw_paragraph(c, "Read the story, choose an action, and notice how every choice helps the forest.", small_style, 1.5 * inch, 1.18 * inch, PAGE_W - 3 * inch, 0.4 * inch)
    draw_footer(c, 2)
    c.showPage()

    # Story pages
    for page_number, (key, title, text, question) in enumerate(STORY, start=3):
        c.setFillColor(CREAM); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        draw_art(c, key)
        text_top = PAGE_H - ART_H - 0.72 * inch
        draw_paragraph(c, title, ParagraphStyle("page-title", parent=title_style, fontSize=22, leading=25, alignment=TA_LEFT), MARGIN, text_top, PAGE_W - 2 * MARGIN, 0.38 * inch)
        draw_paragraph(c, text, story_style, MARGIN, text_top - 0.48 * inch, PAGE_W - 2 * MARGIN, 0.8 * inch)
        rounded(c, MARGIN, 0.61 * inch, PAGE_W - 2 * MARGIN, 0.36 * inch, 10, colors.HexColor("#F6EFD7"))
        c.setFillColor(DEEP_GREEN); c.setFont("Helvetica-Bold", 10); c.drawString(MARGIN + 0.14 * inch, 0.735 * inch, question)
        draw_footer(c, page_number)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
