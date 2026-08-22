import os
import json
import markdown
from xhtml2pdf import pisa

base_dir = "/Users/shawncabbell/Downloads/viva-dental-prep/docs"
questions_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"

json_path = os.path.join(base_dir, "ch8_questions_clean.json")
with open(json_path, 'r', encoding='utf-8') as f:
    ch8_data = json.load(f)

CSS_STYLES = """
@page {
    size: letter;
    margin: 0.8in;
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
    font-size: 18pt;
    color: #0C4A47;
    margin-bottom: 4px;
    border-bottom: 2px solid #E2765A;
    padding-bottom: 4px;
    font-weight: bold;
    text-align: center;
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
    margin-top: 12px;
    margin-bottom: 12px;
}
.question-block {
    margin-bottom: 16px;
    page-break-inside: avoid;
}
.question-number {
    font-size: 10.5pt;
    font-weight: bold;
    color: #0C4A47;
    margin-bottom: 4px;
}
.question-text {
    margin-bottom: 6px;
    font-weight: 500;
}
.options-list {
    margin-left: 15px;
    margin-bottom: 6px;
}
.option-item {
    margin-bottom: 2px;
    font-size: 9pt;
}
.answer-box {
    background-color: #F0F7F4;
    border-left: 4px solid #0C4A47;
    padding: 6px 10px;
    margin-top: 6px;
    margin-bottom: 6px;
}
.correct-label {
    font-weight: bold;
    color: #0C4A47;
    font-size: 9pt;
    margin-bottom: 2px;
}
.rationale-text {
    font-size: 8.5pt;
    color: #2D4A43;
}
"""

html_blocks = []
for q in ch8_data:
    opts_html = "".join([f'<div class="option-item"><strong>{k.upper()}.</strong> {v}</div>' for k, v in q['options'].items()])
    correct_text = q['options'][q['correct']]
    block = f"""
    <div class="question-block">
        <div class="question-number">Question {q["num"]}</div>
        <div class="question-text">{q["stem"]}</div>
        <div class="options-list">{opts_html}</div>
        <div class="answer-box">
            <div class="correct-label">Correct Answer: {q["correct"].upper()}. {correct_text}</div>
            <div class="rationale-text"><strong>Clinical Rationale:</strong> {q["rationale"]}</div>
        </div>
    </div>
    <hr/>
    """
    html_blocks.append(block)

full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>{CSS_STYLES}</style>
</head>
<body>
<div id="footerContent" class="footer-text">
    NBDHE Chapter 8 Questions & Answers (Week 4) &nbsp;|&nbsp; Page <pdf:pagenumber> of <pdf:pagecount>
</div>
<h1>Chapter 8: Oral Pathology Review Questions & Answers</h1>
<p style="text-align: center; margin-bottom: 15px; font-style: italic; color: #4D6661;">
    Complete 50-Question Bank for Week 4 NBDHE Preparation.
</p>
<hr/>
{"".join(html_blocks)}
</body>
</html>
"""

pdf_out = os.path.join(base_dir, "Chapter_8_Questions_and_Answers.pdf")
pdf_out_q = os.path.join(questions_dir, "Chapter_8_Questions_and_Answers.pdf")

with open(pdf_out, "w+b") as f:
    pisa.CreatePDF(full_html, dest=f)

with open(pdf_out_q, "w+b") as f:
    pisa.CreatePDF(full_html, dest=f)

print("Successfully generated Chapter 8 PDF files!")
