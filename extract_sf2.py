import json
import re

path = r'C:/Users/USER/.gemini/antigravity-ide/brain/6aee1998-740d-45f7-8440-f7da5abe5e2e/.system_generated/logs/transcript.jsonl'
lines = open(path, encoding='utf-8').readlines()

for idx, l in enumerate(lines):
    if 'handleDownloadOfficialSF2' in l:
        # We know lines 586 and 698 contain this. 
        # But wait, there was also lines 542, 574, etc.
        # Let's extract TargetContent and ReplacementContent using regex
        
        # The payload is {"TargetContent": "...", "ReplacementContent": "..."}
        # Because of escaping, it's safer to just search for the strings.
        target_match = re.search(r'"TargetContent"\s*:\s*"(.*?)(?<!\\)"', l, re.DOTALL)
        repl_match = re.search(r'"ReplacementContent"\s*:\s*"(.*?)(?<!\\)"', l, re.DOTALL)
        
        if repl_match:
            try:
                # unescape the string
                repl = repl_match.group(1).encode('utf-8').decode('unicode_escape')
                print(f"\n--- REPLACEMENT FROM LINE {idx} ---")
                print(repl[:500] + "...\n" + repl[-500:])
            except:
                print(f"Failed to unescape line {idx}")
