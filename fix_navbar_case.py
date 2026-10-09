import os
import re

base_dir = "/Users/niccolodebartolo/Downloads/archivio-main"
files = [
    ("calendar.html", "Uscite"),
    ("admin_users.html", None)
]

sidebar_template = """  <!-- Floating Sidebar (Desktop) -->
  <aside class="sidebar">
    <div class="sidebar-top">
      <img src="assets/unnamed.png" alt="Logo" class="sidebar-logo" onclick="window.location.href='index.html'">
    </div>
    <ul class="sidebar-links">
      <li><a href="index.html"><i class='bx bx-home-alt-2'></i> <span>Home</span></a></li>
      <li><a href="catalog_series.html"><i class='bx bx-tv'></i> <span>Serie</span></a></li>
      <li><a href="catalog_movies.html"><i class='bx bx-movie-play'></i> <span>Film</span></a></li>
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

for filename, active_menu in files:
    filepath = os.path.join(base_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "Floating Sidebar" in content:
        continue
        
    uscite_active = ' class="active"' if active_menu == "Uscite" else ''
    
    sidebar = sidebar_template.format(uscite_active=uscite_active)
    
    if filename == "admin_users.html":
        sidebar = "\n".join([line for line in sidebar.split('\n') if not ('Mobile Header' in line or '<header class="mobile-header">' in line or 'mobile-header-right' in line or 'mobile-logo' in line or 'mobile-avatar' in line or '</header>' in line)])
    
    # ignore case
    nav_pattern = re.compile(r'<!-- navbar -->\s*<nav class="navbar">.*?</nav>', re.DOTALL | re.IGNORECASE)
    content = nav_pattern.sub(sidebar, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Navbar replaced ignoring case!")
