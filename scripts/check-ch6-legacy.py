import json

with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
    questions = json.load(f)

legacy = [q for q in questions if q.get("is_legacy")]
new_qs = [q for q in questions if not q.get("is_legacy")]

print(f"Total Chapter 6 questions: {len(questions)}")
print(f"Legacy questions: {len(legacy)}")
print(f"New (non-legacy) questions: {len(new_qs)}")

# Let's inspect some of the new questions
print("\nSample of new questions:")
for q in new_qs[:5]:
    print(f"  Q ID {q.get('id')} | Num {q.get('sequence_order') or ''}:")
    print(f"    Stem: {q.get('question_text')[:120]}...")
    print(f"    Has Image: {bool(q.get('image_url'))}")
