import os
import re
import json
import urllib.request
import markdown
from xhtml2pdf import pisa

# Setup paths
base_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"
images_dir = os.path.join(base_dir, "images")
os.makedirs(images_dir, exist_ok=True)

english_md_path = os.path.join(base_dir, "Chapter_6_Study_Guide_English.md")
spanish_md_path = os.path.join(base_dir, "Chapter_6_Study_Guide_Spanish.md")
qa_md_path = os.path.join(base_dir, "Chapter_6_Questions_and_Answers.md")

english_pdf_path = os.path.join(base_dir, "Chapter_6_Study_Guide_English.pdf")
spanish_pdf_path = os.path.join(base_dir, "Chapter_6_Study_Guide_Spanish.pdf")
qa_pdf_path = os.path.join(base_dir, "Chapter_6_Questions_and_Answers.pdf")

# CSS styles matching the styling rules
CSS_STYLES = """
@page {
    size: letter;
    margin-top: 0.8in;
    margin-bottom: 0.8in;
    margin-left: 0.8in;
    margin-right: 0.8in;
    @frame footer {
        -pdf-frame-content: footerContent;
        bottom: 0.3in;
        left: 0.8in;
        width: 6.9in;
        height: 0.3in;
    }
}
body {
    font-family: Helvetica, Arial, sans-serif;
    color: #132E2B;
    line-height: 1.4;
    font-size: 8pt;
}
h1 {
    font-size: 15pt;
    color: #0C4A47;
    margin-bottom: 4px;
    border-bottom: 2px solid #E2765A;
    padding-bottom: 4px;
    font-weight: bold;
    text-align: center;
}
h2 {
    font-size: 11pt;
    color: #0C4A47;
    margin-top: 14px;
    margin-bottom: 8px;
    border-bottom: 1.5px solid #dde7e3;
    padding-bottom: 2px;
    font-weight: bold;
}
h3 {
    font-size: 9.5pt;
    color: #0C4A47;
    margin-top: 10px;
    margin-bottom: 4px;
    font-weight: bold;
}
p {
    margin-bottom: 6px;
    text-align: justify;
}
ul {
    margin-bottom: 8px;
    margin-left: 15px;
}
li {
    margin-bottom: 3px;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 12px;
}
th {
    background-color: #0C4A47;
    color: white;
    font-weight: bold;
    text-align: left;
    padding: 5px;
    font-size: 7.5pt;
}
td {
    border-bottom: 1px solid #dde7e3;
    padding: 5px;
    font-size: 7.5pt;
}
.note {
    background-color: #FEF9E7;
    border-left: 4px solid #E6A94E;
    padding: 8px;
    margin-top: 10px;
    margin-bottom: 12px;
}
.note p {
    margin: 0;
    color: #7A6027;
    font-size: 7.5pt;
}
.note strong {
    color: #8A6418;
}
.footer-text {
    font-size: 7pt;
    color: #7d938e;
    text-align: center;
}
hr {
    color: #dde7e3;
    height: 1px;
    border: none;
    background-color: #dde7e3;
    margin-top: 15px;
    margin-bottom: 15px;
}
.question-block {
    margin-bottom: 20px;
    page-break-inside: avoid;
}
.question-number {
    font-size: 9.5pt;
    font-weight: bold;
    color: #0C4A47;
    margin-bottom: 4px;
}
.question-text {
    margin-bottom: 8px;
    font-weight: 500;
}
.options-list {
    margin-left: 15px;
    margin-bottom: 8px;
}
.option-item {
    margin-bottom: 3px;
    font-size: 8pt;
}
.answer-box {
    background-color: #F0F7F4;
    border-left: 4px solid #0C4A47;
    padding: 8px;
    margin-top: 6px;
    margin-bottom: 6px;
}
.correct-label {
    font-weight: bold;
    color: #0C4A47;
    margin-bottom: 4px;
    font-size: 7.5pt;
}
.rationale-text {
    color: #4D6661;
    font-size: 7.5pt;
    margin-top: 4px;
}
.case-box {
    background-color: #F7FAF9;
    border: 1.5px solid #dde7e3;
    padding: 12px;
    margin-bottom: 15px;
    page-break-inside: avoid;
}
.case-title {
    color: #0C4A47;
    font-size: 9.5pt;
    font-weight: bold;
    margin-bottom: 6px;
}
.case-desc {
    font-style: italic;
    color: #4D6661;
    font-size: 8pt;
    margin-bottom: 10px;
}
.case-image {
    text-align: center;
    margin-top: 8px;
    margin-bottom: 8px;
}
.case-image img {
    width: 1.9in;
    border: 1px solid #dde7e3;
}
"""

CH6_STUDY_GUIDE_ENGLISH = """# Dental Radiology Study Guide (Chapter 6)
## Focused Review for Oral Radiology (Questions 1–48)

---

## 1. Radiation Physics & X-Ray Generation
* **Ionizing Radiation**: X-rays are a form of high-energy electromagnetic radiation capable of producing ions by removing orbital electrons from atoms. They travel in straight lines at the speed of light and have no mass or charge.
* **X-Ray Tube Production**:
  * **Anode (+)**: Made of a copper stem with a **tungsten target**. Serves to convert kinetic energy of incoming electrons into x-ray photons. Only **1%** of kinetic energy is converted to x-rays; **99%** is lost as heat.
  * **Cathode (-)**: Contains a tungsten filament that produces electrons via **thermionic emission** when heated. The focusing cup directs the electron cloud toward the anode.
  * **Deceleration (Bremsstrahlung/General Radiation)**: Occurs when high-speed electrons slow down or hit the nuclei of tungsten atoms. Accounts for **70%** of dental x-ray energy produced.
  * **Characteristic Radiation**: Occurs when a high-speed electron dislodges an inner-shell electron of a tungsten atom, causing outer-shell rearrangement. Occurs only at **70 kVp and above**.

> [!NOTE]
> **HIGH-YIELD PHYSICS CONCEPTS (Q17, Q29, Q30, Q31, Q32):**
> * **Bremsstrahlung** (general radiation) is the primary source of dental x-ray photons.
> * Only **1%** of energy is converted into useful x-rays (99% is heat).
> * The **cathode** supplies electrons (thermionic emission) and the **anode (tungsten target)** receives them.
> * X-rays belong to electromagnetic radiation (photons); **particulate radiation** includes alpha/beta particles, protons, and neutrons (UV rays, gamma rays, and visible light are electromagnetic, not particulate).
> * **Velocity** refers to the speed of the wave. **Useful beam** is primary radiation.

---

## 2. Exposure Factors & Image Density
* **Milliamperage (mA)**: Controls the temperature of the cathode filament, regulating the **quantity** of electrons produced and thus the **density/darkness** of the final image. Higher mA = darker image (increased density).
* **Kilovoltage Peak (kVp)**: Controls the speed and energy of electrons moving from cathode to anode, regulating the **quality (penetrating power)** and **contrast** of the image.
  * **High kVp (e.g. 90 kVp)** = High penetrating power, **low contrast** (long scale of contrast, many shades of gray). Ideal for periodontal assessment.
  * **Low kVp (e.g. 70 kVp)** = Low penetrating power, **high contrast** (short scale of contrast, mostly black and white). Ideal for caries detection.
* **Exposure Time**: Direct multiplier of density. An increase in exposure time increases the number of photons, increasing overall image density.
* **Distance (Inverse Square Law)**: The intensity of the x-ray beam is inversely proportional to the square of the distance from the source. If distance is doubled, intensity decreases to **1/4**. If distance is halved, intensity increases by **4 times**.

| Factor | Effect on Quantity (Density) | Effect on Quality (Contrast/Penetration) | Clinical Purpose |
| :--- | :--- | :--- | :--- |
| **Increase mA** | Increases Density (Darker) | No Effect | Adjust for patient tissue density |
| **Increase kVp** | Increases Density (Darker) | Decreases Contrast (More Grays) | Long-scale contrast for bone levels |
| **Increase Time** | Increases Density (Darker) | No Effect | Primary control for film density |
| **Longer PID (Cone)** | Decreases Density (Lighter) | No Effect | Reduces patient skin exposure / magnification |

> [!NOTE]
> **HIGH-YIELD EXPOSURE CONCEPTS (Q18, Q20, Q37):**
> * To **increase image density** (make it darker), you should **increase mA, kVp, or exposure time**.
> * **Contrast** is controlled exclusively by **kVp**.
> * A longer PID (e.g. 16-inch vs. 8-inch) reduces magnification and improves sharpness but requires longer exposure times to maintain density.

---

## 3. Radiation Biology & Dose Effects
* **Mechanisms of Damage**:
  * **Direct Theory**: Ionizing radiation directly hits critical cell macromolecules (like DNA) causing cell damage/death (less common, ~33%).
  * **Indirect Theory (Radiolysis of Water)**: X-ray photons ionize water inside cells, producing hydrogen and hydroxyl **free radicals**. These recombine to form toxic substances like **hydrogen peroxide ($H_2O_2$)** which cause cellular damage (more common, ~67%).
* **Tissue Sensitivity**:
  * **Radiosensitive (Rapidly dividing, undifferentiated cells)**: Bone marrow, reproductive cells, lymph tissue, thyroid, and small lymphocytes. Fetal tissues are highly radiosensitive.
  * **Radioresistant (Highly specialized cells)**: Muscle tissue, nerve cells, mature bone.
* **Dose-Response Categories**:
  * **Stochastic Effects**: Occur by chance; severity is independent of dose. There is **no threshold** (any dose can cause a mutation; e.g., cancer, genetic mutations).
  * **Deterministic (Non-stochastic) Effects**: Have a **threshold** dose below which no effect is seen. Severity increases with dose (e.g., skin erythema, cataracts, hair loss).

> [!NOTE]
> **HIGH-YIELD BIOLOGY CONCEPTS (Q23, Q33):**
> * Free radicals produced by water radiolysis form **hydrogen peroxide ($H_2O_2$)**, a primary cell toxin.
> * Highly active, rapidly dividing cells (like a developing fetus or blood-forming organs) are most susceptible to radiation damage.

---

## 4. Radiation Protection & ALARA
* **ALARA Concept**: **As Low As Reasonably Achievable**. Every precaution must be taken to minimize radiation exposure to patients and operators.
* **Patient Protection**:
  * **Collimation**: A **rectangular collimator** restricts the beam size to slightly larger than the size 2 receptor and reduces patient skin exposure by **60%** compared to a round collimator.
  * **Filtration**: Aluminum filters remove low-energy, non-penetrating, long-wavelength x-rays from the beam.
    * Tubes operating at 70 kVp or below require **1.5 mm** aluminum filtration.
    * Tubes operating above 70 kVp require **2.5 mm** aluminum filtration.
  * **Fastest Film/Receptors**: Using digital sensors or **F-speed film** reduces patient dose significantly compared to D-speed film.
  * **Shielding**: A **lead apron with thyroid collar** must be placed on every patient.
* **Operator Protection**:
  * The operator must stand at least **6 feet away** from the tubehead and positioned at an angle of **90 to 135 degrees** relative to the primary beam.
  * The operator must **never hold a film/sensor** in the patient's mouth or hold the tubehead during exposure.

> [!NOTE]
> **HIGH-YIELD PROTECTION CONCEPTS (Q25, Q34, Q35):**
> * **F-speed film** is the fastest and most dose-efficient dental film.
> * The **rectangular collimator** is the single most effective way to reduce patient skin exposure.
> * X-ray film should be stored in a cool, dry place away from radiation (unsuitable locations: humid rooms or direct exposure zones).

---

## 5. Technique Errors & Corrections
* **Angulation Errors**:
  * **Elongation**: Teeth appear pathologically long. Caused by **insufficient (too flat) vertical angulation**. Correction: Increase vertical angulation.
  * **Foreshortening**: Teeth appear pathologically short. Caused by **excessive (too steep) vertical angulation**. Correction: Decrease vertical angulation.
  * **Overlapping**: Interproximal contact areas are overlapped. Caused by **incorrect horizontal angulation** (x-ray beam not directed through the contacts). Correction: Align PID parallel to contact lines.
  * **Cone-Cut**: A curved, unexposed (clear) area on the image. Caused by the PID not fully covering the receptor. Correction: Center the PID over the sensor holder.
* **Receptor Placement & Processing Errors**:
  * **Herringbone/Tire Track Pattern**: The film was **placed backward** in the mouth (lead foil backing facing the tube). Result is a light image with a patterned texture.
  * **Clear Film**: A totally blank/clear film. Caused by either **no radiation exposure** or putting the film in the **fixer solution first** (which washes away all silver halide crystals before development).
  * **Light Image**: Under-exposed (low mA/kVp/time) or under-developed (cold developer, exhausted chemicals).
  * **Dark Image**: Over-exposed or over-developed (warm developer, too much time).

> [!NOTE]
> **HIGH-YIELD TECHNIQUE CONCEPTS (Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q26, Q27, Q36, Q44):**
> * **Overlapping** is caused by incorrect **horizontal angulation**.
> * **Elongation** occurs when vertical angulation is **too flat (insufficient)**.
> * A **clear film** is most commonly caused by **not being exposed to radiation** or placing it in the **fixer first**.
> * Patient movement during exposure results in **decreased image sharpness**.

---

## 6. Radiographic Anatomy & Restorations
* **Radiopaque (White/Light)**: Dense structures that absorb/block x-rays (e.g. enamel, bone, restorations).
  * *Maxillary Landmarks*: Nasal septum, anterior nasal spine, zygomatic process (appears as a J or U-shaped radiopacity superior to molars), septum of maxillary sinus.
  * *Mandibular Landmarks*: Genial tubercles (ring-like radiopacity around lingual foramen), external oblique ridge, internal oblique ridge, mental ridge, mylohyoid ridge.
  * *Restorations*: Amalgam (radiopaque, irregular borders), gold (radiopaque, smooth margins), composite (intermediate radiopacity, matches tooth margins).
* **Radiolucent (Black/Dark)**: Less dense structures that allow x-rays to pass through (e.g. pulps, cavities, air spaces, foramina).
  * *Maxillary Landmarks*: Incisive (nasopalatine) foramen (oval radiolucency between central incisor roots), median palatal suture, maxillary sinus cavity.
  * *Mandibular Landmarks*: Mental foramen (circular radiolucency near premolar apices), mandibular canal (radiolucent tube bordered by thin radiopaque lines), lingual foramen.
  * *Pathology*: Dental caries (radiolucency in enamel, dentin, or root cementum).

| Landmark | Radiopacity / Radiolucency | Location | Radiographic Appearance |
| :--- | :--- | :--- | :--- |
| **Incisive Foramen** | Radiolucent | Maxilla (Anterior) | Oval opening between central incisor roots |
| **Mental Foramen** | Radiolucent | Mandible (Posterior) | Circular opening near mandibular premolar apices |
| **Zygomatic Process** | Radiopaque | Maxilla (Posterior) | J-shaped or U-shaped line superior to molars |
| **Genial Tubercles** | Radiopaque | Mandible (Anterior) | Ring of bone surrounding the lingual foramen |

> [!NOTE]
> **HIGH-YIELD ANATOMY CONCEPTS (Q2, Q4, Q39, Q40, Q41, Q42):**
> * The **Mental Foramen** is a circular radiolucency found near mandibular premolar apices.
> * The **Incisive Foramen** is a radiolucent landmark located between maxillary central incisor roots.
> * The **Zygomatic Process** appears as a J-shaped or U-shaped radiopacity superior to maxillary molar roots.
> * **Genial Tubercles** are ring-like radiopacities on the lingual aspect of the anterior mandible.
"""

CH6_STUDY_GUIDE_SPANISH = """# Guía de Estudio de Radiología Dental (Capítulo 6)
## Repaso Enfocado para Radiología Oral (Preguntas 1–48)

---

## 1. Física de la Radiación y Generación de Rayos X
* **Radiación Ionizante**: Los rayos X son una forma de radiación electromagnética de alta energía capaz de producir iones al remover electrones orbitales de los átomos. Viajan en línea recta a la velocidad de la luz y no tienen masa ni carga.
* **Producción en el Tubo de Rayos X**:
  * **Ánodo (+)**: Hecho de un vástago de cobre con un **blanco de tungsteno**. Sirve para convertir la energía cinética de los electrones entrantes en fotones de rayos X. Solo el **1%** de la energía cinética se convierte en rayos X; el **99%** restante se disipa como calor.
  * **Cátodo (-)**: Contiene un filamento de tungsteno que produce electrones mediante **emisión termoiónica** al ser calentado. La copa enfocadora dirige la nube de electrones hacia el ánodo.
  * **Desaceleración (Bremsstrahlung / Radiación General)**: Ocurre cuando los electrones de alta velocidad disminuyen su velocidad o chocan con los núcleos de los átomos de tungsteno. Representa el **70%** de la energía de rayos X dentales producida.
  * **Radiación Característica**: Ocurre cuando un electrón de alta velocidad desaloja un electrón de la capa interna de un átomo de tungsteno, causando una reorganización de las capas externas. Ocurre únicamente a **70 kVp o más**.

> [!NOTE]
> **CONCEPTOS CLAVE DE FÍSICA (Q17, Q29, Q30, Q31, Q32):**
> * La radiación de **Bremsstrahlung** (radiación general) es la principal fuente de fotones de rayos X dentales.
> * Solo el **1%** de la energía cinética de los electrones se convierte en rayos X útiles (el 99% es calor).
> * El **cátodo** proporciona los electrones (emisión termoiónica) y el **ánodo (blanco de tungsteno)** los recibe.
> * Los rayos X pertenecen a la radiación electromagnética (fotones); la **radiación corpuscular (particulada)** incluye partículas alfa y beta, protones y neutrones (los rayos UV, los rayos gamma y la luz visible son electromagnéticos, no particulados).
> * La **velocidad** se refiere a la rapidez de la onda. El **haz útil** es la radiación primaria.

---

## 2. Factores de Exposición y Densidad de la Imagen
* **Miliamperaje (mA)**: Controla la temperatura del filamento del cátodo, regulando la **cantidad** de electrones producidos y, por ende, la **densidad/oscuridad** de la imagen final. Un mA más alto = imagen más oscura (mayor densidad).
* **Kilovoltaje Pico (kVp)**: Controla la velocidad y la energía de los electrones que se mueven del cátodo al ánodo, regulando la **calidad (poder de penetración)** y el **contraste** de la imagen.
  * **Alto kVp (p. ej., 90 kVp)** = Alto poder de penetración, **bajo contraste** (escala de contraste larga, muchos tonos de gris). Ideal para la evaluación periodontal.
  * **Bajo kVp (p. ej., 70 kVp)** = Bajo poder de penetración, **alto contraste** (escala de contraste corta, principalmente blanco y negro). Ideal para la detección de caries.
* **Tiempo de Exposición**: Multiplicador directo de la densidad. Un aumento en el tiempo de exposición incrementa el número de fotones, aumentando la densidad general de la imagen.
* **Distancia (Ley del Cuadrado Inverso)**: La intensidad del haz de rayos X es inversamente proporcional al cuadrado de la distancia desde la fuente. Si la distancia se duplica, la intensidad disminuye a **1/4**. Si la distancia se reduce a la mitad, la intensidad se multiplica por **4**.

| Factor | Efecto en Cantidad (Densidad) | Efecto en Calidad (Contraste/Penetración) | Propósito Clínico |
| :--- | :--- | :--- | :--- |
| **Aumentar mA** | Incrementa Densidad (Más Oscuro) | Sin Efecto | Ajustar según la densidad del tejido del paciente |
| **Aumentar kVp** | Incrementa Densidad (Más Oscuro) | Disminuye Contraste (Más Grises) | Contraste de escala larga para niveles óseos |
| **Aumentar Tiempo** | Incrementa Densidad (Más Oscuro) | Sin Efecto | Control primario para la densidad de la película |
| **PID (Cono) Más Largo** | Disminuye Densidad (Más Claro) | Sin Efecto | Reduce la exposición cutánea y la magnificación |

> [!NOTE]
> **CONCEPTOS CLAVE DE EXPOSICIÓN (Q18, Q20, Q37):**
> * Para **aumentar la densidad de la imagen** (hacerla más oscura), se debe **aumentar el mA, el kVp o el tiempo de exposición**.
> * El **contraste** es controlado exclusivamente por el **kVp**.
> * Un PID más largo (p. ej., de 16 pulgadas vs. 8 pulgadas) reduce la magnificación y mejora la nitidez, pero requiere tiempos de exposición más largos para mantener la densidad.

---

## 3. Biología de la Radiación y Efectos de la Dosis
* **Mecanismos de Daño**:
  * **Teoría Directa**: La radiación ionizante golpea directamente macromoléculas críticas de la célula (como el ADN) causando daño o muerte celular (menos común, ~33%).
  * **Teoría Indirecta (Radiólisis del Agua)**: Los fotones de rayos X ionizan el agua dentro de las células, produciendo **radicales libres** de hidrógeno e hidroxilo. Estos se combinan para formar sustancias tóxicas como el **peróxido de hidrógeno ($H_2O_2$)**, que causa el daño celular (más común, ~67%).
* **Sensibilidad Tisular**:
  * **Radiosensibles (Células de división rápida e indiferenciadas)**: Médula ósea, células reproductoras, tejido linfático, tiroides y linfocitos pequeños. Los tejidos fetales son altamente radiosensibles.
  * **Radiorresistentes (Células altamente especializadas)**: Tejido muscular, células nerviosas, hueso maduro.
* **Categorías de Respuesta a la Dosis**:
  * **Efectos Estocásticos**: Ocurren por azar; la gravedad es independiente de la dosis. **No tienen umbral** (cualquier dosis puede causar una mutación; p. ej., cáncer, mutaciones genéticas).
  * **Efectos Deterministas (No Estocásticos)**: Tienen un **umbral** de dosis por debajo del cual no se observa ningún efecto. La gravedad aumenta con la dosis (p. ej., eritema cutáneo, cataratas, caída del cabello).

> [!NOTE]
> **CONCEPTOS CLAVE DE BIOLOGÍA (Q23, Q33):**
> * Los radicales libres producidos por la radiólisis del agua forman **peróxido de hidrógeno ($H_2O_2$)**, una toxina celular primaria.
> * Las células altamente activas y en rápida división (como las de un feto en desarrollo u órganos formadores de sangre) son las más susceptibles al daño por radiación.

---

## 4. Protección contra la Radiación y ALARA
* **Concepto ALARA**: **As Low As Reasonably Achievable** (Tan bajo como sea razonablemente posible). Se deben tomar todas las precauciones para minimizar la exposición a la radiación de pacientes y operadores.
* **Protección del Paciente**:
  * **Colimación**: Un **colimador rectangular** restringe el tamaño del haz a un área ligeramente mayor que un receptor tamaño 2 y reduce la exposición de la piel del paciente en un **60%** en comparación con un colimador redondo.
  * **Filtración**: Los filtros de aluminio eliminan los rayos X de baja energía, no penetrantes y de longitud de onda larga.
    * Los tubos que operan a 70 kVp o menos requieren **1.5 mm** de filtración de aluminio.
    * Los tubos que operan por encima de 70 kVp requieren **2.5 mm** de filtración de aluminio.
  * **Películas/Receptores Rápidos**: El uso de sensores digitales o de **película de velocidad F** reduce significativamente la dosis del paciente en comparación con la película de velocidad D.
  * **Blindaje**: Se debe colocar un **chaleco de plomo con collar tiroideo** en cada paciente.
* **Protección del Operador**:
  * El operador debe pararse al menos a **6 pies (1.8 metros) de distancia** del cabezal del tubo y posicionado en un ángulo de **90 a 135 grados** con respecto al haz primario.
  * El operador **nunca debe sostener una película/sensor** en la boca del paciente ni sostener el cabezal del tubo durante la exposición.

> [!NOTE]
> **CONCEPTOS CLAVE DE PROTECCIÓN (Q25, Q34, Q35):**
> * La **película de velocidad F** es la más rápida y eficiente en dosis en radiología dental convencional.
> * El **colimador rectangular** es el método más efectivo para reducir la dosis cutánea del paciente.
> * Las películas radiográficas deben almacenarse en un lugar fresco y seco alejado de la radiación (lugares inadecuados: habitaciones húmedas o zonas de exposición directa).

---

## 5. Errores de Técnica y Correcciones
* **Errores de Angulación**:
  * **Elongación**: Los dientes aparecen patológicamente largos. Causado por una **angulación vertical insuficiente (demasiado plana)**. Corrección: Aumentar la angulación vertical.
  * **Escorzo (Foreshortening)**: Los dientes aparecen patológicamente cortos. Causado por una **angulación vertical excesiva (demasiado empinada)**. Corrección: Disminuir la angulación vertical.
  * **Traslape (Overlapping)**: Las áreas de contacto interproximales aparecen superpuestas. Causado por una **angulación horizontal incorrecta** (el haz de rayos X no se dirige a través de los puntos de contacto). Corrección: Alinear el PID paralelo a las líneas de contacto.
  * **Corte de Cono (Cone-Cut)**: Un área curva sin exponer (blanca/clara) en la imagen. Causado por el hecho de que el PID no cubre completamente el receptor. Corrección: Centrar el PID sobre el soporte del sensor.
* **Errores de Colocación del Receptor y Procesamiento**:
  * **Patrón de Espina de Pescado (Herringbone)**: La película se colocó **al revés** en la boca (el lado de la lámina de plomo hacia el tubo). El resultado es una imagen clara con una textura estampada.
  * **Película Clara (Blanca)**: Una película totalmente en blanco/clara. Causado por la **ausencia de exposición a la radiación** o por colocar la película en la **solución fijadora primero** (lo que elimina los cristales de haluro de plata antes del revelado).
  * **Imagen Clara**: Subexpuesta (bajo mA/kVp/tiempo) o subrevelada (revelador frío, químicos agotados).
  * **Imagen Oscura**: Sobreexpuesta o sobrerevelada (revelador caliente, exceso de tiempo).

> [!NOTE]
> **CONCEPTOS CLAVE DE TÉCNICA (Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q26, Q27, Q36, Q44):**
> * El **traslape** se debe a una **angulación horizontal** incorrecta.
> * La **elongación** ocurre cuando la angulación vertical es **insuficiente (muy plana)**.
> * Una **película clara** se debe a la **falta de radiación** o al uso del **fijador primero**.
> * El movimiento del paciente durante la exposición produce una **pérdida de nitidez (borrosidad)** en la imagen.

---

## 6. Anatomía Radiográfica y Restauraciones
* **Radiopaco (Blanco/Claro)**: Estructuras densas que absorben/bloquean los rayos X (p. ej., esmalte, hueso, restauraciones).
  * *Puntos de Referencia Maxilares*: Tabique nasal, espina nasal anterior, proceso cigomático (aparece como una radiopacidad en forma de J o U superior a los molares), tabiques del seno maxilar.
  * *Puntos de Referencia Mandibulares*: Tubérculos genianos (anillo radiopaco alrededor del foramen lingual), cresta oblicua externa, cresta oblicua interna, cresta mentoniana, cresta milohioidea.
  * *Restauraciones*: Amalgama (radiopaca, bordes irregulares), oro (radiopaco, bordes lisos), resina compuesta (radiopacidad intermedia, coincide con los bordes del diente).
* **Radiolúcido (Negro/Oscuro)**: Estructuras menos densas que permiten el paso de los rayos X (p. ej., pulpas, caries, espacios aéreos, forámenes).
  * *Puntos de Referencia Maxilares*: Foramen incisivo (nasopalatino) (radiolucidez ovalada entre las raíces de los incisivos centrales), sutura palatina media, cavidad del seno maxilar.
  * *Puntos de Referencia Mandibulares*: Foramen mentoniano (radiolucidez circular cerca de los ápices premolares), conducto mandibular (tubo radiolúcido bordeado por líneas delgadas radiopacas), foramen lingual.
  * *Patología*: Caries dental (radiolucidez en esmalte, dentina o cemento radicular).

| Punto de Referencia | Radiopaco / Radiolúcido | Ubicación | Apariencia Radiográfica |
| :--- | :--- | :--- | :--- |
| **Foramen Incisivo** | Radiolúcido | Maxilar (Anterior) | Apertura ovalada entre las raíces de incisivos centrales |
| **Foramen Mentoniano** | Radiolúcido | Mandíbula (Posterior) | Apertura circular cerca de los ápices premolares mandibulares |
| **Proceso Cigomático** | Radiopaco | Maxilar (Posterior) | Línea en forma de J o U superior a las raíces de molares |
| **Tubérculos Genianos** | Radiopaco | Mandíbula (Anterior) | Anillo de hueso que rodea el foramen lingual |

> [!NOTE]
> **CONCEPTOS CLAVE DE ANATOMÍA (Q2, Q4, Q39, Q40, Q41, Q42):**
> * El **Foramen Mentoniano** es una radiolucidez circular situada cerca de los ápices premolares mandibulares.
> * El **Foramen Incisivo** es una estructura radiolúcida localizada entre las raíces de incisivos centrales maxilares.
> * El **Proceso Cigomático** aparece como una radiopacidad en forma de J o U superior a las raíces de los molares maxilares.
> * Los **Tubérculos Genianos** son radiopacidades en forma de anillo en el aspecto lingual de la mandíbula anterior.
"""

def fetch_ch6_data():
    # Load ch6 questions from our dumped file
    with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
        questions = json.load(f)
    
    # Load case sets
    with open("ch6_cases_dump.json", "r", encoding="utf-8") as f:
        cases_list = json.load(f)
        
    cases_dict = {c["id"]: c for c in cases_list if c is not None}
    
    # Filter for non-legacy questions
    new_qs = [q for q in questions if not q.get("is_legacy")]
    
    # Let's sort them so that case-based questions are grouped together at the beginning,
    # and standalone questions are at the end.
    case_based = [q for q in new_qs if q.get("case_set_id") is not None]
    standalone = [q for q in new_qs if q.get("case_set_id") is None]
    
    # Sort case-based by case_set_id, then by sequence_order or created_at
    case_based.sort(key=lambda q: (q.get("case_set_id"), q.get("sequence_order") or 0, q.get("created_at") or ""))
    
    # Sort standalone questions
    standalone.sort(key=lambda q: (q.get("sequence_order") or 0, q.get("created_at") or ""))
    
    sorted_qs = case_based + standalone
    return sorted_qs, cases_dict

def main():
    print("Loading data...")
    sorted_qs, cases_dict = fetch_ch6_data()
    print(f"Loaded {len(sorted_qs)} active new questions.")
    
    # Download images locally to make compilation robust
    print("Downloading case images locally...")
    local_images_mapping = {}
    for q in sorted_qs:
        img_url = q.get("image_url")
        if img_url:
            img_filename = os.path.basename(img_url)
            local_path = os.path.join(images_dir, img_filename)
            if not os.path.exists(local_path):
                try:
                    print(f"Downloading {img_url} -> {local_path}")
                    urllib.request.urlretrieve(img_url, local_path)
                except Exception as e:
                    print(f"Error downloading image: {e}")
            local_images_mapping[q["id"]] = local_path
            
    # Write English study guide markdown
    print("Writing English study guide...")
    with open(english_md_path, "w", encoding="utf-8") as f:
        f.write(CH6_STUDY_GUIDE_ENGLISH)
        
    # Write Spanish study guide markdown
    print("Writing Spanish study guide...")
    with open(spanish_md_path, "w", encoding="utf-8") as f:
        f.write(CH6_STUDY_GUIDE_SPANISH)
        
    # Programmatically compile HTML for Questions and Answers
    print("Generating Chapter 6 Questions & Answers content...")
    html_blocks = []
    current_case_id = None
    
    # Generate Markdown for Q&A file for record-keeping
    qa_md_lines = [
        "# Chapter 6 Review: Questions, Answers & Rationales",
        "## Complete Oral Radiology Question Bank with Images & Clinical Context",
        "",
        "---",
        ""
    ]
    
    q_num = 1
    for q in sorted_qs:
        cid = q.get("case_set_id")
        case_html = ""
        case_md = ""
        
        # Determine if we need to show a Case header
        if cid is not None and cid != current_case_id:
            current_case_id = cid
            case_data = cases_dict.get(cid)
            
            # Find the local image path for the case image from any question in this case set
            case_img_path = None
            for q_in_case in sorted_qs:
                if q_in_case.get("case_set_id") == cid and q_in_case["id"] in local_images_mapping:
                    case_img_path = local_images_mapping[q_in_case["id"]]
                    break
                    
            label = "Figure"
            desc = ""
            if case_data:
                label = case_data.get("case_label") or "Figure"
                desc = case_data.get("description") or ""
                
            img_html = ""
            img_md = ""
            if case_img_path:
                img_html = f'<div class="case-image"><img src="{case_img_path}" width="184"/></div>'
                img_md = f"![{label}]({case_img_path})\n\n"
                
            case_html = f"""
            <div class="case-box">
                <div class="case-title">{label}</div>
                <div class="case-desc">{desc}</div>
                {img_html}
            </div>
            """
            case_md = f"### **{label}**\n\n{desc}\n\n{img_md}"
            qa_md_lines.append(case_md)
        elif cid is None:
            current_case_id = None
            
        options = [q.get("option_a"), q.get("option_b"), q.get("option_c"), q.get("option_d")]
        options = [opt for opt in options if opt]
        
        options_html = ""
        options_md = ""
        if options:
            options_html = '<div class="options-list">'
            for opt in options:
                options_html += f'<div class="option-item">{opt}</div>'
                options_md += f"* {opt}\n"
            options_html += '</div>'
            
        rationale_cleaned = q.get("explanation") or ""
        rationale_html = rationale_cleaned.replace("\n", "<br/>")
        
        # Build HTML question card
        block = f"""
        <div class="question-block">
            {case_html}
            <div class="question-number">Question {q_num}</div>
            <div class="question-text">{q.get("question_text")}</div>
            {options_html}
            <div class="answer-box">
                <div class="correct-label">Correct Answer: {q.get("correct_option").upper()}</div>
                <div class="rationale-text"><strong>Clinical Rationale:</strong><br/>{rationale_html}</div>
            </div>
        </div>
        <hr/>
        """
        html_blocks.append(block)
        
        # Build Markdown question block
        q_md = f"""### **Q{q_num}. {q.get("question_text")}**
{options_md}

* **Correct Answer:** **{q.get("correct_option").upper()}**
* **Clinical Rationale:**
  {rationale_cleaned}

---

"""
        qa_md_lines.append(q_md)
        q_num += 1
        
    # Write Q&A markdown
    print("Writing Chapter 6 Q&A markdown...")
    with open(qa_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(qa_md_lines))
        
    # Build complete HTML for Q&A PDF
    qa_full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{CSS_STYLES}
</style>
</head>
<body>
<div id="footerContent" class="footer-text">
    NBDHE Chapter 6 Questions & Answers &nbsp;|&nbsp; Page <pdf:pagenumber> of <pdf:pagecount>
</div>
<h1>Chapter 6: Oral Radiology Questions & Answers</h1>
<p style="text-align: center; margin-bottom: 20px; font-style: italic; color: #4D6661;">
    Comprehensive Question Bank containing Case Radiographs, Stems, and Detailed Explanations.
</p>
<hr/>
{"".join(html_blocks)}
</body>
</html>
"""

    # Compile function for study guides
    def compile_pdf(md_path, pdf_path, doc_title):
        print(f"Reading study guide: {md_path}")
        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()

        md_text = md_text.replace("> [!NOTE]", ">")
        html_content = markdown.markdown(md_text, extensions=['tables'])
        html_content = html_content.replace("<blockquote>", '<div class="note">')
        html_content = html_content.replace("</blockquote>", '</div>')

        full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{CSS_STYLES}
</style>
</head>
<body>
<div id="footerContent" class="footer-text">
    {doc_title} &nbsp;|&nbsp; Page <pdf:pagenumber> of <pdf:pagecount>
</div>
{html_content}
</body>
</html>
"""
        print(f"Compiling study guide PDF to: {pdf_path}")
        with open(pdf_path, "w+b") as out_file:
            pisa_status = pisa.CreatePDF(full_html, dest=out_file)
            
        if pisa_status.err:
            print(f"Error compiling: {pdf_path}")
        else:
            print(f"Success! Saved PDF to {pdf_path}")

    # Compile Study Guides
    compile_pdf(english_md_path, english_pdf_path, "NBDHE Chapter 6 Summary (English)")
    compile_pdf(spanish_md_path, spanish_pdf_path, "NBDHE Resumen de Capítulo 6 (Español)")
    
    # Compile Q&A PDF
    print(f"Compiling Q&A PDF to: {qa_pdf_path}")
    with open(qa_pdf_path, "w+b") as out_file:
        pisa_status = pisa.CreatePDF(qa_full_html, dest=out_file)
        
    if pisa_status.err:
        print(f"Error compiling Q&A PDF: {qa_pdf_path}")
    else:
        print(f"Success! Saved Q&A PDF to {qa_pdf_path}")
        
    print("All Chapter 6 resources generated and compiled successfully!")

if __name__ == "__main__":
    main()
