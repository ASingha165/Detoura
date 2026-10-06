import re
import os

def html_to_jsx(html):
    # Basic replacements
    jsx = html.replace('class=', 'className=')
    jsx = jsx.replace('for=', 'htmlFor=')
    jsx = jsx.replace('<!--', '{/*').replace('-->', '*/}')
    
    # Self-close specific tags
    jsx = re.sub(r'<img([^>]+?)(?<!/)>', r'<img\1 />', jsx)
    jsx = re.sub(r'<input([^>]+?)(?<!/)>', r'<input\1 />', jsx)
    jsx = re.sub(r'<br([^>]+?)(?<!/)>', r'<br\1 />', jsx)
    jsx = re.sub(r'<hr([^>]+?)(?<!/)>', r'<hr\1 />', jsx)
    
    # Handle inline styles (simple ones like style="width: 66.6%;")
    def style_replacer(match):
        style_str = match.group(1)
        styles = {}
        for rule in style_str.split(';'):
            if ':' in rule:
                k, v = rule.split(':', 1)
                k = k.strip()
                v = v.strip()
                # camelCase keys
                k = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
                styles[k] = v
        return 'style={{' + ', '.join(f'"{k}": "{v}"' for k,v in styles.items()) + '}}'
    
    jsx = re.sub(r'style="([^"]*)"', style_replacer, jsx)
    
    # Clean up SVG properties
    jsx = jsx.replace('viewbox', 'viewBox')
    jsx = jsx.replace('stroke-width', 'strokeWidth')
    jsx = jsx.replace('stroke-dasharray', 'strokeDasharray')
    jsx = jsx.replace('stroke-linecap', 'strokeLinecap')
    jsx = jsx.replace('font-variation-settings', 'fontVariationSettings')
    
    # Remove HTML, HEAD, BODY tags and wrapping
    match = re.search(r'<main[^>]*>(.*?)</main>', jsx, re.DOTALL)
    if match:
        jsx = match.group(1)
    
    # Remove any script tags
    jsx = re.sub(r'<script[^>]*>.*?</script>', '', jsx, flags=re.DOTALL)
    
    return jsx

src_dir = 'd:/Detoura/stitch_detoura_ai_regional_travel_intelligence'
dest_dir = 'd:/Detoura/detoura-frontend/src/pages'
os.makedirs(dest_dir, exist_ok=True)

files_map = {
    'detoura_onboarding_travel_dna': 'TravelDNA.tsx',
    'detoura_home_explore': 'Explore.tsx',
    'detoura_ai_recommendations': 'Recommendations.tsx',
    'detoura_destination_smart_itinerary': 'DestinationDetail.tsx',
    'detoura_profile_my_trips': 'Profile.tsx'
}

for folder, dest_file in files_map.items():
    html_path = os.path.join(src_dir, folder, 'code.html')
    if not os.path.exists(html_path):
        continue
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    jsx_content = html_to_jsx(html)
    
    template = f'''import React, {{ useState }} from "react";
import {{ useNavigate }} from "react-router-dom";
import {{ useDetoura }} from "../DetouraContext";
import {{ getRecommendations }} from "../api";

export default function {dest_file.replace('.tsx', '')}() {{
  return (
    <div className="flex flex-col w-full">
      {jsx_content}
    </div>
  );
}}
'''
    
    with open(os.path.join(dest_dir, dest_file), 'w', encoding='utf-8') as f:
        f.write(template)
    print(f'Converted {dest_file}')
