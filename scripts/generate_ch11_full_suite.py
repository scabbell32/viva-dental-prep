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
        self.doc_title = kwargs.pop('doc_title', 'Viva Dental Prep — Pharmacology Review')
        self.sub_title = kwargs.pop('sub_title', 'NBDHE Board Exam Review — Chapter 11')
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
    # Replace math blocks if any
    text = text.replace('$\\beta_1$', '&beta;1').replace('$\\beta_2$', '&beta;2').replace('$\\alpha_4\\beta_2$', '&alpha;4&beta;2')
    text = text.replace('\\text{H}^+/\\text{K}^+', 'H+/K+').replace('\\text{H}_2', 'H2').replace('$', '')
    # First handle triple asterisks ***text***
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<b><i>\g<1></i></b>', text)
    # Then bold **text**
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\g<1></b>', text)
    # Then italic *text* (only where not inside HTML tags)
    text = re.sub(r'(?<![<a-zA-Z/])\*(?!\s)([^*]+?)(?<!\s)\*(?![>a-zA-Z])', r'<i>\g<1></i>', text)
    # Inline code
    text = re.sub(r'`(.*?)`', r'<b><font color="#2B6CB0">\g<1></font></b>', text)
    return text

def compile_markdown_to_pdf(md_path, pdf_path, doc_title, sub_title):
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=45,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    h1_style = ParagraphStyle('DocH1', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor('#1A365D'), alignment=1, spaceAfter=4)
    h2_style = ParagraphStyle('DocH2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=colors.HexColor('#2B6CB0'), spaceBefore=12, spaceAfter=6)
    h3_style = ParagraphStyle('DocH3', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=colors.HexColor('#2D3748'), spaceBefore=8, spaceAfter=4)
    body_style = ParagraphStyle('DocBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#2D3748'), spaceAfter=4)
    bullet_style = ParagraphStyle('DocBullet', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#2D3748'), leftIndent=12, spaceAfter=3)
    note_box_style = ParagraphStyle('DocNoteBox', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11.5, textColor=colors.HexColor('#744210'), backColor=colors.HexColor('#FEFCBF'), borderColor=colors.HexColor('#D69E2E'), borderWidth=0.5, borderPadding=6, spaceBefore=4, spaceAfter=8)

    story = []

    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_note_box = False
    note_lines = []

    for line in lines:
        raw = line.rstrip()
        trimmed = raw.strip()

        if trimmed.startswith('> [!NOTE]'):
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

        if not trimmed:
            continue

        if trimmed.startswith('# '):
            t = clean_md_inline(trimmed[2:])
            story.append(Paragraph('Viva Dental Prep', ParagraphStyle('SubTop', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor('#319795'), alignment=1, spaceAfter=2)))
            story.append(Paragraph(t, h1_style))
            story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2B6CB0'), spaceBefore=2, spaceAfter=8))
        elif trimmed.startswith('## '):
            t = clean_md_inline(trimmed[3:])
            story.append(Paragraph(t, h2_style))
        elif trimmed.startswith('### '):
            t = clean_md_inline(trimmed[4:])
            story.append(Paragraph(t, h3_style))
        elif trimmed.startswith('* ') or trimmed.startswith('- '):
            t = clean_md_inline(trimmed[2:])
            story.append(Paragraph(f'&bull; {t}', bullet_style))
        elif trimmed.startswith('---'):
            story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CBD5E0'), spaceBefore=6, spaceAfter=8))
        else:
            t = clean_md_inline(trimmed)
            story.append(Paragraph(t, body_style))

    if in_note_box and note_lines:
        box_html = '<br/>'.join([clean_md_inline(nl) for nl in note_lines if nl])
        story.append(Paragraph(box_html, note_box_style))

    canvas_factory = lambda *args, **kwargs: NumberedCanvas(*args, doc_title=doc_title, sub_title=sub_title, **kwargs)
    doc.build(story, canvasmaker=canvas_factory)
    print(f'✅ Built PDF: {pdf_path}')

ENGLISH_STUDY_GUIDE_MD = """# Pharmacology Study Guide (Chapter 11)
## Focused Review for NBDHE Preparation (Questions 1 to 30)

**How to use this guide:** Master the yellow "High-Yield" callout boxes first. They contain the core pharmacology facts tested directly in Questions 1 to 30 on the NBDHE Dental Hygiene Board Exam. Then utilize the question-to-concept map and clinical vocabulary table to cement your mastery.

---

## 1. Autonomic & Cardiovascular Pharmacology
* **Angiotensin-Converting Enzyme (ACE) Inhibitors**:
  * **Prototype Drugs**: Enalapril (Vasotec), Lisinopril, Captopril (suffix **"-pril"**).
  * **Mechanism of Action**: Inhibit conversion of Angiotensin I to Angiotensin II (a potent vasoconstrictor); reduce aldosterone secretion.
  * **Adverse Effects & Dental Significance**: Dry, nonproductive hacking cough (due to accumulated bradykinin in 10–20% of patients); angioedema; orthostatic hypotension.
* **Calcium Channel Blockers (CCBs)**:
  * **Prototype Drugs**: Nifedipine (Procardia), Amlodipine (Norvasc), Diltiazem, Verapamil (suffix **"-dipine"**).
  * **Mechanism**: Inhibit calcium ion influx into vascular smooth muscle and myocardium, causing vasodilation.
  * **High-Yield Oral Complication**: **Drug-Induced Gingival Enlargement (Hyperplasia)** in 15–80% of patients. Begins in interdental papillae.
* **Beta-Adrenergic Receptor Blockers**:
  * **Prototype Drugs**: Metoprolol (Lopressor, $\\beta_1$-selective), Propranolol (Inderal, non-selective) (suffix **"-olol"**).
  * **Adverse Effects**: Bradycardia, bronchospasm (with non-selective agents). *Epinephrine Interaction*: Limit local anesthetic epinephrine with nonselective beta-blockers (cardiac dose: max 0.04 mg epinpehrine).
* **Antihyperlipidemics (Lipid-Lowering Drugs)**:
  * **HMG-CoA Reductase Inhibitors ("Statins")**: Lovastatin (Mevacor), Atorvastatin (Lipitor). Block rate-limiting step in cholesterol synthesis.
  * **Fibric Acid Derivatives (Fibrates)**: Fenofibrate (Tricor), Gemfibrozil. Lower triglycerides and VLDL; do **NOT** alter blood coagulation or clotting times.
  * **Grapefruit Juice Interaction**: Inactivates intestinal CYP3A4 enzymes, dramatically increasing serum levels and toxicities of statins and calcium channel blockers.

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 6, 8, 10, 11, 15, 17, 18:**
> * **Enalapril** is an **ACE inhibitor** (associated with chronic dry cough).
> * **Nifedipine** is a **calcium channel blocker** that causes **gingival hyperplasia**.
> * **Metoprolol** is a **cardioselective beta-blocker**.
> * **Fenofibrate** treats elevated lipids and **does NOT affect blood coagulation**.
> * **Grapefruit juice** inhibits **CYP3A4**, causing severe drug-food toxicity interactions.

---

## 2. Central Nervous System & Psychiatric Medications
* **Trigeminal Neuralgia (*Tic Douloureux*)**:
  * **Drug of Choice**: **Carbamazepine (Tegretol)** is the first-line anticonvulsant for severe neuropathic lancinating facial pain.
  * **Pediatric Alert**: Chewable carbamazepine contains **63% sucrose**, putting pediatric patients at high risk for rampant dental caries.
* **Antidepressants**:
  * **Selective Serotonin Reuptake Inhibitors (SSRIs)**: Fluoxetine (Prozac), Sertraline (Zoloft). Solely block serotonin reuptake (SERT); low anticholinergic liability.
  * **Tricyclic Antidepressants (TCAs)**: Amitriptyline (Elavil), Nortriptyline. Potent anticholinergic side effects (**severe xerostomia**).
* **Antipsychotics (Neuroleptics)**:
  * **First-Generation (Typical)**: Fluphenazine, Thioridazine (phenothiazines). Potent D2 dopamine antagonists causing Extrapyramidal Symptoms (EPS: acute dystonia, akathisia, parkinsonism) and marked dry mouth.
  * **Second-Generation (Atypical)**: Risperidone (Risperdal), Aripiprazole (Abilify). Dual 5-HT2A and D2 antagonists with lower EPS risks.
  * **Oral Effect**: Antipsychotics cause **xerostomia** due to muscarinic blockade; **sialorrhea (excess salivation) is the exception**.
* **Anxiolytics & Hypnotics (Sedation)**:
  * **Alprazolam (Xanax)**: Short-to-intermediate benzodiazepine; first-line oral premedication for **acute dental anxiety**.
  * **Zolpidem (Ambien)**: Non-benzodiazepine GABA-A agonist hypnotic; associated with complex parasomnias (**sleep-driving, sleep-eating**).

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 1, 2, 4, 9, 13, 14, 21, 23, 30:**
> * **Carbamazepine** treats **trigeminal neuralgia**; chewable tablets contain **63% sugar**.
> * **Fluoxetine** is an SSRI that solely blocks serotonin reuptake with minimal xerostomia.
> * **Thioridazine** is a first-generation phenothiazine antipsychotic causing dry mouth.
> * **Antipsychotics** cause EPS and dry mouth; **sialorrhea is NOT a typical side effect**.
> * **Alprazolam** is used for **acute situational dental anxiety**.
> * **Zolpidem** causes **sleep-driving and sleep-eating**.

---

## 3. Analgesics, Anti-Inflammatories & Emergency Reversal
* **Aspirin (Acetylsalicylic Acid)**:
  * **Mechanism**: **Irreversibly inhibits COX-1**, suppressing platelet Thromboxane A2 (TXA2) synthesis.
  * **Clinical Dental Effect**: Prolongs bleeding time for the entire **7 to 10 day lifespan of the platelet**, causing **increased bleeding during scaling and root planing**.
* **Nonsteroidal Anti-Inflammatory Drugs (NSAIDs)**:
  * **Examples**: Ibuprofen, Naproxen, Meloxicam.
  * **Mechanism**: Inhibit renal vasodilatory prostaglandins (PGE2, PGI2), causing renal vasoconstriction and decreased GFR. **Avoid in renal impairment**.
* **Acetaminophen (Tylenol / APAP)**:
  * **Safety Profile**: Safe analgesic of choice in **renal impairment** and pregnancy (Category B).
  * **Toxicity**: Overdose (>3000–4000 mg/day) depletes glutathione, generating toxic metabolite **NAPQI**, causing fatal **acute liver toxicity (hepatotoxicity)**.
* **Opioids & Overdose Reversal**:
  * **Naloxone (Narcan)**: Pure competitive **opioid receptor antagonist** that rapidly reverses life-threatening opioid-induced respiratory depression and coma.

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 16, 25, 26, 27:**
> * **Aspirin** causes **irreversible platelet inhibition** and increases bleeding during SRP.
> * **Acetaminophen** is safe in **renal failure**, but toxic doses cause **severe liver necrosis (NAPQI)**.
> * **Naloxone (Narcan)** is the emergency drug of choice to reverse **opioid overdose**.

---

## 4. Antibiotics, Pregnancy Safety & Gastrointestinal Agents
* **Tetracyclines (Doxycycline, Minocycline)**:
  * **Contraindication in Pregnancy**: Category D. Chelates with calcium orthophosphate, depositing into calcifying fetal bones and unerupted tooth germs, causing **permanent brownish-yellow intrinsic staining** and enamel hypoplasia.
  * **Photosensitivity**: Causes exaggerated sunburn reactions.
* **Safe Antibiotics in Pregnancy**:
  * **Amoxicillin & Penicillin VK**: FDA Category B; safe for odontogenic infections during pregnancy.
* **Metronidazole (Flagyl) & Alcohol Warning**:
  * Inhibits aldehyde dehydrogenase, causing a **severe disulfiram (Antabuse) reaction** (nausea, violent vomiting, flushing) with any alcohol, including **alcohol-containing mouth rinses**.
* **Gastrointestinal Drugs**:
  * **Proton Pump Inhibitors (PPIs)**: Esomeprazole (Nexium), Omeprazole. **Irreversibly bind** H+/K+ ATPase pump (>24 hr acid suppression).
  * **H2-Receptor Antagonists**: Famotidine (Pepcid). Competitively block gastric H2 receptors.
  * **Peptic Ulcer Triple Therapy**: PPI + Clarithromycin + Amoxicillin (or Metronidazole) to eradicate *Helicobacter pylori*.

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 3, 5, 7, 12, 20, 22, 24:**
> * **Tetracycline** is contraindicated in pregnancy (fetal tooth staining) and causes **photosensitivity**.
> * **Amoxicillin** is **safe for pregnant patients**.
> * Patients taking **metronidazole** must strictly avoid **alcohol-based mouth rinses**.
> * **Esomeprazole** produces **>24-hour acid suppression** via irreversible proton pump binding.
> * **Peptic ulcer disease (H. pylori)** is treated with **clarithromycin + amoxicillin/metronidazole + PPI**.

---

## 5. Respiratory Drugs & Smoking Cessation
* **Asthma Management**:
  * **Rescue Inhaler (Acute Attack)**: **Albuterol** (Short-Acting Beta-2 Agonist - SABA); rapid onset bronchodilation.
  * **Maintenance Therapy**: Salmeterol (LABA), Flunisolide / Fluticasone (inhaled corticosteroid; instruct patient to rinse mouth to prevent oral candidiasis).
* **Smoking Cessation Pharmacotherapy**:
  * **Nicotine Gum**: Proper "chew and park" technique prevents jaw ache and nausea. Side effects: mouth soreness, sticking to dental work. **Runny nose is an EXCEPTION (side effect of nasal spray)**.
  * **Varenicline (Chantix)**: $\\alpha_4\\beta_2$ nicotinic partial agonist. Side effects: vivid dreams, mood changes, nausea, **constipation** (diarrhea is an exception).

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 19, 28, 29:**
> * **Albuterol** is the primary rescue inhaler for **acute asthma symptoms**.
> * **Nicotine gum** causes jaw ache and sticks to dental work; **runny nose occurs with nasal spray**.
> * **Varenicline (Chantix)** causes abnormal dreams, mood changes, and **constipation**.

---

## 6. Bilingual Pharmacology Master Terminology Table

| English Dental Term | Spanish Dental Translation | Clinical & Board Relevance |
|:---|:---|:---|
| **Trigeminal neuralgia** | *Neuralgia del trigémino* | Neuropathic lancinating facial pain treated with carbamazepine. |
| **Xerostomia (Dry mouth)** | *Xerostomía (Boca seca)* | Caused by TCAs, phenothiazines, antihistamines, and diuretics. |
| **Gingival hyperplasia** | *Hiperplasia gingival* | Drug-induced enlargement caused by CCBs, phenytoin, and cyclosporine. |
| **Irreversible platelet inhibition** | *Inhibición plaquetaria irreversible* | Caused by aspirin (COX-1 block); lasts 7–10 days. |
| **Hepatotoxicity** | *Hepatotoxicidad* | Acute liver damage caused by acetaminophen metabolite NAPQI. |
| **Disulfiram-like reaction** | *Reacción tipo disulfiram* | Violent nausea from combining metronidazole with alcohol. |
| **Proton pump inhibitor (PPI)** | *Inhibidor de la bomba de protones* | Irreversible gastric acid suppression lasting >24 hours (esomeprazole). |
| **Photosensitivity** | *Fotosensibilidad* | Exaggerated sunburn risk caused by tetracyclines. |
| **Extrapyramidal symptoms (EPS)** | *Síntomas extrapiramidales* | Motor dystonias and tremors caused by D2-blocking antipsychotics. |
| **Rescue inhaler** | *Inhalador de rescate* | Short-acting beta-2 agonist (albuterol) for acute bronchospasm. |
"""

SPANISH_STUDY_GUIDE_MD = """# Guía de Estudio de Farmacología (Capítulo 11)
## Repaso Enfocado para el Examen de la Junta NBDHE (Preguntas 1 a 30)

**Cómo usar esta guía:** Estudie primero los recuadros amarillos de "Alto Rendimiento". Contienen los conceptos farmacológicos clave evaluados directamente en las Preguntas 1 a 30 del examen NBDHE. Luego, utilice la tabla de vocabulario técnico para consolidar el dominio bilingüe.

---

## 1. Farmacología Autonómica y Cardiovascular
* **Inhibidores de la Enzima Convertidora de Angiotensina (IECA)**:
  * **Fármacos Prototipo**: Enalapril (Vasotec), Lisinopril, Captopril (sufijo **"-pril"**).
  * **Mecanismo de Acción**: Bloquean la conversión de Angiotensina I en Angiotensina II (potente vasoconstrictor); disminuyen la secreción de aldosterona.
  * **Efecto Adverso y Relevancia Dental**: Tos seca y persistente (por acumulación de bradicinina en 10–20% de los pacientes); angioedema; hipotensión ortostática.
* **Bloqueadores de los Canales de Calcio (BCC)**:
  * **Fármacos Prototipo**: Nifedipino (Procardia), Amlodipino (Norvasc), Diltiazem, Verapamilo (sufijo **"-dipino"**).
  * **Mecanismo**: Inhiben la entrada de iones de calcio en el músculo liso vascular y miocardio, produciendo vasodilatación.
  * **Complicación Oral de Alto Rendimiento**: **Hiperplasia / Agrandamiento Gingival Inducido por Fármacos** en 15–80% de los pacientes. Comienza en las papilas interdentales.
* **Bloqueadores Beta-Adrenérgicos**:
  * **Fármacos Prototipo**: Metoprolol (Lopressor, selectivo $\\beta_1$), Propranolol (Inderal, no selectivo) (sufijo **"-olol"**).
  * **Interacción con Epinefrina**: Limitar la epinefrina anestésica con betabloqueadores no selectivos (dosis cardíaca máxima: 0.04 mg).
* **Hipolipemiantes (Fármacos para el Colesterol)**:
  * **Inhibidores de la HMG-CoA Reductasa ("Estatinas")**: Lovastatina (Mevacor), Atorvastatina. Bloquean la síntesis hepática de colesterol.
  * **Fibratos**: Fenofibrato (Tricor). Disminuyen triglicéridos; **NO alteran la coagulación sanguínea ni el tiempo de sangrado**.
  * **Interacción con Jugo de Toronja (Pomelo)**: Inhibe irreversiblemente las enzimas intestinales CYP3A4, elevando peligrosamente las concentraciones sanguíneas de estatinas y bloqueadores de canales de calcio.

> [!NOTE]
> **ALTO RENDIMIENTO PARA PREGUNTAS 6, 8, 10, 11, 15, 17, 18:**
> * **Enalapril** es un **IECA** (asociado a tos seca crónica).
> * **Nifedipino** es un **bloqueador de canales de calcio** que causa **hiperplasia gingival**.
> * **Metoprolol** es un **betabloqueador cardioselectivo**.
> * El **fenofibrato** reduce triglicéridos y **NO altera la coagulación sanguínea**.
> * El **jugo de toronja** inhibe el **CYP3A4**, generando toxicidad farmacológica.

---

## 2. Medicamentos para el Sistema Nervioso Central y Psiquiatría
* **Neuralgia del Trigémino (*Tic Douloureux*)**:
  * **Fármaco de Elección**: La **carbamazepina (Tegretol)** es el anticonvulsivo de primera línea para el dolor neuropático lancinante facial.
  * **Alerta Pediátrica**: La tableta masticable contiene **63% de sacarosa**, incrementando severamente el riesgo de caries rampante en niños.
* **Antidepresivos**:
  * **ISRS (Inhibidores Selectivos de la Recaptación de Serotonina)**: Fluoxetina (Prozac). Bloquean exclusivamente la recaptación de serotonina; baja xerostomía.
  * **Antidepresivos Tricíclicos (ATC)**: Amitriptilina (Elavil), Nortriptilina. Fuerte acción anticolinérgica (**marcada xerostomía**).
* **Antipsicóticos (Neurolépticos)**:
  * **Primera Generación (Típicos)**: Flufenazina, Tioridazina (fenotiazinas). Antagonistas D2 que causan Síntomas Extrapiramidales (SEP: distonías, acatisia, parkinsonismo) y boca seca.
  * **Segunda Generación (Atípicos)**: Risperidona (Risperdal), Aripiprazol (Abilify). Menor riesgo de efectos extrapiramidales.
  * **Efecto Oral**: Los antipsicóticos causan **xerostomía**; la **sialorrea (salivación excesiva) es la excepción**.
* **Ansiolíticos y Sedantes**:
  * **Alprazolam (Xanax)**: Benzodiacepina de acción corta; fármaco de elección para la **ansiedad dental aguda**.
  * **Zolpidem (Ambien)**: Hipnótico no benzodiacepínico; asociado a parasomnias complejas (**conducir dormido, comer dormido**).

> [!NOTE]
> **ALTO RENDIMIENTO PARA PREGUNTAS 1, 2, 4, 9, 13, 14, 21, 23, 30:**
> * La **carbamazepina** trata la **neuralgia del trigémino**; su forma masticable tiene **63% de azúcar**.
> * La **fluoxetina** es un ISRS que bloquea solo la serotonina con mínima sequedad bucal.
> * La **tioridazina** es un antipsicótico fenotiazínico típico que produce boca seca.
> * Los **antipsicóticos** causan SEP y boca seca; la **sialorrea NO es un efecto típico**.
> * El **alprazolam** se usa para el control de la **ansiedad dental aguda**.
> * El **zolpidem** puede causar **sonambulismo y conductas automáticas al dormir**.

---

## 3. Analgésicos, Antiinflamatorios y Reversión de Emergencia
* **Aspirina (Ácido Acetilsalicílico)**:
  * **Mecanismo**: **Inhibe irreversiblemente la COX-1**, bloqueando el tromboxano A2 (TXA2) en las plaquetas.
  * **Efecto Clínico Dental**: Prolonga el tiempo de sangrado durante toda la **vida media de la plaqueta (7 a 10 días)**, provocando **mayor sangrado durante el raspado y alisado radicular**.
* **Antiinflamatorios No Esteroideos (AINEs)**:
  * **Ejemplos**: Ibuprofeno, Naproxeno, Meloxicam.
  * **Precaución**: Inhiben las prostaglandinas renales (PGE2, PGI2), reduciendo la filtración glomerular. **Evitar en insuficiencia renal**.
* **Acetaminofén / Paracetamol (Tylenol / APAP)**:
  * **Seguridad**: Analgésico de elección en **insuficiencia renal** y embarazo (Categoría B).
  * **Toxicidad**: Dosis excesivas (>3000–4000 mg/día) agotan el glutatión y acumulan el metabolito tóxico **NAPQI**, causando **necrosis hepática aguda (hepatotoxicidad)**.
* **Opioides y Reversión de Sobredosis**:
  * **Naloxona (Narcan)**: Antagonista puro de receptores opioides que revierte rápidamente la depresión respiratoria potencialmente mortal.

> [!NOTE]
> **ALTO RENDIMIENTO PARA PREGUNTAS 16, 25, 26, 27:**
> * La **aspirina** produce **inhibición plaquetaria irreversible** y prolonga el sangrado en tartrectomía/raspado.
> * El **acetaminofén** es seguro en **enfermedad renal**, pero en exceso causa **toxicidad hepática grave (NAPQI)**.
> * La **naloxona (Narcan)** es el fármaco de elección para revertir la **sobredosis por opioides**.

---

## 4. Antibióticos, Embarazo y Agentes Gastrointestinales
* **Tetraciclinas (Doxiciclina, Minociclina)**:
  * **Contraindicación en Embarazo**: Categoría D. Se quelan con el calcio y se depositan en huesos fetales y gérmenes dentarios, causando **tinción intrínseca permanente amarillo-marrón** e hipoplasia del esmalte.
  * **Fotosensibilidad**: Producen quemaduras solares exageradas con mínima exposición solar.
* **Antibióticos Seguros en el Embarazo**:
  * **Amoxicilina y Penicilina VK**: Categoría B de la FDA; seguros para infecciones odontogénicas en gestantes.
* **Metronidazol (Flagyl) y Advertencia de Alcohol**:
  * Inhibe la aldehído deshidrogenasa, causando una **reacción tipo disulfiram (Antabuse)** grave con cualquier producto que contenga alcohol, incluidos **enjuagues bucales con alcohol**.
* **Fármacos Gastrointestinales**:
  * **Inhibidores de la Bomba de Protones (IBP)**: Esomeprazol (Nexium). Se unen covalentemente a la bomba $\\text{H}^+/\\text{K}^+$ ATPasa, suprimiendo el ácido gástrico por **más de 24 horas**.
  * **Antagonistas $\\text{H}_2$**: Famotidina (Pepcid). Bloquean receptores histamínicos gástricos.
  * **Terapia Triple para Úlcera Péptica**: IBP + Claritromicina + Amoxicilina (o Metronidazol) para erradicar *Helicobacter pylori*.

> [!NOTE]
> **ALTO RENDIMIENTO PARA PREGUNTAS 3, 5, 7, 12, 20, 22, 24:**
> * La **tetraciclina** está contraindicada en el embarazo (manchas dentales en el feto) y causa **fotosensibilidad**.
> * La **amoxicilina** es **segura en pacientes embarazadas**.
> * Pacientes que toman **metronidazol** deben evitar estrictamente los **enjuagues con alcohol**.
> * El **esomeprazol** logra una **supresión ácida >24 horas** por unión irreversible a la bomba de protones.
> * La **úlcera péptica por H. pylori** se trata con **claritromicina + amoxicilina/metronidazol + IBP**.

---

## 5. Fármacos Respiratorios y Cesación Tabáquica
* **Manejo del Asma**:
  * **Inhalador de Rescate (Crisis Aguda)**: **Albuterol** (Agonista Beta-2 de Acción Corta - SABA); rápida broncodilatación en 5–15 min.
  * **Mantenimiento**: Salmeterol (LABA), Fluticasona (corticoide inhalado; enjuagar la boca tras su uso para prevenir candidiasis oral).
* **Tratamiento para Dejar de Fumar**:
  * **Chicle de Nicotina**: Técnica adecuada de masticar y pausar previene dolor mandibular y náuseas. Se adhiere a restauraciones dentales. **La rinorrea (secreción nasal) es la EXCEPCIÓN (ocurre con el spray nasal)**.
  * **Vareniclina (Chantix)**: Agonista parcial nicotínico. Efectos secundarios: sueños vívidos, cambios de humor, náuseas y **estreñimiento** (la diarrea es la excepción).

> [!NOTE]
> **ALTO RENDIMIENTO PARA PREGUNTAS 19, 28, 29:**
> * El **albuterol** es el inhalador de rescate para **crisis asmáticas agudas**.
> * El **chicle de nicotina** causa dolor mandibular y se adhiere a prótesis; **la rinorrea ocurre con el spray**.
> * La **vareniclina (Chantix)** provoca cambios de humor, pesadillas y **estreñimiento**.
"""

def main():
    en_md_path = 'docs/Chapter_11_Study_Guide_English.md'
    en_pdf_path = 'docs/Chapter_11_Study_Guide_English.pdf'
    es_md_path = 'docs/Chapter_11_Study_Guide_Spanish.md'
    es_pdf_path = 'docs/Chapter_11_Study_Guide_Spanish.pdf'

    with open(en_md_path, 'w', encoding='utf-8') as f:
        f.write(ENGLISH_STUDY_GUIDE_MD)
    print(f'Wrote {en_md_path}')

    with open(es_md_path, 'w', encoding='utf-8') as f:
        f.write(SPANISH_STUDY_GUIDE_MD)
    print(f'Wrote {es_md_path}')

    compile_markdown_to_pdf(en_md_path, en_pdf_path, 'Viva Dental Prep — Chapter 11 Pharmacology Study Guide (English)', 'NBDHE Board Exam Review — Chapter 11 Pharmacology')
    compile_markdown_to_pdf(es_md_path, es_pdf_path, 'Viva Dental Prep — Guía de Estudio de Farmacología Capítulo 11 (Español)', 'Repaso para el Examen NBDHE — Capítulo 11 Farmacología')

if __name__ == '__main__':
    main()
