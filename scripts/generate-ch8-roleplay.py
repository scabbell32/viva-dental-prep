import os
import markdown
from xhtml2pdf import pisa

base_dir = "/Users/shawncabbell/Downloads/viva-dental-prep/docs"
questions_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"

roleplay_md_path = os.path.join(base_dir, "Chapter_8_Role_Play_Jeff.md")
pdf_out_docs = os.path.join(base_dir, "Chapter_8_Role_Play_Jeff.pdf")
pdf_out_questions = os.path.join(questions_dir, "Chapter_8_Role_Play_Jeff.pdf")

with open(roleplay_md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

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
"""

html_body = markdown.markdown(md_content, extensions=['tables'])

full_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>{CSS_STYLES}</style>
</head>
<body>
<div id="footerContent" class="footer-text">
    Chapter 8 Clinical Dialogue Script (Patient Jeff) &nbsp;|&nbsp; Page <pdf:pagenumber> of <pdf:pagecount>
</div>
{html_body}
</body>
</html>
"""

with open(pdf_out_docs, "w+b") as f:
    pisa.CreatePDF(full_html, dest=f)

with open(pdf_out_questions, "w+b") as f:
    pisa.CreatePDF(full_html, dest=f)

print("Successfully generated Chapter_8_Role_Play_Jeff.pdf!")
