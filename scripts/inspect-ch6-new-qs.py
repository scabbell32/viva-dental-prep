import json

with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

new_qs = [q for q in questions if not q.get("is_legacy")]

print(f"Total new questions: {len(new_qs)}")
for idx, q in enumerate(new_qs):
    print(f"{idx+1}. Q ID: {q.get('id')}")
    print(f"   Stem: {q.get('question_text')[:120]}...")
    print(f"   Image URL: {q.get('image_url')}")
    print(f"   Case Set ID: {q.get('case_set_id')}")
    print(f"   Has English Expl: {bool(q.get('explanation'))}")
    print(f"   Has Spanish Expl: {bool(q.get('explanation_es'))}")
    print("-" * 40)
