import os
from pypdf import PdfReader

pdf_path = "/Users/shawncabbell/Downloads/dental hygiene/questions/Chapter 6-9.pdf"

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
else:
    reader = PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    found = []
    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        if "Perry" in text or "Goddard" in text or "Dorchester" in text or "Janis Johnson" in text:
            found.append(idx + 1)
    print(f"Names found on pages: {found}")
