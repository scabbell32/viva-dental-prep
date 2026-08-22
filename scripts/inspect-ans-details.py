import re

with open('/Users/shawncabbell/Downloads/dental hygiene/questions/Chapter_7_Answers_and_Rationales.md', 'r', encoding='utf-8') as f:
    content = f.read()

q_blocks = re.split(r'###\s+\*\*Q(\d+)\.', content)
for i in range(1, len(q_blocks), 2):
    q_num = int(q_blocks[i])
    if q_num in [21, 22, 24, 25, 26, 27]:
        print(f"Q{q_num}:")
        print(q_blocks[i+1].strip())
        print("-" * 60)
