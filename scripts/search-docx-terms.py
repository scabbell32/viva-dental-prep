import re

def search_terms(filepath, terms):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for term in terms:
        matches = [m.start() for m in re.finditer(term, content, re.IGNORECASE)]
        print(f"Term '{term}': {len(matches)} matches")
        for m in matches:
            start = max(0, m - 100)
            end = min(len(content), m + 200)
            context = content[start:end].replace('\n', ' ')
            print(f"  Context: {context}")

search_terms('/Users/shawncabbell/Downloads/dental hygiene/questions/Chapter_7_Questions_Clean.md', ['Adenine', 'DNA', 'dominant', 'recessive'])
