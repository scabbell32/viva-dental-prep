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
        self.doc_title = kwargs.pop('doc_title', 'Viva Dental Prep — Chapter 11 Clinical Role-Play Dialogues')
        self.sub_title = kwargs.pop('sub_title', 'NBDHE Chairside Patient Communications & Pharmacology')
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
            self.drawString(36, 762, self.doc_title)
            self.setStrokeColor(colors.HexColor('#CBD5E0'))
            self.setLineWidth(0.5)
            self.line(36, 756, 576, 756)
            
        # Footer
        self.setStrokeColor(colors.HexColor('#CBD5E0'))
        self.setLineWidth(0.5)
        self.line(36, 45, 576, 45)
        page_text = f'Page {self._pageNumber} of {page_count}'
        self.drawRightString(576, 32, page_text)
        self.drawString(36, 32, self.sub_title)
        self.restoreState()

def clean_md_inline(text):
    if not text:
        return ''
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<b><i>\g<1></i></b>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\g<1></b>', text)
    text = re.sub(r'(?<![<a-zA-Z/])\*(?!\s)([^*]+?)(?<!\s)\*(?![>a-zA-Z])', r'<i>\g<1></i>', text)
    text = re.sub(r'`(.*?)`', r'<b><font color="#2B6CB0">\g<1></font></b>', text)
    return text

ROLEPLAY_MD = """# Viva Dental Prep — Chapter 11 Clinical Role-Play Dialogues
## Interactive Learning Scripts for Spanish-Speaking Dental Hygiene Students
### (Chairside Patient Communications & NBDHE Pharmacology Mastery)

---

## 🎯 ABOUT THESE ROLE PLAYS / ACERCA DE ESTOS JUEGOS DE ROL

These role-play scripts are designed specifically for native Spanish-speaking dental hygiene students to practice **chairside patient communication** in English while reinforcing core NBDHE pharmacology board exam concepts.

The scripts simulate realistic dental operatory interactions featuring 3 levels of English proficiency:
1. **Dental Assistant (Beginner English)**: Takes vitals, asks medical history questions, and reviews prescription medications.
2. **Dental Hygienist (Intermediate English)**: Conducts intraoral examination, identifies pharmacological oral side effects (gingival hyperplasia, xerostomia, bleeding risk), and provides empathetic patient education.
3. **Dentist (Advanced English)**: Conducts doctor exam, explains drug mechanisms, systemic interactions, and connects clinical findings to NBDHE board questions.

---

# 📖 ROLE PLAY 1: CARDIOVASCULAR PHARMACOLOGY & BLEEDING RISK
## Clinical Setting: Dental Hygiene Appointment & Periodontal Assessment
### **Patient**: Mr. Robert Vance (62 y/o male, taking Nifedipine for hypertension, Lovastatin for high cholesterol, and daily 81 mg Aspirin)
### **Clinical Team Characters**:
* **Ilmary** *(Beginner English)*: Dental Assistant (taking vitals and medication review).
* **Nancy** *(Intermediate English)*: Registered Dental Hygienist (RDH) (evaluating gingival tissue and bleeding).
* **Dr. Christopher** *(Advanced English)*: Dentist (explaining pharmacology concepts and board connections).

---

### 💬 CHAIRSIDE CLINICAL SCRIPT: SCENARIO 1

**Ilmary (Dental Assistant - Beginner)**: Good morning, Mr. Vance! Welcome to our clinic. How are you feeling today?

**Mr. Robert Vance (Patient)**: Good morning, Ilmary. I am doing well, but I noticed my gums look swollen and puffy in the front, and they bleed whenever I brush.

**Ilmary (Dental Assistant - Beginner)**: Thank you for letting us know, Mr. Vance. Let me check your blood pressure. Your blood pressure is 132 over 82. Let us review your daily medications. You are currently taking Nifedipine, Lovastatin, and daily Aspirin. Do you take any other supplements or drink grapefruit juice?

**Mr. Robert Vance (Patient)**: I used to drink grapefruit juice with breakfast, but my cardiologist told me to stop. Why is that?

**Nancy (Hygienist - Intermediate)**: That was very important advice, Mr. Vance! Grapefruit juice blocks an enzyme in your intestine called CYP3A4 (**Board Question #6**). When that enzyme is blocked, your body cannot break down medications like Nifedipine and Lovastatin (**Board Question #10**), which causes the medicine levels in your blood to become dangerously high.

**Mr. Robert Vance (Patient)**: Wow, I had no idea fruit juice could interact with blood pressure pills like that!

**Nancy (Hygienist - Intermediate)**: Yes, it is a very common interaction. Now, let me examine your gums. I see firm, enlarged pink tissue in between your teeth, especially in the front. This condition is called **Drug-Induced Gingival Hyperplasia** (**Board Question #15**). It is a well-known side effect of your calcium channel blocker, Nifedipine (**Board Question #11**).

**Mr. Robert Vance (Patient)**: Will my gums go back to normal? And why are they bleeding so much today?

**Dr. Christopher (Dentist - Advanced)**: Good morning, Mr. Vance! Dr. Christopher here. Nancy's evaluation is spot-on. Calcium channel blockers cause fibrous overgrowth of the gingival tissue. Excellent plaque control and thorough scaling and root planing will significantly reduce the inflammation. Regarding your bleeding: because you take daily aspirin therapy, aspirin **irreversibly binds to your blood platelets** for their entire 7 to 10 day lifespan (**Board Question #16**). This prevents blood clotting and causes prolonged bleeding during scaling, which we manage with localized pressure and gentle instrumentation.

**Mr. Robert Vance (Patient)**: Thank you so much for explaining! I feel much more confident about my treatment today.

---

### 🔤 VOCABULARY & PRONUNCIATION GUIDE — SCENARIO 1

| English Term | Spanish Translation | Simple Definition | Pronunciation Guide |
| :--- | :--- | :--- | :--- |
| **Gingival Hyperplasia** | Hiperplasia Gingival | Drug-induced overgrowth of gum tissue. | *JIN-jih-vul hye-per-PLAY-zhuh* |
| **Calcium Channel Blocker** | Bloqueador de Canales de Calcio | Drug that lowers blood pressure (nifedipine). | *KAL-see-um CHAN-ul BLOK-er* |
| **Irreversible Platelet Binding** | Unión Plaquetaria Irreversible | Aspirin's permanent inhibition of clotting cells. | *eer-ee-VER-sih-bul PLAYT-let* |
| **Enzyme Inhibition** | Inhibición Enzimática | Slowing down the chemical breakdown of drugs. | *EN-zyme in-hih-BISH-un* |
| **Subgingival Scaling** | Raspado Subgingival | Deep cleaning beneath the gumline. | *sub-JIN-jih-vul SKAY-ling* |

---

# 📖 ROLE PLAY 2: ANTIMICROBIALS, DENTAL ANXIETY & ANALGESICS
## Clinical Setting: Emergency Consultation & Dental Pain Evaluation
### **Patient**: Mrs. Sofia Martinez (35 y/o female, experiencing severe dental abscess pain and severe dental anxiety)
### **Clinical Team Characters**:
* **Ilmary** *(Beginner English)*: Dental Assistant (seating patient, recognizing anxiety symptoms).
* **Nancy** *(Intermediate English)*: Registered Dental Hygienist (RDH) (reviewing antibiotic instructions).
* **Dr. Christopher** *(Advanced English)*: Dentist (prescribing medication and explaining emergency protocols).

---

### 💬 CHAIRSIDE CLINICAL SCRIPT: SCENARIO 2

**Ilmary (Dental Assistant - Beginner)**: Hello Mrs. Martinez. I see that your hands are shaking. Are you feeling very nervous about today's dental procedure?

**Mrs. Sofia Martinez (Patient)**: Yes, Ilmary... I have terrible dental anxiety. My heart is racing, and my toothache on the lower right is unbearable. I couldn't sleep last night!

**Nancy (Hygienist - Intermediate)**: We understand completely, Mrs. Martinez. You are in safe hands. For patients with acute dental anxiety, Dr. Christopher can prescribe an oral medication such as **Alprazolam** (Xanax) before your next visit (**Board Question #30**). It is a short-acting benzodiazepine that calms your nervous system during dental visits.

**Mrs. Sofia Martinez (Patient)**: My friend recommended Ambien (Zolpidem). Could I take that instead?

**Dr. Christopher (Dentist - Advanced)**: Good morning, Mrs. Martinez! I would advise against Zolpidem for dental anxiety. Zolpidem is a sleep medication for insomnia and carries warnings for parasomnias such as sleep-walking, sleep-eating, and sleep-driving (**Board Question #21**). For dental procedural anxiety, Alprazolam is far more effective. Now, looking at your X-ray, you have an acute odontogenic infection. I am going to prescribe **Metronidazole** along with an analgesic.

**Nancy (Hygienist - Intermediate)**: Mrs. Martinez, this is very important: while taking Metronidazole, you must **strictly avoid all alcohol**, including **mouth rinses containing alcohol** (**Board Question #5**). If you consume alcohol with Metronidazole, it will cause a severe disulfiram reaction with violent nausea, vomiting, and chest flushing.

**Mrs. Sofia Martinez (Patient)**: I will be very careful with mouthwashes! And what can I take for the pain? I have mild kidney problems.

**Dr. Christopher (Dentist - Advanced)**: Excellent question! Because you have renal impairment, you should **avoid NSAIDs like Ibuprofen and Naproxen**, because NSAIDs reduce blood flow to the kidneys. The safest analgesic for you is **Acetaminophen (Tylenol)** (**Board Question #27**), because it is processed by the liver. Just make sure never to exceed 3,000 mg in a day to protect your liver (**Board Question #26**).

**Mrs. Sofia Martinez (Patient)**: Thank you, Doctor and team! I feel so much calmer knowing what to expect.

---

### 🔤 VOCABULARY & PRONUNCIATION GUIDE — SCENARIO 2

| English Term | Spanish Translation | Simple Definition | Pronunciation Guide |
| :--- | :--- | :--- | :--- |
| **Dental Anxiety** | Ansiedad Dental | Fear or apprehension related to dental care. | *DEN-tul ang-ZYE-eh-tee* |
| **Benzodiazepine** | Benzodiacepina | Calming medication class (e.g., alprazolam). | *ben-zoh-dye-AY-zuh-peen* |
| **Disulfiram Reaction** | Reacción Tipo Disulfiram | Severe nausea from mixing metronidazole with alcohol. | *dye-SUL-fih-ram ree-AK-shun* |
| **Hepatotoxicity** | Hepatotoxicidad | Chemical-driven liver damage (acetaminophen overdose). | *heh-PAT-oh-tok-SIS-ih-tee* |
| **Renal Impairment** | Insuficiencia Renal | Reduced kidney function. | *REE-nul im-PAIR-ment* |

---

### 💡 CLINICAL & BOARD EXAM PEARLS — CHAPTER 11

> [!IMPORTANT]
> **Key Takeaways for Dental Hygiene Practice:**
> 1. **Gingival Hyperplasia Triumvirate**: Calcium Channel Blockers (nifedipine), Anticonvulsants (phenytoin), and Immunosuppressants (cyclosporine).
> 2. **Metronidazole Alcohol Ban**: Instruct patients to avoid alcohol and alcohol mouth rinses for 48–72 hours after therapy.
> 3. **Analgesic Selection**: Acetaminophen for renal patients; avoid NSAIDs in kidney disease and pregnancy.
"""

def main():
    md_path = 'docs/Chapter_11_Bilingual_Role_Play_Dialogues.md'
    pdf_path = 'docs/Chapter_11_Bilingual_Role_Play_Dialogues.pdf'

    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(ROLEPLAY_MD)
    print(f'Wrote {md_path}')

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    h1_style = ParagraphStyle('DocH1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=colors.HexColor('#1A365D'), alignment=1, spaceAfter=4)
    h2_style = ParagraphStyle('DocH2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=colors.HexColor('#2B6CB0'), spaceBefore=10, spaceAfter=4)
    h3_style = ParagraphStyle('DocH3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#2D3748'), spaceBefore=6, spaceAfter=3)
    body_style = ParagraphStyle('DocBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#2D3748'), spaceAfter=4)
    speaker_style = ParagraphStyle('DocSpeaker', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#1A202C'), leftIndent=8, spaceAfter=4)
    note_box_style = ParagraphStyle('DocNoteBox', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=colors.HexColor('#744210'), backColor=colors.HexColor('#FEFCBF'), borderColor=colors.HexColor('#D69E2E'), borderWidth=0.5, borderPadding=5, spaceBefore=4, spaceAfter=6)

    story = []

    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_table = False
    table_rows = []
    in_note_box = False
    note_lines = []

    for line in lines:
        raw = line.rstrip()
        trimmed = raw.strip()

        if trimmed.startswith('> [!IMPORTANT]') or trimmed.startswith('> [!NOTE]'):
            in_note_box = True
            note_lines = []
            continue

        if in_note_box:
            if trimmed.startswith('>'):
                cleaned_note = trimmed.replace('>', '', 1).strip()
                note_lines.append(cleaned_note)
                continue
            else:
                in_note_box = False
                box_html = '<br/>'.join([clean_md_inline(nl) for nl in note_lines if nl])
                story.append(Paragraph(box_html, note_box_style))
                note_lines = []

        if trimmed.startswith('|') and '|' in trimmed[1:]:
            in_table = True
            cols = [c.strip() for c in trimmed.split('|')[1:-1]]
            if all(set(c).issubset({'-', ':', ' '}) for c in cols):
                continue
            table_rows.append(cols)
            continue
        else:
            if in_table:
                in_table = False
                if table_rows:
                    col_widths = [110, 110, 160, 120] if len(table_rows[0]) == 4 else None
                    formatted_table = []
                    for row_idx, row in enumerate(table_rows):
                        formatted_row = []
                        is_header = (row_idx == 0)
                        for cell in row:
                            cell_text = clean_md_inline(cell)
                            cell_style = ParagraphStyle('CellHead' if is_header else 'CellBody', parent=styles['Normal'], fontName='Helvetica-Bold' if is_header else 'Helvetica', fontSize=7.5, leading=10, textColor=colors.HexColor('#FFFFFF' if is_header else '#2D3748'))
                            formatted_row.append(Paragraph(cell_text, cell_style))
                        formatted_table.append(formatted_row)
                    
                    t = Table(formatted_table, colWidths=col_widths)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2B6CB0')),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E0')),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 6))
                    table_rows = []

        if not trimmed:
            continue

        if trimmed.startswith('# '):
            t = clean_md_inline(trimmed[2:])
            story.append(Paragraph('Viva Dental Prep', ParagraphStyle('SubTop', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#319795'), alignment=1, spaceAfter=2)))
            story.append(Paragraph(t, h1_style))
            story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2B6CB0'), spaceBefore=2, spaceAfter=6))
        elif trimmed.startswith('## '):
            t = clean_md_inline(trimmed[3:])
            story.append(Paragraph(t, h2_style))
        elif trimmed.startswith('### '):
            t = clean_md_inline(trimmed[4:])
            story.append(Paragraph(t, h3_style))
        elif trimmed.startswith('**') and ('**:' in trimmed or '** (Patient):' in trimmed or '** (Dental Assistant' in trimmed or '** (Hygienist' in trimmed or '** (Dentist' in trimmed):
            t = clean_md_inline(trimmed)
            story.append(Paragraph(t, speaker_style))
        elif trimmed.startswith('* ') or trimmed.startswith('- '):
            t = clean_md_inline(trimmed[2:])
            story.append(Paragraph(f'&bull; {t}', body_style))
        elif trimmed.startswith('---'):
            story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CBD5E0'), spaceBefore=4, spaceAfter=6))
        else:
            t = clean_md_inline(trimmed)
            story.append(Paragraph(t, body_style))

    if in_note_box and note_lines:
        box_html = '<br/>'.join([clean_md_inline(nl) for nl in note_lines if nl])
        story.append(Paragraph(box_html, note_box_style))

    canvas_factory = lambda *args, **kwargs: NumberedCanvas(*args, doc_title='Viva Dental Prep — Chapter 11 Clinical Role-Play Dialogues', sub_title='NBDHE Chairside Patient Communications & Pharmacology', **kwargs)
    doc.build(story, canvasmaker=canvas_factory)
    print(f'✅ Built PDF: {pdf_path}')

if __name__ == '__main__':
    main()
