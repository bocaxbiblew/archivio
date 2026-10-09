import os
import re

filepath = "/Users/niccolodebartolo/Downloads/archivio-main/admin_users.html"

sidebar = """  <!-- Floating Sidebar (Desktop) -->
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

  <!-- Main Content Wrapper -->
  <main class="main-content">"""

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

nav_pattern = re.compile(r'<!-- Navbar -->\s*<nav class="navbar"[^>]*>.*?</nav>', re.DOTALL | re.IGNORECASE)
content = nav_pattern.sub(sidebar, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

