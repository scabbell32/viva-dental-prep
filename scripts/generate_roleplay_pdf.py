import os
import re
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
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
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#4A5568'))
        
        if self._pageNumber > 1:
            self.drawString(36, 762, 'Viva Dental Prep — Chapters 9 & 10 Clinical Role-Play Dialogues')
            self.setStrokeColor(colors.HexColor('#CBD5E0'))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)
            
        self.setStrokeColor(colors.HexColor('#CBD5E0'))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        page_text = f'Page {self._pageNumber} of {page_count}'
        self.drawRightString(576, 32, page_text)
        self.drawString(36, 32, 'NBDHE Clinical Role-Play Scripts for Spanish-Speaking Students')
        self.restoreState()

def clean_md_inline(text):
    if not text:
        return ''
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Replace triple asterisks ***text*** first
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<b><i>\1</i></b>', text)
    # Replace double asterisks **text**
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Replace single asterisk *text*
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    # Replace markdown code `text`
    text = re.sub(r'`(.*?)`', r'<b><font color="#2B6CB0">\1</font></b>', text)
    return text

def build_roleplay_pdf():
    md_path = '/Users/shawncabbell/Downloads/viva-dental-prep/docs/Chapter_9_and_10_Bilingual_Role_Play_Dialogues.md'
    pdf_path = '/Users/shawncabbell/Downloads/viva-dental-prep/docs/Chapter_9_and_10_Bilingual_Role_Play_Dialogues.pdf'

    with open(md_path) as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    h1_style = ParagraphStyle(
        'DocH1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#1A365D'), alignment=1, spaceAfter=4
    )
    h2_style = ParagraphStyle(
        'DocH2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=colors.HexColor('#2B6CB0'), spaceBefore=12, spaceAfter=6
    )
    h3_style = ParagraphStyle(
        'DocH3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=14.5, textColor=colors.HexColor('#2C5282'), spaceBefore=8, spaceAfter=4
    )
    body_style = ParagraphStyle(
        'DocBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=colors.HexColor('#1A202C'), spaceAfter=4
    )
    dialogue_style = ParagraphStyle(
        'DocDialogue', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor('#2D3748'), leftIndent=10, spaceAfter=5
    )
    table_cell_style = ParagraphStyle(
        'TCell', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#1A202C')
    )
    table_cell_bold = ParagraphStyle(
        'TCellB', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=colors.HexColor('#1A365D')
    )
    quote_style = ParagraphStyle(
        'QuoteText', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=9, leading=13, textColor=colors.HexColor('#2C5282')
    )

    story = []

    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        if line.startswith('---'):
            story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CBD5E0'), spaceBefore=8, spaceAfter=8))
            i += 1
            continue

        if line.startswith('# '):
            text = clean_md_inline(line[2:])
            story.append(Paragraph(text, h1_style))
            i += 1
            continue

        if line.startswith('## '):
            text = clean_md_inline(line[3:])
            story.append(Paragraph(text, h2_style))
            i += 1
            continue

        if line.startswith('### '):
            text = clean_md_inline(line[4:])
            story.append(Paragraph(text, h3_style))
            i += 1
            continue

        # Tables
        if line.startswith('|') and '|' in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1

            data = []
            for t_idx, t_line in enumerate(table_lines):
                if t_idx == 1 and ('---' in t_line or ':-' in t_line):
                    continue
                cells = [c.strip() for c in t_line.split('|')[1:-1]]
                row_cells = []
                for cell in cells:
                    cell_text = clean_md_inline(cell)
                    if t_idx == 0:
                        row_cells.append(Paragraph(cell_text, table_cell_bold))
                    else:
                        row_cells.append(Paragraph(cell_text, table_cell_style))
                if row_cells:
                    data.append(row_cells)

            if data:
                num_cols = len(data[0])
                if num_cols == 4:
                    col_widths = [100, 120, 160, 160]
                else:
                    col_widths = [540 // num_cols] * num_cols

                t = Table(data, colWidths=col_widths)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EDF2F7')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E0')),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                    ('PADDING', (0, 0), (-1, -1), 4),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                story.append(Spacer(1, 4))
                story.append(t)
                story.append(Spacer(1, 6))
            continue

        if line.startswith('> '):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('> '):
                quote_lines.append(clean_md_inline(lines[i].strip()[2:]))
                i += 1
            quote_text = '<br/>'.join(quote_lines)
            quote_p = Paragraph(quote_text, quote_style)
            quote_t = Table([[quote_p]], colWidths=[540])
            quote_t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F7FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E0')),
                ('LINELEFT', (0, 0), (0, 0), 3, colors.HexColor('#2B6CB0')),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(Spacer(1, 4))
            story.append(quote_t)
            story.append(Spacer(1, 4))
            continue

        # Check for dialogue lines (e.g. **Ilmary (Beginner)**: ...)
        if re.match(r'^\*\*(.*?)\*\*\:', line):
            text = clean_md_inline(line)
            story.append(Paragraph(text, dialogue_style))
            i += 1
            continue

        text = clean_md_inline(line)
        story.append(Paragraph(text, body_style))
        i += 1

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f'Role Play PDF successfully built at: {pdf_path}')

    art_dir = '/Users/shawncabbell/.gemini/antigravity-ide/brain/57d87529-259b-4111-91c9-8fa4e3240aa9'
    if os.path.exists(art_dir):
        art_pdf = os.path.join(art_dir, 'Chapter_9_and_10_Bilingual_Role_Play_Dialogues.pdf')
        shutil.copy(pdf_path, art_pdf)
        print(f'Role Play PDF copied to artifacts at: {art_pdf}')

if __name__ == '__main__':
    build_roleplay_pdf()
