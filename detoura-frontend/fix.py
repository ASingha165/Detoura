import glob
import re
import os

for filepath in glob.glob('d:/Detoura/detoura-frontend/src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix oninput
    content = content.replace('oninput=', 'onInput=')
    # Fix onclick
    content = content.replace('onclick=', 'onClick=')
    # Fix checked=""
    content = content.replace('checked=""', 'defaultChecked')
    # Fix preserveaspectratio
    content = content.replace('preserveaspectratio=', 'preserveAspectRatio=')
    
    # Also remove the unused imports to clear TS errors
    content = re.sub(r'import\s+\{\s*useNavigate\s*\}\s*from\s*"react-router-dom";\n', '', content)
    content = re.sub(r'import\s+\{\s*useDetoura\s*\}\s*from\s*"../DetouraContext";\n', '', content)
    content = re.sub(r'import\s+\{\s*getRecommendations\s*\}\s*from\s*"../api";\n', '', content)
    # Remove unused React
    content = re.sub(r'import React(?:, \{ useState \})? from "react";\n', '', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
