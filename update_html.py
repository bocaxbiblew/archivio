import os
import re

base_dir = "/Users/niccolodebartolo/Downloads/archivio-main"
files = [
    ("index.html", "Home"),
    ("catalog_series.html", "Serie"),
    ("catalog_movies.html", "Film"),
    ("calendar.html", "Uscite"),
    ("movie.html", None),
    ("series.html", None),
    ("admin_users.html", None)
]

sidebar_template = """  <!-- Floating Sidebar (Desktop) -->
  <aside class="sidebar">
    <div class="sidebar-top">
      <img src="assets/unnamed.png" alt="Logo" class="sidebar-logo" onclick="window.location.href='index.html'">
    </div>
    <ul class="sidebar-links">
      <li><a href="index.html"{home_active}><i class='bx bx-home-alt-2'></i> <span>Home</span></a></li>
      <li><a href="catalog_series.html"{serie_active}><i class='bx bx-tv'></i> <span>Serie</span></a></li>
      <li><a href="catalog_movies.html"{film_active}><i class='bx bx-movie-play'></i> <span>Film</span></a></li>
      <li><a href="calendar.html"{uscite_active}><i class='bx bx-calendar-star'></i> <span>Uscite</span></a></li>
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
  <main class="main-content">"""

modal_template = """
  <!-- Cinematic Modal -->
  <div class="cinematic-modal" id="cinematic-modal">
    <button class="close-modal" id="close-modal"><i class='bx bx-x'></i></button>
    <iframe id="modal-iframe" src="" frameborder="0"></iframe>
  </div>
"""

for filename, active_menu in files:
    filepath = os.path.join(base_dir, filename)
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Generate the correct sidebar block for this file
    home_active = ' class="active"' if active_menu == "Home" else ''
    serie_active = ' class="active"' if active_menu == "Serie" else ''
    film_active = ' class="active"' if active_menu == "Film" else ''
    uscite_active = ' class="active"' if active_menu == "Uscite" else ''
    
    sidebar = sidebar_template.format(
        home_active=home_active,
        serie_active=serie_active,
        film_active=film_active,
        uscite_active=uscite_active
    )
    
    if filename == "admin_users.html":
        # No mobile header for admin
        sidebar = "\n".join([line for line in sidebar.split('\n') if not ('Mobile Header' in line or '<header class="mobile-header">' in line or 'mobile-header-right' in line or 'mobile-logo' in line or 'mobile-avatar' in line or '</header>' in line)])
    
    # 1. Find and replace Navbar with new sidebar
    nav_pattern = re.compile(r'<!-- Navbar -->\s*<nav class="navbar">.*?</nav>', re.DOTALL)
    content = nav_pattern.sub(sidebar, content)
    
    # 2. Body modification for index.html
    if filename == "index.html":
        content = content.replace('<body>', '<body id="home-page">')
        
    # 3. Main wrapper closing
    # We need to wrap everything after the sidebar until just before scripts/body closing in </main>
    # The prompt says: "Add </main> before the closing </body> (but after the scripts)"
    # Wait, actually, "but after the scripts" is bad HTML semantics usually, but let's follow the prompt. Or wait, "Add </main> before the closing </body> (but after the scripts)" - let me re-read prompt.
    # Ah: "Add </main> before the closing </body> (but after the scripts)" actually wait:
    # prompt: "Add </main> before the closing </body> (but after the scripts)".
    # Let me just place it right before </body>.
    # Wait, for index.html: 
    # "Wrap all the <section> elements (from "Continua a guardare" through "Tutti i film") in a <div class="sections-wrapper">...</div>"
    # "The </main> goes after the sections-wrapper closing </div>"
    
    if filename == "index.html":
        # wrap sections
        content = re.sub(r'(<section\s+id="continue-watching-section".*?)(<script src="script\.js")', r'<div class="sections-wrapper">\n\1\n</div>\n</main>\n\2', content, flags=re.DOTALL)
    else:
        # for others, insert </main> before scripts or before </body>
        if "movie.html" in filename or "series.html" in filename or "admin_users.html" in filename:
            content = content.replace('</body>', '</main>\n</body>')
        else:
            # for catalog pages, let's insert it before script
            content = content.replace('<script src="script.js"></script>', '</main>\n<script src="script.js"></script>')
            
    # 4. Cinematic Modal
    if filename not in ["movie.html", "series.html", "admin_users.html"]:
        content = content.replace('</body>', modal_template + '\n</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Python script generated!")
