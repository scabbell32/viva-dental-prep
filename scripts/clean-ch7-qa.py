import re
import os

def parse_clean_questions(qs_path):
    with open(qs_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split on questions
    q_blocks = re.split(r'###\s+\*\*Q(\d+)\.', content)
    questions = {}
    
    # Iterate over blocks
    for i in range(1, len(q_blocks), 2):
        q_num = int(q_blocks[i])
        q_body = q_blocks[i+1].strip()
        
        lines = [l.strip() for l in q_body.split('\n') if l.strip()]
        options = []
        stem_lines = []
        for line in lines:
            if re.match(r'^[a-f]\.', line) or re.match(r'^[a-f]\s+\.', line):
                # Clean up options
                opt_match = re.match(r'^([a-f])(?:\s*\.\s*|\s+)(.*)', line)
                if opt_match:
                    letter = opt_match.group(1).lower()
                    text = opt_match.group(2).strip()
                    options.append((letter, text))
            else:
                stem_lines.append(line)
        
        stem = "\n".join(stem_lines)
        
        # Deduplicate or store
        if q_num not in questions:
            questions[q_num] = []
        questions[q_num].append({
            "stem": stem,
            "options": options
        })
    return questions

def parse_clean_rationales(ans_path):
    with open(ans_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    q_blocks = re.split(r'###\s+\*\*Q(\d+)\.', content)
    rationales = {}
    
    for i in range(1, len(q_blocks), 2):
        q_num = int(q_blocks[i])
        q_body = q_blocks[i+1].strip()
        
        # Extract correct answer and rationale
        ans_match = re.search(r'\*\*\s*Correct Answer:\s*\*\*\s*\*\*?([a-fA-F])(?:\.|\.\*\*|\s+)(.*?)(?:\*\*|$)', q_body, re.IGNORECASE)
        rat_match = re.search(r'\*\*\s*Clinical Rationale:\s*\*\*\s*([\s\S]*)', q_body, re.IGNORECASE)
        
        correct_ans = ans_match.group(1).strip().lower() if ans_match else "n/a"
        correct_text = ans_match.group(2).strip() if ans_match else ""
        rationale = rat_match.group(1).strip() if rat_match else q_body
        
        if q_num not in rationales:
            rationales[q_num] = []
        rationales[q_num].append({
            "correct_answer": correct_ans,
            "correct_text": correct_text,
            "rationale": rationale
        })
    return rationales

def main():
    base_dir = "/Users/shawncabbell/Downloads/dental hygiene/questions"
    qs_file = os.path.join(base_dir, "Chapter_7_Questions_Clean.md")
    ans_file = os.path.join(base_dir, "Chapter_7_Answers_and_Rationales.md")
    
    questions = parse_clean_questions(qs_file)
    rationales = parse_clean_rationales(ans_file)
    
    print(f"Parsed {len(questions)} question entries and {len(rationales)} rationale entries.")
    
    # Let's inspect some matching
    for q_num in sorted(questions.keys()):
        instances = questions[q_num]
        ans_instances = rationales.get(q_num, [])
        print(f"Q{q_num}: {len(instances)} question instances, {len(ans_instances)} answer instances")
        # Print first instance stem
        stem_preview = instances[0]["stem"].replace('\n', ' ')
        if len(stem_preview) > 80:
            stem_preview = stem_preview[:80] + "..."
        print(f"  Stem: {stem_preview}")
        if ans_instances:
            print(f"  Ans: {ans_instances[0]['correct_answer']} | {ans_instances[0]['correct_text']}")

if __name__ == "__main__":
    main()
