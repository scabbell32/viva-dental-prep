import os
import json
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
            self.drawString(54, 11 * inch - 36, "Viva Dental Prep — Chapter 14: Periodontics")
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

def build_markdown_files():
    with open('docs/ch14_parsed_raw.json', 'r', encoding='utf-8') as f:
        qs = json.load(f)

    clean_q_md = '# Chapter 14: Periodontics & Periodontology — Clean Questions\n\n'
    clean_a_md = '# Chapter 14: Periodontics & Periodontology — Answers & Rationales\n\n'
    full_qa_md = '# Chapter 14: Periodontics & Periodontology\n## Comprehensive NBDHE Board Exam Review & Rationales (30 Questions)\n\n'

    for i, q in enumerate(qs):
        num = i + 1
        clean_q_md += f'### **Q{num}. {q["question_text"]}**\n'
        for opt_key in ['a', 'b', 'c', 'd']:
            if q.get(f'option_{opt_key}'):
                clean_q_md += f'* {opt_key}. {q[f"option_{opt_key}"]}\n'
        clean_q_md += '\n'

        correct_letter = q['correct_option'].upper()
        correct_text = q.get(f'option_{q["correct_option"]}', '')
        clean_a_md += f'### **Q{num}. Answer: {correct_letter}**\n'
        clean_a_md += f'* **Explanation:** {q["explanation"]}\n\n'

        full_qa_md += f'### **Q{num}. {q["question_text"]}**\n'
        for opt_key in ['a', 'b', 'c', 'd']:
            if q.get(f'option_{opt_key}'):
                full_qa_md += f'* {opt_key}. {q[f"option_{opt_key}"]}\n'
        full_qa_md += f'\n* **Correct Answer:** **{correct_letter}. {correct_text}**\n'
        full_qa_md += f'* **Clinical Rationale:**\n  {q["explanation"]}\n\n---\n\n'

    with open('docs/Chapter_14_Questions_Clean.md', 'w', encoding='utf-8') as f:
        f.write(clean_q_md)

    with open('docs/Chapter_14_Answers_and_Rationales.md', 'w', encoding='utf-8') as f:
        f.write(clean_a_md)

    with open('docs/Chapter_14_Questions_and_Answers.md', 'w', encoding='utf-8') as f:
        f.write(full_qa_md)

    print("Generated Chapter 14 Markdown files.")

def build_qa_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), '../docs/Chapter_14_Questions_and_Answers.pdf')
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    with open(os.path.join(os.path.dirname(__file__), '../docs/ch14_parsed_raw.json'), 'r') as f:
        qs = json.load(f)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=colors.HexColor('#0F172A'), spaceAfter=4)
    subtitle_style = ParagraphStyle('DocSub', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B'), spaceAfter=14)
    qnum_style = ParagraphStyle('QNum', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.HexColor('#1E3A8A'), spaceAfter=3)
    stem_style = ParagraphStyle('Stem', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=colors.HexColor('#1E293B'), spaceAfter=6)
    opt_style = ParagraphStyle('Opt', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#334155'), spaceAfter=2)
    correct_style = ParagraphStyle('Correct', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=12.5, textColor=colors.HexColor('#065F46'), spaceBefore=3, spaceAfter=2)
    rat_style = ParagraphStyle('Rat', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#064E3B'))

    story = [
        Paragraph("Chapter 14: Periodontics & Periodontology", title_style),
        Paragraph("Comprehensive NBDHE Board Exam Review — Questions, Answers & Rationales (30 Questions)", subtitle_style),
        Spacer(1, 10)
    ]

    for i, q in enumerate(qs):
        num = i + 1
        q_elements = [
            Paragraph(f"Question {num}", qnum_style),
            Paragraph(q['question_text'], stem_style)
        ]
        
        for opt_key in ['a', 'b', 'c', 'd']:
            opt_text = q.get(f'option_{opt_key}', '')
            if opt_text:
                q_elements.append(Paragraph(f"<b>{opt_key}.</b> {opt_text}", opt_style))
        
        corr_key = q['correct_option'].upper()
        corr_text = q.get(f'option_{q["correct_option"]}', '')
        
        ans_box = [
            Paragraph(f"<b>Correct Answer: {corr_key}</b> — {corr_text}", correct_style),
            Paragraph(f"<b>Clinical Rationale:</b> {q['explanation']}", rat_style)
        ]
        
        ans_table = Table([[ans_box]], colWidths=[500])
        ans_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0FDF4')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#86EFAC')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        q_elements.append(Spacer(1, 4))
        q_elements.append(ans_table)
        q_elements.append(Spacer(1, 10))

        story.append(KeepTogether(q_elements))

    doc.build(story, canvasmaker=NumberedCanvas)
    print("✅ Built PDF: docs/Chapter_14_Questions_and_Answers.pdf")

def build_study_guides():
    eng_content = """# Chapter 14 High-Yield NBDHE Study Guide
## Periodontics & Clinical Periodontology

---

## 1. Periodontal Anatomy & Biologic Width
* **Attached Gingiva:**
  * Width: Widest in the **Maxillary Anterior** (3.5–4.5 mm); narrowest in the **Mandibular Premolar Facial** (1.8 mm).
  * Boundary: Separated from alveolar mucosa by the **Mucogingival Junction (MGJ)** (present on facial and mandibular lingual, absent on palate).
* **Junctional Epithelium (JE):**
  * Length: **0.25 to 1.35 mm** (average ≈ 0.97 mm).
  * Attachment: Attached to tooth via **hemidesmosomes** and the internal basal lamina. Highly permeable, providing passage for GCF and PMNs.
* **Alveolar Bone Crest:**
  * Normal position: Located **1.5 to 2.0 mm apical** to the cementoenamel junction (CEJ) in health. Follows the scalloped contour of the CEJ.
* **Bone Defects:**
  * **Fenestration:** Isolated "window" of bone loss leaving root surface exposed, with marginal bone intact.
  * **Dehiscence:** Cleft-like bone defect extending continuously from the marginal bone crest apically.

---

## 2. Etiology & Pathogenesis of Periodontal Diseases
* **Microbiology & Subgingival Biofilm:**
  * Earliest immune responders in Stage I (Initial) Gingivitis: **Neutrophils (PMNs)** via chemotaxis.
  * Apical subgingival attached biofilm: Dominated by anaerobic **Gram-negative rods and filaments** (e.g., *Porphyromonas gingivalis*, *Tannerella forsythia*, *Treponema denticola* — Red Complex).
  * Calculus: Acts as a **plaque-retentive factor**, not the primary chemical initiator.
* **Medication-Induced Gingival Enlargement:**
  * Calcium Channel Blockers (e.g., **Nifedipine**, Amlodipine).
  * Immunosuppressants (e.g., **Cyclosporine**).
  * Anticonvulsants (e.g., **Phenytoin / Dilantin**).
  * Most frequently affects the **anterior labial/interproximal** gingiva.
* **Necrotizing Periodontal Diseases (NPD):**
  * Punched-out crater-like interdental papillae, pseudomembranous slough, fetid odor, pain, and bleeding.

---

## 3. Nonsurgical Periodontal Therapy (NSPT) & Re-evaluation
* **Objective of NSPT:** To eliminate etiologic biofilm/calculus, reduce inflammation, and facilitate biological healing.
* **Optimal Treatment Response:** Initial probing depths of **4 to 6 mm** achieve the highest rate of probing depth reduction and clinical attachment gain.
* **Re-evaluation Timing:** **4 to 6 weeks** post-instrumentation is required to allow connective tissue reorganization, epithelial junctional adaptation, and resolution of inflammation.
* **Gingival Condition / Bleeding on Probing (BOP):** The best clinical indicator of periodontal stability or active disease progression.

---

## 4. Periodontal Surgery & Dental Implants
* **Guided Tissue Regeneration (GTR):** Placement of a barrier membrane to prevent epithelial downgrowth, allowing slower-migrating PDL and osteogenic cells to populate the root surface.
* **Suture Removal:** Grasp the knot with cotton pliers, gently lift, and cut close to the tissue below the knot to prevent pulling contaminated external suture material through the wound.
* **Implant Biology & Maintenance:**
  * **Perimucosal Seal:** Epithelial adaptation forming a biological seal around the titanium abutment cylinder.
  * Normal 1st-Year Bone Loss: **1 to 2 mm** during healing/remodeling, followed by $<0.2$ mm annually.
  * 5-Year Success Rate: $\ge 85\\%$.
  * Cleaning: Use non-scratching plastic, resin, graphite, or titanium instruments.
* **Antimicrobial Fluoride:** **Stannous Fluoride ($SnF_2$)** possesses direct antimicrobial action against plaque pathogens via the stannous ion.
"""
    with open('docs/Chapter_14_Study_Guide_English.md', 'w', encoding='utf-8') as f:
        f.write(eng_content)

    esp_content = """# Guía de Estudio de Alto Rendimiento NBDHE — Capítulo 14
## Periodoncia y Periodontología Clínica

---

## 1. Anatomía Periodontal y Espacio Biológico
* **Encía Adherida:**
  * Ancho: Más ancha en la zona **Anterior Superior** (3.5–4.5 mm); más estrecha en la zona **Premolar Inferior Vestibular** (1.8 mm).
  * Límite: Separada de la mucosa alveolar por la **Línea o Unión Mucogingival (UMG)** (ausente en el paladar).
* **Epitelio de Unión (EU):**
  * Longitud: **0.25 a 1.35 mm** (promedio ≈ 0.97 mm).
  * Unión: Se une al diente mediante **hemidesmosomas** y lámina basal interna. Muy permeable al fluido crevicular (GCF) y neutrófilos.
* **Cresta Ósea Alveolar:**
  * Posición normal: **1.5 a 2.0 mm apical** a la unión cemento-esmalte (UCE) en salud.
* **Defectos Óseos:**
  * **Fenestración:** "Ventana" aislada de pérdida ósea donde la raíz queda expuesta pero el hueso marginal permanece intacto.
  * **Dehiscencia:** Hendidura o defecto óseo continuo que incluye la pérdida del margen óseo crestal.

---

## 2. Etiología y Patogenia Periodontal
* **Microbiología y Biopelícula:**
  * Primeras células de defensa en gingivitis inicial (Estadio I): **Neutrófilos (PMNs)**.
  * Biopelícula apical subgingival: Predominio de **bacilos y espiroquetas Gram-negativas anaerobias** (Complejo Rojo: *P. gingivalis*, *T. forsythia*, *T. denticola*).
  * Cálculo: Factor **retenedor de placa**, no el iniciador químico primario.
* **Agrandamiento Gingival Farmacológico:**
  * Bloqueadores de canales de calcio (p. ej., **Nifedipino**, Amlodipino).
  * Inmunosupresores (p. ej., **Ciclosporina**).
  * Anticonvulsivantes (p. ej., **Fenitoína / Epamin**).
  * Afecta principalmente el sector **anterior vestibular**.
* **Enfermedades Periodontales Necrosantes (EPN):**
  * Papilas interdentales decapitadas en forma de cráter, dolor agudo, sangrado espontáneo, pseudomembrana y olor fétido.

---

## 3. Terapia Periodontal No Quirúrgica (TPNQ) y Reevaluación
* **Objetivo de TPNQ:** Eliminar cálculo y biopelícula, disminuir inflamación y favorecer la cicatrización biológica.
* **Respuesta Óptima:** Bolsas iniciales de **4 a 6 mm** presentan la mayor reducción de profundidad al sondaje y ganancia de inserción clínica.
* **Tiempo de Reevaluación:** **4 a 6 semanas** post-tratamiento para permitir la cicatrización del epitelio de unión largo y maduración del colágeno.
* **Sangrado al Sondaje (BOP):** Mejor indicador clínico de actividad y respuesta al tratamiento.

---

## 4. Cirugía Periodontal e Implantes Dentales
* **Regeneración Tisular Guiada (RTG):** Uso de membranas barrera para evitar la migración apical del epitelio, permitiendo la repoblación del ligamento periodontal y hueso.
* **Retiro de Suturas:** Sujetar el nudo con pinzas algodoneras, levantarlo y cortar pegado al tejido por debajo del nudo.
* **Biología y Mantenimiento de Implantes:**
  * **Sellado Perimucoso:** Adaptación epitelial alrededor del pilar de titanio.
  * Pérdida ósea fisiológica en el 1.er año: **1 a 2 mm**.
  * Tasa de éxito a 5 años: $\ge 85\\%$.
  * Instrumental: Curetas de titanio, plástico o grafito para evitar rayar la superficie de óxido de titanio.
* **Fluoruro con Acción Antimicrobiana:** **Fluoruro Estannoso ($SnF_2$)**.
"""
    with open('docs/Chapter_14_Study_Guide_Spanish.md', 'w', encoding='utf-8') as f:
        f.write(esp_content)

    print("Wrote Chapter 14 English & Spanish Study Guides.")

def build_roleplay():
    rp_content = """# Chapter 14 Bilingual Role-Play Dialogues
## Periodontal Disease Education & Nonsurgical Therapy Communication

---

## 🎭 SCENARIO 1: Explaining Periodontal Pockets & Deep Scaling (SRP / NSPT)

### **Clinical Context**
A patient diagnosed with Stage II Periodontitis with 4–5 mm pockets is nervous about needing "deep cleaning" (NSPT) instead of a standard regular cleaning.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "During your periodontal exam, we measured 4 to 5 millimeter pockets around your back teeth, along with bleeding when we probed. A regular dental cleaning only polishes above the gumline, but bacteria and hardened calculus have moved beneath the gums where brushing cannot reach. Scaling and root planing removes those subgingival deposits and smooths the root surfaces so your gums can heal and tighten back onto the teeth."

**Higienista Dental (Español):**
> "Durante su examen periodontal, medimos bolsas de 4 a 5 milímetros alrededor de sus muelas, junto con sangrado al sondear. Una limpieza regular solo pule por encima de la encía, pero las bacterias y el sarro endurecido se han acumulado por debajo de las encías donde el cepillo no llega. El raspado y alisado radicular elimina esos depósitos profundos y alisa las raíces para que sus encías puedan sanar y adherirse nuevamente al diente."

---

## 🎭 SCENARIO 2: Post-Op Care & 4–6 Week Re-evaluation Importance

### **Clinical Context**
A patient completes quad scaling and asks why they must return in 4 to 6 weeks for a re-evaluation appointment.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "Gingival tissues take about 4 to 6 weeks to fully heal, resolve inflammation, and form a strong new attachment against your teeth. When you return in one month, we will re-measure your pocket depths and check for bleeding to confirm that the infection is gone and ensure your bone support has stabilized."

**Higienista Dental (Español):**
> "Los tejidos de las encías tardan entre 4 y 6 semanas en desinflamarse por completo, cicatrizar y formar una nueva unión firme contra sus dientes. Cuando regrese en un mes, volveremos a medir sus bolsas y verificaremos si hay sangrado para confirmar que la infección ha desaparecido y que el soporte óseo se ha estabilizado."
"""
    with open('docs/Chapter_14_Bilingual_Role_Play_Dialogues.md', 'w', encoding='utf-8') as f:
        f.write(rp_content)
    print("Wrote Chapter 14 Bilingual Role Play Dialogues.")

def build_all_pdfs():
    build_markdown_files()
    build_qa_pdf()
    build_study_guides()
    build_roleplay()

    def compile_pdf(md_filename, pdf_filename, title, subtitle):
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
        title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#0F172A'), spaceAfter=4)
        sub_style = ParagraphStyle('DocSub', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B'), spaceAfter=14)
        h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=colors.HexColor('#1E3A8A'), spaceBefore=10, spaceAfter=6)
        p_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13.5, textColor=colors.HexColor('#334155'), spaceAfter=5)
        bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=13, textColor=colors.HexColor('#1E293B'), leftIndent=12, spaceAfter=3)
        quote_style = ParagraphStyle('Quote', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8.5, leading=12.5, textColor=colors.HexColor('#0F766E'), leftIndent=15, spaceAfter=4)

        story = [Paragraph(title, title_style), Paragraph(subtitle, sub_style), Spacer(1, 10)]

        for line in md_text.split('\n'):
            line_s = line.strip()
            if not line_s or line_s.startswith('# '):
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

    compile_pdf('Chapter_14_Study_Guide_English.md', 'Chapter_14_Study_Guide_English.pdf', 'Chapter 14: High-Yield NBDHE Study Guide', 'Periodontics & Clinical Periodontology (English)')
    compile_pdf('Chapter_14_Study_Guide_Spanish.md', 'Chapter_14_Study_Guide_Spanish.pdf', 'Capítulo 14: Guía de Estudio de Alto Rendimiento NBDHE', 'Periodoncia y Periodontología Clínica (Español)')
    compile_pdf('Chapter_14_Bilingual_Role_Play_Dialogues.md', 'Chapter_14_Bilingual_Role_Play_Dialogues.pdf', 'Chapter 14: Bilingual Clinical Role-Play Dialogues', 'Periodontal Disease Education & Communication (English & Spanish)')

build_all_pdfs()
