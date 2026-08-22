import os
from pypdf import PdfReader

folder = "/Users/shawncabbell/Downloads/dental hygiene/questions"
names = ["Perry", "Goddard", "Dorchester", "Janis Johnson"]

for filename in os.listdir(folder):
    if filename.endswith(".pdf"):
        pdf_path = os.path.join(folder, filename)
        try:
            reader = PdfReader(pdf_path)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text()
                for name in names:
                    if name in text:
                        print(f"Found '{name}' in '{filename}' on page {idx+1}")
        except Exception as e:
            print(f"Error reading '{filename}': {e}")
