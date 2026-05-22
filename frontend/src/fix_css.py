import re

css_path = '/Users/nagachaitanya/care-trace-ai-demo/frontend/src/index.css'
with open(css_path, 'r') as f:
    lines = f.readlines()

new_lines = []
in_dark_block = False

for line in lines:
    # Check if entering a dark block
    if '[data-theme="dark"]' in line or '.dark' in line:
        in_dark_block = True
    
    # If we hit an closing brace, and it's not nested inside a media query (very naive, but works for simple CSS)
    # Actually, tracking braces is better.
    
    # Let's do this robustly with a state machine
    pass

# A simpler robust state machine:
with open(css_path, 'r') as f:
    content = f.read()

# We need to find all blocks starting with [data-theme="dark"] ... { ... }
# Because regex is hard for nested braces, we can just split by '}' and look at the selector.

def replace_in_dark_blocks(text):
    # Regex to find [data-theme="dark"] blocks. This assumes no nested {} inside them EXCEPT if we handle it carefully.
    # Actually, we can just do line by line. Most of the file's dark theme overrides are single level.
    return text

# Wait, let's just use Python's re to find all [data-theme="dark"] selectors and process the block.
import sys

out = []
in_dark = False
brace_level = 0

for line in lines:
    if '[data-theme="dark"]' in line:
        in_dark = True
        
    if '{' in line:
        brace_level += line.count('{')
    if '}' in line:
        brace_level -= line.count('}')
        if brace_level == 0:
            in_dark = False
            
    if in_dark:
        line = line.replace('138, 166, 36', '255, 255, 255')
    
    out.append(line)

with open(css_path, 'w') as f:
    f.writelines(out)

print("CSS updated successfully.")
