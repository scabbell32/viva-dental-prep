import os
import json
import urllib.request

def main():
    env_path = "/Users/shawncabbell/Downloads/viva-dental-prep/.env.local"
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
                
    supabase_url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL")
    service_role = env_vars.get("SUPABASE_SERVICE_ROLE_KEY")
    
    # Load ch6 questions
    with open("ch6_db_dump.json", "r", encoding="utf-8") as f:
        questions = json.load(f)
        
    case_ids = list(set([q.get("case_set_id") for q in questions if q.get("case_set_id") is not None]))
    print("Referenced case_set_ids:", case_ids)
    
    if not case_ids:
        print("No cases referenced.")
        return
        
    # Let's query case_sets table
    url = f"{supabase_url}/rest/v1/case_sets?id=in.({','.join(map(str, case_ids))})"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}"
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            cases = json.loads(response.read().decode('utf-8'))
            print(f"Fetched {len(cases)} case sets:")
            for case in cases:
                if case is not None:
                    print(f"  Case ID: {case.get('id')}")
                    print(f"  Title: {case.get('title')}")
                    desc = case.get('description') or ''
                    print(f"  Description: {desc[:200]}...")
            with open("ch6_cases_dump.json", "w", encoding="utf-8") as f:
                json.dump(cases, f, indent=2, ensure_ascii=False)
            print("Wrote ch6_cases_dump.json successfully")
    except Exception as e:
        print("Error fetching case sets:", e)

if __name__ == "__main__":
    main()
