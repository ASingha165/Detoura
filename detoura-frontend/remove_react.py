import glob
import re

for filepath in glob.glob('d:/Detoura/detoura-frontend/src/**/*.tsx', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove import React from 'react';
    content = re.sub(r"import React from 'react';\n", "", content)
    # Remove import React, { useState } from 'react'; but keep { useState }
    content = re.sub(r"import React,\s*\{\s*([^}]+)\s*\}\s*from\s*'react';\n", r"import { \1 } from 'react';\n", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
