import os
from pypdf import PdfReader

pdf_path = "/Users/shawncabbell/Downloads/dental hygiene/questions/example_chapter7.pdf"
output_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"

if not os.path.exists(pdf_path):
    print(f"File not found: {pdf_path}")
else:
    reader = PdfReader(pdf_path)
    print(f"Total pages: {len(reader.pages)}")
    for idx, page in enumerate(reader.pages):
        images = list(page.images)
        print(f"Page {idx+1} has {len(images)} images")
        for jdx, img in enumerate(images):
            img_name = f"extracted_ch7_p{idx+1}_img{jdx+1}.jpg"
            img_path = os.path.join(output_dir, img_name)
            with open(img_path, "wb") as f:
                f.write(img.data)
            print(f"  Extracted image: {img_path} ({len(img.data)} bytes)")
