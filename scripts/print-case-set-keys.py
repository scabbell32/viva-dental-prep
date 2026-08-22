import json

with open("ch6_cases_dump.json", "r", encoding="utf-8") as f:
    cases = json.load(f)

for case in cases:
    print(f"Case ID: {case.get('id')}")
    print("Keys:", list(case.keys()))
    print("Values:")
    for k, v in case.items():
        if v is not None:
            print(f"  {k}: {v}")
    print("-" * 50)
