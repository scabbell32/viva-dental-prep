import json

with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

# Group questions by case_set_id
by_case = {}
for q in questions:
    cid = q.get("case_set_id")
    if cid not in by_case:
        by_case[cid] = []
    by_case[cid].append(q)

for cid, qs in by_case.items():
    print(f"=== Case Set ID: {cid} (contains {len(qs)} questions) ===")
    # Print some samples
    for q in qs[:3]:
        print(f"  Q ID: {q.get('id')}")
        print(f"    Stem: {q.get('question_text')[:150]}")
        print(f"    Context: {q.get('context_text')}")
        print(f"    Image URL: {q.get('image_url')}")
    print("-" * 50)
