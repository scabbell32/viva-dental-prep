import os
import re
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
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 762, 'Viva Dental Prep — Chapter 11 Pharmacology Review & Answer Key')
            self.setStrokeColor(colors.HexColor('#CBD5E0'))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)
            
        # Footer
        self.setStrokeColor(colors.HexColor('#CBD5E0'))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        page_text = f'Page {self._pageNumber} of {page_count}'
        self.drawRightString(576, 32, page_text)
        self.drawString(36, 32, 'NBDHE Board Exam Review — Chapter 11 Pharmacology')
        self.restoreState()

def clean_md_inline(text):
    if not text:
        return ''
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\g<1></b>', text)
    text = re.sub(r'\*(.*?)\*', r'<i>\g<1></i>', text)
    text = re.sub(r'`(.*?)`', r'<b><font color="#2B6CB0">\g<1></font></b>', text)
    return text

def build_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), '../docs/Chapter_11_Questions_and_Answers.pdf')
    md_path = os.path.join(os.path.dirname(__file__), '../docs/Chapter_11_Questions_and_Answers.md')

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
        'DocH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
        textColor=colors.HexColor('#1A365D'),
        alignment=1,
        spaceAfter=3
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2B6CB0'),
        alignment=1,
        spaceAfter=10
    )
    q_title_style = ParagraphStyle(
        'QTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=colors.HexColor('#1A202C'),
        spaceBefore=6,
        spaceAfter=3
    )
    opt_style = ParagraphStyle(
        'OptStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#2D3748'),
        leftIndent=10,
        spaceAfter=2
    )
    ans_style = ParagraphStyle(
        'AnsStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#22543D'),
        spaceBefore=4,
        spaceAfter=3
    )
    rat_style = ParagraphStyle(
        'RatStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#2D3748'),
        spaceAfter=4
    )
    flag_style = ParagraphStyle(
        'FlagStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#744210'),
        backColor=colors.HexColor('#FEFCBF'),
        borderColor=colors.HexColor('#D69E2E'),
        borderWidth=0.5,
        borderPadding=4,
        spaceBefore=2,
        spaceAfter=5
    )

    story = []

    # Title Banner
    story.append(Paragraph('Viva Dental Prep', ParagraphStyle('SubTop', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor('#319795'), alignment=1, spaceAfter=2)))
    story.append(Paragraph('Chapter 11: Pharmacology Question Bank', h1_style))
    story.append(Paragraph('Complete NBDHE Board Exam Review Questions &amp; Clinical Rationales', h2_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2B6CB0'), spaceBefore=2, spaceAfter=10))

    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = content.split('---')
    for b in blocks:
        b = b.strip()
        if not b or b.startswith('# Chapter 11'):
            continue
        
        lines = b.split('\n')
        q_elements = []
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if line_str.startswith('### **Q'):
                q_text = clean_md_inline(line_str.replace('### ', ''))
                q_elements.append(Paragraph(q_text, q_title_style))
            elif line_str.startswith('* a.') or line_str.startswith('* b.') or line_str.startswith('* c.') or line_str.startswith('* d.'):
                opt_text = clean_md_inline(line_str.replace('* ', ''))
                q_elements.append(Paragraph(opt_text, opt_style))
            elif line_str.startswith('* **Correct Answer:**'):
                ans_text = clean_md_inline(line_str.replace('* ', ''))
                q_elements.append(Paragraph(ans_text, ans_style))
            elif line_str.startswith('* **Clinical Rationale:**'):
                continue
            elif line_str.startswith('> ⚠️'):
                flag_text = clean_md_inline(line_str.replace('> ', ''))
                q_elements.append(Paragraph(flag_text, flag_style))
            else:
                rat_text = clean_md_inline(line_str)
                q_elements.append(Paragraph(f'<b>Clinical Rationale:</b> {rat_text}', rat_style))
        
        q_elements.append(Spacer(1, 4))
        q_elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceBefore=3, spaceAfter=5))
        story.append(KeepTogether(q_elements))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f'Successfully built PDF at {pdf_path}!')

if __name__ == '__main__':
    build_pdf()
