import re

with open('/Users/niccolodebartolo/Downloads/archivio-main/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# I need to wrap all <section> elements from "continue-watching-section" through "Tutti i film"
# In index.html, sections start with <section class="section" id="continue-watching-section" style="display: none;">
# and end right before <script src="script.js?v=7"></script>

if '<div class="sections-wrapper">' not in content:
    pattern = re.compile(r'(<section\s+class="section"\s+id="continue-watching-section".*?)(<script src="script\.js)', re.DOTALL)
    
    def repl(m):
        return f'<div class="sections-wrapper">\n{m.group(1)}\n</div>\n</main>\n{m.group(2)}'
        
    content = pattern.sub(repl, content)
    
    with open('/Users/niccolodebartolo/Downloads/archivio-main/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
        
print("index.html fixed!")
