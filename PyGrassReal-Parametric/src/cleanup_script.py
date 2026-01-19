
import os

file_path = r'c:\Users\PATJUNG\OneDrive\Desktop\Software_PyGrassRealAi\TEST_PyGrassReal\web-3d-editor\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
found_start = False

for i, line in enumerate(lines):
    # Identify the start of the duplicate block
    if 'let angle = v1.angleTo(v2);' in line:
        found_start = True
        skip = True
        # We also want to remove the empty line before it if possible, but let's stick to the block first.
    
    # Identify the end of the duplicate block
    if skip and 'targetRef.current.updateMatrixWorld();' in line:
        skip = False
        continue # Skip this last line of the block too

    if not skip:
        new_lines.append(line)

if found_start:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully removed duplicate block.")
else:
    print("Could not find the duplicate block start.")
