import os, re, glob

template_dir = 'src/main/resources/templates'
files = glob.glob(os.path.join(template_dir, '*.html'))
print(f'Found {len(files)} HTML files')

updated = 0
for fpath in files:
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    original = content

    # Fix CSS variables - change dark text colors to dark
    content = content.replace('--text-white: #ffffff', '--text-white: #0f172a')
    content = content.replace('--text-white:#ffffff', '--text-white:#0f172a')
    content = content.replace('--text-light: rgba(255,255,255,0.82)', '--text-light: #334155')
    content = content.replace('--text-light:rgba(255,255,255,0.82)', '--text-light:#334155')
    content = content.replace('--text-dim: rgba(255,255,255,0.55)', '--text-dim: #64748b')
    content = content.replace('--text-dim:rgba(255,255,255,0.55)', '--text-dim:#64748b')

    # Fix nav background - remove dark bg
    content = content.replace('background: rgba(0,0,0,0.25)', 'background: rgba(255,255,255,0.75)')
    content = content.replace('background:rgba(0,0,0,0.25)', 'background:rgba(255,255,255,0.75)')
    content = content.replace('background: rgba(0,0,0,0.2)', 'background: rgba(255,255,255,0.75)')
    content = content.replace('background:rgba(0,0,0,0.2)', 'background:rgba(255,255,255,0.75)')

    # Fix dropdown dark backgrounds
    content = content.replace('background: rgba(10, 12, 30, 0.90)', 'background: rgba(255,255,255,0.97)')
    content = content.replace('background: rgba(10, 30, 10, 0.85)', 'background: rgba(255,255,255,0.97)')
    content = content.replace('background: rgba(10,12,30,0.88)', 'background: rgba(255,255,255,0.97)')
    content = content.replace('background: rgba(10,30,10,0.85)', 'background: rgba(255,255,255,0.97)')

    # Fix alert dark backgrounds
    content = content.replace('background: rgba(10,12,30,0.88)', 'background: rgba(255,255,255,0.95)')
    content = content.replace('background: rgba(10, 30, 10, 0.85)', 'background: rgba(255,255,255,0.95)')

    # Fix glass card backgrounds - make them white
    content = content.replace('--glass-card: rgba(255, 255, 255, 0.15)', '--glass-card: rgba(255,255,255,0.88)')
    content = content.replace('--glass-card:rgba(255,255,255,0.15)', '--glass-card:rgba(255,255,255,0.88)')
    content = content.replace('--glass-bg: rgba(255, 255, 255, 0.12)', '--glass-bg: rgba(255,255,255,0.85)')
    content = content.replace('--glass-bg:rgba(255,255,255,0.12)', '--glass-bg:rgba(255,255,255,0.85)')

    # Fix dark overlay on bg-layer::after
    content = re.sub(
        r'(\.bg-layer::after\s*\{[^}]*)background\s*:[^;]+;',
        r'\1background: rgba(255,255,255,0.10);',
        content, flags=re.DOTALL
    )

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        updated += 1
        print(f'✓ {os.path.basename(fpath)}')
    else:
        print(f'- skipped: {os.path.basename(fpath)}')

print(f'\nDone! {updated} files updated.')