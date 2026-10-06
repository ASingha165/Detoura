import os
import re
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
README_PATH = ROOT_DIR / "README.md"
APP_PATH = ROOT_DIR / "app.py"
RECOMMENDER_PATH = ROOT_DIR / "recommender.py"
REQ_PATH = ROOT_DIR / "requirements.txt"

def get_requirements():
    if not REQ_PATH.exists():
        return []
    with open(REQ_PATH, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]

def get_fastapi_routes():
    if not APP_PATH.exists():
        return []
    routes = []
    with open(APP_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        # Matches typical FastAPI decorators
        pattern = re.compile(r"@app\.(get|post|put|delete)\([\"']([^\"']+)[\"']")
        for match in pattern.finditer(content):
            method, route = match.groups()
            routes.append(f"{method.upper()} {route}")
    return routes

def get_recommender_functions():
    if not RECOMMENDER_PATH.exists():
        return []
    funcs = []
    with open(RECOMMENDER_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        pattern = re.compile(r"^def\s+([a-zA-Z0-9_]+)\s*\(", re.MULTILINE)
        for match in pattern.finditer(content):
            funcs.append(match.group(1))
    return funcs

def update_readme():
    if not README_PATH.exists():
        print(f"Error: {README_PATH} not found.")
        return

    reqs = get_requirements()
    routes = get_fastapi_routes()
    funcs = get_recommender_functions()

    auto_gen_content = "\n### Current Dependencies\n"
    for r in reqs:
        auto_gen_content += f"- `{r}`\n"
        
    auto_gen_content += "\n### Detected Endpoints\n"
    if routes:
        for r in routes:
            auto_gen_content += f"- `{r}`\n"
    else:
        auto_gen_content += "None detected.\n"
        
    auto_gen_content += "\n### Core Recommender Functions\n"
    for f in funcs:
        auto_gen_content += f"- `{f}`\n"
    auto_gen_content += "\n"

    with open(README_PATH, "r", encoding="utf-8") as f:
        readme_content = f.read()

    start_marker = "<!-- AUTO-GENERATED:START -->"
    end_marker = "<!-- AUTO-GENERATED:END -->"

    if start_marker not in readme_content or end_marker not in readme_content:
        # Append markers if they don't exist
        readme_content += f"\n## System Status\n\n{start_marker}\n{end_marker}\n"

    pattern = re.compile(f"({re.escape(start_marker)}).*?({re.escape(end_marker)})", re.DOTALL)
    
    new_readme = pattern.sub(rf"\1\n{auto_gen_content}\2", readme_content)

    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(new_readme)
        
    print("README.md updated successfully.")

if __name__ == "__main__":
    update_readme()
