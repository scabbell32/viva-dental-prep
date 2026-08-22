import os
from pypdf import PdfReader

pdf_path = "/Users/shawncabbell/Downloads/dental hygiene/questions/example_chapter7.pdf"

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
else:
    reader = PdfReader(pdf_path)
    print(f"Number of pages: {len(reader.pages)}")
    for idx, page in enumerate(reader.pages):
        print(f"=== PAGE {idx+1} TEXT ===")
        print(page.extract_text())
