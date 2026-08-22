import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    try:
        with zipfile.ZipFile(file_path) as z:
            doc_xml = z.read('word/document.xml')
            root = ET.fromstring(doc_xml)
            
            # Namespaces
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract text
            text_runs = []
            for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                p_text = []
                for run in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r'):
                    for text in run.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if text.text:
                            p_text.append(text.text)
                if p_text:
                    text_runs.append("".join(p_text))
            
            full_text = "\n".join(text_runs)
            print(f"Total paragraphs: {len(text_runs)}")
            print("Preview of the first 2000 characters:")
            print("-" * 50)
            print(full_text[:2000])
            print("-" * 50)
            
            # Save to a text file for further reading if needed
            txt_path = file_path.replace('.docx', '_extracted.txt')
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            print(f"Extracted full text to {txt_path}")
            
    except Exception as e:
        print(f"Error reading docx: {str(e)}")

read_docx('/Users/shawncabbell/Downloads/Chapter_007 (1).docx')
