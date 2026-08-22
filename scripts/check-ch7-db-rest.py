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
    
    if not supabase_url or not service_role:
        print("Missing Supabase credentials in .env.local")
        return
        
    url = f"{supabase_url}/rest/v1/questions?chapter_tag=eq.ch7"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}"
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"Total questions with tag ch7 in DB: {len(data)}")
            active = sum(1 for q in data if q.get("is_active"))
            legacy = sum(1 for q in data if q.get("is_legacy"))
            with_images = sum(1 for q in data if q.get("image_url") or q.get("image_urls"))
            print(f"Active: {active}")
            print(f"Legacy: {legacy}")
            print(f"With images: {with_images}")
    except Exception as e:
        print("Error fetching from Supabase:", e)

if __name__ == "__main__":
    main()
