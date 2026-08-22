import urllib.request
import json
import os
import sys
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
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont('Helvetica', 8)
        self.setFillColor(colors.HexColor('#4A5568'))
        
        if self._pageNumber > 1:
            self.drawString(36, 762, 'Viva Dental Prep — Chapters 9 & 10 Complete Question Bank & Answer Key')
            self.setStrokeColor(colors.HexColor('#CBD5E0'))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)
            
        self.setStrokeColor(colors.HexColor('#CBD5E0'))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        page_text = f'Page {self._pageNumber} of {page_count}'
        self.drawRightString(576, 32, page_text)
        self.drawString(36, 32, 'NBDHE Board Exam Review — Microbiology, Immunology & Infection Control')
        self.restoreState()

def clean_text(t):
    if not t:
        return ''
    return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def build_pdf():
    env_path = '/Users/shawncabbell/Downloads/viva-dental-prep/.env.local'
    env_vars = {}
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

    supabase_url = env_vars['NEXT_PUBLIC_SUPABASE_URL']
    service_role = env_vars['SUPABASE_SERVICE_ROLE_KEY']

    url_q = f'{supabase_url}/rest/v1/questions?week_number=eq.5&is_legacy=eq.false&order=chapter_tag.asc,sequence_order.asc&select=*'
    req_q = urllib.request.Request(url_q, headers={'apikey': service_role, 'Authorization': f'Bearer {service_role}'})
    with urllib.request.urlopen(req_q) as resp:
        questions = json.loads(resp.read().decode('utf-8'))

    url_c = f'{supabase_url}/rest/v1/case_sets?select=*'
    req_c = urllib.request.Request(url_c, headers={'apikey': service_role, 'Authorization': f'Bearer {service_role}'})
    with urllib.request.urlopen(req_c) as resp:
        case_sets = json.loads(resp.read().decode('utf-8'))

    case_map = {c['id']: c for c in case_sets}

    pdf_path = '/Users/shawncabbell/Downloads/viva-dental-prep/docs/Chapter_9_and_10_Complete_Questions_and_Answers.pdf'
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1A365D'),
        alignment=1,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#4A5568'),
        alignment=1,
        spaceAfter=12
    )
    ch_header_style = ParagraphStyle(
        'ChHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#1A365D'),
        spaceBefore=14,
        spaceAfter=8
    )
    q_title_style = ParagraphStyle(
        'QTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13.5,
        textColor=colors.HexColor('#2B6CB0')
    )
    q_stem_style = ParagraphStyle(
        'QStem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1A202C')
    )
    opt_style = ParagraphStyle(
        'QOpt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#2D3748'),
        leftIndent=12
    )
    ans_style = ParagraphStyle(
        'QAns',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1A202C')
    )
    case_style = ParagraphStyle(
        'CaseText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#2C5282')
    )

    story = []

    story.append(Paragraph('Viva Dental Prep — NBDHE Board Exam Question Bank', title_style))
    story.append(Paragraph('Complete Audited Question Bank with Case Scenarios, Correct Answer Keys & Clinical Rationales<br/><b>Chapter 9: Microbiology & Immunology &nbsp;|&nbsp; Chapter 10: Infection Control</b>', subtitle_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2B6CB0'), spaceAfter=10))

    ch9_qs = [q for q in questions if q['chapter_tag'] == 'ch9']
    ch10_qs = [q for q in questions if q['chapter_tag'] == 'ch10']

    def make_q_elements(q, global_idx):
        q_elems = []
        is_case = q.get('case_set_id') is not None
        case_info = case_map.get(q.get('case_set_id'), {}) if is_case else {}
        
        q_type_str = 'CASE-BASED QUESTION' if is_case else 'INDIVIDUAL QUESTION'
        q_head_text = f'<b>Question {global_idx}</b> &nbsp;&nbsp;<font color="#718096" size="8">[{q_type_str}]</font>'
        q_elems.append(Paragraph(q_head_text, q_title_style))
        q_elems.append(Spacer(1, 3))

        if is_case and case_info:
            c_label = clean_text(case_info.get('case_label', 'Case Scenario'))
            c_desc = clean_text(case_info.get('description', ''))
            c_full_text = f'<b>{c_label}</b>: {c_desc}'
            
            case_p = Paragraph(c_full_text, case_style)
            case_table = Table([[case_p]], colWidths=[540])
            case_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EBF8FF')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#BEE3F8')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            q_elems.append(case_table)
            q_elems.append(Spacer(1, 4))

        q_stem_cleaned = clean_text(q['question_text'])
        q_elems.append(Paragraph(q_stem_cleaned, q_stem_style))
        q_elems.append(Spacer(1, 4))

        for opt_key in ['a', 'b', 'c', 'd', 'e']:
            opt_val = q.get(f'option_{opt_key}')
            if opt_val:
                opt_val_cleaned = clean_text(opt_val)
                is_correct = (str(q.get('correct_option', '')).lower() == opt_key)
                if is_correct:
                    opt_line = f'<b>{opt_key.upper()}. {opt_val_cleaned}</b> <font color="#276749"><b>✓ [CORRECT ANSWER]</b></font>'
                else:
                    opt_line = f'<b>{opt_key.upper()}.</b> {opt_val_cleaned}'
                q_elems.append(Paragraph(opt_line, opt_style))
                q_elems.append(Spacer(1, 1.5))

        q_elems.append(Spacer(1, 4))

        corr_opt = clean_text(str(q.get('correct_option', '')).upper())
        explanation = clean_text(q.get('explanation', ''))
        ans_text = f'<b>Correct Answer: Option {corr_opt}</b><br/><b>Clinical Rationale:</b> {explanation}'
        ans_p = Paragraph(ans_text, ans_style)

        ans_table = Table([[ans_p]], colWidths=[540])
        ans_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F7FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E0')),
            ('LINELEFT', (0, 0), (0, 0), 3, colors.HexColor('#2B6CB0')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        q_elems.append(ans_table)
        q_elems.append(Spacer(1, 10))

        return KeepTogether(q_elems)

    story.append(Paragraph('CHAPTER 9: Microbiology & Immunology', ch_header_style))
    story.append(Paragraph('<i>Total Questions: 50 (40 Individual Review Questions + 10 Clinical Case-Based Questions)</i>', ParagraphStyle('Sub', fontName='Helvetica-Oblique', fontSize=9, textColor=colors.HexColor('#4A5568'))))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CBD5E0'), spaceBefore=4, spaceAfter=10))

    for idx, q in enumerate(ch9_qs, 1):
        story.append(make_q_elements(q, idx))

    story.append(PageBreak())

    story.append(Paragraph('CHAPTER 10: Infection Control', ch_header_style))
    story.append(Paragraph('<i>Total Questions: 50 (42 Individual Review Questions + 8 Clinical Case-Based Questions)</i>', ParagraphStyle('Sub', fontName='Helvetica-Oblique', fontSize=9, textColor=colors.HexColor('#4A5568'))))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#CBD5E0'), spaceBefore=4, spaceAfter=10))

    for idx, q in enumerate(ch10_qs, 1):
        story.append(make_q_elements(q, idx))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f'PDF successfully built at: {pdf_path}')

    art_dir = '/Users/shawncabbell/.gemini/antigravity-ide/brain/57d87529-259b-4111-91c9-8fa4e3240aa9'
    if os.path.exists(art_dir):
        art_pdf = os.path.join(art_dir, 'Chapter_9_and_10_Complete_Questions_and_Answers.pdf')
        shutil.copy(pdf_path, art_pdf)
        print(f'PDF copied to artifacts at: {art_pdf}')

if __name__ == '__main__':
    build_pdf()
