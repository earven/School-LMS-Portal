import json
import os

path = r'C:/Users/USER/.gemini/antigravity-ide/brain/6aee1998-740d-45f7-8440-f7da5abe5e2e/.system_generated/logs/transcript.jsonl'
lines = open(path, encoding='utf-8').readlines()

with open(r'd:/coding_files/School-LMS-Portal/src/pages/TeacherTools/AttendanceTracker.jsx', 'r', encoding='utf-8') as f:
    file_content = f.read()

for l in lines:
    try:
        d = json.loads(l, strict=False)
    except:
        continue
    
    if d.get('type') == 'PLANNER_RESPONSE' and d.get('tool_calls'):
        for tc in d['tool_calls']:
            if tc['name'] == 'replace_file_content' and 'AttendanceTracker.jsx' in tc['args'].get('TargetFile', ''):
                file_content = file_content.replace(tc['args']['TargetContent'], tc['args']['ReplacementContent'])
            elif tc['name'] == 'multi_replace_file_content' and 'AttendanceTracker.jsx' in tc['args'].get('TargetFile', ''):
                chunks = tc['args']['ReplacementChunks']
                if isinstance(chunks, str):
                    try:
                        chunks = json.loads(chunks, strict=False)
                    except:
                        continue
                if isinstance(chunks, list):
                    for chunk in chunks:
                        file_content = file_content.replace(chunk['TargetContent'], chunk['ReplacementContent'])

with open('recovered.jsx', 'w', encoding='utf-8') as f:
    f.write(file_content)
