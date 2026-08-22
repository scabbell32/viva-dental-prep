import os
import re
import markdown
from xhtml2pdf import pisa

# Setup paths
base_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"
os.makedirs(base_dir, exist_ok=True)

english_md_path = os.path.join(base_dir, "Chapter_7_Study_Guide_English.md")
spanish_md_path = os.path.join(base_dir, "Chapter_7_Study_Guide_Spanish.md")
qa_md_path = os.path.join(base_dir, "Chapter_7_Questions_and_Answers.md")

english_pdf_path = os.path.join(base_dir, "Chapter_7_Study_Guide_English.pdf")
spanish_pdf_path = os.path.join(base_dir, "Chapter_7_Study_Guide_Spanish.pdf")
qa_pdf_path = os.path.join(base_dir, "Chapter_7_Questions_and_Answers.pdf")

# CSS styles matching compile_pdfs.py and compile_qa_pdf.py
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
    font-size: 9.5pt;
}
h1 {
    font-size: 20pt;
    color: #0C4A47;
    margin-bottom: 4px;
    border-bottom: 2px solid #E2765A;
    padding-bottom: 4px;
    font-weight: bold;
    text-align: center;
}
h2 {
    font-size: 14pt;
    color: #0C4A47;
    margin-top: 14px;
    margin-bottom: 8px;
    border-bottom: 1.5px solid #dde7e3;
    padding-bottom: 2px;
    font-weight: bold;
}
h3 {
    font-size: 11pt;
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
    font-size: 8.5pt;
}
td {
    border-bottom: 1px solid #dde7e3;
    padding: 5px;
    font-size: 8.5pt;
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
    font-size: 9pt;
}
.note strong {
    color: #8A6418;
}
.footer-text {
    font-size: 7.5pt;
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
    font-size: 11pt;
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
    font-size: 9.5pt;
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
    font-size: 9pt;
}
.rationale-text {
    color: #4D6661;
    font-size: 9pt;
    margin-top: 4px;
}
"""

# Reconstructed questions data dictionary
QUESTIONS_DATA = [
    {
        "num": 1,
        "case": "Case A",
        "case_desc": "Mr. Steve Perry is a new patient to your dental practice. He presents with generalized gingivitis indicated by gingival inflammation, edema, bleeding upon probing, and red fiery tissue. You also notice generalized heavy biofilm at the gingival margin. As you begin to explain your clinical findings to Mr. Perry, he explains he often feels discomfort and pain when flossing his teeth so he has discontinued his flossing routine. Use Case A to answer questions 1 to 4.",
        "stem": "What is the cause of the redness described in Case A?",
        "options": [
            "a. Vasoconstriction of blood vessels",
            "b. Increased vascularity",
            "c. Elimination of malignant neoplasia as a possible cause",
            "d. Exudation of fluid"
        ],
        "answer": "B. Increased vascularity is the cause of redness",
        "rationale": "Increased vascularity is the cause of redness.<br/><br/>* a. Vasoconstriction of blood vessels causes stasis.<br/>* c. Stretching of pain receptors causes pain.<br/>* d. Exudation of fluid causes swelling."
    },
    {
        "num": 2,
        "case": "Case A",
        "case_desc": "Mr. Steve Perry is a new patient to your dental practice. He presents with generalized gingivitis indicated by gingival inflammation, edema, bleeding upon probing, and red fiery tissue. You also notice generalized heavy biofilm at the gingival margin. As you begin to explain your clinical findings to Mr. Perry, he explains he often feels discomfort and pain when flossing his teeth so he has discontinued his flossing routine. Use Case A to answer questions 1 to 4.",
        "stem": "What is the cause of the gingival edema described in Case A?",
        "options": [
            "a. Vasoconstriction of blood vessels",
            "b. Increased vascularity",
            "c. Stretching of pain receptors",
            "d. Exudation of fluid"
        ],
        "answer": "D. Exudation of fluid causes gingival edema",
        "rationale": "Exudation of fluid causes gingival edema.<br/><br/>* a. Vasoconstriction of blood vessels causes stasis.<br/>* b. Increased vascularity causes redness.<br/>* c. Stretching of pain receptors causes pain."
    },
    {
        "num": 3,
        "case": "Case A",
        "case_desc": "Mr. Steve Perry is a new patient to your dental practice. He presents with generalized gingivitis indicated by gingival inflammation, edema, bleeding upon probing, and red fiery tissue. You also notice generalized heavy biofilm at the gingival margin. As you begin to explain your clinical findings to Mr. Perry, he explains he often feels discomfort and pain when flossing his teeth so he has discontinued his flossing routine. Use Case A to answer questions 1 to 4.",
        "stem": "Which of the following signs of inflammation can explain the pain Mr. Perry is reporting?",
        "options": [
            "a. Rubor",
            "b. Calor",
            "c. Dolor",
            "d. Functio laesa"
        ],
        "answer": "C. Dolor is responsible for pain",
        "rationale": "Dolor is responsible for pain.<br/><br/>* a. Rubor is redness.<br/>* b. Calor is heat.<br/>* d. Functio laesa is loss of function."
    },
    {
        "num": 4,
        "case": "Case A",
        "case_desc": "Mr. Steve Perry is a new patient to your dental practice. He presents with generalized gingivitis indicated by gingival inflammation, edema, bleeding upon probing, and red fiery tissue. You also notice generalized heavy biofilm at the gingival margin. As you begin to explain your clinical findings to Mr. Perry, he explains he often feels discomfort and pain when flossing his teeth so he has discontinued his flossing routine. Use Case A to answer questions 1 to 4.",
        "stem": "Mr. Perry's gingival tissue is reacting in response to an inflammatory stimulus. The inflammatory response has what type of reaction?",
        "options": [
            "a. Vascular and cellular reaction",
            "b. Vascular and regenerative reaction",
            "c. Regenerative and reparative reaction",
            "d. Cellular and regenerative reaction"
        ],
        "answer": "A. Mr. Perry’s gingival tissue is reacting to a vascular and cellular reaction in the inflammatory process",
        "rationale": "The inflammatory response primarily manifests as a vascular and cellular reaction to stimulus.<br/><br/>* b. Regenerative reaction is not part of the inflammatory response.<br/>* c. Regenerative and reparative reactions are part of the wound healing process, not the inflammatory response.<br/>* d. Regenerative reaction is not part of the inflammatory response."
    },
    {
        "num": 5,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "The body’s response to the development of an abscess most likely represents:",
        "options": [
            "a. Acute inflammation",
            "b. Chronic inflammation",
            "c. Regeneration",
            "d. Repair"
        ],
        "answer": "A. Acute inflammation manifests with exudation of fluid (edema in this case) and emigration of leukocytes, mainly neutrophils, and is characterized by rapid onset and short duration",
        "rationale": "Acute inflammation is characterized by rapid onset, short duration, exudation of fluid (edema), and neutrophil emigration.<br/><br/>* b. Chronic inflammation is a sustained response over a longer duration.<br/>* c. Regeneration represents growth of cells and tissues to replace lost structures.<br/>* d. Repair is a combination of regeneration and scar formation."
    },
    {
        "num": 6,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "Which of the following is another name for redness (as seen in Mrs. Goddard's case)?",
        "options": [
            "a. Dolor",
            "b. Calor",
            "c. Tumor",
            "d. Rubor"
        ],
        "answer": "D. Rubor is the other name for redness",
        "rationale": "Rubor represents redness.<br/><br/>* a. Dolor is pain.<br/>* b. Calor is heat.<br/>* c. Tumor is swelling."
    },
    {
        "num": 7,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "Edema is associated with which of the following processes?",
        "options": [
            "a. Redness caused by increased vascularity",
            "b. Exudation of fluid",
            "c. Dilation of blood vessels",
            "d. Stretching of pain receptors"
        ],
        "answer": "B. Edema is associated with exudation of fluid also known as increased fluid in the interstitial space",
        "rationale": "Edema is caused by the exudation of fluid into the interstitial tissue spaces.<br/><br/>* a. Redness is caused by increased vascularity.<br/>* c. Calor (heat) is associated with blood flow and chemical mediators.<br/>* d. Dolor (pain) is caused by stretching of pain receptors."
    },
    {
        "num": 8,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "Which of the following cells are primary white blood cells associated with suppuration (pus formation)?",
        "options": [
            "a. Lymphocytes and plasma cells",
            "b. Eosinophils and mast cells",
            "c. Neutrophils and macrophages",
            "d. Eosinophils and lymphocytes"
        ],
        "answer": "C. Neutrophils and macrophages are the primary white blood cells associated with suppuration; neutrophils are the first white blood cells to emigrate to the site of injury and the primary cell involved in acute inflammation followed by macrophages",
        "rationale": "Neutrophils and macrophages are the cells that form pus. Neutrophils arrive first during acute inflammation, followed by macrophages.<br/><br/>* a. Lymphocytes and plasma cells are involved in chronic inflammation.<br/>* b. Eosinophils are involved in immune reactions/parasitic infections; mast cells are involved in allergic responses."
    },
    {
        "num": 9,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "Recent evidence demonstrates that in addition to phagocytosis, neutrophils also perform which function?",
        "options": [
            "a. Regulate vascular permeability",
            "b. Release chemical mediators",
            "c. Regulate bronchial smooth muscle tone",
            "d. Contribute to the repair process"
        ],
        "answer": "D. Neutrophils contribute to repair as well as the inflammatory response",
        "rationale": "Neutrophils perform phagocytosis and also actively contribute to the wound repair process.<br/><br/>* a, b, and c are all primary functions of mast cells, not neutrophils."
    },
    {
        "num": 10,
        "case": "Case B",
        "case_desc": "Mrs. Evelyn Goddard presents with a periodontal abscess on the buccal mucosa adjacent to tooth #30. She noticed swelling and mild pain in this area when she woke up in the morning and called the dental office immediately for an appointment. Upon examination with the dental hygienist, the area was significantly enlarged with redness and edema. A fistula was present. When the tissue was compressed, suppuration was expressed. Use Case B to answer questions 5 to 10.",
        "stem": "What type of healing will occur in the narrow space left by the fistula/abscess drainage?",
        "options": [
            "a. Primary intention",
            "b. Secondary intention",
            "c. Tertiary intention",
            "d. None of the above"
        ],
        "answer": "A. Primary intention healing will occur. Even though sutures are not placed, the edges of the wound will be in close approximation and there will be a narrow incisional space for healing to occur",
        "rationale": "Primary intention occurs when wound edges are close together, leaving a narrow space for healing.<br/><br/>* b. Secondary intention involves a large, separated space with abundant granulation tissue.<br/>* c. and d. represent tertiary intention which is delayed wound closure due to contamination."
    },
    {
        "num": 11,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "What is the first step in the healing process of the extraction socket?",
        "options": [
            "a. An inflammatory process",
            "b. Thrombus or clot formation",
            "c. Granulation tissue formation",
            "d. Collagen remodeling"
        ],
        "answer": "B. Thrombus or clot is formed at the site of injury as the first step in the healing process",
        "rationale": "Clot/thrombus formation is always the very first step in wound healing.<br/><br/>* a. Inflammation occurs shortly after clot formation.<br/>* c and d are later stages in the wound healing process."
    },
    {
        "num": 12,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "During wound healing, the epithelium will form a basement membrane under the scab within what time frame?",
        "options": [
            "a. 12 hours",
            "b. 24 hours",
            "c. 24-48 hours",
            "d. 72 hours"
        ],
        "answer": "C. Epithelium will form a basement membrane under the scab within 24-48 hours",
        "rationale": "Epithelial migration and basement membrane formation under the protective scab occur within 24 to 48 hours post-injury."
    },
    {
        "num": 13,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "By day 5 in the wound healing process, granulation tissue fills the incisional space. All of the following are characteristics of granulation tissue EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Tissue is pink and soft",
            "b. New small blood vessels appear",
            "c. New vessels are fully patent and do not leak",
            "d. Amount of granulation tissue depends on the size of the wound"
        ],
        "answer": "C. New vessels tend to leak and are edematous",
        "rationale": "During early granulation, newly formed blood vessels are immature, fragile, and leak fluid, making the tissue edematous. They are NOT fully patent and leak-free.<br/><br/>* All other options (a, b, and d) are correct characteristics of granulation tissue."
    },
    {
        "num": 14,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "Tissues recover what percentage of tensile strength over a 3-month period of healing as compared with intact skin?",
        "options": [
            "a. 60-70%",
            "b. 70-80%",
            "c. 80-90%",
            "d. 100%"
        ],
        "answer": "B. Tissues recover 70-80% of tensile strength over a 3-month period of healing as compared with intact skin",
        "rationale": "Healed wounds recover up to 70-80% of original tensile strength by 3 months. Strength rarely reaches 100% of uninjured tissue."
    },
    {
        "num": 15,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "Which of the following is considered a systemic factor (rather than a local factor) that may inhibit or prolong the wound healing process?",
        "options": [
            "a. Size of the wound",
            "b. Foreign material in the wound",
            "c. Location of the wound",
            "d. Blood supply"
        ],
        "answer": "D. Blood supply is considered a systemic factor that may inhibit or prolong the wound healing process",
        "rationale": "Blood supply (vascular status) is a systemic parameter affecting healing capacity.<br/><br/>* a, b, and c are local factors that directly affect only the localized wound site."
    },
    {
        "num": 16,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "Which wound healing anomaly occurs as a result of deficient scar formation?",
        "options": [
            "a. Wound dehiscence",
            "b. Keloid",
            "c. Contracture",
            "d. Fibrosis"
        ],
        "answer": "A. Wound dehiscence occurs with deficient scar formation",
        "rationale": "Wound dehiscence (re-opening of a wound) occurs when scar tissue formation is deficient.<br/><br/>* b. Keloid is an overgrowth of scar tissue.<br/>* c. Contracture is an exaggeration of normal wound contraction.<br/>* d. Fibrosis is extensive deposition of collagen that causes dysfunction."
    },
    {
        "num": 17,
        "case": "Case C",
        "case_desc": "Sam Adams presents for extraction of tooth #32 which is impacted. The extraction is performed and surgery is uneventful. Sutures are placed and the patient is discharged with instructions to alternate acetaminophen and ibuprofen as needed for pain, apply ice on the outside of the mouth to reduce swelling, gently rinse the mouth with a mild antiseptic mouth rinse, consume liquid based foods/soft diet for 1-2 days and return in one week for post-op evaluation and suture removal. Use Case C to answer questions 11 to 17.",
        "stem": "Local factors that could prolong the wound healing of the extraction site include all of the following EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Size of the wound",
            "b. Blood supply",
            "c. Foreign material in the wound",
            "d. Infection of the wound"
        ],
        "answer": "B. Size, location and type of wound is a local factor for wound healing",
        "rationale": "Blood supply is a systemic factor that affects wound healing, whereas size, location, foreign material, and infection are local factors."
    },
    {
        "num": 18,
        "case": "Case D",
        "case_desc": "Mrs. Monica Salt is a female patient scheduled for periodontal maintenance. As you are reviewing her health history, Mrs. Salt tells you that she is pregnant. She is concerned about her baby being born with a cleft lip and palate because there is a family history. Use Case D to answer questions 18 to 21.",
        "stem": "Which of the following is a primary indication for genetic counseling?",
        "options": [
            "a. Routine pregnancy checkup",
            "b. Advanced maternal age only",
            "c. Maternal nutrition concern",
            "d. Previous family history of cleft lip and palate"
        ],
        "answer": "D. Previous family history of cleft lip and palate would be reasons for genetic counseling",
        "rationale": "A family history of congenital disorders like cleft lip and palate is a primary indication for genetic counseling.<br/><br/>* a, b, and c do not warrant chromosome analysis or genetics referrals."
    },
    {
        "num": 19,
        "case": "Case D",
        "case_desc": "Mrs. Monica Salt is a female patient scheduled for periodontal maintenance. As you are reviewing her health history, Mrs. Salt tells you that she is pregnant. She is concerned about her baby being born with a cleft lip and palate because there is a family history. Use Case D to answer questions 18 to 21.",
        "stem": "The majority of mutations associated with hereditary diseases are:",
        "options": [
            "a. Genome mutations",
            "b. Chromosome mutations",
            "c. Submicroscopic gene mutations",
            "d. Cytosine gene mutations"
        ],
        "answer": "C. A majority of mutations associated with hereditary diseases are submicroscopic gene mutations",
        "rationale": "Submicroscopic gene mutations (point mutations or small indels) make up the majority of genetic alterations causing hereditary disease."
    },
    {
        "num": 20,
        "case": "Case D",
        "case_desc": "Mrs. Monica Salt is a female patient scheduled for periodontal maintenance. As you are reviewing her health history, Mrs. Salt tells you that she is pregnant. She is concerned about her baby being born with a cleft lip and palate because there is a family history. Use Case D to answer questions 18 to 21.",
        "stem": "In this case, genetic testing for the fetus can be performed on cells obtained by:",
        "options": [
            "a. Amniocentesis",
            "b. Chorionic villus biopsy",
            "c. Umbilical cord blood",
            "d. All of the above"
        ],
        "answer": "D. Amniocentesis, chorionic villus biopsy, and umbilical cord blood are ways in which genetic testing can be performed on cells obtained from a fetus",
        "rationale": "All listed methods (amniocentesis, CVS, and cordocentesis) obtain fetal cells for karyotyping or genetic analysis."
    },
    {
        "num": 21,
        "case": "Case D",
        "case_desc": "Mrs. Monica Salt is a female patient scheduled for periodontal maintenance. As you are reviewing her health history, Mrs. Salt tells you that she is pregnant. She is concerned about her baby being born with a cleft lip and palate because there is a family history. Use Case D to answer questions 18 to 21.",
        "stem": "Cleft lip and/or cleft palate is considered a disorder of:",
        "options": [
            "a. Single gene inheritance",
            "b. Multiple factorial inheritance",
            "c. Autosomal dominant inheritance",
            "d. Autosomal recessive inheritance"
        ],
        "answer": "B. Cleft lip and/or cleft palate is considered a disorder of multiple factorial inheritance",
        "rationale": "Cleft lip and palate results from multiple genetic and environmental factors (multifactorial inheritance).<br/><br/>* a, c, and d represent single-gene inheritance patterns (such as Huntington's or sickle cell anemia)."
    },
    {
        "num": 22,
        "case": "Case E",
        "case_desc": "Mr. and Mrs. Dorchester present to the dental practice for a consult. They would like to bring their 4-year-old son to the office for comprehensive oral health care; however, he has Duchenne muscular dystrophy. They are concerned that the practice can provide care managing their son’s condition as the disease progresses. Use Case E to answer questions 22 to 25.",
        "stem": "What type of genetic disease does Duchenne muscular dystrophy represent?",
        "options": [
            "a. Autosomal dominant disorder",
            "b. Autosomal recessive disorder",
            "c. X-linked recessive disorder",
            "d. Disorder with multifactorial inheritance"
        ],
        "answer": "C. Duchenne muscular dystrophy is an X-linked recessive disorder",
        "rationale": "Duchenne muscular dystrophy is inherited in an X-linked recessive pattern.<br/><br/>* a. Neurofibromatosis is autosomal dominant.<br/>* b. Phenylketonuria is autosomal recessive.<br/>* d. Coronary heart disease is multifactorial."
    },
    {
        "num": 23,
        "case": "Case E",
        "case_desc": "Mr. and Mrs. Dorchester present to the dental practice for a consult. They would like to bring their 4-year-old son to the office for comprehensive oral health care; however, he has Duchenne muscular dystrophy. They are concerned that the practice can provide care managing their son’s condition as the disease progresses. Use Case E to answer questions 22 to 25.",
        "stem": "All of the following are characteristics of Duchenne muscular dystrophy EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Primarily affects males",
            "b. All sons of carrier mothers are carriers",
            "c. No male-to-male transmission",
            "d. Affected males transmit the genes to all daughters"
        ],
        "answer": "B. All daughters are carriers of Duchenne muscular dystrophy",
        "rationale": "Sons of carrier mothers either inherit the mutated X chromosome and are affected, or inherit the healthy X and are unaffected; they are never carriers. All daughters of affected males will be carriers (inheriting his only mutated X chromosome)."
    },
    {
        "num": 24,
        "case": "Case E",
        "case_desc": "Mr. and Mrs. Dorchester present to the dental practice for a consult. They would like to bring their 4-year-old son to the office for comprehensive oral health care; however, he has Duchenne muscular dystrophy. They are concerned that the practice can provide care managing their son’s condition as the disease progresses. Use Case E to answer questions 22 to 25.",
        "stem": "Which of the following is an example of a multifactorial inheritance disorder?",
        "options": [
            "a. Hemophilia",
            "b. Duchenne muscular dystrophy",
            "c. Red-green color blindness",
            "d. Coronary heart disease"
        ],
        "answer": "D. Coronary heart disease is an example of multifactorial inheritance disorders",
        "rationale": "Coronary heart disease is multifactorial, depending on multiple genes and lifestyle elements.<br/><br/>* a, b, and c are all X-linked recessive disorders."
    },
    {
        "num": 25,
        "case": "Case E",
        "case_desc": "Mr. and Mrs. Dorchester present to the dental practice for a consult. They would like to bring their 4-year-old son to the office for comprehensive oral health care; however, he has Duchenne muscular dystrophy. They are concerned that the practice can provide care managing their son’s condition as the disease progresses. Use Case E to answer questions 22 to 25.",
        "stem": "All of the following are methods of examining genetic material for Duchenne muscular dystrophy EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Karyotyping",
            "b. Chromosome analysis",
            "c. Polymerase chain reaction",
            "d. Electromyography"
        ],
        "answer": "D. Karyotyping, chromosome analysis, and polymerase chain reaction are all methods of examining genetic material for Duchenne muscular dystrophy",
        "rationale": "Karyotyping, chromosome analysis, and PCR directly analyze genetic structures or DNA. Electromyography measures muscle electrical activity, not genetic material."
    },
    {
        "num": 26,
        "case": "Case F",
        "case_desc": "Janis Johnson presents to your practice with a chief complaint of a mass on the left buccal mucosa of normal tissue coloration. The lesion has been present for 2 months, is painless, but interferes occasionally with chewing activities. The patient reports that she has been known to bite the mass causing it to become ulcerated. Answer the following items as they relate to the diagnostic process. Use Case F to answer questions 26 to 30.",
        "stem": "Classify the abnormality based on the primary manifestation.",
        "options": [
            "a. A white mucosal discoloration without loss of mucosal integrity",
            "b. A dark mucosal discoloration",
            "c. A loss of mucosal integrity",
            "d. Enlargement of soft tissues"
        ],
        "answer": "D. Enlargement of soft tissues is the primary manifestation because the lesion is a mass on the buccal mucosa",
        "rationale": "The lesion is a localized swelling or mass, classifying it as an enlargement of soft tissues. It is not white, dark, and is not primarily an ulceration (loss of integrity) though it can be traumatized."
    },
    {
        "num": 27,
        "case": "Case F",
        "case_desc": "Janis Johnson presents to your practice with a chief complaint of a mass on the left buccal mucosa of normal tissue coloration. The lesion has been present for 2 months, is painless, but interferes occasionally with chewing activities. The patient reports that she has been known to bite the mass causing it to become ulcerated. Answer the following items as they relate to the diagnostic process. Use Case F to answer questions 26 to 30.",
        "stem": "Which of the following is NOT an appropriate clinical diagnostic technique to evaluate this mass?",
        "options": [
            "a. Probing",
            "b. Palpation",
            "c. Aspiration",
            "d. Visual examination"
        ],
        "answer": "A. A mass cannot be probed",
        "rationale": "A soft tissue mass is assessed by palpation, inspection, or aspiration. Probing is used to measure pocket depths or tissue defects, not solid masses."
    },
    {
        "num": 28,
        "case": "Case F",
        "case_desc": "Janis Johnson presents to your practice with a chief complaint of a mass on the left buccal mucosa of normal tissue coloration. The lesion has been present for 2 months, is painless, but interferes occasionally with chewing activities. The patient reports that she has been known to bite the mass causing it to become ulcerated. Answer the following items as they relate to the diagnostic process. Use Case F to answer questions 26 to 30.",
        "stem": "Alcohol use, tobacco use, and oral behaviors describe which component of the patient's history during the diagnostic process?",
        "options": [
            "a. Demographics",
            "b. Habits",
            "c. Recent history",
            "d. Patient awareness of condition"
        ],
        "answer": "B. Alcohol use, tobacco use, and oral behaviors describe a patient’s habits",
        "rationale": "These elements are grouped under patient habits.<br/><br/>* a. Demographics include age, gender, race.<br/>* c. Recent history includes trauma, surgeries, infections."
    },
    {
        "num": 29,
        "case": "Case F",
        "case_desc": "Janis Johnson presents to your practice with a chief complaint of a mass on the left buccal mucosa of normal tissue coloration. The lesion has been present for 2 months, is painless, but interferes occasionally with chewing activities. The patient reports that she has been known to bite the mass causing it to become ulcerated. Answer the following items as they relate to the diagnostic process. Use Case F to answer questions 26 to 30.",
        "stem": "Pain, discomfort, altered function, duration, and response to factors such as stress or certain foods all describe the patient's:",
        "options": [
            "a. Demographics",
            "b. Habits",
            "c. Recent history",
            "d. Awareness of condition"
        ],
        "answer": "D. Pain, discomfort or altered function, duration, response to factors such as stress or certain foods all describe patient awareness of condition",
        "rationale": "These items capture the patient's subjective awareness of their condition."
    },
    {
        "num": 30,
        "case": "Case F",
        "case_desc": "Janis Johnson presents to your practice with a chief complaint of a mass on the left buccal mucosa of normal tissue coloration. The lesion has been present for 2 months, is painless, but interferes occasionally with chewing activities. The patient reports that she has been known to bite the mass causing it to become ulcerated. Answer the following items as they relate to the diagnostic process. Use Case F to answer questions 26 to 30.",
        "stem": "All of the following are terms for a working diagnosis EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Differential diagnosis",
            "b. Probable diagnosis",
            "c. Preliminary diagnosis",
            "d. Tentative diagnosis"
        ],
        "answer": "B. Probable diagnosis is a fabricated term",
        "rationale": "Probable diagnosis is not a formal diagnostic term. Differential, preliminary, and tentative are standard classifications of a working diagnosis."
    },
    {
        "num": 31,
        "case": "None",
        "case_desc": "",
        "stem": "Which white blood cells are responsible for producing vasoconstrictive chemical mediators that maintain chronic inflammation and performing phagocytosis?",
        "options": [
            "a. Eosinophils",
            "b. Lymphocytes",
            "c. Macrophages",
            "d. Mast cells"
        ],
        "answer": "C. Macrophages are the white blood cells responsible for producing vasoconstrictive chemical mediators which maintain chronic inflammation",
        "rationale": "Macrophages play a key role in chronic inflammation by phagocytizing tissue debris and releasing chemical mediators that sustain the inflammatory state.<br/><br/>* a. Eosinophils assist in allergic/parasitic responses.<br/>* b. Lymphocytes orchestrate chronic immune responses.<br/>* d. Mast cells trigger acute inflammation via histamine release."
    },
    {
        "num": 32,
        "case": "None",
        "case_desc": "",
        "stem": "Which white blood cells are responsible for assisting in immune reactions and defending against parasitic infections?",
        "options": [
            "a. Eosinophils",
            "b. Lymphocytes",
            "c. Macrophages",
            "d. Mast cells"
        ],
        "answer": "A. Eosinophils are involved in immune reactions and parasitic infections",
        "rationale": "Eosinophils are specialized granulocytes key to fighting parasitic infections and regulating immediate allergic hypersensitivity."
    },
    {
        "num": 33,
        "case": "None",
        "case_desc": "",
        "stem": "Which chemical mediator is responsible for causing dilation of arterioles, constricting large arteries, increasing vascular permeability (edema), and smooth muscle contraction?",
        "options": [
            "a. Serotonin",
            "b. Bradykinin",
            "c. Histamine",
            "d. Arachidonic acid"
        ],
        "answer": "C. Histamine is the chemical mediator that is responsible for causing dilation of arterioles and constricting large arteries, edema and smooth muscle contraction",
        "rationale": "Histamine (predominantly from mast cells) dilates arterioles, constricts larger arteries, increases vascular permeability, and contracts smooth muscle.<br/><br/>* a. Serotonin causes vasoconstriction/increased permeability in immune responses.<br/>* b. Bradykinin dilates vessels, increases permeability, and causes pain.<br/>* d. Arachidonic acid is a precursor to prostaglandins/leukotrienes."
    },
    {
        "num": 34,
        "case": "None",
        "case_desc": "",
        "stem": "Programmed cell death that occurs during phagocytosis without inducing inflammation is referred to as:",
        "options": [
            "a. Engulfment",
            "b. Degradation",
            "c. Apoptosis",
            "d. Chemotaxis"
        ],
        "answer": "C. Apoptosis is programmed cell death in phagocytosis",
        "rationale": "Apoptosis is programmed, non-inflammatory cell death.<br/><br/>* a, b, and d are steps in the migration and ingestion stages of phagocytosis."
    },
    {
        "num": 35,
        "case": "None",
        "case_desc": "",
        "stem": "Pro-resolving mediators (like lipoxins and resolvins) perform all of the following functions EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Evoke potent antiinflammatory mechanisms",
            "b. Return cells to homeostasis",
            "c. Enhance microbial clearance",
            "d. Induce pain"
        ],
        "answer": "D. Pro-resolving mediators help to reduce pain",
        "rationale": "Pro-resolving mediators function to resolve inflammation, clear microbes, and *reduce* pain. They do not induce pain."
    },
    {
        "num": 36,
        "case": "None",
        "case_desc": "",
        "stem": "Which of the following chemical mediators moderates the susceptibility, development, and progression of autoimmune and inflammatory diseases?",
        "options": [
            "a. Interleukin-6 (IL-6)",
            "b. Tumor Necrosis Factor (TNF)",
            "c. Interleukin-1 (IL-1)",
            "d. Nitric Oxide (NO)"
        ],
        "answer": "A. IL-6 is the chemical mediators moderates the susceptibility, development and progression of autoimmune and inflammatory diseases",
        "rationale": "IL-6 is a pleiotropic cytokine that regulates chronic inflammation and autoimmune progression.<br/><br/>* b and c (TNF and IL-1) drive acute systemic reactions and septic shock.<br/>* d (NO) is microbicidal and vasoactive."
    },
    {
        "num": 37,
        "case": "None",
        "case_desc": "",
        "stem": "All of the following are possible outcomes of acute inflammation EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Complete resolution",
            "b. Healing by connective tissue replacement (fibrosis/scarring)",
            "c. Progression of tissue to chronic inflammation",
            "d. Leukopenia"
        ],
        "answer": "D. Leukopenia is not a possible outcome of inflammation; leukocytosis is the outcome of inflammation",
        "rationale": "Acute inflammation leads to leukocytosis (elevated WBCs), not leukopenia (depleted WBCs). Complete resolution, scarring, and chronic progression are normal potential outcomes."
    },
    {
        "num": 38,
        "case": "None",
        "case_desc": "",
        "stem": "Which of the following oral conditions is associated with chronic inflammation?",
        "options": [
            "a. Gingivitis",
            "b. von Willebrand disease",
            "c. Anemia",
            "d. Caries"
        ],
        "answer": "A. Gingivitis is associated with chronic inflammation",
        "rationale": "Gingivitis and periodontitis represent chronic inflammatory responses to plaque biofilm.<br/><br/>* b is a genetic bleeding disorder.<br/>* c is a blood disorder.<br/>* d is a localized infectious decay process."
    },
    {
        "num": 39,
        "case": "None",
        "case_desc": "",
        "stem": "A hallmark of healing and repair is the formation of:",
        "options": [
            "a. A scab",
            "b. Granulation tissue",
            "c. Adjacent blood vessels",
            "d. Endothelial growth factor"
        ],
        "answer": "B. Formation of granulation tissue is a hallmark of healing",
        "rationale": "Granulation tissue, rich in new capillaries and fibroblasts, is the diagnostic hallmark of active healing."
    },
    {
        "num": 40,
        "case": "None",
        "case_desc": "",
        "stem": "Extensive deposition of collagen that sustains the synthesis and secretion of growth factors during the wound healing process causing significant scar formation represents:",
        "options": [
            "a. Wound dehiscence",
            "b. Keloid",
            "c. Contracture",
            "d. Fibrosis"
        ],
        "answer": "D. Fibrosis is extensive deposition of collagen that sustains the synthesis and secretion of growth factors during the wound healing process causing significant scar formation",
        "rationale": "Fibrosis refers to extensive, pathologic deposition of collagen leading to dense scar tissue.<br/><br/>* a is split-open margins.<br/>* b is a raised, overgrown scar.<br/>* c is pathologic shrinkage."
    },
    {
        "num": 41,
        "case": "None",
        "case_desc": "",
        "stem": "Poor wound healing associated with a severely compromised blood supply can lead to:",
        "options": [
            "a. Chronic obstructive pulmonary disease (COPD)",
            "b. Rheumatoid arthritis",
            "c. Amputation",
            "d. Cirrhosis"
        ],
        "answer": "C. Poor wound healing with a compromised blood supply can lead to amputation",
        "rationale": "Severe ischemia (lack of blood flow) prevents healing, leading to tissue necrosis/gangrene and eventual amputation."
    },
    {
        "num": 42,
        "case": "None",
        "case_desc": "",
        "stem": "Stem cells derived from another individual of the same species are referred to as:",
        "options": [
            "a. Autogenous",
            "b. Allogenous",
            "c. Unipotent",
            "d. Totipotent"
        ],
        "answer": "B. Stem cells derived from other individuals is defined as allogenous",
        "rationale": "Allogenous cells come from a separate donor of the same species. Autogenous cells come from the patient's own body."
    },
    {
        "num": 43,
        "case": "None",
        "case_desc": "",
        "stem": "Characteristics of embryonic stem cells include all of the following EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Pluripotent capacity",
            "b. Isolated from the inner cell mass of blastocysts",
            "c. Found in adult skin, the lining of the intestine, cornea, and brain",
            "d. May be used to treat organs affected by diabetes or spinal cord injury"
        ],
        "answer": "C. Adult stems are found in skin, lining of intestine, cornea and brain",
        "rationale": "Stem cells in the skin, gut, cornea, and brain are multipotent adult stem cells, not embryonic stem cells. The other properties describe embryonic stem cells."
    },
    {
        "num": 44,
        "case": "None",
        "case_desc": "",
        "stem": "What is the most common commercially available source of adult stem cells?",
        "options": [
            "a. Umbilical cord blood stem cells",
            "b. Dental stem cells",
            "c. Adipose-derived stem cells",
            "d. Bone marrow-derived stem cells"
        ],
        "answer": "D. Bone marrow-derived stem cells are the most common commercially available stem cell",
        "rationale": "Bone marrow aspirates are the most widely used and commercially available source of adult hematopoietic and mesenchymal stem cells."
    },
    {
        "num": 45,
        "case": "None",
        "case_desc": "",
        "stem": "A common, unique property of stem cells is their:",
        "options": [
            "a. Ability to undergo rapid senescence",
            "b. Capacity to intermittently undergo division or remain quiescent",
            "c. Development from terminally differentiated cells",
            "d. Production of single-lineage cells only"
        ],
        "answer": "B. A common property of stem cells is the capacity to intermittently undergo division or remain quiescent",
        "rationale": "Stem cells can replicate indefinitely (self-renewal) or enter a resting state (quiescence) until triggered to divide."
    },
    {
        "num": 46,
        "case": "None",
        "case_desc": "",
        "stem": "Sources of dental stem cells include all of the following EXCEPT one. Which one is the EXCEPTION?",
        "options": [
            "a. Pulp chamber walls (dentin)",
            "b. Periodontal ligament",
            "c. Unerupted third molars",
            "d. Exfoliated primary teeth"
        ],
        "answer": "A. The pulp chamber is not a source of dental stem cells",
        "rationale": "Dental stem cells are harvested from soft tissues like the dental pulp, PDL, follicle, or apical papilla. The mineralized dentin walls of the pulp chamber do not contain stem cells."
    },
    {
        "num": 47,
        "case": "None",
        "case_desc": "",
        "stem": "Approximately how many genes do humans have?",
        "options": [
            "a. 10,000 to 15,000",
            "b. 15,000 to 20,000",
            "c. 20,000 to 25,000",
            "d. 25,000 to 30,000"
        ],
        "answer": "C. Humans have 20,000 to 25,000 genes",
        "rationale": "Current sequencing estimates place the human genome at approximately 20,000 to 25,000 protein-coding genes."
    },
    {
        "num": 48,
        "case": "None",
        "case_desc": "",
        "stem": "Which of the following represents the four letters of the DNA code?",
        "options": [
            "a. Adenine, thiamine, cytosine, guanine",
            "b. Adenine, thymine, cystine, guanine",
            "c. Adenosine, thymine, cytosine, guanine",
            "d. Adenine, thymine, cytosine, guanine"
        ],
        "answer": "D. Adenine, thymine, cytosine, and guanine are the four letters of the DNA code",
        "rationale": "DNA nitrogenous bases are Adenine, Thymine, Cytosine, and Guanine. Other options use incorrect terms (thiamine is a vitamin, cystine is an amino acid, adenosine is a nucleoside)."
    },
    {
        "num": 49,
        "case": "None",
        "case_desc": "",
        "stem": "For an autosomal dominant inheritance disorder, a person has what percent chance of passing the trait to their offspring?",
        "options": [
            "a. 25%",
            "b. 50%",
            "c. 75%",
            "d. 100%"
        ],
        "answer": "B. A person has a 50% chance of passing a trait to an offspring for an autosomal dominant inheritance disorder",
        "rationale": "A heterozygote with an autosomal dominant condition has a 50% chance of passing the mutant allele to each child."
    },
    {
        "num": 50,
        "case": "None",
        "case_desc": "",
        "stem": "With autosomal recessive inheritance, two carrier parents have what percent chance with each conception of having an affected child?",
        "options": [
            "a. 25%",
            "b. 50%",
            "c. 75%",
            "d. 100%"
        ],
        "answer": "A. Two carrier parents have a 25% chance of having an affected child with an autosomal recessive inheritance disorder with each conception",
        "rationale": "For an autosomal recessive trait, each pregnancy of carrier parents (Aa x Aa) has a 25% chance of producing an affected child (aa)."
    }
]

# Generate Markdown content for English Study Guide
ENGLISH_STUDY_GUIDE_MD = """# General Pathology & Genetics Study Guide
## Focused Review for Questions 1–50 (including Cases A to F)

**How to use this guide:** Study the yellow "High-Yield" boxes first. They contain the facts most directly tested in Questions 1–50. Then use the question-to-concept map at the end to connect each question with the correct concept.

---

## 1. Cellular Injury, Death, and Inflammation Basics
* **Cellular Death**:
  * **Apoptosis**: Programmed, active, organized cell death. The cell shrinks and fragment structures are phagocytized cleanly **without inducing an inflammatory response**.
  * **Necrosis**: Pathological, accidental cell death from injury. The cell swells and ruptures, releasing lysosomal enzymes that damage surrounding tissues and **induce acute inflammation**.
* **Phagocytosis Cascade**: The process of engulfing and destroying pathogens or cellular debris.
  * *Steps in order*: **Chemotaxis** (cell migration to the site of injury) → **Opsonization** (coating target with proteins for recognition) → **Engulfment** (ingesting target) → **Degradation** (intracellular killing/lysis).
* **The Inflammation Cascade**: A protective tissue response to injury, divided into acute and chronic.
  * **Acute Inflammation**: Rapid onset, short duration. Characterized by **fluid exudation (edema)** and the migration of white blood cells, predominantly **neutrophils** (the first line of defense).
  * **Chronic Inflammation**: Slow onset, long duration. Involves **macrophages**, lymphocytes, and plasma cells. Macrophages phagocytize debris and release vasoconstrictive chemical mediators that maintain chronic inflammation.
  * **Suppuration (Pus)**: Suppuration is the formation of purulent exudate (pus). The primary white blood cells responsible are **neutrophils and macrophages** that ingest bacteria and degenerate at the site of injury.

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 1, 2, 3, 4, 5, 8, 9, 31, 32, 34, 37, 38: Cellular Death & Inflammation**
> * **Apoptosis** is programmed cell death that **does not cause inflammation**.
> * **Neutrophils** are the first cells to arrive in **acute inflammation**.
> * **Suppuration** is primarily composed of **neutrophils and macrophages**.
> * **Macrophages** produce chemical mediators that maintain **chronic inflammation**.
> * **Gingivitis** is an example of a disease characterized by **chronic inflammation**.
> * **Leukocytosis** (elevated WBCs) is a typical outcome of inflammation; **leukopenia** (low WBCs) is NOT.

---

## 2. Cardinal Signs & Chemical Mediators of Inflammation
* **Five Cardinal Signs of Inflammation**:
  1. **Rubor (Redness)**: Caused by vasodilation and **increased vascularity** (blood flow) to the site of injury.
  2. **Calor (Heat)**: Caused by a combination of increased blood flow and the release of inflammatory mediators.
  3. **Tumor (Swelling/Edema)**: Caused by the **exudation of fluid** (plasma and proteins) from leaky vessels into the interstitial tissue space.
  4. **Dolor (Pain)**: Caused by the **stretching of local pain receptors** due to edema, and the release of pain-inducing mediators.
  5. **Functio laesa (Loss of function)**: Resulting from pain and swelling.
* **Chemical Mediators**: Small molecules that coordinate the inflammatory response.
  * **Histamine**: Secreted primarily by **mast cells**. It causes arteriole dilation, increases vascular permeability (edema), and induces smooth muscle contraction.
  * **Serotonin**: Acts as a vasoconstrictor and increases vascular permeability during immunologic reactions.
  * **Bradykinin**: Increases vascular permeability, contracts smooth muscle, dilates vessels, and triggers **inflammatory pain**.
  * **Arachidonic Acid Metabolites**: Precursor to prostaglandins (which cause fever/pain) and leukotrienes.
  * **Interleukin-6 (IL-6)**: Moderates susceptibility, development, and progression of **autoimmune and inflammatory diseases**.
  * **TNF & IL-1**: Cytokines responsible for endothelial activation, systemic acute-phase reactions (fever), and the hemodynamic effects of septic shock.
  * **Nitric Oxide (NO)**: Relaxes vascular smooth muscle causing vasodilation, and acts as a microbicidal agent.
  * **Pro-Resolving Mediators**: Lipoxins, resolvins, and protectins. They actively resolve inflammation, enhance microbial clearance, and **reduce pain**.

| Mediator | Source | Primary Function | Clinical Relevance |
| :--- | :--- | :--- | :--- |
| **Histamine** | Mast Cells | Vasodilation, capillary permeability | Primary mediator in acute inflammation / allergy |
| **Bradykinin** | Plasma | Dilation, contracts smooth muscle, pain | Directly stimulates pain receptors (**Dolor**) |
| **IL-6** | Macrophages | Cytokine regulation | Drives autoimmune disease progression |
| **Pro-resolving** | Lipids | Actively resolves inflammation | Helps **reduce pain** and return cells to homeostasis |

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 1, 2, 3, 6, 7, 33, 35, 36: Cardinal Signs & Mediators**
> * **Rubor** (redness) is caused by **increased vascularity**.
> * **Tumor** (swelling/edema) is caused by **exudation of fluid**.
> * **Dolor** is responsible for **pain**, caused by stretching pain receptors.
> * **Histamine** is released by **mast cells** and causes vasodilation and increased permeability.
> * **IL-6** moderates the progression of **autoimmune and chronic inflammatory diseases**.
> * **Pro-resolving mediators** help to **reduce pain** and resolve inflammation.

---

## 3. Wound Healing, Repair, and Tissue Regeneration
* **Wound Healing Phases**:
  * **Step 1: Hemostasis**: Immediate **thrombus (clot) formation** at the injury site to prevent blood loss.
  * **Step 2: Inflammation**: Emigration of neutrophils and macrophages to clear pathogens.
  * **Step 3: Proliferation**: Cell migration and division. Epithelial cells migrate and form a **basement membrane under the protective scab within 24 to 48 hours**.
  * **Step 4: Granulation Tissue**: Tissue that fills the wound space. It is characterized by being **pink, soft, and containing fragile, leaky new blood vessels** (making it edematous), alongside proliferating fibroblasts.
  * **Step 5: Remodeling**: Tissue gains strength. Tissues recover **70-80% of original tensile strength over a 3-month period** of healing as compared to intact skin (it rarely recovers 100%).
* **Types of Healing Intention**:
  * **Primary Intention**: Occurs when wound edges are clean and closely approximated (e.g., sutured surgical incision, or narrow drained abscess fistula). Healing occurs with minimal scar.
  * **Secondary Intention**: Occurs in larger wounds with separated edges. The gap is filled by abundant granulation tissue, leaving a large scar and undergoing significant wound contraction.
  * **Tertiary Intention**: Delayed primary closure. Contaminated wounds are left open for repeated debridement and antibiotic therapy before surgical closure.
* **Healing Anomalies**:
  * **Wound Dehiscence**: Separation or splitting open of wound margins due to **deficient scar formation**.
  * **Keloid**: A raised, overgrown scar that extends beyond the original wound margins due to **excessive scar growth**.
  * **Contracture**: An exaggeration of normal contraction during healing, resulting in physical deformity.
  * **Fibrosis**: Pathological deposition of excessive collagen that sustains growth factors, causing massive scarring and dysfunction.
* **Factors Influencing Healing**:
  * **Local Factors**: Inhibit healing at the wound site (e.g., **size and location of the wound, foreign material**, infection).
  * **Systemic Factors**: Body-wide factors (e.g., **blood supply/ischemia**, diabetes, nutrition, age, steroid use).

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 10, 11, 12, 13, 14, 15, 16, 17, 39, 40, 41: Wound Healing & Repair**
> * **Thrombus/clot formation** is the **first step** in wound healing.
> * Epithelial cells form a **basement membrane** under the scab in **24-48 hours**.
> * **Granulation tissue** is pink and soft, and contains **fragile, leaky vessels**.
> * Wounds recover **70-80% of tensile strength** by **3 months**.
> * **Blood supply** is a **systemic factor** in healing; **wound size & foreign material** are **local factors**.
> * **Wound Dehiscence** is caused by **deficient scar formation**.
> * **Fibrosis** is the extensive deposition of collagen.
> * Compromised blood supply (severe ischemia) can result in tissue necrosis and **amputation**.

---

## 4. Stem Cells & Regenerative Medicine
* **Basic Properties**: Stem cells are characterized by **self-renewal** (the capacity to undergo division or remain **quiescent/resting**) and **potency** (the ability to differentiate into other cell types).
* **Stem Cell Sources**:
  * **Autogenous**: Stem cells harvested from the same individual being treated (no rejection risk).
  * **Allogenous**: Stem cells harvested from another individual of the same species.
* **Levels of Potency**:
  * **Totipotent**: Can differentiate into any cell type, including extraembryonic membranes (e.g., zygote).
  * **Pluripotent**: Can differentiate into all cells of the body, but not extraembryonic tissues (e.g., **embryonic stem cells**, isolated from the **inner cell mass of blastocysts**).
  * **Multipotent**: Can differentiate into multiple cell types within a specific lineage (e.g., **adult stem cells**, found in **skin, gut lining, cornea, brain, and bone marrow**).
  * **Unipotent**: Can give rise to only one mature cell type.
* **Adult & Dental Stem Cells**:
  * The most common commercially available source of adult stem cells is **bone marrow**.
  * **Dental Stem Cells**: High-potency adult stem cells found in dental soft tissues. Sources include the **dental pulp, periodontal ligament (PDL), unerupted third molars, and exfoliated primary teeth**. (Note: the mineralized *pulp chamber walls* composed of dentin do not contain stem cells).

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 42, 43, 44, 45, 46: Stem Cells**
> * **Allogenous** stem cells come from **another individual**.
> * **Embryonic stem cells** are **pluripotent** and isolated from the **inner cell mass of blastocysts**.
> * **Adult stem cells** are found in **skin, gut lining, and bone marrow**; **bone marrow** is the most common commercial source.
> * **Dental stem cells** are found in **dental pulp, PDL, third molars, and primary teeth**; the **pulp chamber wall (dentin)** is NOT a source.

---

## 5. Genetics and Patterns of Inheritance
* **The Human Genome**: Humans possess approximately **20,000 to 25,000 protein-coding genes**.
* **DNA Code**: The genetic code is written using four nitrogenous base letters: **Adenine (A), Thymine (T), Cytosine (C), and Guanine (G)**.
* **Modes of Inheritance & Transmission Risks**:
  * **Autosomal Dominant**: A single copy of the mutated gene causes the disorder. A carrier/affected parent has a **50% chance of passing the trait** to each offspring. Examples: Huntington's disease, von Willebrand disease, Marfan syndrome.
  * **Autosomal Recessive**: Two copies of the mutated gene are required. Two carrier parents (Aa x Aa) have a **25% chance of having an affected child** (aa) with each pregnancy. Examples: Sickle cell anemia, cystic fibrosis, phenylketonuria (PKU).
  * **X-Linked Recessive**: Gene located on the X chromosome. Primarily affects males (who only have one X). There is **no male-to-male transmission**. Affected males transmit the mutated X to **all daughters**, making them obligate carriers. Example: **Duchenne muscular dystrophy**.
  * **Multifactorial Inheritance**: Disorders caused by the combined effects of multiple genes and environmental factors. Examples: **Cleft lip and/or cleft palate, coronary heart disease**.
* **Prenatal Diagnostics**: Fetal genetic testing is performed on cells obtained via **amniocentesis, chorionic villus biopsy (CVS), or umbilical cord blood sampling**.

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 18, 19, 20, 21, 22, 23, 24, 25, 47, 48, 49, 50: Genetics & Inheritance**
> * The human genome has **20,000 to 25,000 genes**.
> * The four DNA letters are **Adenine, Thymine, Cytosine, and Guanine**.
> * **Autosomal dominant** disorders have a **50% transmission risk**.
> * **Autosomal recessive** carrier parents have a **25% risk** of an affected child.
> * **Duchenne muscular dystrophy** is an **X-linked recessive** disorder. All daughters of affected males are carriers.
> * **Cleft lip and/or palate** and **coronary heart disease** are **multifactorial** disorders.
> * Indication for genetic counseling: **Family history of cleft lip/palate**.
> * Fetal genetic cells are gathered via **amniocentesis, chorionic villus biopsy, and umbilical cord blood**.

---

## 6. Diagnostic Process and Clinical Assessment
* **Clinical Evaluation Techniques**:
  * **Visual Examination**: Assessing the location, shape, size, color, delineation of borders, and texture of a lesion.
  * **Palpation**: Feeling a lesion to determine compressibility, tenderness, and color changes under pressure (e.g. blanching).
  * **Auscultation**: Listening to sounds (e.g., popping/clicking TMJ).
  * **Probing**: Evaluating tissue defects or measuring pocket depths.
  * **Aspiration**: Withdrawing fluid (e.g., pus from abscesses, cyst fluid).
* **Diagnostic History Categories**:
  * **Habits**: Alcohol use, tobacco use, and oral behaviors (e.g., nail-biting, cheek-biting).
  * **Demographics**: Patient age, gender, and race/ethnicity.
  * **Recent History**: History of local injury, infection, or surgery.
  * **Awareness of Condition**: Patient's reports of pain, duration, and response to stress or foods.
* **Working Diagnosis Classifications**: The initial list of possibilities is a **working diagnosis**, which includes **differential diagnosis, preliminary diagnosis, and tentative diagnosis**. (Note: "probable diagnosis" is not a recognized clinical term).

> [!NOTE]
> **HIGH-YIELD FOR QUESTIONS 26, 27, 28, 29, 30: Diagnostic Process**
> * A mucosal swelling is classified as an **enlargement of soft tissues**.
> * **A solid soft tissue mass cannot be probed**; it is assessed via palpation, aspiration, and visual inspection.
> * **Tobacco/alcohol use** are classified as patient **habits**.
> * **Pain and duration** fall under patient **awareness of condition**.
> * **Probable diagnosis** is a fabricated term, NOT a form of working diagnosis.

---

## 7. Case Study Reviews (Cases A to F)
* **Case A Review (Questions 1 to 4)**: Steve Perry presents with generalized gingivitis, red fiery tissues, heavy biofilm, and bleeding/pain during flossing. 
  * *Redness* is caused by **increased vascularity**. 
  * *Edema* is caused by **exudation of fluid**. 
  * *Pain* is mediated by **dolor** (stretching pain receptors).
  * *Reaction* is a **vascular and cellular reaction** in the inflammatory process.
* **Case B Review (Questions 5 to 10)**: Evelyn Goddard presents with a periodontal abscess (buccal mucosa of #30), swelling, redness, pain, and a fistula expressing pus.
  * *Abscess response* represents **acute inflammation** (neutrophils and fluid exudation).
  * *Redness* is known as **rubor**.
  * *Edema* is caused by **exudation of fluid**.
  * *Pus* consists of **neutrophils and macrophages**.
  * *Healing* of the narrow drained fistula will occur by **primary intention**.
* **Case C Review (Questions 11 to 17)**: Sam Adams underwent extraction of impacted tooth #32.
  * *First step in healing* is **thrombus/clot formation**.
  * *Basement membrane* forms under the scab within **24-48 hours**.
  * *Granulation tissue* is pink, soft, and has **immature, leaky vessels** (exception: they are not leak-free).
  * *Tensile strength* recovers to **70-80% over 3 months**.
  * *Systemic factor prolonging healing* is **blood supply** (wound size/location are local).
* **Case D Review (Questions 18 to 21)**: Monica Salt is a pregnant patient concerned about family history of cleft lip and palate.
  * *Family history* is a primary reason for **genetic counseling**.
  * *Gene mutations* causing hereditary diseases are mostly **submicroscopic**.
  * *Genetic material* of the fetus is obtained via **amniocentesis, chorionic villus biopsy, and umbilical cord blood**.
  * *Cleft lip/palate* is inherited via **multiple factorial inheritance**.
* **Case E Review (Questions 22 to 25)**: A 4-year-old boy has Duchenne muscular dystrophy.
  * *Muscular dystrophy* is an **X-linked recessive disorder**.
  * *Transmission*: Affected males transmit the mutant X to **all daughters** (making them carriers). There is **no male-to-male transmission**.
  * *Multifactorial inheritance example* is **coronary heart disease** (muscular dystrophy is X-linked).
  * *Genetic material analysis* is done via **karyotyping, chromosome analysis, and PCR**.
* **Case F Review (Questions 26 to 30)**: Janis Johnson has a painless, normal-colored buccal mucosa mass that she bites occasionally, causing ulceration.
  * *Primary manifestation* of this mass is **enlargement of soft tissues**.
  * *Examination limitation*: **A mass cannot be probed**.
  * *Habits*: Her cheek-biting, along with tobacco/alcohol use, represent patient **habits**.
  * *Awareness of condition*: Pain and duration represent patient **awareness**.

---

## 8. Question-to-Concept Map

| Question | Case | Topic | Key Fact to Recall |
| :---: | :--- | :--- | :--- |
| **1** | Case A | Inflammation (Redness) | Rubor (redness) in gingivitis is caused by **increased vascularity**. |
| **2** | Case A | Inflammation (Edema) | Swelling in gingivitis is caused by the **exudation of fluid**. |
| **3** | Case A | Inflammation (Pain) | **Dolor** represents pain, caused by stretching pain receptors. |
| **4** | Case A | Inflammation Reaction | The inflammatory process is a **vascular and cellular reaction**. |
| **5** | Case B | Acute Inflammation | Abscess response is **acute inflammation** (rapid onset, neutrophil-rich). |
| **6** | Case B | Cardinal Signs | **Rubor** is the clinical term for redness. |
| **7** | Case B | Edema Process | Edema is caused by the **exudation of fluid** into tissues. |
| **8** | Case B | Suppuration Cells | **Neutrophils and macrophages** are the cells forming pus. |
| **9** | Case B | Neutrophils | Neutrophils phagocytize and also **contribute to the repair process**. |
| **10** | Case B | Intention Healing | Narrow, closely approximated wounds heal via **primary intention**. |
| **11** | Case C | Wound Healing Step 1 | The first stage of wound healing is **thrombus (clot) formation**. |
| **12** | Case C | Epithelialization | The epithelial basement membrane forms under a scab in **24-48 hours**. |
| **13** | Case C | Granulation Tissue | Early granulation vessels are immature and **leak fluid (edema)**. |
| **14** | Case C | Tensile Strength | Healed wounds recover **70-80% of original strength** at **3 months**. |
| **15** | Case C | Healing Factors | **Blood supply** is a systemic factor; wound size/location are local. |
| **16** | Case C | Deficient Scarring | **Wound Dehiscence** is wound splitting due to deficient scar tissue. |
| **17** | Case C | Healing Factors | **Blood supply** is a systemic factor, not a local factor. |
| **18** | Case D | Genetic Counseling | Family history of cleft lip/palate is an indication for **genetic counseling**. |
| **19** | Case D | Hereditary Mutations | Most hereditary mutations are **submicroscopic gene mutations**. |
| **20** | Case D | Prenatal Testing | Fetal cells are gathered via **amniocentesis, CVS, and cordocentesis**. |
| **21** | Case D | Cleft Lip/Palate | Cleft lip and palate is inherited via **multiple factorial inheritance**. |
| **22** | Case E | Genetic Disease Type | Duchenne muscular dystrophy is an **X-linked recessive** disorder. |
| **23** | Case E | X-linked Inheritance | Carrier females pass the gene to daughters (carriers) and sons (50% affected). |
| **24** | Case E | Multifactorial Disorders | **Coronary heart disease** is an example of a multifactorial disorder. |
| **25** | Case E | Genetic Evaluation | Genetic material is analyzed using **karyotyping, chromosome analysis, and PCR**. |
| **26** | Case F | Mass Classification | A localized mucosal swelling is classified as an **enlargement of soft tissues**. |
| **27** | Case F | Diagnostic Techniques | Probing cannot be performed on a solid soft tissue mass. |
| **28** | Case F | Diagnostic History | Plaque, alcohol, and tobacco use fall under patient **habits**. |
| **29** | Case F | Subjective History | Pain, duration, and food triggers fall under **awareness of condition**. |
| **30** | Case F | Working Diagnosis | **Probable diagnosis** is a fabricated term, not a working diagnosis. |
| **31** | None | Macrophages | **Macrophages** maintain chronic inflammation by producing mediators. |
| **32** | None | Eosinophils | **Eosinophils** defend against parasites and participate in allergic reactions. |
| **33** | None | Histamine | **Histamine** causes vasodilation, permeability, and smooth muscle contraction. |
| **34** | None | Apoptosis | Programmed cell death during phagocytosis is **apoptosis**. |
| **35** | None | Resolving Mediators | Pro-resolving lipid mediators **reduce pain** and resolve inflammation. |
| **36** | None | Cytokines | **IL-6** moderates the progression of chronic autoimmune diseases. |
| **37** | None | Inflammation Outcomes | **Leukopenia** is not an outcome of acute inflammation. |
| **38** | None | Chronic Inflammation | **Gingivitis** is a chronic inflammatory oral disease. |
| **39** | None | Tissue Repair | **Granulation tissue** is the diagnostic hallmark of wound healing. |
| **40** | None | Fibrosis | **Fibrosis** is pathologic scar formation from excessive collagen. |
| **41** | None | Tissue Necrosis | Severely compromised blood supply can lead to gangrene and **amputation**. |
| **42** | None | Allogenous | **Allogenous** cells are harvested from a different donor. |
| **43** | None | Stem Cell Potency | Embryonic stem cells are pluripotent; adult stems are multipotent. |
| **44** | None | Stem Cell Commercial source | **Bone marrow** is the most common commercial source of adult stem cells. |
| **45** | None | Stem Cell Division | Stem cells undergo self-renewal and can remain **quiescent (resting)**. |
| **46** | None | Dental Stem Cells | Dental pulp, PDL, and primary teeth contain stem cells; **dentin walls** do not. |
| **47** | None | Human Genome | Humans have approximately **20,000 to 25,000 genes**. |
| **48** | None | DNA Structure | DNA bases consist of **Adenine, Thymine, Cytosine, and Guanine**. |
| **49** | None | Autosomal Dominant | A parent has a **50% chance** of passing an autosomal dominant trait. |
| **50** | None | Autosomal Recessive | Two carrier parents have a **25% chance** of an affected child. |

---

## 9. Rapid Recall
* **Apoptosis** → Programmed cell death that does not induce inflammation.
* **Neutrophils** → First white blood cells to arrive in acute inflammation.
* **Suppuration (Pus)** → Primarily composed of neutrophils and macrophages.
* **Rubor** → Redness (caused by increased vascularity).
* **Tumor** → Swelling/edema (caused by fluid exudation).
* **Dolor** → Pain (caused by stretching of pain receptors).
* **Calor** → Heat (caused by increased blood flow and mediators).
* **Functio laesa** → Loss of function.
* **Histamine** → Released by mast cells; causes vasodilation and vascular leakage.
* **Thrombus** → Clot formation; first step in wound healing.
* **Granulation Tissue** → Pink, soft, containing fragile, leaky new capillaries.
* **Wound Dehiscence** → Wound separation from deficient scar formation.
* **Allogenous** → Cells derived from a different individual of the same species.
* **Bone Marrow** → Most common commercial source of adult stem cells.
* **Duchenne Muscular Dystrophy** → X-linked recessive disorder (no male-to-male transmission).
* **Cleft Lip/Palate** → Multifactorial inheritance disorder (genetic + environment).
* **Amniocentesis / CVS** → Common methods for obtaining fetal cells for genetic testing.
* **Differential Diagnosis** → Form of working diagnosis.
* **Probable Diagnosis** → A fabricated term (not a working diagnosis).
* **20,000 to 25,000** → Approximate number of genes in the human genome.
* **Adenine, Thymine, Cytosine, Guanine** → Nitrogenous bases of DNA.
* **50%** → Transmission risk of an autosomal dominant disorder to offspring.
* **25%** → Risk of affected child with autosomal recessive carrier parents.
"""

# Generate Markdown content for Spanish Study Guide
SPANISH_STUDY_GUIDE_MD = """# Guía de Estudio de Patología General y Genética
## Repaso Enfocado para las Preguntas 1–50 (incluyendo los Casos A al F)

**Cómo usar esta guía:** Estudie primero los recuadros amarillos marcados como "Concepto Clave". Contienen los datos que se evalúan de forma directa en las Preguntas 1 a 50. Luego, utilice el mapa de preguntas y conceptos al final para relacionar cada pregunta con el tema correspondiente.

---

## 1. Lesión Celular, Muerte y Conceptos Básicos de Inflamación
* **Muerte Celular**:
  * **Apoptosis**: Muerte celular programada, activa y organizada. La célula se contrae y sus fragmentos son fagocitados limpiamente **sin inducir una respuesta inflamatoria**.
  * **Necrosis**: Muerte celular patológica y accidental por lesión. La célula se hincha y se rompe, liberando enzimas lisosomales que dañan los tejidos circundantes e **inducen inflamación aguda**.
* **Cascada de la Fagocitosis**: El proceso de engullir y destruir patógenos o desechos celulares.
  * *Pasos en orden*: **Quimiotaxis** (migración celular al sitio de la lesión) → **Opsonización** (recubrimiento del objetivo con proteínas para su reconocimiento) → **Englobamiento/Ingestión** (introducción del objetivo en la célula) → **Degradación** (destrucción/lisis intracelular).
* **La Cascada de la Inflamación**: Una respuesta tisular protectora ante una lesión, dividida en aguda y crónica.
  * **Inflamación Aguda**: De inicio rápido y corta duración. Se caracteriza por la **exudación de líquido (edema)** y la migración de glóbulos blancos, predominantemente **neutrófilos** (la primera línea de defensa).
  * **Inflamación Crónica**: De inicio lento y larga duración. Involucra **macrófagos**, linfocitos y células plasmáticas. Los macrófagos fagocitan desechos y liberan mediadores químicos vasoconstrictores que mantienen la inflamación crónica.
  * **Supuración (Pus)**: Formación de un exudado purulento (pus). Las células principales responsables son los **neutrófilos y los macrófagos**, que ingieren bacterias y se degeneran en el sitio de la lesión.

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 1, 2, 3, 4, 5, 8, 9, 31, 32, 34, 37, 38: Muerte Celular e Inflamación**
> * La **apoptosis** es la muerte celular programada que **no causa inflamación**.
> * Los **neutrófilos** son las primeras células en llegar en la **inflamación aguda**.
> * La **supuración** está compuesta principalmente por **neutrófilos y macrófagos**.
> * Los **macrófagos** producen mediadores químicos que mantienen la **inflamación crónica**.
> * La **gingivitis** es un ejemplo de enfermedad caracterizada por **inflamación crónica**.
> * La **leucocitosis** (elevación de glóbulos blancos) es un resultado típico de la inflamación; la **leucopenia** (glóbulos blancos bajos) NO lo es.

---

## 2. Signos Cardinales y Mediadores Químicos de la Inflamación
* **Cinco Signos Cardinales de la Inflamación**:
  1. **Rubor (Enrojecimiento)**: Causado por la vasodilatación y el **aumento de la vascularidad** (flujo sanguíneo) en el sitio de la lesión.
  2. **Calor**: Causado por una combinación de aumento del flujo sanguíneo y la liberación de mediadores inflamatorios.
  3. **Tumor (Hinchazón/Edema)**: Causado por la **exudación de líquido** (plasma y proteínas) desde los vasos hacia el espacio tisular intersticial.
  4. **Dolor**: Causado por el **estiramiento de los receptores locales del dolor** debido al edema, y por la liberación de mediadores químicos que inducen dolor.
  5. **Functio laesa (Pérdida de función)**: Resultado del dolor y la hinchazón.
* **Mediadores Químicos**: Pequeñas moléculas que coordinan la respuesta inflamatoria.
  * **Histamina**: Secretada principalmente por los **mastocitos**. Causa dilatación de las arteriolas, aumenta la permeabilidad vascular (edema) e induce la contracción del músculo liso.
  * **Serotonina**: Actúa como vasoconstrictor y aumenta la permeabilidad vascular durante las reacciones inmunológicas.
  * **Bradicinina**: Aumenta la permeabilidad vascular, contrae el músculo liso, dilata los vasos y desencadena el **dolor inflamatorio**.
  * **Metabolitos del Ácido Araquidónico**: Precursores de las prostaglandinas (que causan fiebre/dolor) y leucotrienos.
  * **Interleucina-6 (IL-6)**: Modera la susceptibilidad, el desarrollo y la progresión de **enfermedades autoinmunitarias e inflamatorias**.
  * **TNF e IL-1**: Citocinas responsables de la activación endotelial, las reacciones sistémicas de fase aguda (fiebre) y los efectos hemodinámicos del choque séptico.
  * **Óxido Nítrico (NO)**: Relaja el músculo liso vascular causando vasodilatación, y actúa como agente microbicida.
  * **Mediadores Pro-Resolución**: Lipoxinas, resolvinas y protectinas. Resuelven activamente la inflamación, mejoran la eliminación de microbios y **reducen el dolor**.

| Mediador | Fuente | Función Principal | Relevancia Clínica |
| :--- | :--- | :--- | :--- |
| **Histamina** | Mastocitos | Vasodilatación, permeabilidad capilar | Mediador primario en inflamación aguda y alergia |
| **Bradicinina** | Plasma | Dilatación, contracción de músculo liso, dolor | Estimula directamente los receptores del dolor (**Dolor**) |
| **IL-6** | Macrófagos | Regulación de citocinas | Impulsa la progresión de enfermedades autoinmunes |
| **Pro-resolución** | Lípidos | Resuelve activamente la inflamación | Ayuda a **reducir el dolor** y devolver las células a la homeostasis |

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 1, 2, 3, 6, 7, 33, 35, 36: Signos Cardinales y Mediadores**
> * El **rubor** (enrojecimiento) es causado por el **aumento de la vascularidad**.
> * El **tumor** (hinchazón/edema) es causado por la **exudación de líquido**.
> * El **dolor** se debe al **estiramiento de los receptores de dolor** locales.
> * La **histamina** es liberada por los **mastocitos** y produce vasodilatación y edema.
> * La **IL-6** modera la progresión de **enfermedades autoinmunitarias e inflamatorias crónicas**.
> * Los **mediadores pro-resolución** ayudan a **reducir el dolor** y resolver la inflamación.

---

## 3. Cicatrización de Heridas, Reparación y Regeneración Tisular
* **Fases de la Cicatrización de Heridas**:
  * **Paso 1: Hemostasia**: Formación inmediata de un **trombo (coágulo)** en el sitio de la lesión para evitar la pérdida de sangre.
  * **Paso 2: Inflamación**: Emigración de neutrófilos y macrófagos para limpiar patógenos.
  * **Paso 3: Proliferación**: Migración y división celular. Las células epiteliales migran y forman una **membrana basal debajo de la costra protectora dentro de las 24 a 48 horas**.
  * **Paso 4: Tejido de Granulación**: Tejido que llena el espacio de la herida. Se caracteriza por ser **rosado, suave y contener vasos sanguíneos nuevos, frágiles y permeables** (lo que produce edema), junto con fibroblastos en proliferación.
  * **Paso 5: Remodelación**: El tejido recupera fuerza. Los tejidos recuperan entre el **70% y 80% de la fuerza tensil original en un período de cicatrización de 3 meses**, en comparación con la piel intacta (rara vez recupera el 100%).
* **Tipos de Cicatrización por Intención**:
  * **Primera Intención**: Ocurre cuando los bordes de la herida están limpios y aproximados (p. ej., una incisión quirúrgica suturada, o una fístula estrecha de absceso drenado). La cicatrización ocurre con una marca mínima.
  * **Segunda Intención**: Ocurre en heridas grandes con bordes separados. El espacio se llena con abundante tejido de granulación, dejando una gran cicatriz y experimentando una contracción significativa de la herida.
  * **Tercera Intención**: Cierre primario diferido. Las heridas altamente contaminadas se dejan abiertas para desbridamiento repetido y terapia antibiótica antes de realizar el cierre quirúrgico.
* **Anomalías de la Cicatrización**:
  * **Dehiscencia de la Herida**: Separación o apertura de los bordes de una herida debido a una **formación deficiente de cicatriz**.
  * **Queloide**: Una cicatriz elevada y sobredesarrollada que se extiende más allá de los bordes originales de la herida debido a un **crecimiento excesivo de la cicatriz**.
  * **Contractura**: Una exageración de la contracción normal durante la cicatrización, lo que resulta en deformidad física.
  * **Fibrosis**: Depósito patológico de colágeno excesivo que mantiene factores de crecimiento, causando cicatrices masivas y disfunción.
* **Factores que Influyen en la Cicatrización**:
  * **Factores Locales**: Inhiben la cicatrización directamente en el sitio de la herida (p. ej., **tamaño y localización de la herida, material extraño**, infección).
  * **Factores Sistémicos**: Afectan a todo el cuerpo (p. ej., **suministro de sangre/isquemia**, diabetes, nutrición, edad, uso de esteroides).

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 10, 11, 12, 13, 14, 15, 16, 17, 39, 40, 41: Cicatrización de Heridas y Reparación**
> * La **formación de un trombo/coágulo** es el **primer paso** en la cicatrización.
> * Las células epiteliales forman una **membrana basal** bajo la costra en **24-48 horas**.
> * El **tejido de granulación** es rosado, suave y contiene **vasos nuevos, frágiles y permeables**.
> * Las heridas recuperan del **70% al 80% de su fuerza tensil** a los **3 meses**.
> * El **suministro de sangre** es un **factor sistémico** de curación; el **tamaño de la herida y el material extraño** son **factores locales**.
> * La **dehiscencia de la herida** se debe a una **formación deficiente de cicatriz**.
> * La **fibrosis** es el depósito extenso de colágeno.
> * Un suministro de sangre severamente comprometido (isquemia) puede resultar en necrosis tisular y **amputación**.

---

## 4. Células Madre y Medicina Regenerativa
* **Propiedades Básicas**: Las células madre se caracterizan por su **autorrenovación** (la capacidad de dividirse o permanecer en estado **inactivo/quiescente**) y su **potencialidad/potencia** (la capacidad de diferenciarse en otros tipos celulares).
* **Fuentes de Células Madre**:
  * **Autógenas**: Células madre obtenidas del mismo individuo que recibe el tratamiento (sin riesgo de rechazo).
  * **Alogénicas**: Células madre obtenidas de otro individuo de la misma especie.
* **Niveles de Potencialidad (Potencia)**:
  * **Totipotentes**: Pueden diferenciarse en cualquier tipo celular, incluyendo las membranas extraembrionarias (p. ej., el cigoto).
  * **Pluripotentes**: Pueden diferenciarse en todas las células del cuerpo, pero no en tejidos extraembrionarios (p. ej., **células madre embrionarias**, aisladas de la **masa celular interna de los blastocistos**).
  * **Multipotentes**: Pueden diferenciarse en múltiples tipos celulares dentro de un linaje específico (p. ej., **células madre adultas**, que se encuentran en **la piel, el revestimiento del intestino, la córnea, el cerebro y la médula ósea**).
  * **Unipotentes**: Pueden dar origen a un solo tipo celular maduro.
* **Células Madre Adultas y Dentales**:
  * La fuente comercial más común de células madre adultas es la **médula ósea**.
  * **Células Madre Dentales**: Células madre adultas de alta potencia que se encuentran en los tejidos blandos dentales. Las fuentes incluyen la **pulpa dental, el ligamento periodontal (LPD), los terceros molares no erupcionados y los dientes primarios exfoliados**. (Nota: las paredes mineralizadas de la *cámara pulpar* compuestas de dentina no contienen células madre).

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 42, 43, 44, 45, 46: Células Madre**
> * Las células madre **alogénicas** provienen de **otro individuo**.
> * Las **células madre embrionarias** son **pluripotentes** y se aíslan de la **masa celular interna del blastocisto**.
> * Las **células madre adultas** se encuentran en la **piel, el intestino y la médula ósea**; la **médula ósea** es la fuente comercial más común.
> * Las **células madre dentales** se encuentran en la **pulpa, LPD, terceros molares y dientes primarios**; la **pared de la cámara pulpar (dentina)** NO es una fuente.

---

## 5. Genética y Patrones de Herencia
* **El Genoma Humano**: Los seres humanos poseen aproximadamente entre **20,000 y 25,000 genes codificadores de proteínas**.
* **El Código del ADN**: El código genético está escrito con cuatro letras de bases nitrogenadas: **Adenina (A), Timina (T), Citocina (C) y Guanina (G)**.
* **Modos de Herencia y Riesgos de Transmisión**:
  * **Autosómica Dominante**: Una sola copia del gen mutado causa el trastorno. Un progenitor portador/afectado tiene un **50% de probabilidad de transmitir el rasgo** a cada hijo. Ejemplos: Enfermedad de Huntington, enfermedad de von Willebrand, síndrome de Marfan.
  * **Autosómica Recesiva**: Se requieren dos copias del gen mutado. Dos progenitores portadores (Aa x Aa) tienen un **25% de probabilidad de tener un hijo afectado** (aa) en cada embarazo. Ejemplos: Anemia de células falciformes (drepanocítica), fibrosis quística, fenilcetonuria (PKU).
  * **Recesiva Ligada al Cromosoma X**: El gen se localiza en el cromosoma X. Afecta principalmente a varones (que solo tienen un X). **No hay transmisión de varón a varón**. Los varones afectados transmiten el X mutado a **todas sus hijas**, convirtiéndolas en portadoras obligadas. Ejemplo: **Distrofia muscular de Duchenne**.
  * **Herencia Multifactorial**: Trastornos causados por los efectos combinados de múltiples genes y factores ambientales. Ejemplos: **Labio y/o paladar hendido, enfermedad coronaria**.
* **Diagnóstico Prenatal**: Las pruebas genéticas fetales se realizan en células obtenidas mediante **amniocentesis, biopsia de vellosidades coriónicas (BVC) o muestreo de sangre del cordón umbilical**.

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 18, 19, 20, 21, 22, 23, 24, 25, 47, 48, 49, 50: Genética y Herencia**
> * El genoma humano tiene entre **20,000 y 25,000 genes**.
> * Las cuatro letras del ADN son **Adenina, Timina, Citocina y Guanina**.
> * Los trastornos **autosómicos dominantes** tienen un **50% de riesgo de transmisión**.
> * Los padres portadores de trastornos **autosómicos recesivos** tienen un **25% de riesgo** de tener un hijo afectado.
> * La **distrofia muscular de Duchenne** es un trastorno **recesivo ligado al X**. Todas las hijas de varones afectados son portadoras.
> * El **labio y/o paladar hendido** y la **enfermedad coronaria** son trastornos **multifactoriales**.
> * Indicación para asesoría genética: **Antecedentes familiares de labio/paladar hendido**.
> * Las células genéticas fetales se obtienen mediante **amniocentesis, biopsia de vellosidades coriónicas y cordón umbilical**.

---

## 6. Proceso Diagnóstico y Evaluación Clínica
* **Técnicas de Evaluación Clínica**:
  * **Examen Visual**: Evaluación de la localización, forma, tamaño, color, delimitación de bordes y textura de una lesión.
  * **Palpación**: Sentir la lesión para determinar su compresibilidad, sensibilidad al dolor y cambios de color bajo presión (p. ej., isquemia/blanqueamiento).
  * **Auscultación**: Escuchar sonidos (p. ej., chasquidos o ruidos de la ATM).
  * **Sondeo**: Evaluación de defectos tisulares o medición de la profundidad de las bolsas.
  * **Aspiración**: Extracción de líquido (p. ej., pus de un absceso, líquido quístico).
* **Categorías de la Historia Clínica**:
  * **Hábitos**: Consumo de alcohol, tabaco y comportamientos orales (p. ej., morderse las uñas, morderse las mejillas).
  * **Demografía**: Edad, sexo y raza/origen étnico del paciente.
  * **Historia Reciente**: Antecedentes de lesión local, infección o cirugía.
  * **Conciencia de la Condición**: Reportes subjetivos del paciente sobre dolor, duración y respuesta a factores como el estrés o alimentos.
* **Clasificaciones del Diagnóstico de Trabajo**: La lista inicial de posibilidades constituye el **diagnóstico de trabajo**, que incluye el **diagnóstico diferencial, el diagnóstico preliminar y el diagnóstico tentativo**. (Nota: "diagnóstico probable" no es un término clínico reconocido).

> [!NOTE]
> **CONCEPTO CLAVE PARA LAS PREGUNTAS 26, 27, 28, 29, 30: Proceso Diagnóstico**
> * Un aumento de volumen de la mucosa se clasifica como un **envejecimiento o agrandamiento de los tejidos blandos**.
> * **Una masa sólida de tejido blando no se puede sondear**; se evalúa mediante palpación, aspiración e inspección visual.
> * El **uso de tabaco/alcohol** se clasifica dentro de los **hábitos** del paciente.
> * El **dolor y la duración** entran en la **conciencia de la condición** del paciente.
> * El **diagnóstico probable** es un término inventado, NO es una forma de diagnóstico de trabajo.

---

## 7. Revisiones de Casos Clínicos (Casos A al F)
* **Caso A (Preguntas 1 a 4)**: Steve Perry presenta gingivitis generalizada, enrojecimiento intenso, abundante biofilm y sangrado/dolor al usar hilo dental.
  * El *enrojecimiento* es causado por el **aumento de la vascularidad**.
  * El *edema* se debe a la **exudación de líquido**.
  * El *dolor* es mediado por el **dolor** (estiramiento de receptores).
  * La *reacción* es una **reacción vascular y celular** en el proceso inflamatorio.
* **Caso B (Preguntas 5 a 10)**: Evelyn Goddard presenta un absceso periodontal (mucosa bucal del diente #30) con hinchazón, enrojecimiento, dolor y una fístula que drena pus.
  * La *respuesta al absceso* representa una **inflamación aguda** (neutrófilos y exudación).
  * El *enrojecimiento* clínicamente se denomina **rubor**.
  * El *edema* es causado por la **exudación de líquido**.
  * El *pus* está formado por **neutrófilos y macrófagos**.
  * La *cicatrización* de la fístula drenada curará por **primera intención**.
* **Caso C (Preguntas 11 a 17)**: Sam Adams se sometió a la extracción del diente impactado #32.
  * El *primer paso de la cicatrización* es la **formación de un trombo/coágulo**.
  * La *membrana basal* se forma bajo la costra en **24-48 horas**.
  * El *tejido de granulación* es rosado y suave, y posee **vasos inmaduros y permeables (que gotean)**.
  * La *fuerza tensil* se recupera en un **70-80% a los 3 meses**.
  * El *factor sistémico que prolonga la curación* es el **suministro de sangre** (el tamaño/ubicación de la herida son locales).
* **Caso D (Preguntas 18 a 21)**: Monica Salt es una paciente embarazada preocupada por antecedentes familiares de labio y paladar hendido.
  * Los *antecedentes familiares* son la razón principal para recomendar **asesoría genética**.
  * Las *mutaciones genéticas* que causan enfermedades hereditarias son principalmente **submicroscópicas**.
  * Las *células fetales* se obtienen mediante **amniocentesis, biopsia de vellosidades coriónicas y cordón umbilical**.
  * El *labio/paladar hendido* se hereda por **herencia multifactorial**.
* **Caso E (Preguntas 22 a 25)**: Un niño de 4 años presenta distrofia muscular de Duchenne.
  * La *distrofia muscular* es un trastorno **recesivo ligado al X**.
  * *Transmisión*: Los varones afectados transmiten el gen mutado a **todas sus hijas** (portadoras). **No hay transmisión de varón a varón**.
  * Un *ejemplo de herencia multifactorial* es la **enfermedad coronaria** (la distrofia muscular es ligada al X).
  * El *análisis genético* se realiza mediante **cariotipo, análisis cromosómico y PCR**.
* **Caso F (Preguntas 26 a 30)**: Janis Johnson presenta una masa indolora de color normal en la mucosa bucal izquierda que se muerde ocasionalmente, causándose úlceras.
  * La *manifestación primaria* de esta masa es un **agrandamiento de los tejidos blandos**.
  * *Limitación clínica*: **Una masa no se puede sondear**.
  * *Hábitos*: Morderse la mejilla, junto con fumar o beber, representan **hábitos** del paciente.
  * *Conciencia de la condición*: El dolor y la duración representan la **conciencia de la condición** por parte del paciente.

---

## 8. Mapa de Preguntas y Conceptos

| Pregunta | Caso | Tema | Dato Clave que Debe Recordarse |
| :---: | :--- | :--- | :--- |
| **1** | Caso A | Inflamación (Rubor) | El rubor (enrojecimiento) en la gingivitis se debe al **aumento de la vascularidad**. |
| **2** | Caso A | Inflamación (Edema) | La hinchazón en la gingivitis es causada por la **exudación de líquido**. |
| **3** | Caso A | Inflamación (Dolor) | El **dolor** representa el dolor físico por el estiramiento de receptores nociceptivos. |
| **4** | Caso A | Reacción Inflamatoria | La respuesta inflamatoria es fundamentalmente una **reacción vascular y celular**. |
| **5** | Caso B | Inflamación Aguda | El absceso es una **inflamación aguda** (inicio rápido, rica en neutrófilos). |
| **6** | Caso B | Signos Cardinales | El **rubor** es el término clínico para el enrojecimiento. |
| **7** | Caso B | Proceso del Edema | El edema es causado por la **exudación de líquido** hacia los tejidos. |
| **8** | Caso B | Células de la Supuración | Los **neutrófilos y macrófagos** son las células que componen el pus. |
| **9** | Caso B | Neutrófilos | Los neutrófilos fagocitan y también **contribuyen al proceso de reparación**. |
| **10** | Caso B | Cicatrización por Intención | Las heridas estrechas y aproximadas cicatrizan por **primera intención**. |
| **11** | Caso C | Cicatrización Paso 1 | La primera fase de la curación alveolar es la **formación de un trombo (coágulo)**. |
| **12** | Caso C | Epitelización | La membrana basal epitelial se regenera bajo la costra en **24-48 horas**. |
| **13** | Caso C | Tejido de Granulación | Los vasos nuevos en el tejido de granulación son inmaduros y **permeables (gotean)**. |
| **14** | Caso C | Fuerza Tensil | A los **3 meses**, las heridas recuperan del **70% al 80% de su fuerza original**. |
| **15** | Caso C | Factores de Cicatrización | El **suministro de sangre** es un factor sistémico; el tamaño y ubicación son locales. |
| **16** | Caso C | Cicatrización Deficiente | La **dehiscencia** es la apertura de la herida por cicatrización deficiente. |
| **17** | Caso C | Factores de Cicatrización | El **suministro de sangre** es un factor sistémico, no local. |
| **18** | Caso D | Asesoría Genética | Los antecedentes de labio/paladar hendido son indicación de **asesoría genética**. |
| **19** | Caso D | Mutaciones Hereditarias | La mayoría de las mutaciones hereditarias son **mutaciones génicas submicroscópicas**. |
| **20** | Caso D | Pruebas Prenatales | Las células fetales se obtienen por **amniocentesis, BVC y cordocentesis**. |
| **21** | Caso D | Labio/Paladar Hendido | El labio y paladar hendido se heredan por **herencia multifactorial**. |
| **22** | Caso E | Tipo de Trastorno | La distrofia muscular de Duchenne es un trastorno **recesivo ligado al X**. |
| **23** | Caso E | Herencia Ligada al X | Las madres portadoras transmiten el gen a sus hijas (portadoras) e hijos (50% afectados). |
| **24** | Caso E | Herencia Multifactorial | La **enfermedad coronaria** es un ejemplo de trastorno multifactorial. |
| **25** | Caso E | Evaluación Genética | El material genético se analiza con **cariotipo, análisis cromosómico y PCR**. |
| **26** | Caso F | Clasificación de Masas | Un aumento de volumen de la mucosa se clasifica como **agrandamiento de tejidos blandos**. |
| **27** | Caso F | Técnicas Diagnósticas | No se puede realizar sondeo clínico sobre una masa sólida de tejido blando. |
| **28** | Caso F | Historia Diagnóstica | El morderse la mejilla, fumar y beber se clasifican como **hábitos** del paciente. |
| **29** | Caso F | Historia Subjetiva | El dolor, la duración y los desencadenantes entran en la **conciencia de la condición**. |
| **30** | Caso F | Diagnóstico de Trabajo | El **diagnóstico probable** es un término inventado, no es un diagnóstico de trabajo. |
| **31** | None | Macrófagos | Los **macrófagos** mantienen la inflamación crónica liberando mediadores. |
| **32** | None | Eosinófilos | Los **eosinófilos** defienden contra parásitos y participan en reacciones alérgicas. |
| **33** | None | Histamina | La **histamina** causa vasodilatación, permeabilidad vascular y broncocontracción. |
| **34** | None | Apoptosis | La muerte celular programada durante la fagocitosis es la **apoptosis**. |
| **35** | None | Mediadores de Resolución | Los mediadores lipídicos pro-resolución **reducen el dolor** y resuelven la inflamación. |
| **36** | None | Citocinas | La **IL-6** modera la progresión de enfermedades autoinmunitarias crónicas. |
| **37** | None | Resultados de Inflamación | La **leucopenia** no es un resultado posible de la inflamación aguda. |
| **38** | None | Inflamación Crónica | La **gingivitis** es una enfermedad oral inflamatoria crónica. |
| **39** | None | Reparación Tisular | El **tejido de granulación** es el sello diagnóstico de la cicatrización. |
| **40** | None | Fibrosis | La **fibrosis** es la cicatrización patológica por depósito excesivo de colágeno. |
| **41** | None | Necrosis Tisular | Un suministro de sangre seriamente comprometido puede causar necrosis y **amputación**. |
| **42** | None | Alogénico | Las células **alogénicas** se obtienen de un donante diferente de la misma especie. |
| **43** | None | Potencia de Células Madre | Las células madre embrionarias son pluripotentes; las adultas son multipotentes. |
| **44** | None | Célula Comercial | La **médula ósea** es la fuente comercial más común de células madre adultas. |
| **45** | None | División Celular | Las células madre se autorrenuevan y pueden permanecer **quiescentes (en reposo)**. |
| **46** | None | Células Madre Dentales | La pulpa, el LPD y los dientes primarios contienen células madre; la **pared de dentina** no. |
| **47** | None | Genoma Humano | Los seres humanos tienen aproximadamente entre **20,000 y 25,000 genes**. |
| **48** | None | Estructura del ADN | Las bases del ADN consisten en **Adenina, Timina, Citocina y Guanina**. |
| **49** | None | Autosómica Dominante | Un progenitor tiene un **50% de probabilidad** de transmitir un rasgo autosómico dominante. |
| **50** | None | Autosómica Recesiva | Dos padres portadores tienen un **25% de probabilidad** de tener un hijo afectado. |

---

## 9. Repaso Rápido
* **Apoptosis** → Muerte celular programada que no induce inflamación.
* **Neutrófilos** → Primeros glóbulos blancos en llegar en la inflamación aguda.
* **Supuración (Pus)** → Compuesta principalmente por neutrófilos y macrófagos.
* **Rubor** → Enrojecimiento (causado por el aumento de la vascularidad).
* **Tumor** → Hinchazón/edema (causado por la exudación de líquido).
* **Dolor** → Dolor (causado por el estiramiento de los receptores).
* **Calor** → Calor (causado por el flujo sanguíneo y mediadores).
* **Functio laesa** → Pérdida de función.
* **Histamina** → Liberada por mastocitos; produce vasodilatación y edema.
* **Trombo** → Formación de coágulo; primer paso en la cicatrización.
* **Tejido de granulación** → Rosado, suave, con capilares nuevos y permeables.
* **Dehiscencia de la herida** → Apertura de la herida por cicatrización deficiente.
* **Alogénicas** → Células de un donante diferente de la misma especie.
* **Médula ósea** → Fuente comercial más común de células madre adultas.
* **Distrofia muscular de Duchenne** → Trastorno recesivo ligado al X (sin transmisión varón-varón).
* **Labio/paladar hendido** → Trastorno de herencia multifactorial (genética + ambiente).
* **Amniocentesis / BVC** → Métodos comunes para obtener células fetales para análisis genético.
* **Diagnóstico diferencial** → Tipo de diagnóstico de trabajo.
* **Diagnóstico probable** → Un término inventado (no es un diagnóstico de trabajo).
* **20,000 a 25,000** → Número aproximado de genes en el genoma humano.
* **Adenina, Timina, Citocina, Guanina** → Bases nitrogenadas del ADN.
* **50%** → Probabilidad de transmitir un trastorno autosómico dominante a la descendencia.
* **25%** → Probabilidad de tener un hijo afectado si ambos padres son portadores de un gen recesivo.
"""

# Generate Markdown content for clean Questions & Answers file
QA_MD_CONTENT = """# Chapter 7 Review: Questions, Answers & Rationales
## Complete Question Bank with Detailed Explanations for NBDHE Preparation

---

"""

# Append the questions and answers to QA_MD_CONTENT
for q in QUESTIONS_DATA:
    options_str = "\n".join([f"* {opt}" for opt in q["options"]])
    case_header = ""
    if q["case_desc"]:
        case_header = f"### **{q['case']}**\n{q['case_desc']}\n\n"
        
    QA_MD_CONTENT += f"""{case_header}### **Q{q['num']}. {q['stem']}**
{options_str}

* **Correct Answer:** **{q['answer']}**
* **Clinical Rationale:**
  {q['rationale']}

---

"""

# Write files to disk
print(f"Writing {english_md_path}...")
with open(english_md_path, 'w', encoding='utf-8') as f:
    f.write(ENGLISH_STUDY_GUIDE_MD)

print(f"Writing {spanish_md_path}...")
with open(spanish_md_path, 'w', encoding='utf-8') as f:
    f.write(SPANISH_STUDY_GUIDE_MD)

print(f"Writing {qa_md_path}...")
with open(qa_md_path, 'w', encoding='utf-8') as f:
    f.write(QA_MD_CONTENT)

# Function to compile PDF for study guides
def compile_pdf(md_path, pdf_path, doc_title):
    print(f"Reading: {md_path}")
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Pre-process markdown to clean up blockquotes to look like yellow note cards
    md_text = md_text.replace("> [!NOTE]", ">")
    
    # Convert markdown to html
    html_content = markdown.markdown(md_text, extensions=['tables'])

    # Post-process html blockquotes to use our styled notes
    html_content = html_content.replace("<blockquote>", '<div class="note">')
    html_content = html_content.replace("</blockquote>", '</div>')

    # Wrap in complete HTML layout with footer
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

    print(f"Compiling PDF: {pdf_path}")
    with open(pdf_path, "w+b") as out_file:
        pisa_status = pisa.CreatePDF(full_html, dest=out_file)
        
    if pisa_status.err:
        print(f"Error compiling: {pdf_path}")
    else:
        print(f"Success! Saved PDF to {pdf_path}")

# Function to compile PDF for Questions & Answers programmatically (fixes tag mismatches)
def compile_qa_pdf_from_data(questions_data, pdf_path, doc_title):
    html_blocks = []
    current_case = None
    for q in questions_data:
        case_html = ""
        # Show Case details only when case name changes and isn't "None"
        if q["case"] != "None" and q["case"] != current_case:
            current_case = q["case"]
            case_html = f"""
            <div style="background-color: #F7FAF9; border: 1px solid #dde7e3; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
                <strong style="color: #0C4A47; font-size: 11pt;">{q["case"]}</strong>
                <p style="margin-top: 4px; font-style: italic; color: #4D6661; margin-bottom: 0;">{q["case_desc"]}</p>
            </div>
            """
        elif q["case"] == "None":
            current_case = None
            
        options_html = ""
        if q["options"]:
            options_html = '<div class="options-list">'
            for opt in q["options"]:
                options_html += f'<div class="option-item">{opt}</div>'
            options_html += '</div>'
            
        rationale_html = q["rationale"].replace('\n', '<br/>')
        
        block = f"""
        <div class="question-block">
            {case_html}
            <div class="question-number">Question {q["num"]}</div>
            <div class="question-text">{q["stem"]}</div>
            {options_html}
            <div class="answer-box">
                <div class="correct-label">Correct Answer: {q["answer"]}</div>
                <div class="rationale-text"><strong>Clinical Rationale:</strong><br/>{rationale_html}</div>
            </div>
        </div>
        <hr/>
        """
        html_blocks.append(block)
        
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
<h1>Chapter 7: Questions, Answers & Rationales</h1>
<p style="text-align: center; margin-bottom: 20px; font-style: italic; color: #4D6661;">
    Comprehensive study bank covering General Pathology, Genetics, and Clinical Case Studies.
</p>
<hr/>
{"".join(html_blocks)}
</body>
</html>
"""

    print(f"Compiling PDF: {pdf_path}")
    with open(pdf_path, "w+b") as out_file:
        pisa_status = pisa.CreatePDF(full_html, dest=out_file)
        
    if pisa_status.err:
        print(f"Error compiling: {pdf_path}")
    else:
        print(f"Success! Saved PDF to {pdf_path}")

# Run compilation
compile_pdf(english_md_path, english_pdf_path, "NBDHE Chapter 7 Study Guide (English)")
compile_pdf(spanish_md_path, spanish_pdf_path, "NBDHE Guía de Estudio Capítulo 7 (Español)")
compile_qa_pdf_from_data(QUESTIONS_DATA, qa_pdf_path, "NBDHE Chapter 7 Questions & Answers")

print("All documents generated and compiled successfully!")

