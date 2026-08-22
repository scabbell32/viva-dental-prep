import re

def search_terms(filepath, terms):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"=== Searching {filepath} ===")
    for term in terms:
        matches = [m.start() for m in re.finditer(term, content, re.IGNORECASE)]
        print(f"Term '{term}': {len(matches)} matches")
        for m in matches[:10]: # show first 10 matches
            start = max(0, m - 50)
            end = min(len(content), m + 150)
            context = content[start:end].replace('\n', ' ')
            print(f"  Context: {context}")

search_terms('/Users/shawncabbell/Downloads/dental hygiene/questions/Chapter_5_Questions_Clean.md', ['fig', 'figure', 'photo', 'image'])
search_terms('/Users/shawncabbell/Downloads/dental hygiene/questions/Chapter_5_Answers_and_Rationales.md', ['fig', 'figure', 'photo', 'image'])
