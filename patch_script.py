import re

with open("script.js", "r") as f:
    content = f.read()

# 1. API_BASE
content = content.replace(
    "const API_BASE = 'https://api-archivio.duckdns.org/api';",
    "const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/api' : 'https://api-archivio.duckdns.org/api';"
)

# 2. safeSetItem
content = content.replace(
    "try { safeSetItem(key, value); }",
    "try { localStorage.setItem(key, value); }"
)

# 3. Cinematic Modal logic (inject at DOMContentLoaded)
modal_logic = """
  // --- CINEMATIC MODAL LOGIC ---
  const cinematicModal = document.getElementById('cinematic-modal');
  const modalIframe = document.getElementById('modal-iframe');
  const closeModalBtn = document.getElementById('close-modal');
  
  if (cinematicModal && modalIframe && closeModalBtn) {
    document.addEventListener('click', e => {
      // Only intercept card clicks, not sidebar/tab navigation
      const card = e.target.closest('a.card') || e.target.closest('a.episode-card');
      if (card && card.href && (card.href.includes('movie.html') || card.href.includes('series.html'))) {
        e.preventDefault();
        modalIframe.src = card.href;
        cinematicModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
    closeModalBtn.addEventListener('click', () => {
      cinematicModal.classList.remove('active');
      modalIframe.src = '';
      document.body.style.overflow = '';
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && cinematicModal.classList.contains('active')) {
        cinematicModal.classList.remove('active');
        modalIframe.src = '';
        document.body.style.overflow = '';
      }
    });
  }
  
  if (window.self !== window.top) {
    document.body.classList.add('in-iframe');
  }
"""
content = content.replace(
    "document.addEventListener('DOMContentLoaded', () => {",
    "document.addEventListener('DOMContentLoaded', () => {\n" + modal_logic
)

# 4. User Menu dropdown order and mobile position
# Find initUserMenu()
# We need to move the `avatars.forEach` after `document.body.appendChild(dropdown);`
# Actually, we can just replace the whole function. Let's do a targeted replace for safety.
dropdown_create = "const dropdown = document.createElement('div');"
content = content.replace("avatars.forEach(avatar => {", "/* avatars loop moved */ //")

# Find the place where dropdown is appended and add the loop
append_dropdown = "document.body.appendChild(dropdown);"
new_loop = """
    document.body.appendChild(dropdown);
    
    avatars.forEach(avatar => {
      if (currentUser.profile_pic) {
         avatar.src = currentUser.profile_pic;
      }
      avatar.style.cursor = 'pointer';
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = avatar.getBoundingClientRect();
        if (window.innerWidth <= 768) {
          dropdown.style.top = (rect.bottom + 10) + 'px';
          dropdown.style.right = '20px';
          dropdown.style.left = 'auto';
          dropdown.style.bottom = 'auto';
        } else {
          dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
          dropdown.style.left = (rect.right + 20) + 'px';
          dropdown.style.top = 'auto';
          dropdown.style.right = 'auto';
        }
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
    });
"""
content = content.replace(append_dropdown, new_loop)

# Also remove the old avatar.addEventListener block that we just replaced
old_listener = """      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = avatar.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + (window.scrollY || window.pageYOffset) + 10) + 'px';
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
    });"""
content = content.replace(old_listener, "/* old listener removed */")


# 5. Fix bookmark button JS to handle multiple icons
content = content.replace(
    "const bookmarkIcon = document.querySelector('.bx-bookmark');",
    "const bookmarkIcons = document.querySelectorAll('.bx-bookmark');"
)
content = content.replace(
    "const bookmarkBtn = bookmarkIcon ? bookmarkIcon.closest('button') : null;",
    "const bookmarkBtns = Array.from(bookmarkIcons).map(i => i.closest('button')).filter(Boolean);"
)
content = content.replace(
    "if (bookmarkBtn) {",
    "if (bookmarkBtns.length > 0) {"
)
content = content.replace(
    "bookmarkBtn.addEventListener('click', async () => {",
    "bookmarkBtns.forEach(btn => btn.addEventListener('click', async () => {"
)
# Fix the specific closing tags for the bookmark listener
# We replace the specific `});` that closes the bookmark click listener with `}));`
# The listener ends right before `// Gestione Menu utente` or `initUserMenu();`
bookmark_end = """        results.forEach(({ item, details }) => {
          if (details) {
            const link = item.type === 'tv' ? `series.html?id=${details.id}` : `movie.html?id=${details.id}`;
            const imgUrl = details.poster_path ? `https://image.tmdb.org/t/p/w300${details.poster_path}` : `https://placehold.co/300x450/1a1a1a/fff?text=${encodeURIComponent(details.title || details.name)}`;
            const labelText = item.type === 'tv' ? 'Serie' : 'Film';
            const card = document.createElement('a');
            card.href = link;
            card.className = 'card';
            card.innerHTML = `
              <img src="${imgUrl}" alt="${escapeHTML(details.title || details.name)}" loading="lazy">
              <div class="poster-overlay">
                <h3 class="poster-title">${escapeHTML(details.title || details.name)}</h3>
                <span class="poster-type">${labelText}</span>
              </div>
            `;
            resultsContainer.appendChild(card);
          }
        });
      });
    }"""
new_bookmark_end = bookmark_end.replace("      });\n    }", "      }));\n    }")
content = content.replace(bookmark_end, new_bookmark_end)

# Also fix the search buttons selector
content = content.replace(
    'const searchBtn = document.getElementById("open-search");',
    'const searchBtns = document.querySelectorAll("#open-search, #open-search-mobile");'
)
content = content.replace(
    'if (searchBtn) {',
    'if (searchBtns.length > 0) {'
)
content = content.replace(
    'searchBtn.addEventListener("click", () => {',
    'searchBtns.forEach(btn => btn.addEventListener("click", () => {'
)
search_end = """    closeSearchBtn.addEventListener("click", () => {
      searchOverlay.classList.remove("active");
    });
  }"""
new_search_end = search_end.replace('    });\n  }', '    }));\n  }')
content = content.replace(search_end, new_search_end)


with open("script.js", "w") as f:
    f.write(content)
