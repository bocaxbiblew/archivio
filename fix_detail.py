import os
import re

base_dir = "/Users/niccolodebartolo/Downloads/archivio-main"
files = ["movie.html", "series.html"]

sidebar_template = """  <!-- Floating Sidebar (Desktop) -->
  <aside class="sidebar">
    <div class="sidebar-top">
      <img src="assets/unnamed.png" alt="Logo" class="sidebar-logo" onclick="window.location.href='index.html'">
    </div>
    <ul class="sidebar-links">
      <li><a href="index.html"><i class='bx bx-home-alt-2'></i> <span>Home</span></a></li>
      <li><a href="catalog_series.html"><i class='bx bx-tv'></i> <span>Serie</span></a></li>
      <li><a href="catalog_movies.html"><i class='bx bx-movie-play'></i> <span>Film</span></a></li>
      <li><a href="calendar.html"><i class='bx bx-calendar-star'></i> <span>Uscite</span></a></li>
    </ul>
    <div class="sidebar-bottom">
      <a href="https://t.me/+w-cVyPMl7B5lOGY0" target="_blank" class="icon-btn" title="Canale Telegram"><i class='bx bx-bulb'></i></a>
      <button class="icon-btn" id="open-search"><i class='bx bx-search'></i></button>
      <button class="icon-btn" title="La mia lista"><i class='bx bx-bookmark'></i></button>
      <img src="https://placehold.co/100x100/ffcc00/000?text=User" alt="Profile" class="profile-avatar">
    </div>
  </aside>

  <!-- Mobile Header (Hidden on Desktop) -->
  <header class="mobile-header">
    <img src="assets/unnamed.png" alt="Logo" class="mobile-logo" onclick="window.location.href='index.html'">
    <div class="mobile-header-right">
      <a href="https://t.me/+w-cVyPMl7B5lOGY0" target="_blank" class="icon-btn" title="Canale Telegram"><i class='bx bx-bulb'></i></a>
      <button class="icon-btn" id="open-search-mobile"><i class='bx bx-search'></i></button>
      <button class="icon-btn" title="La mia lista"><i class='bx bx-bookmark'></i></button>
      <img src="https://placehold.co/100x100/ffcc00/000?text=User" alt="Profile" class="profile-avatar mobile-avatar">
    </div>
  </header>

  <!-- Main Content Wrapper -->
  <main class="main-content">
"""

for filename in files:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "Floating Sidebar" not in content:
        # Wrap body content
        content = content.replace('<body>', '<body>\n' + sidebar_template)
        # Note: the python script before added </main> before </body>. 
        # But wait, did it? The previous python script matched replace('</body>', '</main>\n</body>').
        # Let's check if there is a </main> already.
        if '</main>' not in content:
            content = content.replace('</body>', '</main>\n</body>')
            
        # The prompt also says "No cinematic modal needed". It wasn't added by the previous script because we excluded these files.
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Detail pages fixed!")
