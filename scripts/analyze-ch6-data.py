import json

with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total questions: {len(data)}")
active = [q for q in data if q.get("is_active")]
print(f"Active questions: {len(active)}")

# Track names
tracks = {}
for q in data:
    track = q.get("track")
    tracks[track] = tracks.get(track, 0) + 1
print("Tracks count:", tracks)

# Let's count questions with images
with_images = [q for q in data if q.get("image_url") or q.get("image_urls")]
print(f"Questions with images: {len(with_images)}")
for q in with_images:
    print(f"  Q ID {q.get('id')} (Active={q.get('is_active')}):")
    print(f"    Stem: {q.get('question_text')[:100]}...")
    print(f"    Image: {q.get('image_url')}")
    
# Let's check cases
cases = {}
for q in data:
    case_name = q.get("case_study_name") or q.get("case_name") or q.get("case_title")
    # check keys
    for k in q.keys():
        if "case" in k.lower():
            val = q.get(k)
            if val:
                cases[k] = cases.get(k, 0) + 1

print("Case-related fields in DB records:", cases)

# Let's see some keys of the first record
print("Keys in question record:", list(data[0].keys()))
