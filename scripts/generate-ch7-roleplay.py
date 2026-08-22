import os
import markdown
from xhtml2pdf import pisa

# Setup paths
base_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"
os.makedirs(base_dir, exist_ok=True)

roleplay_md_path = os.path.join(base_dir, "Chapter_7_Role_Play_Mrs_Smith.md")
roleplay_pdf_path = os.path.join(base_dir, "Chapter_7_Role_Play_Mrs_Smith.pdf")

# CSS styles matching the other documents
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
    font-size: 9pt;
}
h1 {
    font-size: 18pt;
    color: #0C4A47;
    margin-bottom: 4px;
    border-bottom: 2px solid #E2765A;
    padding-bottom: 4px;
    font-weight: bold;
    text-align: center;
}
h2 {
    font-size: 13pt;
    color: #0C4A47;
    margin-top: 14px;
    margin-bottom: 8px;
    border-bottom: 1.5px solid #dde7e3;
    padding-bottom: 2px;
    font-weight: bold;
}
h3 {
    font-size: 10.5pt;
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
    font-size: 8pt;
}
td {
    border-bottom: 1px solid #dde7e3;
    padding: 5px;
    font-size: 8pt;
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
    font-size: 8.5pt;
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
"""

ROLE_PLAY_MD = """# Role Play: Mrs. Smith's Bleeding Gums
A classroom teaching aid for Spanish-speaking students learning clinical English, general pathology, and patient communication.

| Character | English Level | Learning Focus |
| :--- | :--- | :--- |
| **Mrs. Smith** | Basic / Beginner | Simple symptoms, expressing pain/tender areas, and financial barriers |
| **David (Dental Assistant)** | Intermediate | Reviewing timelines, dental history, and basic explanations of gum health |
| **Sarah (Hygienist)** | Advanced | Detailed pathology explanations, microvasculature permeability, acute vs. chronic, and signs of inflammation |

---

## Case A Overview
**Mrs. Smith** is a 38-year-old female who currently has no medical conditions. She does not attend dental appointments on a regular basis due to finances and not having dental insurance. Her last visit to the dentist was a year ago for a root canal on tooth #3. 

Mrs. Smith called the dental office because she was concerned about her bleeding gingival tissue. Upon evaluation, the dental hygienist notes Mrs. Smith's gingival tissues are fiery red in color, tender to probing, and edematous. Mrs. Smith stated her gingival tissues started bleeding and becoming tender about three days ago. She has not been able to brush or floss for the last few days due to pain.

---

## Scene 1: Greeting and Chief Complaint

**David (Dental Assistant)**:
Good afternoon, Mrs. Smith. Welcome to our practice. My name is David, and I will be helping you today. What is your main concern?

**Mrs. Smith**:
Good afternoon, David. My gums bleed. They bleed a lot.

**David (Dental Assistant)**:
I am sorry to hear that. Bleeding gums can be very concerning. When did you first notice the bleeding?

**Mrs. Smith**:
It started three days ago. It happened very fast. Now, my gums are very red and sore.

---

## Scene 2: Dental History and Financial Barriers

**David (Dental Assistant)**:
Thank you for telling me. It has been a rapid onset, then. Looking at your chart, your last dental visit was one year ago. Is that correct?

**Mrs. Smith**:
Yes. One year ago. I had a root canal on tooth #3. That is the upper right molar.

**David (Dental Assistant)**:
Yes, I see the root canal treated tooth here. Do you visit the dentist regularly for cleanings?

**Mrs. Smith**:
No, I do not. I do not have dental insurance. Dental visits are very expensive for me, so I only come when I have a problem.

**David (Dental Assistant)**:
I understand. Many patients face financial barriers. We will do our best to help you today. Have you been brushing and flossing since the bleeding started?

**Mrs. Smith**:
No. I have not brushed or flossed for the last few days. It hurts too much. My gums are too tender.

---

## Scene 3: The Hygienist Explains "Edematous" Swelling

**Sarah (Hygienist)**:
Hello, Mrs. Smith. My name is Sarah, and I am the dental hygienist. I will be doing your periodontal evaluation today. David mentioned that your gums are bleeding and tender. Let's take a look.

**Mrs. Smith**:
Hello, Sarah. Yes, please be gentle. It is very sore.

**Sarah (Hygienist)**:
I will be very gentle. Looking at your gum tissue, I notice they are fiery red in color, very tender when I probe, and they are highly **edematous**.

**Mrs. Smith**:
What is "edematous"? Is it dangerous?

**Sarah (Hygienist)**:
Edematous means that your gums are swollen and filled with fluid. When bacteria from food accumulate on your teeth, the body triggers a defense mechanism. In your gums, this causes **increased permeability of the microvasculature**.

**Mrs. Smith**:
I do not understand. What are micro-vessels?

**David (Dental Assistant)**:
Microvasculature refers to the tiny blood vessels in your gums. "Permeability" means they become leaky. The tiny spaces in the walls of these blood vessels open up, allowing fluid and defensive white blood cells to escape into the surrounding tissues to fight the bacteria. This fluid buildup is what makes your gums swollen, or **edematous**.

---

## Scene 4: The Protective Purpose of Inflammation

**Mrs. Smith**:
So, the swelling is my body trying to fight the bacteria?

**Sarah (Hygienist)**:
Exactly! This is called an **inflammatory response**. The primary purpose of this response is **protective**. It is your body's defense mechanism designed to **rid the body of the initial cause of cell injury**—which in this case is the bacterial plaque—and prepare the tissue to heal.

**Mrs. Smith**:
So, inflammation is good?

**Sarah (Hygienist)**:
It is protective and necessary! However, because you could not brush or floss for the last few days due to pain, more bacteria accumulated, making the protective response even stronger and more painful.

---

## Scene 5: Acute vs. Chronic Inflammation

**Mrs. Smith**:
How long will my gums be like this? Is it a permanent disease?

**Sarah (Hygienist)**:
Because your symptoms started suddenly about three days ago, your gingival inflammation is considered **acute**. 

**Mrs. Smith**:
What does "acute" mean?

**David (Dental Assistant)**:
**Acute** means the condition is short-term and has a rapid onset. It responds quickly to treatment. If it lasted for months or years without healing, it would be called **chronic** inflammation. Since yours is acute, it will heal quickly once we remove the plaque.

---

## Scene 6: Expected Signs of Inflammation

**Mrs. Smith**:
Why are my gums so red and hot?

**Sarah (Hygienist)**:
Those are the classic signs of acute inflammation. We expect to see four main signs:
1. Redness, which we call **rubor**, caused by increased blood flow.
2. Swelling, which we call **tumor**, due to the edematous fluid.
3. Heat, which we call **calor**, because of the active blood circulation.
4. Pain, which we call **dolor**, from the pressure on your nerve endings.

**David (Dental Assistant)**:
Yes, and because of this active, warm blood flow, we would **NOT** expect to see cool tissues or **acrocyanosis** (which is a blue, cold appearance caused by lack of oxygen). Gums with active inflammation are always warm and red, never cool or blue.

**Mrs. Smith**:
That makes sense. My gums feel very warm.

---

## Scene 7: Treatment and Home Care Advice

**Sarah (Hygienist)**:
Today, we will perform a gentle cleaning to remove the bacterial plaque and calculus. This will eliminate the cause of the cell injury.

**Mrs. Smith**:
Will it hurt?

**Sarah (Hygienist)**:
It might be slightly uncomfortable because your tissues are tender, but removing the plaque is the only way to stop the inflammation. David will show you a soft-bristled toothbrush and a gentle flossing technique to use at home.

**David (Dental Assistant)**:
Yes, Mrs. Smith. Brushing twice a day is key. Even if it bleeds a little at first, gentle cleaning will reduce the fluid buildup, and the edematous swelling will disappear in a few days.

**Mrs. Smith**:
Okay. I will try my best. Thank you, Sarah. Thank you, David.

---

## Classroom Learning Review

### Question 1 (Purpose of Inflammation)
What is the primary purpose of the inflammatory response in Mrs. Smith's tissues?
* **Correct Answer**: **d. Protective response to rid body of the initial cause of cell injury**
* **Key Point**: The inflammatory response is fundamentally a protective mechanism designed to neutralize pathogens (like plaque bacteria) and pave the way for tissue repair.

### Question 2 (Edema Mechanism)
Which factor contributes to the formation of Mrs. Smith's edematous (swollen) tissue?
* **Correct Answer**: **c. Increased permeability of microvasculature**
* **Key Point**: Endothelial cells in the microvasculature contract, creating gaps that increase permeability. This allows protein-rich fluid to escape into the tissue, creating edema.

### Question 3 (Onset Type)
Mrs. Smith's gingival inflammation is considered which of the following?
* **Correct Answer**: **a. Acute**
* **Key Point**: Acute inflammation has a rapid onset (starting 3 days ago in Mrs. Smith's case) and short duration, compared to chronic inflammation which is prolonged.

### Question 4 (Mismatched Clinical Sign)
Upon evaluation of the gingival tissues, the clinician would NOT expect to see:
* **Correct Answer**: **d. Cool tissue (acrocyanosis)**
* **Key Point**: Acute inflammation presents with heat (calor) and redness (rubor) due to active vasodilation. Cool, blue tissues (acrocyanosis) represent ischemia or poor oxygenation, which are not characteristics of acute inflammation.

---

## Important Vocabulary

| English | Spanish | Clinical Definition |
| :--- | :--- | :--- |
| **Inflammatory response** | Respuesta inflamatoria | The body's vascular and cellular reaction to injury or infection. |
| **Edematous** | Edematoso | Swollen due to accumulation of excess fluid in tissues. |
| **Microvasculature** | Microvasculatura | The smallest blood vessels, including capillaries and venules. |
| **Permeability** | Permeabilidad | The capacity of vessel walls to allow fluids/cells to pass through. |
| **Acute** | Agudo | Having a rapid onset, severe symptoms, and short duration. |
| **Chronic** | Crónico | Persisting over a long period of time, often with tissue destruction. |
| **Rubor (Redness)** | Rubor | Redness of the skin/mucosa due to capillary vasodilation. |
| **Tumor (Swelling)** | Tumor | Swelling or enlargement of tissue due to fluid buildup. |
| **Calor (Heat)** | Calor | Increased temperature in a localized area from active blood flow. |
| **Acrocyanosis** | Acrocianosis | Bluish discoloration and coldness of extremities/tissues. |
| **Root canal** | Endodoncia | Treatment to remove infected pulp from the root canal of a tooth. |
| **Tender to probing** | Sensible al sondaje | Pain or discomfort felt when evaluating tissues with a probe. |
"""

print("Writing Markdown file...")
with open(roleplay_md_path, 'w', encoding='utf-8') as f:
    f.write(ROLE_PLAY_MD)

print("Compiling PDF file...")
# Render HTML
html_content = markdown.markdown(ROLE_PLAY_MD, extensions=['tables'])

# Wrap in CSS
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
    NBDHE Chapter 7 English Practice: Role Play &nbsp;|&nbsp; Page <pdf:pagenumber> of <pdf:pagecount>
</div>
{html_content}
</body>
</html>
"""

with open(roleplay_pdf_path, 'w+b') as out_file:
    pisa_status = pisa.CreatePDF(full_html, dest=out_file)

if pisa_status.err:
    print(f"Error compiling: {roleplay_pdf_path}")
else:
    print(f"Success! Saved PDF to {roleplay_pdf_path}")
