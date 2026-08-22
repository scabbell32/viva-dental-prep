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
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "Viva Dental Prep — Chapter 12: Nutrition & Biochemistry")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
            
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL — NBDHE Study Materials")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.restoreState()

def build_qa_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), '../docs/Chapter_12_Questions_and_Answers.pdf')
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    with open(os.path.join(os.path.dirname(__file__), '../docs/ch12_parsed_raw.json'), 'r') as f:
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

    story = []
    story.append(Paragraph("Chapter 12: Biochemistry, Nutrition & Nutritional Counseling", title_style))
    story.append(Paragraph("Comprehensive NBDHE Board Exam Review — Questions, Answers & Rationales (44 Questions)", subtitle_style))
    story.append(Spacer(1, 10))

    for i, q in enumerate(qs):
        num = i + 1
        q_elements = []
        q_elements.append(Paragraph(f"Question {num}", qnum_style))
        q_elements.append(Paragraph(q['question_text'], stem_style))
        
        # Options
        for opt_key in ['a', 'b', 'c', 'd']:
            opt_text = q.get(f'option_{opt_key}', '')
            if opt_text:
                q_elements.append(Paragraph(f"<b>{opt_key}.</b> {opt_text}", opt_style))
        
        # Correct answer block
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
    print("✅ Built PDF: docs/Chapter_12_Questions_and_Answers.pdf")

def build_study_guides():
    # English Study Guide
    eng_content = """# Chapter 12 High-Yield NBDHE Study Guide
## Biochemistry, Nutrition, and Nutritional Counseling

---

## 1. Carbohydrate Chemistry & Metabolism
* **Monosaccharides:** Simple sugars (Glucose, Fructose, Galactose). Fructose is the sweetest.
* **Disaccharides:**
  * **Sucrose:** Glucose + Fructose (most cariogenic carbohydrate).
  * **Lactose:** Glucose + Galactose (milk sugar).
  * **Maltose:** Glucose + Glucose.
* **Polysaccharides:**
  * **Homopolysaccharides:** Composed of identical repeating monosaccharide units (e.g., Cellulose, Glycogen, Starch).
  * **Heteropolysaccharides:** Mixed carbohydrate units (e.g., Pectin, Hemicellulose, Glycoproteins).
* **Soluble vs. Insoluble Fiber:**
  * **Soluble Fiber:** Pectin, oat bran, gums, mucilages (dissolve in water, lower serum cholesterol).
  * **Insoluble Fiber:** Cellulose, hemicellulose, lignin (increase fecal bulk, accelerate transit).
* **Digestion & Glycolysis:**
  * Salivary amylase begins starch breakdown in the oral cavity.
  * In aerobic glycolysis, glucose produces **Pyruvate**, which converts to **Acetyl-CoA** for the Krebs cycle.
  * In anaerobic glycolysis, glucose produces **Lactic acid**.
* **Cariogenicity & Stephan Curve:**
  * Frequency and form (retentiveness/stickiness) of sugar intake are far more critical to caries risk than total quantity consumed.
  * Each sugar exposure drops plaque pH below critical level (**5.5 for enamel**, **6.0–6.7 for cementum/dentin**) for 20–40 minutes.
  * Eating sweets with meals rather than between meals reduces net cariogenic exposure.

---

## 2. Amino Acids & Protein Metabolism
* **Essential vs. Non-Essential Amino Acids:**
  * Essential (must be supplied in diet): Histidine, Isoleucine, Leucine, Lysine, Methionine, Phenylalanine, Threonine, Tryptophan, Valine.
  * PKU (Phenylketonuria): Patients lack phenylalanine hydroxylase; avoid **Aspartame** (NutraSweet) which hydrolyzes to phenylalanine.
* **Digestion:** Pepsin (stomach) and trypsin/chymotrypsin (pancreas) hydrolyze peptide bonds.
* **Nitrogen Balance:**
  * **Positive Balance:** Intake > Output (Growth, pregnancy, recovery from trauma).
  * **Negative Balance:** Output > Intake (Starvation, catabolic illness, anorexia nervosa).

---

## 3. Lipids & Energy Metabolism
* **Caloric Values:**
  * Lipids: **9 kcal/g**
  * Carbohydrates: **4 kcal/g**
  * Proteins: **4 kcal/g**
  * Alcohol: **7 kcal/g**
* **Compound Lipids:** Glycolipids (contain carbohydrate components and are abundant in brain and myelin sheath).
* **Bile Salts:** Synthesized by liver, stored in gallbladder; emulsify dietary fats in duodenum.

---

## 4. Vitamins & Minerals in Dental Health
* **Fat-Soluble (A, D, E, K):**
  * Stored in liver and adipose tissue; toxicity possible with chronic mega-doses.
  * **Vitamin A:** Essential for salivary gland epithelium integrity, amelogenesis, and mucosal maintenance.
  * **Vitamin D:** Facilitates calcium absorption; deficiency causes rickets (children) or osteomalacia (adults).
  * **Vitamin E:** Antioxidant membrane protection.
  * **Vitamin K:** Co-factor for prothrombin and clotting factors (II, VII, IX, X).
* **Water-Soluble (B-Complex, C):**
  * Readily excreted in urine; daily intake required.
  * **Vitamin C (Ascorbic Acid):** Essential cofactor for prolyl/lysyl hydroxylase in collagen synthesis (dentin, pulp, PDL). Deficiency causes Scurvy.
  * **Thiamin (B1) & Niacin (B3):** Depleted by chronic alcoholism.
  * **Vitamin B12 (Cobalamin):** Bound to intrinsic factor in stomach; deficiency causes **Pernicious Anemia** (glossitis, red beefy tongue, paresthesia). Vegans require supplementation.

---

## 5. Clinical Nutritional Counseling & Special Populations
* **24-Hour Recall + 3–7 Day Food Diary:** Golden standard for assessing accurate dietary habits.
* **Diabetic Patients:** Schedule morning visits 1.5–2 hours post-breakfast and medication to prevent hypoglycemia.
* **CKD (Chronic Kidney Disease):** Restrict dietary phosphorus, sodium, and carefully titrate protein.
* **New Prosthesis:** Soft/liquid diet for first 24 hours; chew bilaterally to equalize occlusal load; flavors initially feel altered.
* **Bulimia & Anorexia:** Perimylolysis (chemical acid erosion of lingual maxillary surfaces) and parotid gland hypertrophy.
"""
    with open('docs/Chapter_12_Study_Guide_English.md', 'w', encoding='utf-8') as f:
        f.write(eng_content)

    # Spanish Study Guide
    esp_content = """# Guía de Estudio de Alto Rendimiento NBDHE — Capítulo 12
## Bioquímica, Nutrición y Consejería Nutricional

---

## 1. Química y Metabolismo de Carbohidratos
* **Monosacáridos:** Azúcares simples (Glucosa, Fructosa, Galactosa). La fructosa es el azúcar más dulce.
* **Disacáridos:**
  * **Sacarosa:** Glucosa + Fructosa (carbohidrato más cariogénico).
  * **Lactosa:** Glucosa + Galactosa (azúcar de la leche).
  * **Maltosa:** Glucosa + Glucosa.
* **Polisacáridos:**
  * **Homopolisacáridos:** Formados por unidades idénticas de monosacáridos (p. ej., Celulosa, Glucógeno, Almidón).
  * **Heteropolisacáridos:** Formados por unidades mixtas (Pectina, Hemicelulosa, Glucoproteínas).
* **Fibra Soluble vs. Insoluble:**
  * **Fibra Soluble:** Pectina, salvado de avena, gomas (se disuelven en agua, disminuyen el colesterol sérico).
  * **Fibra Insoluble:** Celulosa, lignina (aumentan el volumen fecal y aceleran el tránsito intestinal).
* **Digestión y Glucólisis:**
  * La amilasa salival inicia la hidrólisis del almidón en la cavidad oral.
  * En la glucólisis aeróbica, la glucosa produce **Piruvato**, el cual se convierte en **Acetil-CoA** para el ciclo de Krebs.
  * En condiciones anaeróbicas, produce **Ácido láctico**.
* **Cariogenicidad y Curva de Stephan:**
  * La frecuencia y consistencia (adherencia) del consumo de azúcar son mucho más críticas para el riesgo de caries que la cantidad total.
  * Cada exposición desciende el pH por debajo del nivel crítico (**5.5 para esmalte**, **6.0–6.7 para dentina/cemento**) durante 20 a 40 minutos.

---

## 2. Aminoácidos y Metabolismo Proteico
* **Aminoácidos Esenciales vs. No Esenciales:**
  * Esenciales: Histidina, Isoleucina, Leucina, Lisina, Metionina, Fenilalanina, Treonina, Triptófano, Valina.
  * Fenilcetonuria (PKU): Deficiencia de fenilalanina hidroxilasa; evitar **Aspartamo**, ya que se metaboliza en fenilalanina.
* **Balance Nitrogenado:**
  * **Positivo:** Ingesta > Excreción (Crecimiento, embarazo, curación tisular).
  * **Negativo:** Excreción > Ingesta (Inanición, enfermedades catabólicas, anorexia nerviosa).

---

## 3. Lípidos y Valores Energéticos
* **Aporte Calórico:**
  * Lípidos: **9 kcal/g**
  * Carbohidratos: **4 kcal/g**
  * Proteínas: **4 kcal/g**
  * Alcohol: **7 kcal/g**
* **Lípidos Compuestos:** Glucolípidos (contienen carbohidratos y abundan en el cerebro y vainas de mielina).
* **Sales Biliares:** Producidas en hígado, almacenadas en vesícula; emulsionan grasas en duodeno.

---

## 4. Vitaminas y Minerales en Salud Oral
* **Liposolubles (A, D, E, K):**
  * Se almacenan en hígado y tejido adiposo; riesgo de toxicidad por megadosis crónicas.
  * **Vitamina A:** Integridad epitelial de glándulas salivales y amelogénesis.
  * **Vitamina D:** Absorción de calcio; déficit causa raquitismo u osteomalacia.
  * **Vitamina K:** Cofactor de factores de coagulación (II, VII, IX, X).
* **Hidrosolubles (Complejo B, C):**
  * Se excretan en orina; requieren consumo diario.
  * **Vitamina C:** Cofactor de hidroxilasas de prolina y lisina en la síntesis de colágeno (dentina, pulpa, ligamento periodontal). Déficit causa Escorbuto.
  * **Vitamina B12:** Causa **Anemia Perniciosa** (glositis, lengua roja carnosa, parestesias). Los veganos requieren suplementación.

---

## 5. Consejería Nutricional Clínica
* **Diario Dietético (3-7 días + Recordatorio 24h):** Método estándar de oro.
* **Pacientes Diabéticos:** Citas matutinas 1.5 a 2 horas tras desayuno y medicación.
* **Enfermedad Renal Crónica:** Restringir fósforo y sodio en la dieta.
* **Bulimia:** Perimilólisis (erosión ácida química en caras linguales de dientes anterosuperiores).
"""
    with open('docs/Chapter_12_Study_Guide_Spanish.md', 'w', encoding='utf-8') as f:
        f.write(esp_content)

    print("Wrote English & Spanish Study Guides.")

def build_roleplay():
    rp_content = """# Chapter 12 Bilingual Role-Play Dialogues
## Nutritional Counseling & Cariology Patient Communication

---

## 🎭 SCENARIO 1: High School Athlete with Frequent Sports Drink & Snack Consumption (Case A - Alex)

### **Clinical Context**
Alex (17 y/o varsity football player) presents with two new interproximal carious lesions. He drinks Gatorade during practices, energy drinks at night, and snacks on refined carbohydrates while working at an ice cream parlor.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "Alex, we noticed two small new cavities forming between your teeth today. I know you have a demanding football schedule and work at the ice cream shop. Tell me about the drinks and snacks you reach for when you're on the go."

**Higienista Dental (Español):**
> "Alex, hoy notamos dos pequeñas caries nuevas entre tus dientes. Sé que tienes un horario muy exigente con el fútbol y tu trabajo en la heladería. Cuéntame qué bebidas y bocadillos consumes cuando estás fuera de casa."

**Alex:**
> "I drink Gatorade during morning practice and energy drinks in the evening to stay awake for AP homework. Plus, free ice cream at work!"

**Dental Hygienist (English):**
> "Those sports and energy drinks keep your teeth bathed in acid and sugar for hours. Every time you sip a sugary drink, your mouth drops below the critical pH of 5.5, which strips calcium and phosphate from your enamel for 20 to 30 minutes. Switching to water during practices and eating your sweet treats with meals—instead of sipping them all evening—will stop these cavities in their tracks."

**Higienista Dental (Español):**
> "Esas bebidas deportivas y energéticas bañan tus dientes en ácido y azúcar durante horas. Cada vez que tomas un sorbo dulce, el pH de tu boca cae por debajo de 5.5, desmineralizando el esmalte durante 20 a 30 minutos. Cambiar a agua durante los entrenamientos y consumir los dulces junto con las comidas principales detendrá estas caries de inmediato."

---

## 🎭 SCENARIO 2: Geriatric Patient with Medication-Induced Xerostomia & Nighttime Sweets (Case B - Mrs. James)

### **Clinical Context**
Mrs. James (67 y/o widow taking Lisinopril and Zoloft) presents with dry mouth, cervical root demineralization, and carious lesions on molars. She uses honey lemon cough drops and eats ice cream in bed without brushing before sleep.

### **Dialogue (Bilingual)**

**Dental Hygienist (English):**
> "Mrs. James, your blood pressure medication can reduce your saliva flow, which makes your teeth vulnerable to decay. Because saliva neutralizes mouth acids, sucking on honey-lemon lozenges and enjoying ice cream in bed without brushing exposes your root surfaces to continuous acid attack."

**Higienista Dental (Español):**
> "Sra. James, sus medicamentos para la presión pueden disminuir la saliva, haciendo que sus dientes sean vulnerables a las caries. Como la saliva neutraliza los ácidos, chupar pastillas con miel y comer helado en la cama sin cepillarse expone las raíces dentales a un ataque ácido continuo."

**Mrs. James:**
> "My throat is so dry at night, but I get too tired to get out of bed and brush."

**Dental Hygienist (English):**
> "Let's switch your cough drops to sugar-free xylitol lozenges, which actually fight cavity-causing bacteria. Keep a water bottle by your bedside instead of sugary tea, and we will prescribe a high-fluoride 5000 ppm toothpaste to remineralize those root surfaces before you go to sleep."

**Higienista Dental (Español):**
> "Cambiemos las pastillas de miel por pastillas sin azúcar con xilitol, las cuales combaten las bacterias causantes de caries. Tenga agua fresca junto a su cama en lugar de té con azúcar, y le recetaremos una pasta de alto contenido de flúor (5000 ppm) para remineralizar sus raíces antes de dormir."
"""
    with open('docs/Chapter_12_Bilingual_Role_Play_Dialogues.md', 'w', encoding='utf-8') as f:
        f.write(rp_content)
    print("Wrote Bilingual Role Play Dialogues.")

build_qa_pdf()
build_study_guides()
build_roleplay()
