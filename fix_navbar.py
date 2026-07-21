import os
import re

files = ['index.html', 'catalog_series.html', 'catalog_movies.html', 'series.html', 'movie.html', 'calendar.html']

nav_links_html = '''    <ul class="nav-links">
      <li><a href="index.html">Home</a></li>
      <li><a href="catalog_series.html">Serie</a></li>
      <li><a href="catalog_movies.html">Film</a></li>
      <li><a href="calendar.html">Uscite</a></li>
    </ul>'''

for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r') as file: html = file.read()
    
    # 1. Navbar desktop
    if '<ul class="nav-links">' not in html:
        # Insert nav_links_html right after <div class="nav-left"> ... </div>
        html = re.sub(r'(<div class="nav-left">.*?</div>)', r'\1\n' + nav_links_html, html, flags=re.DOTALL)
    
    # 4. Logo più grande (35px -> 45px)
    html = html.replace('height: 35px;', 'height: 45px;')
    
    with open(f, 'w') as file:
        file.write(html)
print("HTML update done")
