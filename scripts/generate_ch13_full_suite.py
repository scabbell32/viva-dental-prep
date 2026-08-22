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
            self.drawString(54, 11 * inch - 36, "Viva Dental Prep — Chapter 13: Dental Biomaterials")
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
    with open('docs/ch13_parsed_raw.json', 'r', encoding='utf-8') as f:
        qs = json.load(f)

    clean_q_md = '# Chapter 13: Dental Biomaterials — Clean Questions\n\n'
    clean_a_md = '# Chapter 13: Dental Biomaterials — Answers & Rationales\n\n'
    full_qa_md = '# Chapter 13: Dental Biomaterials\n## Comprehensive NBDHE Board Exam Review & Rationales (100 Questions)\n\n'

    for i, q in enumerate(qs):
        num = i + 1
        clean_q_md += f'### **Q{num}. {q["question_text"]}**\n'
        for opt_key in ['a', 'b', 'c', 'd', 'e']:
            if q.get(f'option_{opt_key}'):
                clean_q_md += f'* {opt_key}. {q[f"option_{opt_key}"]}\n'
        clean_q_md += '\n'

        correct_letter = q['correct_option'].upper()
        correct_text = q.get(f'option_{q["correct_option"]}', '')
        clean_a_md += f'### **Q{num}. Answer: {correct_letter}**\n'
        clean_a_md += f'* **Explanation:** {q["explanation"]}\n\n'

        full_qa_md += f'### **Q{num}. {q["question_text"]}**\n'
        for opt_key in ['a', 'b', 'c', 'd', 'e']:
            if q.get(f'option_{opt_key}'):
                full_qa_md += f'* {opt_key}. {q[f"option_{opt_key}"]}\n'
        full_qa_md += f'\n* **Correct Answer:** **{correct_letter}. {correct_text}**\n'
        full_qa_md += f'* **Clinical Rationale:**\n  {q["explanation"]}\n\n---\n\n'

    with open('docs/Chapter_13_Questions_Clean.md', 'w', encoding='utf-8') as f:
        f.write(clean_q_md)

    with open('docs/Chapter_13_Answers_and_Rationales.md', 'w', encoding='utf-8') as f:
        f.write(clean_a_md)

    with open('docs/Chapter_13_Questions_and_Answers.md', 'w', encoding='utf-8') as f:
        f.write(full_qa_md)

    print("Generated Chapter 13 Markdown files.")

def build_qa_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), '../docs/Chapter_13_Questions_and_Answers.pdf')
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    with open(os.path.join(os.path.dirname(__file__), '../docs/ch13_parsed_raw.json'), 'r') as f:
        qs = json.load(f)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14
    )
    qnum_style = ParagraphStyle(
        'QNum',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=3
    )
    stem_style = ParagraphStyle(
        'Stem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )
    opt_style = ParagraphStyle(
        'Opt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=2
    )
    correct_style = ParagraphStyle(
        'Correct',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#065F46'),
        spaceBefore=3,
        spaceAfter=2
    )
    rat_style = ParagraphStyle(
        'Rat',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#064E3B')
    )

    story = [
        Paragraph("Chapter 13: Dental Biomaterials", title_style),
        Paragraph("Comprehensive NBDHE Board Exam Review — Questions, Answers & Rationales (100 Questions)", subtitle_style),
        Spacer(1, 10)
    ]

    for i, q in enumerate(qs):
        num = i + 1
        q_elements = [
            Paragraph(f"Question {num}", qnum_style),
            Paragraph(q['question_text'], stem_style)
        ]
        
        for opt_key in ['a', 'b', 'c', 'd', 'e']:
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
    print("✅ Built PDF: docs/Chapter_13_Questions_and_Answers.pdf")

def build_study_guides():
    eng_content = """# Chapter 13 High-Yield NBDHE Study Guide
## Dental Biomaterials & Clinical Applications

---

## 1. Impression Materials
* **Hydrocolloids:**
  * **Alginate (Irreversible Hydrocolloid):** Sets by chemical reaction. Susceptible to **syneresis** (loss of water / shrinkage) and **imbibition** (absorption of water / expansion). Pour within 10–15 minutes.
  * **Agar (Reversible Hydrocolloid):** Changes state via temperature changes (gel $\\leftrightarrow$ sol).
* **Elastomers:**
  * **Vinyl Polysiloxane (VPS / Addition Silicone):** Highest dimensional stability; no volatile by-product; mixed through automix nozzle.
  * **Polyether:** Excellent hydrophilicity; rigid setting; absorbs water if stored in humid environments.
  * **Polysulfide (Rubber Base):** Smelly (sulfur by-product); pour promptly.

---

## 2. Direct Restorative Materials & Adhesion
* **Dental Amalgam:**
  * Alloy powder (Silver, Tin, Copper, Zinc) + Liquid Mercury (Hg).
  * High copper amalgams ($\ge 12\\%$) eliminate the corrosive **Gamma-2 ($\gamma_2$, Sn-Hg)** phase.
  * Trituration: Mechanical mixing in pre-dosed capsules minimizes mercury vapor release (OSHA limit: 0.05 mg/m³ for 40-hr week).
  * Creep: Slow dimensional distortion under sustained occlusal load.
* **Composite Resins:**
  * Composition: Resin matrix (Bis-GMA, UDMA, TEGDMA) + Inorganic filler particles (silica, zirconia) + **Silane coupling agent**.
  * Polymerization shrinkage: Causes marginal leakage, post-operative sensitivity, and recurrent decay. Incremental placement ($\le 2$ mm) counters C-factor stress.
* **Adhesive Systems:**
  * **Etch-and-Rinse (Total-Etch):** 35%–37% Phosphoric acid dissolves hydroxyapatite, creating microporosities in enamel and exposing collagen fibrils in dentin.
  * **Hybrid Layer:** Infiltration of hydrophilic resin monomers (HEMA) into demineralized dentin collagen meshwork forming micromechanical resin tags.

---

## 3. Dental Cements & Liners
* **Zinc Phosphate:** Exothermic setting reaction $\rightarrow$ mix on a **chilled glass slab** in small increments over a wide area. Low initial pH causes pulpal irritation.
* **Zinc Oxide-Eugenol (ZOE):** Soothing sedative effect on pulp (obtundent); **contraindicated under composite resins** because eugenol inhibits free-radical polymerization.
* **Glass Ionomer (GI / RMGI):** Releases fluoride; bonds chemically to calcium in enamel/dentin via carboxylate groups; thermal expansion coefficient matches natural tooth structure.

---

## 4. Gypsum Products & Ceramics
* **Gypsum (Calcium Sulfate Dihydrate $\\rightarrow$ Hemihydrate):**
  * Type II: Model Plaster (large, irregular particles, highest water-to-powder ratio).
  * Type III: Dental Stone (yellow stone, study models).
  * Type IV: High-Strength Die Stone (dense, cuboidal particles, lowest expansion).
* **Dental Ceramics:**
  * Glass-matrix ceramics (Feldspathic, Lithium Disilicate/E.max) $\rightarrow$ etched with **Hydrofluoric (HF) acid** and silanated.
  * Polycrystalline ceramics (Zirconia) $\rightarrow$ extremely high flexural strength ($>900$ MPa); bonded using **MDP primers** and sandblasting (cannot be etched with HF acid).

---

## 5. Dental Implants & Tissue Engineering
* **Implants:** Made of commercially pure **Titanium** or titanium alloy; osseointegration occurs with biocompatible titanium oxide ($TiO_2$) surface. Clean with non-metallic plastic, graphite, or titanium scalers to prevent scratching.
* **Tissue Engineering Triad:** **Cells + Signals (growth factors) + Scaffolds** (e.g., collagen, PLA, bioglass).
* **Bone Grafts:**
  * **Autograft:** Bone from the patient's own body (gold standard, osteogenic).
  * **Allograft:** Bone from human cadaver donors.
  * **Xenograft:** Bone from another species (e.g., bovine).
  * **Alloplast:** Synthetic bone substitute (hydroxyapatite, beta-TCP).
"""
    with open('docs/Chapter_13_Study_Guide_English.md', 'w', encoding='utf-8') as f:
        f.write(eng_content)

    esp_content = """# Guía de Estudio de Alto Rendimiento NBDHE — Capítulo 13
## Biomateriales Dentales y Aplicaciones Clínicas

---

## 1. Materiales de Impresión
* **Hidrocoloides:**
  * **Alginato (Hidrocoloide Irreversible):** Fragua por reacción química. Susceptible a **sinéresis** (pérdida de agua/contracción) e **imbibición** (absorción de agua/expansión). Vaciar en 10–15 min.
  * **Agar (Hidrocoloide Reversible):** Cambia de estado físicamente por temperatura (gel $\\leftrightarrow$ sol).
* **Elastómeros:**
  * **Vinil Polisiloxano (VPS / Silicona por Adición):** Máxima estabilidad dimensional; sin subproductos volátiles; mezclado en punta automix.
  * **Poliéter:** Excelente hidrofilia; fraguado rígido; absorbe agua si se almacena en humedad.

---

## 2. Materiales Restauradores Directos y Adhesión
* **Amalgama Dental:**
  * Polvo de aleación (Plata, Estaño, Cobre, Zinc) + Mercurio líquido (Hg).
  * Alto contenido de cobre ($\ge 12\\%$) elimina la fase corrosiva **Gamma-2 ($\gamma_2$, Sn-Hg)**.
  * Trituración en cápsulas predosificadas para evitar vapores de mercurio (límite OSHA: 0.05 mg/m³).
* **Resinas Compuestas (Composite):**
  * Matriz orgánica (Bis-GMA, UDMA) + Relleno inorgánico + **Agente de acoplamiento Silano**.
  * Contracción de polimerización: Colocación incremental ($\le 2$ mm) para reducir el estrés del factor C.
* **Sistemas Adhesivos:**
  * Ácido fosfórico al 35%–37% disuelve hidroxiapatita y expone fibras de colágeno.
  * **Capa Híbrida:** Entrelazamiento micromecánico de monómeros hidrófilos (HEMA) con la red de colágeno dentinario desmineralizado.

---

## 3. Cementos Dentales y Protectores Pulpares
* **Fosfato de Cinc:** Reacción fuertemente exotérmica $\rightarrow$ mezclar sobre **loseta de vidrio fría** en pequeñas porciones.
* **Óxido de Cinc-Eugenol (ZOE):** Efecto sedante pulpar (obtundente); **contraindicado bajo resinas compuestas** porque el eugenol inhibe la polimerización.
* **Ionómero de Vidrio:** Libera flúor; adhesión química al calcio dentario; coeficiente de expansión térmica similar al diente.

---

## 4. Yesos Dentales y Cerámicas
* **Yesos (Sulfato de Calcio):**
  * Tipo II: Yeso Taller / París (partículas grandes y porosas).
  * Tipo III: Yeso Piedra (modelos de estudio).
  * Tipo IV: Yeso Piedra de Alta Resistencia / Densita (troqueles).
* **Cerámicas Dentales:**
  * Cerámicas vítreas (Disilicato de litio/E.max) $\rightarrow$ se graban con **Ácido Fluorhídrico (HF)** y se silanizan.
  * Zirconia $\rightarrow$ resistencia flexural $>900$ MPa; unión mediante arenado y **primers con MDP** (no se graba con HF).

---

## 5. Implantes Dentales e Ingeniería Tisular
* **Implantes:** Titanio biocompatible con capa pasiva de óxido de titanio ($TiO_2$). Limpiar solo con instrumental no metálico (plástico o titanio).
* **Tríada de Ingeniería Tisular:** **Células + Señales (factores de crecimiento) + Andamios (scaffolds)**.
* **Injertos Óseos:**
  * **Autoinjerto:** Del propio paciente (estándar de oro).
  * **Aloinjerto:** De donante cadáver humano de la misma especie.
  * **Xenoinjerto:** De otra especie (p. ej., bovino).
  * **Aloplástico:** Sintético (hidroxiapatita, fosfato tricálcico).
"""
    with open('docs/Chapter_13_Study_Guide_Spanish.md', 'w', encoding='utf-8') as f:
        f.write(esp_content)

    print("Wrote Chapter 13 English & Spanish Study Guides.")

def build_roleplay():
    rp_content = """# Chapter 13 Bilingual Role-Play Dialogues
## Dental Materials & Clinical Patient Communication

---

## 🎭 SCENARIO 1: Explaining Dental Amalgam Safety & Post-Operative Care

### **Clinical Context**
A patient expresses anxiety regarding their older silver filling and asks if they should replace all amalgam restorations to prevent toxicity.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "I understand your concern about silver fillings. Dental amalgam is a stable alloy of silver, tin, copper, and bound mercury that has been safely used for over a century. Major health organizations, including the ADA and FDA, confirm that intact amalgam restorations do not pose health hazards. Removing healthy fillings actually removes healthy tooth structure unnecessarily."

**Higienista Dental (Español):**
> "Entiendo su preocupación sobre las restauraciones plateadas. La amalgama dental es una aleación estable de plata, estaño, cobre y mercurio ligado que se ha utilizado de forma segura durante más de un siglo. Las principales organizaciones de salud, incluidas la ADA y la FDA, confirman que las amalgamas intactas no representan un riesgo para la salud. Remover empastes sanos elimina estructura dental sana de forma innecesaria."

---

## 🎭 SCENARIO 2: Post-Bleaching Sensitivity & Desensitizing Toothpaste

### **Clinical Context**
A patient who completed in-office vital tooth whitening complains of transient thermal sensitivity to cold beverages.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "Mild tooth sensitivity is very common after professional whitening because the peroxide temporarily opens microscopic enamel pores and dentinal tubules. Using a toothpaste containing potassium nitrate will calm the nerve fibers, while sodium fluoride will help remineralize the enamel surface. The sensitivity will fade in a couple of days."

**Higienista Dental (Español):**
> "La sensibilidad dental leve es muy común tras el blanqueamiento profesional porque el peróxido abre temporalmente los poros microscópicos del esmalte y los túbulos dentinarios. Usar una pasta con nitrato de potasio calmará las terminaciones nerviosas, mientras que el fluoruro de sodio remineralizará el esmalte. Esta sensibilidad desaparecerá en un par de días."
"""
    with open('docs/Chapter_13_Bilingual_Role_Play_Dialogues.md', 'w', encoding='utf-8') as f:
        f.write(rp_content)
    print("Wrote Chapter 13 Bilingual Role Play Dialogues.")

def build_all_pdfs():
    build_markdown_files()
    build_qa_pdf()
    build_study_guides()
    build_roleplay()

    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
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

    compile_pdf('Chapter_13_Study_Guide_English.md', 'Chapter_13_Study_Guide_English.pdf', 'Chapter 13: High-Yield NBDHE Study Guide', 'Dental Biomaterials & Clinical Applications (English)')
    compile_pdf('Chapter_13_Study_Guide_Spanish.md', 'Chapter_13_Study_Guide_Spanish.pdf', 'Capítulo 13: Guía de Estudio de Alto Rendimiento NBDHE', 'Biomateriales Dentales y Aplicaciones Clínicas (Español)')
    compile_pdf('Chapter_13_Bilingual_Role_Play_Dialogues.md', 'Chapter_13_Bilingual_Role_Play_Dialogues.pdf', 'Chapter 13: Bilingual Clinical Role-Play Dialogues', 'Dental Materials & Patient Communication (English & Spanish)')

build_all_pdfs()
