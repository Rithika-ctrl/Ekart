import re
from pathlib import Path

TEMPLATE_DIR = Path('src/main/resources/templates')

anchor_re = re.compile(r'<a\b[^>]*class=["\']([^"\']*\bnav-brand\b[^"\']*)["\'][^>]*>.*?</a>', re.DOTALL|re.IGNORECASE)

nav_brand_block_re = re.compile(r'(\.nav-brand\b\s*\{)([^}]*)\}', re.IGNORECASE)
nav_brand_span_block_re = re.compile(r'(\.nav-brand\s*span\b\s*\{)([^}]*)\}', re.IGNORECASE)

for path in TEMPLATE_DIR.rglob('*.html'):
    text = path.read_text(encoding='utf-8')
    if 'nav-brand' not in text:
        continue
    orig = text
    # Replace anchor occurrences (broad match)
    def anchor_repl(m):
        return '<a href="/" class="nav-brand"><span>E</span>Kart</a>'
    text = anchor_re.sub(anchor_repl, text)

    # Additional conservative replacements for leftover variants inside anchors
    # Replace common textual variants inside any nav-brand anchors
    text = re.sub(r'>\s*E\s*<span>k<\/span>art\s*<\/a>', '><span>E</span>Kart</a>', text, flags=re.IGNORECASE)
    text = re.sub(r'>\s*Ekart\s*<\/a>', '><span>E</span>Kart</a>', text, flags=re.IGNORECASE)
    text = re.sub(r'>\s*EKart\s*<\/a>', '><span>E</span>Kart</a>', text, flags=re.IGNORECASE)
    text = re.sub(r'>\s*<span>Ek<\/span>art\s*<\/a>', '><span>E</span>Kart</a>', text, flags=re.IGNORECASE)
    text = re.sub(r'>\s*<span>Ekart<\/span>\s*<\/a>', '><span>E</span>Kart</a>', text, flags=re.IGNORECASE)

    # Ensure .nav-brand block color exists/updated
    def ensure_nav_brand_block(s):
        m = nav_brand_block_re.search(s)
        if m:
            block = m.group(0)
            inner = m.group(2)
            if 'color:' in inner:
                inner = re.sub(r'color\s*:\s*[^;]+;', 'color: #ffffff;', inner)
            else:
                inner = inner + '\n    color: #ffffff;'
            new_block = m.group(1) + inner + '\n}'
            return s[:m.start()] + new_block + s[m.end():]
        else:
            # Try to insert into first <style>...</style> or create one before </head>
            style_match = re.search(r'<style[^>]*>', s, re.IGNORECASE)
            if style_match:
                # find end of that style tag
                end_style = re.search(r'</style>', s, re.IGNORECASE)
                if end_style:
                    insert_pos = end_style.start()
                    add = '\n.nav-brand { color: #ffffff; }\n'
                    return s[:insert_pos] + add + s[insert_pos:]
            # fallback: insert before </head>
            head_close = re.search(r'</head>', s, re.IGNORECASE)
            add = '<style>\n.nav-brand { color: #ffffff; }\n</style>\n'
            if head_close:
                return s[:head_close.start()] + add + s[head_close.start():]
            else:
                return add + s

    def ensure_nav_brand_span_block(s):
        m = nav_brand_span_block_re.search(s)
        if m:
            inner = m.group(2)
            if 'color:' in inner:
                inner = re.sub(r'color\s*:\s*[^;]+;', 'color: #f5a800;', inner)
            else:
                inner = inner + '\n    color: #f5a800;'
            new_block = m.group(1) + inner + '\n}'
            return s[:m.start()] + new_block + s[m.end():]
        else:
            # insert similar to above
            style_match = re.search(r'<style[^>]*>', s, re.IGNORECASE)
            add = '\n.nav-brand span { color: #f5a800; }\n'
            if style_match:
                end_style = re.search(r'</style>', s, re.IGNORECASE)
                if end_style:
                    insert_pos = end_style.start()
                    return s[:insert_pos] + add + s[insert_pos:]
            head_close = re.search(r'</head>', s, re.IGNORECASE)
            if head_close:
                return s[:head_close.start()] + '<style>\n' + add + '</style>\n' + s[head_close.start():]
            else:
                return add + s

    text = ensure_nav_brand_block(text)
    text = ensure_nav_brand_span_block(text)

    if text != orig:
        backup = path.with_suffix(path.suffix + '.bak')
        path.write_text(orig, encoding='utf-8')
        backup.write_text(orig, encoding='utf-8')
        path.write_text(text, encoding='utf-8')
        print(f'Updated {path}')

print('Done')
