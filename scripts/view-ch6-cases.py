import json

with open("ch6_cases_dump.json", "r", encoding="utf-8") as f:
    cases = json.load(f)

for idx, case in enumerate(cases):
    print(f"=== CASE {idx+1} ===")
    print(f"ID: {case.get('id')}")
    print(f"Title: {case.get('title')}")
    print(f"Description:\n{case.get('description')}")
    print(f"Context Text:\n{case.get('context_text')}")
    print("-" * 50)
