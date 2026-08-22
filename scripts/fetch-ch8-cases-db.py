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
    
    # 1. Fetch case_sets for ch8
    url_cases = f"{supabase_url}/rest/v1/case_sets?chapter_tag=eq.ch8"
    req_cases = urllib.request.Request(
        url_cases,
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}"
        }
    )
    with urllib.request.urlopen(req_cases) as resp:
        case_sets = json.loads(resp.read().decode('utf-8'))
        
    print(f"=== FOUND {len(case_sets)} CASE SETS FOR CH8 ===")
    case_map = {cs['id']: cs for cs in case_sets}
    for cs in case_sets:
        print(f"Case ID: {cs['id']}")
        print(f"Label: {cs.get('case_label')}")
        print(f"Description:\n{cs.get('description')}")
        print("-" * 50)

    # 2. Fetch questions with case_set_id for ch8
    url_qs = f"{supabase_url}/rest/v1/questions?chapter_tag=eq.ch7&select=*" # let's check ch8 also
    url_ch8_qs = f"{supabase_url}/rest/v1/questions?chapter_tag=eq.ch8&select=*"
    
    req_qs = urllib.request.Request(
        url_ch8_qs,
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}"
        }
    )
    with urllib.request.urlopen(req_qs) as resp:
        questions = json.loads(resp.read().decode('utf-8'))

    print(f"\n=== TOTAL CH8 QUESTIONS IN SUPABASE: {len(questions)} ===")
    
    case_questions = [q for q in questions if q.get('case_set_id') is not None or q.get('image_url') or q.get('image_urls')]
    print(f"=== CASE-BASED / IMAGE QUESTIONS IN CH8: {len(case_questions)} ===")
    
    for i, q in enumerate(case_questions, 1):
        cs = case_map.get(q.get('case_set_id'), {})
        print(f"\nQuestion {i} (DB ID: {q['id']}):")
        print(f"Case Label: {cs.get('case_label', 'No Case Label')}")
        print(f"Case Description: {cs.get('description', 'N/A')}")
        print(f"Stem: {q['question_text']}")
        print(f"  a. {q.get('option_a')}")
        print(f"  b. {q.get('option_b')}")
        print(f"  c. {q.get('option_c')}")
        print(f"  d. {q.get('option_d')}")
        print(f"Correct: {q.get('correct_option')}")
        print(f"Explanation: {q.get('explanation')}")
        print(f"Image URL: {q.get('image_url') or q.get('image_urls')}")

if __name__ == "__main__":
    main()
