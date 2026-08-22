import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "Viva Dental Prep — Chapter 12: Nutrition & Biochemistry")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
            
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL — NBDHE Study Materials")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.restoreState()

def build_markdown_pdf(md_filename, pdf_filename, title, subtitle):
    pdf_path = os.path.join(os.path.dirname(__file__), f'../docs/{pdf_filename}')
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    with open(os.path.join(os.path.dirname(__file__), f'../docs/{md_filename}'), 'r') as f:
        md_text = f.read()

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=10,
        spaceAfter=6
    )
    p_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=13,
        textColor=colors.HexColor('#1E293B'),
        leftIndent=12,
        spaceAfter=3
    )
    quote_style = ParagraphStyle(
        'Quote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#0F766E'),
        leftIndent=15,
        spaceAfter=4
    )

    story = [Paragraph(title, title_style), Paragraph(subtitle, sub_style), Spacer(1, 10)]

    for line in md_text.split('\n'):
        line_s = line.strip()
        if not line_s:
            continue
        if line_s.startswith('# '):
            continue
        elif line_s.startswith('## '):
            story.append(Paragraph(line_s[3:], h2_style))
        elif line_s.startswith('### '):
            story.append(Paragraph(f"<b>{line_s[4:]}</b>", h2_style))
        elif line_s.startswith('* ') or line_s.startswith('- '):
            text = line_s[2:].replace('**', '<b>', 1).replace('**', '</b>', 1)
            story.append(Paragraph(f"• {text}", bullet_style))
        elif line_s.startswith('> '):
            text = line_s[2:].replace('**', '<b>', 1).replace('**', '</b>', 1)
            story.append(Paragraph(text, quote_style))
        elif line_s == '---':
            story.append(Spacer(1, 6))
        else:
            text = line_s.replace('**', '<b>', 1).replace('**', '</b>', 1)
            story.append(Paragraph(text, p_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Built PDF: docs/{pdf_filename}")

build_markdown_pdf('Chapter_12_Study_Guide_English.md', 'Chapter_12_Study_Guide_English.pdf', 'Chapter 12: High-Yield NBDHE Study Guide', 'Biochemistry, Nutrition, and Nutritional Counseling (English)')
build_markdown_pdf('Chapter_12_Study_Guide_Spanish.md', 'Chapter_12_Study_Guide_Spanish.pdf', 'Capítulo 12: Guía de Estudio de Alto Rendimiento NBDHE', 'Bioquímica, Nutrición y Consejería Nutricional (Español)')
build_markdown_pdf('Chapter_12_Bilingual_Role_Play_Dialogues.md', 'Chapter_12_Bilingual_Role_Play_Dialogues.pdf', 'Chapter 12: Bilingual Clinical Role-Play Dialogues', 'Nutritional Counseling & Cariology Patient Communication (English & Spanish)')
