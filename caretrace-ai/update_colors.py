import os
import re

directory = 'frontend/src'

# We will replace all text-blue-*, bg-blue-*, border-blue-* to slate/zinc
substitutions = [
    (r'\b(text|bg|border|ring|shadow)-blue-50\b', r'\1-zinc-50'),
    (r'\b(text|bg|border|ring|shadow)-blue-100\b', r'\1-zinc-100'),
    (r'\b(text|bg|border|ring|shadow)-blue-200\b', r'\1-zinc-200'),
    (r'\b(text|bg|border|ring|shadow)-blue-300\b', r'\1-zinc-300'),
    (r'\b(text|bg|border|ring|shadow)-blue-400\b', r'\1-zinc-400'),
    (r'\b(text|bg|border|ring|shadow)-blue-500\b', r'\1-zinc-600'),
    (r'\b(text|bg|border|ring|shadow)-blue-600\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-blue-700\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-blue-800\b', r'\1-zinc-900'),
    (r'\b(text|bg|border|ring|shadow)-blue-900\b', r'\1-zinc-900'),
    
    (r'\b(text|bg|border|ring|shadow)-sky-50\b', r'\1-zinc-50'),
    (r'\b(text|bg|border|ring|shadow)-sky-100\b', r'\1-zinc-100'),
    (r'\b(text|bg|border|ring|shadow)-sky-200\b', r'\1-zinc-200'),
    (r'\b(text|bg|border|ring|shadow)-sky-300\b', r'\1-zinc-300'),
    (r'\b(text|bg|border|ring|shadow)-sky-400\b', r'\1-zinc-400'),
    (r'\b(text|bg|border|ring|shadow)-sky-500\b', r'\1-zinc-600'),
    (r'\b(text|bg|border|ring|shadow)-sky-600\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-sky-700\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-sky-800\b', r'\1-zinc-900'),
    (r'\b(text|bg|border|ring|shadow)-sky-900\b', r'\1-zinc-900'),

    (r'\b(text|bg|border|ring|shadow)-cyan-50\b', r'\1-zinc-50'),
    (r'\b(text|bg|border|ring|shadow)-cyan-100\b', r'\1-zinc-100'),
    (r'\b(text|bg|border|ring|shadow)-cyan-200\b', r'\1-zinc-200'),
    (r'\b(text|bg|border|ring|shadow)-cyan-300\b', r'\1-zinc-300'),
    (r'\b(text|bg|border|ring|shadow)-cyan-400\b', r'\1-zinc-400'),
    (r'\b(text|bg|border|ring|shadow)-cyan-500\b', r'\1-zinc-600'),
    (r'\b(text|bg|border|ring|shadow)-cyan-600\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-cyan-700\b', r'\1-zinc-800'),
    (r'\b(text|bg|border|ring|shadow)-cyan-800\b', r'\1-zinc-900'),
    (r'\b(text|bg|border|ring|shadow)-cyan-900\b', r'\1-zinc-900'),
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pattern, replacement in substitutions:
                new_content = re.sub(pattern, replacement, new_content)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
