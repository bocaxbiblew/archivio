// API Backend sempre sulla VPS
const API_BASE = 'https://api-archivio.duckdns.org/api';

// --- AUTH CHECK ---
const authData = localStorage.getItem('user_auth');
if (!authData && !window.location.pathname.includes('login.html')) {
  window.location.href = 'login.html';
}
const currentUser = authData ? JSON.parse(authData) : null;

// --- SESSION VERIFICATION ---
if (currentUser && !window.location.pathname.includes('login.html')) {
  fetch(`${API_BASE}/verify-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, otp_code: currentUser.otp_code })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.valid) {
      localStorage.removeItem('user_auth');
      window.location.href = 'login.html';
    }
  })
  .catch(err => console.error("Session verification failed:", err));
}

document.addEventListener('DOMContentLoaded', () => {
  // --- UI/UX & Navbar Scroll ---
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    // Task 3: Opacizzazione su scroll per le pagine di dettaglio (series.html, movie.html)
    const heroOverlay = document.getElementById('hero-fade-overlay');
    if (heroOverlay) {
      const scrollY = window.scrollY;
      const maxScroll = 400; // Il punto in cui l'opacità diventa 1 (tutto nero)
      let opacity = scrollY / maxScroll;
      if (opacity > 1) opacity = 1;
      heroOverlay.style.background = `rgba(0, 0, 0, ${opacity})`;

      // Animazione logo su scroll (Parallax separato)
      const titleLogo = document.querySelector('.hero-content .tmdb-title-logo') || document.querySelector('.hero-content .hero-title-text');
      if (titleLogo) {
        const logoMaxScroll = 300;
        let logoProgress = scrollY / logoMaxScroll;
        if (logoProgress > 1) logoProgress = 1;
        
        const scale = 1 - (logoProgress * 0.25); // Rimpicciolisce fino al 75%
        const logoOpacity = 1 - (logoProgress * 1.5); // Svanisce prima dello sfondo
        
        titleLogo.style.transform = `translateY(${scrollY * 0.4}px) scale(${scale})`;
        titleLogo.style.opacity = logoOpacity < 0 ? 0 : logoOpacity;
        titleLogo.style.transformOrigin = 'bottom left';
      }
      if (opacity < 0) opacity = 0;
      heroOverlay.style.opacity = opacity;
    }
  });

  // --- INTERSECTION OBSERVER (Fade-In Sections) ---
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };
  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.section').forEach(section => {
    section.classList.add('fade-section');
    sectionObserver.observe(section);
  });

  const TMDB_API_KEY = '41e1844e581ce829566f0c641f9f0924';

  // --- SEARCH MODAL LOGIC (GLOBAL) ---
  function initSearch() {
    let searchOverlay = document.getElementById('search-overlay');
    
    // Inject search overlay HTML if it doesn't exist
    if (!searchOverlay) {
      searchOverlay = document.createElement('div');
      searchOverlay.className = 'search-overlay';
      searchOverlay.id = 'search-overlay';
      searchOverlay.innerHTML = `
        <div class="search-container">
          <button class="close-search" id="close-search"><i class='bx bx-x'></i></button>
          <input type="text" id="search-input" placeholder="Cerca film, serie..." autocomplete="off">
          <div class="search-results" id="search-results"></div>
        </div>
      `;
      document.body.appendChild(searchOverlay);
    }

    const searchIcon = document.querySelector('.bx-search');
    const searchBtn = searchIcon ? searchIcon.closest('button') : document.getElementById('open-search');
    const closeSearchBtn = document.getElementById('close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    let localCatalog = [];

    if (searchBtn) {
      searchBtn.addEventListener('click', async () => {
        searchOverlay.classList.add('active');
        searchInput.focus();
        try {
          const res = await fetch(`${API_BASE}/catalog/titles`);
          localCatalog = await res.json();
        } catch(e) { console.error("Errore fetch local catalog", e); }
      });
    }

    if (closeSearchBtn) {
      closeSearchBtn.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        searchResults.innerHTML = '';
      });
    }
    
    let searchTimeout;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 2) {
          searchResults.innerHTML = '';
          return;
        }
        searchTimeout = setTimeout(async () => {
          searchResults.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">Ricerca in corso...</p>';
          
          // Filtra il catalogo locale dell'utente
          const matchedItems = localCatalog.filter(c => 
             (c.title && c.title.toLowerCase().includes(query)) || 
             (c.tmdb_id && c.tmdb_id.toString() === query)
          );
          
          const uniqueIds = [...new Set(matchedItems.filter(c => c.tmdb_id).map(c => c.tmdb_id))];
          
          searchResults.innerHTML = '';
          if (uniqueIds.length === 0) {
            searchResults.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">Nessun risultato nel tuo database.</p>';
            return;
          }
          
          for (const id of uniqueIds.slice(0, 10)) {
            const itemType = matchedItems.find(c => c.tmdb_id === id).type;
            const details = await getDetails(id, itemType);
            if (details) {
              const link = itemType === 'tv' ? `series.html?id=${details.id}` : `movie.html?id=${details.id}`;
              const imgUrl = details.poster_path ? `https://image.tmdb.org/t/p/w200${details.poster_path}` : `https://placehold.co/200x300/1a1a1a/fff?text=${encodeURIComponent(details.title || details.name)}`;
              const card = document.createElement('a');
              card.href = link;
              card.className = 'card card-poster';
              card.style.width = '100%';
              card.innerHTML = `<img src="${imgUrl}" alt="${details.title || details.name}">`;
              searchResults.appendChild(card);
            }
          }
        }, 500);
      });
    }
  }

  // Eseguiamo subito il setup della search globale
  initSearch();

  // --- BOOKMARK (LA MIA LISTA) OVERLAY ---
  function initBookmarkOverlay() {
    // Crea l'overlay HTML
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'bookmark-overlay';
    overlay.innerHTML = `
      <div class="search-container" style="max-width: 700px;">
        <button class="close-search" id="close-bookmark"><i class='bx bx-x'></i></button>
        <h2 style="color:#fff; margin-bottom: 1rem; font-size: 1.5rem;">La mia lista</h2>
        <div id="bookmark-results" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-height: 70vh; overflow-y: auto; padding: 0.5rem 0;"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Trova il pulsante bookmark nella navbar
    const bookmarkIcon = document.querySelector('.bx-bookmark');
    const bookmarkBtn = bookmarkIcon ? bookmarkIcon.closest('button') : null;
    const closeBtn = document.getElementById('close-bookmark');
    const resultsContainer = document.getElementById('bookmark-results');

    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', async () => {
        overlay.classList.add('active');
        resultsContainer.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">Caricamento...</p>';
        
        const list = await getMyList();
        resultsContainer.innerHTML = '';
        
        if (list.length === 0) {
          resultsContainer.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">La tua lista è vuota. Aggiungi contenuti premendo il pulsante "+" sulla pagina di un film o serie!</p>';
          return;
        }

        for (const item of list) {
          const details = await getDetailsLite(item.tmdb_id, item.type);
          if (details) {
            const link = item.type === 'tv' ? `series.html?id=${details.id}` : `movie.html?id=${details.id}`;
            const imgUrl = details.poster_path ? `https://image.tmdb.org/t/p/w300${details.poster_path}` : `https://placehold.co/300x450/1a1a1a/fff?text=${encodeURIComponent(details.title || details.name)}`;
            const card = document.createElement('a');
            card.href = link;
            card.className = 'card card-poster';
            card.style.width = '130px';
            card.style.flexShrink = '0';
            card.style.position = 'relative';
            card.innerHTML = `
              <img src="${imgUrl}" alt="${details.title || details.name}" style="border-radius: 8px;">
              <button class="remove-bookmark-btn" data-id="${item.tmdb_id}" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:white; border:none; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; z-index:10; font-size:16px;">-</button>
            `;
            
            const removeBtn = card.querySelector('.remove-bookmark-btn');
            removeBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              e.stopPropagation();
              removeBtn.innerText = '...';
              const success = await removeFromMyList(item.tmdb_id);
              if(success) {
                card.remove();
                if(resultsContainer.children.length === 0) {
                  resultsContainer.innerHTML = '<p style="color:#aaa; text-align:center; width:100%;">La tua lista è vuota. Aggiungi contenuti premendo il pulsante "+" sulla pagina di un film o serie!</p>';
                }
              } else {
                removeBtn.innerText = '-';
              }
            });

            resultsContainer.appendChild(card);
          }
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }
  }

  initBookmarkOverlay();

  // --- DATA ---
  const mySeries = [
    "56 GIORNI", "9-1-1", "A Good Girls Guide to Murder", "A Knight of the Seven Kingdoms", "American Horror Story", "Anne Rices The Vampire Lestat", "Breaking Bad", "Bridgerton", "Buffy lammazzavampiri", "Cera una volta", "Dark", "Desperate Housewives", "Detective Hole", "Dickinson", "Dietro i suoi occhi", "Euphoria", "Fallout", "Finding Her Edge - Passione sul ghiaccio", "For All Mankind", "From", "Game of Thrones", "Gossip Girl", "Half Man", "Heated Rivalry", "Hijack", "House of Anubis", "House of the Dragon", "IT Welcome to Derry", "Il giurato", "Imperfect Women", "Industry", "Intervista col vampiro", "Intervista col vampiro di Anne Rice", "Jury Duty presenta Company Retreat", "La sua verita", "Le regole del delitto perfetto", "Love Island US", "Love Story John F Kennedy Jr and Carolyn Bessette", "Malcolm", "Margo ha problemi di soldi", "ONE PIECE", "Off Campus", "One Tree Hill", "Ovunque tu sia", "Paradise", "Percy Jackson e gli dei dellOlimpo", "Pluribus", "Pretty Little Liars", "Proud", "Raven", "Reign", "Revenge", "Rivals", "Severance", "Sex and the City", "Shameless", "Shrinking", "Skins (2007)", "Smallville", "Something Very Bad Is Going to Happen", "Spider-Noir", "Stranger Things", "Succession", "Teen Wolf", "Tell Me Lies", "The 100", "The Beauty", "The Borgias", "The Boys", "The Buccaneers", "The Great", "The Leftovers", "The Museum of Innocence", "The Night Agent", "The O C", "The OA", "The Other Bennet Sister", "The Penguin", "The Pitt", "The Testaments", "The Vampire Diaries", "Twin Peaks", "Two Years Later", "Un anno dopo laltro", "Well Be Fine", "Widows Bay", "XO, Kitty", "Young Sherlock"
  ];

  const myMovies = [
    "10 Things I Hate About You 1999", "2046 2004", "28 Years Later The Bone Temple", "Am I OK 2022", "Anyone But You 2023", "Apex 2026", "Barry Lyndon 1975", "Batman Begins 2005", "Billy Elliot 2000", "Bugonia 2025", "Cha Cha Real Smooth", "Days of Being Wild 1991", "Death of a Unicorn 2025", "Fight Club 1999", "Forbidden Fruits 2026", "Good Bye Lenin 2003", "Hamnet-Nel nome del figlio 2025", "Harry Potter and the Chamber of Secrets 2002", "Harry Potter and the Deathly Hallows Part 1 2010", "Harry Potter and the Deathly Hallows Part 2 2011", "Harry Potter and the Goblet of Fire 2005", "Harry Potter and the Half-Blood Prince 2009", "Harry Potter and the Order of the Phoenix 2007", "Harry Potter and the Philosophers Stone 2001", "Harry Potter and the Prisoner of Azkaban 2004", "How to Lose A Guy In 10 Days 2003", "Hunger Games 2012", "Hunger Games Il canto della rivolta Parte 2 2015", "Hunger Games La ballata dell usignolo e del serpente 2023", "Hunger games Il canto della rivolta parte 1 2014", "Hunger games La ragazza di fuoco 2013", "Il cielo sopra berlino 1987", "Il silenzio degli innocenti", "Interstellar 2014", "Joker 2019", "KILL BILL VOLUME 1 2003", "KILL BILL VOLUME 2 2004", "La La Land 2017", "Labyrinth (1986)", "Le Pagine Della Nostra Vita 2005", "Lilja 4-Ever 2002", "Love Me Love Me 2026", "Manchester by the Sea 2016", "Marty Supreme (2025)", "Messaggi per Isabelle 2026", "Michael 2026", "Millers Girl 2024", "Monte Carlo 2011", "Moulin Rouge 2001", "Mulholland Drive 2001", "No Other Choice 2025", "Non abbiam bisogno di parole 2026", "Obsession 2026", "Old Boy 2003", "One Battle After Another 2025", "Oppenheimer 2023", "Paris Texas 1984", "Peaky Blinders The Immortal Man 2026", "People We Meet on Vacation 2026", "Perfect Days 2023", "Perfetti sconosciuti 2016", "Piccole Donne 2020", "Project Hail Mary 2026", "Project Y 2026", "Pulp Fiction 1994", "Ready or Not 2 Here i Come 2026", "Ready or Not 2019", "Resurrection 2025", "Riley (2023)", "Ritratto della giovane in fiamme", "Sentimental Value 2025", "Shutter Island 2010", "Sinners 2025", "Sogni 1990", "Star Wars A New Hope", "Star Wars Attack of the Clones", "Star Wars Return of the Jedi", "Star Wars Revenge of the Sith", "Star Wars The Empire Strikes Back", "Star Wars The Force Awakens", "Star Wars The Last Jedi", "Star Wars The Phantom Menace", "Star Wars The Rise of Skywalker", "Superman 2025", "The Devil Wears Prada 2 2026", "The Devil Wears Prada 2006", "The Drama 2026", "The Greatest Showman 2017", "The Housemaid Una di famiglia 2026", "The Last One for the Road 2025", "The Menu (2022)", "The Substance 2024", "The Ugly Stepsister 2025", "The Sixth Sense 1999", "Tori e Lokita 2022", "Tre All Improvviso 2010", "While You Were Sleeping 1995", "Wuthering Heights 2026", "Yi Yi 2000"
  ];

  // --- API HELPERS ---
  const cache = new Map();

  async function searchTMDB(query, type) {
    let cleanQuery = query.replace(/\d{4}$/, '').trim();
    const cacheKey = `${type}-${cleanQuery}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      // Uso language=en-US qui per recuperare il poster in INGLESE come richiesto ("usa i poster più votati in inglese")
      const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanQuery)}&language=en-US`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        cache.set(cacheKey, data.results[0]);
        return data.results[0];
      }
    } catch (e) {
      console.error('Error fetching poster:', e);
    }
    return null;
  }

  // Helper per controllare se c'è un nuovo episodio (ultimi 7 giorni)
  function checkNewEpisodeBadge(data, type) {
    if (type === 'tv' && data.last_episode_to_air) {
      const airDate = new Date(data.last_episode_to_air.air_date);
      const diffTime = Date.now() - airDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays <= 7) {
        data.badge = "Nuovo Episodio";
      }
    }
    if (type === 'tv' && data.next_episode_to_air) {
      data.next_badge = "Nuovi Episodi in Arrivo";
    }
  }

  // Versione leggera per homepage/carousel: solo 1 chiamata TMDB (no metadata override)
  async function getDetailsLite(id, type) {
    const cacheKey = `lite-${type}-${id}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      // 1 chiamata TMDB in INGLESE + fetch parallela per i metadata locali per non rallentare
      const [res, metaRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=images,translations&include_image_language=en,null`),
        currentUser ? fetch(`${API_BASE}/metadata/get`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ tmdb_id: id, user_id: currentUser.id }) }).catch(() => null) : Promise.resolve(null)
      ]);
      let data = await res.json();
      
      if (metaRes && metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData && metaData.success && metaData.metadata) {
          if (metaData.metadata.poster_path) data.poster_path = metaData.metadata.poster_path;
          if (metaData.metadata.backdrop_path) data.backdrop_path = metaData.metadata.backdrop_path;
          if (metaData.metadata.logo_path) data.logo_path = metaData.metadata.logo_path;
        }
      }
      
      // Applica traduzione ITA se esiste
      if (data.translations && data.translations.translations) {
        const itTranslation = data.translations.translations.find(t => t.iso_639_1 === 'it');
        if (itTranslation && itTranslation.data) {
          if (itTranslation.data.overview) data.overview = itTranslation.data.overview;
          if (itTranslation.data.name) data.name = itTranslation.data.name;
          if (itTranslation.data.title) data.title = itTranslation.data.title;
        }
      }

      checkNewEpisodeBadge(data, type);

      cache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // Versione completa per pagine dettaglio: dettagli EN + traduzioni IT + metadata override
  async function getDetails(id, type) {
    const cacheKey = `details-${type}-${id}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
      // Recupero i dati base in INGLESE per avere sempre il poster primario in lingua originale
      const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=images&include_image_language=en,null`);
      let data = await res.json();
      
      // Recupero la traduzione italiana per la trama e il titolo
      const itRes = await fetch(`https://api.themoviedb.org/3/${type}/${id}/translations?api_key=${TMDB_API_KEY}`);
      const itData = await itRes.json();
      
      if (itData && itData.translations) {
        const itTranslation = itData.translations.find(t => t.iso_639_1 === 'it');
        if (itTranslation && itTranslation.data) {
          if (itTranslation.data.overview) data.overview = itTranslation.data.overview;
          if (itTranslation.data.name) data.name = itTranslation.data.name;
          if (itTranslation.data.title) data.title = itTranslation.data.title;
        }
      }

      // Controlla se ci sono immagini override nel database locale per questo utente
      let metaData = null;
      if (currentUser) {
        const metaRes = await fetch(`${API_BASE}/metadata/get`, {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ tmdb_id: id, user_id: currentUser.id })
        });
        metaData = await metaRes.json();
      }
      if (metaData && metaData.success && metaData.metadata) {
        if (metaData.metadata.poster_path) data.poster_path = metaData.metadata.poster_path;
        if (metaData.metadata.backdrop_path) data.backdrop_path = metaData.metadata.backdrop_path;
        if (metaData.metadata.logo_path) {
          if (!data.images) data.images = { logos: [] };
          if (!data.images.logos) data.images.logos = [];
          data.images.logos.unshift({ file_path: metaData.metadata.logo_path, iso_639_1: 'it' });
        }
      }

      checkNewEpisodeBadge(data, type);

      cache.set(cacheKey, data);
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function getLogoFromImages(images) {
    if (!images || !images.logos || images.logos.length === 0) return null;
    let logo = images.logos.find(l => l.iso_639_1 === 'it');
    if (!logo) logo = images.logos.find(l => l.iso_639_1 === 'en');
    if (!logo) logo = images.logos.find(l => l.iso_639_1 === null);
    if (!logo) logo = images.logos[0];
    return `https://image.tmdb.org/t/p/w500${logo.file_path}`;
  }

  async function getEpisodes(id, season = 1) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}&language=it-IT`);
      let data = await res.json();
      if (data.episodes) {
        // Fallback for missing Italian episode data
        const missingData = data.episodes.some(ep => !ep.overview || !ep.name);
        if (missingData) {
          const enRes = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}&language=en-US`);
          const enData = await enRes.json();
          if (enData.episodes) {
            data.episodes = data.episodes.map((ep, i) => {
              const enEp = enData.episodes[i];
              if (enEp) {
                if (!ep.overview) ep.overview = enEp.overview;
                if (!ep.name || ep.name.startsWith('Episodio')) ep.name = enEp.name;
              }
              return ep;
            });
          }
        }
      }
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  // --- MY LIST API ---
  async function getMyList() {
    if (!currentUser) return [];
    try {
      const res = await fetch(`${API_BASE}/my-list/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      return data.success ? data.list : [];
    } catch(e) { console.error(e); return []; }
  }

  async function addToMyList(tmdb_id, type) {
    if (!currentUser) return false;
    try {
      const res = await fetch(`${API_BASE}/my-list/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, tmdb_id, type })
      });
      const data = await res.json();
      return data.success;
    } catch(e) { console.error(e); return false; }
  }

  async function removeFromMyList(tmdb_id) {
    if (!currentUser) return false;
    try {
      const res = await fetch(`${API_BASE}/my-list/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, tmdb_id })
      });
      const data = await res.json();
      return data.success;
    } catch(e) { console.error(e); return false; }
  }

  // --- ROUTING LOGIC (MOLTO PIU ROBUSTA PER NEOCITIES) ---
  if (document.getElementById('catalog-grid-series')) {
    initCatalog('tv', 'catalog-grid-series');
  } else if (document.getElementById('catalog-grid-movies')) {
    initCatalog('movie', 'catalog-grid-movies');
  } else if (document.getElementById('detail-hero')) {
    // Siamo in una pagina dettagli. Controlliamo l'url per sapere se è tv o movie
    const isMovie = window.location.pathname.includes('movie');
    initDetail(isMovie ? 'movie' : 'tv');
  } else if (document.getElementById('hero-slider')) {
    // Siamo sicuramente sulla home
    initHome();
  }

  // --- HOME PAGE LOGIC ---
  async function renderMyList(filterType = null) {
    const myListSection = document.getElementById('my-list-section');
    const myListCarousel = document.getElementById('my-list-carousel');
    if (!myListSection || !myListCarousel) return;

    const list = await getMyList();
    
    let filteredList = list;
    if (filterType) {
      filteredList = list.filter(item => item.type === filterType);
    }

    if (filteredList.length > 0) {
      myListSection.style.display = 'block';
      myListCarousel.innerHTML = '';
      for (const item of filteredList) {
        const details = await getDetailsLite(item.tmdb_id, item.type);
        if (details) {
          const link = item.type === 'tv' ? `series.html?id=${details.id}` : `movie.html?id=${details.id}`;
          const imgUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=${encodeURIComponent(details.title || details.name)}`;
          
          const card = document.createElement('a');
          card.href = link;
          card.className = 'card card-poster';
          card.innerHTML = `<img src="${imgUrl}" alt="${details.title || details.name}" loading="lazy">`;
          myListCarousel.appendChild(card);
        }
      }
    } else {
      myListSection.style.display = 'none';
    }
  }

  async function initHome() {
    const CACHE_VERSION = 5; // v5: stripped objects to fit localStorage
    const CACHE_KEY = 'homePageCache_v' + CACHE_VERSION;
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore
    
    // Pulizia vecchie cache
    localStorage.removeItem('homePageCache');
    localStorage.removeItem('homePageCache_v1');
    localStorage.removeItem('homePageCache_v2');
    localStorage.removeItem('homePageCache_v3');
    localStorage.removeItem('homePageCache_v4');
    
    // Controlla se abbiamo una cache valida
    const cachedStr = localStorage.getItem(CACHE_KEY);
    if (cachedStr) {
      try {
        const cachedObj = JSON.parse(cachedStr);
        const ageMs = Date.now() - cachedObj.timestamp;
        console.log(`[HomeCache] Found cache, age: ${(ageMs / 60000).toFixed(1)} min, size: ${(cachedStr.length / 1024).toFixed(1)} KB`);
        if (ageMs < CACHE_EXPIRY) {
          const data = cachedObj.data;
          
          // Smart invalidation: check if catalog count changed (new content added/removed)
          let catalogChanged = false;
          if (cachedObj.catalogCount !== undefined) {
            try {
              const countRes = await fetch(`${API_BASE}/catalog/count`);
              const countData = await countRes.json();
              if (countData.count !== cachedObj.catalogCount) {
                console.log(`[HomeCache] Catalog changed (${cachedObj.catalogCount} → ${countData.count}) — invalidating cache`);
                catalogChanged = true;
              }
            } catch(e) { console.warn('[HomeCache] Count check failed, using cache anyway'); }
          }

          // Sanity check: se il db non era vuoto ma abbiamo salvato array vuoti per colpa di un timeout, ignoriamo la cache
          if (!catalogChanged && data.sliderTitles && data.sliderTitles.length > 0) {
            console.log('[HomeCache] Using cached data — skipping all API calls');
            document.getElementById('evidenza-carousel').innerHTML = '';
            populateCarousel('evidenza-carousel', data.evidenzaTitles, true);
            
            const top10SeriesSection = document.getElementById('top10-series-carousel')?.closest('.section');
            if (data.top10Series.length > 0) populateTop10Carousel('top10-series-carousel', data.top10Series, 'tv');
            else if (top10SeriesSection) top10SeriesSection.style.display = 'none';

            const top10MoviesSection = document.getElementById('top10-movies-carousel')?.closest('.section');
            if (data.top10Movies.length > 0) populateTop10Carousel('top10-movies-carousel', data.top10Movies, 'movie');
            else if (top10MoviesSection) top10MoviesSection.style.display = 'none';

            const allSeriesSection = document.getElementById('all-series-carousel')?.closest('.section');
            if (data.randomSeries.length > 0) populateTopRatedCarousel('all-series-carousel', data.randomSeries, 'tv', 'catalog_series.html');
            else if (allSeriesSection) allSeriesSection.style.display = 'none';

            const allMoviesSection = document.getElementById('all-movies-carousel')?.closest('.section');
            if (data.randomMovies.length > 0) populateTopRatedCarousel('all-movies-carousel', data.randomMovies, 'movie', 'catalog_movies.html');
            else if (allMoviesSection) allMoviesSection.style.display = 'none';

            await initSlider(data.sliderTitles);
            return; // Esce senza fare chiamate API
          } else if (!catalogChanged) {
            console.warn('[HomeCache] Cache had empty sliderTitles — refetching');
          }
        } else {
          console.log('[HomeCache] Cache expired — refetching');
        }
      } catch (e) { console.error("[HomeCache] Error parsing cache", e); }
    } else {
      console.log('[HomeCache] No cache found — fetching fresh data');
    }

    let allTitles = [];
    try {
      const fileRes = await fetch(`${API_BASE}/catalog/titles`);
      allTitles = await fileRes.json();
    } catch(e) { console.error("Error fetching catalog titles for home:", e); return; }

    const uniqueSeriesIds = allTitles.filter(c => c.type === 'tv' && c.tmdb_id).map(c => c.tmdb_id);
    const uniqueMoviesIds = allTitles.filter(c => c.type === 'movie' && c.tmdb_id).map(c => c.tmdb_id);
    
    const setSeries = new Set(uniqueSeriesIds);
    const setMovies = new Set(uniqueMoviesIds);

    // Show loading skeleton
    const skeletonHtml = Array(5).fill('<div class="skeleton-card"><div class="skeleton"></div></div>').join('');
    document.getElementById('evidenza-carousel').innerHTML = skeletonHtml;

    // Funzione per prendere la Top 10 basata sui Trending TMDB incrociati col proprio DB
    async function getTrendingTop10(type, localIdsSet) {
      let top10 = [];
      let addedIds = new Set();
      let page = 1;
      // Cerca nei primi 100 risultati trending (5 pagine)
      while(top10.length < 10 && page <= 5) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/trending/${type}/day?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
          const data = await res.json();
          if (!data.results || data.results.length === 0) break;
          for (const item of data.results) {
            if (localIdsSet.has(item.id) && !addedIds.has(item.id)) {
               const details = await getDetailsLite(item.id, type);
               if (details) {
                 details.type = type;
                 top10.push(details);
                 addedIds.add(item.id);
               }
            }
            if (top10.length >= 10) break;
          }
        } catch(e) { console.error(e); break; }
        page++;
      }

      // Fallback: se i trending non bastano, riempi con titoli random dal DB ordinati per rating
      if (top10.length < 10) {
        const remaining = 10 - top10.length;
        const fallbackIds = [...localIdsSet].filter(id => !addedIds.has(id)).sort(() => 0.5 - Math.random()).slice(0, remaining + 5);
        const batchSize = 3;
        let fallbackItems = [];
        for (let i = 0; i < fallbackIds.length && fallbackItems.length < remaining; i += batchSize) {
          const batch = fallbackIds.slice(i, i + batchSize);
          const results = await Promise.allSettled(batch.map(id => getDetailsLite(id, type)));
          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value && fallbackItems.length < remaining) {
              res.value.type = type;
              fallbackItems.push(res.value);
            }
          });
        }
        // Ordina per rating decrescente e aggiungi
        fallbackItems.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        top10 = [...top10, ...fallbackItems];
      }

      return top10;
    }

    const top10Series = setSeries.size > 0 ? await getTrendingTop10('tv', setSeries) : [];
    const top10Movies = setMovies.size > 0 ? await getTrendingTop10('movie', setMovies) : [];

    // Funzione per prendere N elementi random dal DB e scaricarne i dettagli (a lotti per non bloccare il mobile)
    async function getRandomDetails(idsArray, type, count) {
      const shuffled = [...idsArray].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, count);
      let items = [];
      // Batch processing per non superare i limiti di connessione paralleli (specie su Safari Mobile)
      const batchSize = 3;
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        const promises = batch.map(id => getDetailsLite(id, type));
        const results = await Promise.allSettled(promises);
        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            res.value.type = type;
            items.push(res.value);
          }
        });
      }
      return items;
    }

    // Funzione per In Evidenza: Titoli con rating più alto, filtrati dal DB
    async function getTopRatedEvidenza(type, localIdsSet, count) {
      let topItems = [];
      let page = 1;
      let addedIds = new Set();
      // Cerca nei primi 60 film/serie più votati globalmente (3 pagine — ridotto per mobile)
      while(topItems.length < count && page <= 3) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${type}/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`);
          const data = await res.json();
          if (!data.results || data.results.length === 0) break;
          for (const item of data.results) {
            if (localIdsSet.has(item.id) && !addedIds.has(item.id)) {
               const details = await getDetailsLite(item.id, type);
               if (details) {
                 details.type = type;
                 topItems.push(details);
                 addedIds.add(item.id);
               }
            }
            if (topItems.length >= count) break;
          }
        } catch(e) { console.error(e); break; }
        page++;
      }
      
      // Se non abbiamo trovato abbastanza titoli (es. l'utente non ha i classici top rated), peschiamo a caso dal suo DB e ordiniamo per rating
      if (topItems.length < count) {
        const remaining = count - topItems.length;
        // Peschiamo un campione di max 20 titoli dal DB (abbassato da 30 per mobile) non ancora aggiunti
        const sampleIds = [...localIdsSet].filter(id => !addedIds.has(id)).sort(() => 0.5 - Math.random()).slice(0, 20);
        let sampleItems = [];
        
        // Batch processing 
        const batchSize = 3;
        for (let i = 0; i < sampleIds.length; i += batchSize) {
          const batch = sampleIds.slice(i, i + batchSize);
          const promises = batch.map(id => getDetailsLite(id, type));
          const results = await Promise.allSettled(promises);
          results.forEach(res => {
            if(res.status === 'fulfilled' && res.value) {
               res.value.type = type;
               sampleItems.push(res.value);
            }
          });
        }
        
        sampleItems.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        topItems = [...topItems, ...sampleItems.slice(0, remaining)];
      }
      
      return topItems;
    }

    const evidenzaSeries = setSeries.size > 0 ? await getTopRatedEvidenza('tv', setSeries, 4) : [];
    const evidenzaMovies = setMovies.size > 0 ? await getTopRatedEvidenza('movie', setMovies, 4) : [];
    const evidenzaTitles = [...evidenzaSeries, ...evidenzaMovies].sort(() => 0.5 - Math.random());
    
    const sliderSeries = await getRandomDetails(uniqueSeriesIds, 'tv', 3);
    const sliderMovies = await getRandomDetails(uniqueMoviesIds, 'movie', 2);
    const sliderTitles = [...sliderSeries, ...sliderMovies].sort(() => 0.5 - Math.random());

    const randomSeries = await getRandomDetails(uniqueSeriesIds, 'tv', 10);
    const randomMovies = await getRandomDetails(uniqueMoviesIds, 'movie', 10);

    // Svuotiamo loading
    document.getElementById('evidenza-carousel').innerHTML = '';

    // Popoliamo le carousel
    populateCarousel('evidenza-carousel', evidenzaTitles, true);
    
    // Top 10 — show/hide sections based on results
    const top10SeriesSection = document.getElementById('top10-series-carousel')?.closest('.section');
    const top10MoviesSection = document.getElementById('top10-movies-carousel')?.closest('.section');
    
    if(top10Series.length > 0) {
      populateTop10Carousel('top10-series-carousel', top10Series, 'tv');
    } else if(top10SeriesSection) {
      top10SeriesSection.style.display = 'none';
    }
    
    if(top10Movies.length > 0) {
      populateTop10Carousel('top10-movies-carousel', top10Movies, 'movie');
    } else if(top10MoviesSection) {
      top10MoviesSection.style.display = 'none';
    }
    
    // All series/movies — show/hide sections
    const allSeriesSection = document.getElementById('all-series-carousel')?.closest('.section');
    const allMoviesSection = document.getElementById('all-movies-carousel')?.closest('.section');
    
    if(randomSeries.length > 0) {
      populateTopRatedCarousel('all-series-carousel', randomSeries, 'tv', 'catalog_series.html');
    } else if(allSeriesSection) {
      allSeriesSection.style.display = 'none';
    }
    
    if(randomMovies.length > 0) {
      populateTopRatedCarousel('all-movies-carousel', randomMovies, 'movie', 'catalog_movies.html');
    } else if(allMoviesSection) {
      allMoviesSection.style.display = 'none';
    }

    // Strip objects to only the fields needed for rendering (carousel + slider)
    // This prevents QuotaExceededError — full TMDB responses with images/translations are ~50-100KB each
    function stripForCache(item) {
      if (!item) return null;
      const stripped = {
        id: item.id,
        type: item.type,
        title: item.title,
        name: item.name,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview ? item.overview.substring(0, 200) : '',
        vote_average: item.vote_average,
        adult: item.adult,
        badge: item.badge
      };
      // Per lo slider serve anche genres e images.logos
      if (item.genres) stripped.genres = item.genres.map(g => ({ name: g.name }));
      if (item.images && item.images.logos && item.images.logos.length > 0) {
        stripped.images = { logos: item.images.logos.slice(0, 2).map(l => ({ file_path: l.file_path, iso_639_1: l.iso_639_1 })) };
      }
      return stripped;
    }

    const homeData = {
      evidenzaTitles: evidenzaTitles.map(stripForCache).filter(Boolean),
      top10Series: top10Series.map(stripForCache).filter(Boolean),
      top10Movies: top10Movies.map(stripForCache).filter(Boolean),
      randomSeries: randomSeries.map(stripForCache).filter(Boolean),
      randomMovies: randomMovies.map(stripForCache).filter(Boolean),
      sliderTitles: sliderTitles.map(stripForCache).filter(Boolean)
    };
    try {
      // Fetch current catalog count for smart invalidation on next load
      let catalogCount = null;
      try {
        const countRes = await fetch(`${API_BASE}/catalog/count`);
        const countData = await countRes.json();
        catalogCount = countData.count;
      } catch(e) { console.warn('[HomeCache] Could not fetch catalog count'); }

      const cacheStr = JSON.stringify({ timestamp: Date.now(), catalogCount, data: homeData });
      console.log(`[HomeCache] Saving cache: ${(cacheStr.length / 1024).toFixed(1)} KB, catalogCount: ${catalogCount}`);
      localStorage.setItem(CACHE_KEY, cacheStr);
      console.log('[HomeCache] Cache saved successfully');
    } catch(e) { console.error('[HomeCache] FAILED to save cache:', e); }

    await initSlider(sliderTitles);
  }

  async function initSlider(items) {
    const slider = document.getElementById('hero-slider');
    const indicatorsContainer = document.getElementById('slider-indicators');
    if (!slider) return;

    let slidesHtml = '';
    let indicatorsHtml = '';

    for (let i = 0; i < items.length; i++) {
      const details = items[i];
      if (details) {
        const bg = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : '';
        const logo = getLogoFromImages(details.images);
        const link = details.type === 'tv' ? `series.html?id=${details.id}` : `movie.html?id=${details.id}`;
        
        let titleHtml = '';
        if (logo) {
          titleHtml = `<img src="${logo}" alt="${details.title || details.name}" class="tmdb-title-logo">`;
        } else {
          titleHtml = `<h1 class="hero-title-text">${details.title || details.name}</h1>`;
        }

        slidesHtml += `
          <div class="hero-slide" style="background-image: url('${bg}');">
            <div class="hero-content">
              ${titleHtml}
              <div class="hero-meta">
                <div class="age-rating">${details.adult ? '18+' : 'T'}</div>
                <div class="hero-tags">
                  <span>${details.genres?.[0]?.name || 'Drama'}</span>
                </div>
              </div>
              <p class="hero-desc">${(details.overview || '').substring(0, 150)}...</p>
              <div class="hero-buttons">
                <a href="${link}" class="btn btn-primary" style="text-decoration:none;"><i class='bx bx-play'></i> Guarda</a>
                <button class="btn btn-secondary slider-add-btn" data-id="${details.id}" data-type="${details.type}"><i class='bx bx-plus'></i></button>
              </div>
            </div>
          </div>
        `;
        indicatorsHtml += `<div class="indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`;
      }
    }

    slider.innerHTML = slidesHtml;
    indicatorsContainer.innerHTML = indicatorsHtml;

    let currentIndex = 0;
    const slides = slider.querySelectorAll('.hero-slide');
    const indicators = indicatorsContainer.querySelectorAll('.indicator');
    
    if(slides.length === 0) return;

    function goToSlide(index) {
      if (index === currentIndex) return;
      slider.style.transform = `translateX(-${index * 100}%)`;
      indicators.forEach(ind => ind.classList.remove('active'));
      if(indicators[index]) indicators[index].classList.add('active');
      currentIndex = index;
    }

    indicators.forEach(ind => {
      ind.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        goToSlide(index);
      });
    });

    let autoSlideInterval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      goToSlide(nextIndex);
    }, 5000);

    // Setup add-to-list buttons in slider
    if (currentUser) {
      try {
        const userList = await getMyList();
        const addBtns = slider.querySelectorAll('.slider-add-btn');
        addBtns.forEach(btn => {
          const tmdbId = btn.getAttribute('data-id');
          const type = btn.getAttribute('data-type');
          const icon = btn.querySelector('i');
          
          let isInList = userList.some(i => i.tmdb_id == tmdbId);
          if (isInList) icon.className = 'bx bx-check';
          else icon.className = 'bx bx-plus';

          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.style.transform = 'scale(0.85)';
            setTimeout(() => { btn.style.transform = ''; }, 200);
            
            if (isInList) {
              if (await removeFromMyList(tmdbId)) {
                isInList = false;
                icon.className = 'bx bx-plus';
              }
            } else {
              if (await addToMyList(tmdbId, type)) {
                isInList = true;
                icon.className = 'bx bx-check';
              }
            }
          });
        });
      } catch(e) { console.error('Slider list init error:', e); }
    }

    // Animazione di slide "seguendo il mouse"
    const sliderContainer = document.querySelector('.hero-slider-container');
    if (sliderContainer) {
      sliderContainer.addEventListener('mousemove', (e) => {
        const rect = sliderContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const segment = rect.width / slides.length;
        let hoverIndex = Math.floor(x / segment);
        if (hoverIndex < 0) hoverIndex = 0;
        if (hoverIndex >= slides.length) hoverIndex = slides.length - 1;
        
        if (hoverIndex !== currentIndex) {
          goToSlide(hoverIndex);
          clearInterval(autoSlideInterval);
          autoSlideInterval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % slides.length;
            goToSlide(nextIndex);
          }, 5000);
        }
      });
    }
  }

  async function populateCarousel(containerId, items, mixed = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (const tmdbData of items) {
      if (tmdbData) {
        const type = tmdbData.type || 'tv';
        const title = tmdbData.name || tmdbData.title;
        const link = type === 'tv' ? `series.html?id=${tmdbData.id}` : `movie.html?id=${tmdbData.id}`;
        const imgUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=${encodeURIComponent(title)}`;
        const badgeHtml = tmdbData.badge ? `<div class="card-badge">${tmdbData.badge}</div>` : '';
        
        const card = document.createElement('a');
        card.href = link;
        card.className = 'card card-poster';
        card.innerHTML = `${badgeHtml}<img src="${imgUrl}" alt="${title}" loading="lazy">`;
        container.appendChild(card);
      }
    }
  }

  async function populateTop10Carousel(containerId, items, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let tmdbData, title;
      if (typeof item === 'string') {
        title = item;
        tmdbData = await searchTMDB(title, type);
      } else {
        tmdbData = item;
        title = item.name || item.title;
      }
      
      if (tmdbData) {
        const link = type === 'tv' ? `series.html?id=${tmdbData.id}` : `movie.html?id=${tmdbData.id}`;
        const imgUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=${encodeURIComponent(title)}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'top10-card-wrapper';
        wrapper.innerHTML = `
          <span class="top10-number">${i + 1}</span>
          <a href="${link}" class="card card-poster">
            <img src="${imgUrl}" alt="${title}" loading="lazy">
          </a>
        `;
        container.appendChild(wrapper);
      }
    }
  }

  async function populateTopRatedCarousel(containerId, items, type, viewAllLink = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (const item of items) {
      let tmdbData, title;
      if (typeof item === 'string') {
        title = item;
        tmdbData = await searchTMDB(title, type);
      } else {
        tmdbData = item;
        title = item.name || item.title;
      }
      if (tmdbData) {
        const link = type === 'tv' ? `series.html?id=${tmdbData.id}` : `movie.html?id=${tmdbData.id}`;
        const imgUrl = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=${encodeURIComponent(title)}`;
        
        const card = document.createElement('a');
        card.href = link;
        card.className = 'card card-poster';
        card.innerHTML = `<img src="${imgUrl}" alt="${title}" loading="lazy">`;
        container.appendChild(card);
      }
    }
    
    if (viewAllLink) {
        const card = document.createElement('a');
        card.href = viewAllLink;
        card.className = 'card card-poster view-all-card';
        card.innerHTML = `
          <div class="view-all-content">
            <i class='bx bx-right-arrow-circle'></i>
            <span>Vedi tutti</span>
          </div>
        `;
        container.appendChild(card);
    }
  }
  // --- CATALOG PAGE LOGIC ---
  async function initCatalog(type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const renderGrid = (items) => {
      container.innerHTML = '';
      items.forEach(data => {
        const link = type === 'tv' ? `series.html?id=${data.id}` : `movie.html?id=${data.id}`;
        const imgUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=No+Poster`;
        
        const card = document.createElement('a');
        card.href = link;
        card.className = 'card card-poster';
        card.innerHTML = `<img src="${imgUrl}" alt="${data.name || data.title}" loading="lazy">`;
        container.appendChild(card);
      });
    };

    // Load from remote DB backend
    try {
      container.innerHTML = '';
      
      const fileRes = await fetch(`${API_BASE}/catalog/titles`);
      const allTitles = await fileRes.json();
      
      const uniqueTmdbIds = allTitles.filter(c => c.type === type && c.tmdb_id).map(c => c.tmdb_id);
      if (uniqueTmdbIds.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Nessun titolo trovato nel catalogo.</p>';
        return;
      }
      
      let currentIndex = 0;
      const CHUNK_SIZE = 15;
      let isLoading = false;
      
      // Loading sentinel
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'grid-column: 1/-1; text-align: center; padding: 2rem; color: #aaa;';
      sentinel.innerHTML = 'Caricamento...';
      
      const loadNextChunk = async () => {
        if (isLoading || currentIndex >= uniqueTmdbIds.length) return;
        isLoading = true;
        
        const chunk = uniqueTmdbIds.slice(currentIndex, currentIndex + CHUNK_SIZE);
        currentIndex += CHUNK_SIZE;
        
        const promises = chunk.map(id => getDetails(id, type));
        const results = await Promise.allSettled(promises);
        
        const validItems = [];
        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) validItems.push(res.value);
        });
        
        // Remove sentinel before appending new items
        if (sentinel.parentNode === container) container.removeChild(sentinel);
        
        validItems.forEach(data => {
          const link = type === 'tv' ? `series.html?id=${data.id}` : `movie.html?id=${data.id}`;
          const imgUrl = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : `https://placehold.co/400x600/1a1a1a/fff?text=No+Poster`;
          
          const card = document.createElement('a');
          card.href = link;
          card.className = 'card card-poster';
          card.innerHTML = `<img src="${imgUrl}" alt="${data.name || data.title}" loading="lazy">`;
          container.appendChild(card);
        });
        
        // Re-append sentinel if more items remain
        if (currentIndex < uniqueTmdbIds.length) {
          container.appendChild(sentinel);
        }
        
        isLoading = false;
      };
      
      // Setup IntersectionObserver
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadNextChunk();
        }
      }, { rootMargin: '200px' });
      
      container.appendChild(sentinel);
      observer.observe(sentinel);
      
    } catch (e) {
      console.error('Error loading remote catalog:', e);
      container.innerHTML = '<h2 style="grid-column: 1/-1; text-align: center; color: red;">Errore nel caricamento del catalogo remoto. Backend offline?</h2>';
    }
  }

  // --- DETAIL PAGE LOGIC ---
  async function initDetail(type) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
      document.getElementById('detail-title').innerText = "Titolo non trovato";
      return;
    }

    // Clean up temporary loading text to avoid flicker
    document.getElementById('detail-title').innerText = '';
    
    const data = await getDetails(id, type);
    if (!data) return;

    // Fetch available links from our remote database (usando il nuovo endpoint di ricerca per bypassare il limite di 1000)
    let availableLinks = [];
    try {
      const cleanTitle = (data.title || data.name).replace(/[\.\_]/g, ' ').trim();
      const res = await fetch(`${API_BASE}/search-catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: id, title: cleanTitle })
      });
      const searchedCatalog = await res.json();
      
      // Filtro di sicurezza sul frontend: controlliamo ID esatto, o titolo esatto (rimuovendo punteggiatura e spazi per evitare mismatch scemi come "The O.C." vs "The O C")
      availableLinks = searchedCatalog.filter(item => {
        if (item.tmdb_id == id) return true;
        const dbTitleClean = item.title.toLowerCase().replace(/[\W_]+/g, '');
        const tmdbTitleClean = cleanTitle.toLowerCase().replace(/[\W_]+/g, '');
        return dbTitleClean === tmdbTitleClean;
      });
    } catch(e) { console.error('Failed to load links from backend:', e); }

    // Background
    if (data.backdrop_path) {
      document.getElementById('detail-hero').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${data.backdrop_path})`;
    } else {
      document.getElementById('detail-hero').style.background = '#1a1a1a';
    }

    // Logo or Title
    const logoUrl = getLogoFromImages(data.images);
    const titleEl = document.getElementById('detail-title');
    if (logoUrl) {
      titleEl.outerHTML = `<img src="${logoUrl}" alt="${data.title || data.name}" class="tmdb-title-logo" id="detail-title">`;
    } else {
      titleEl.innerText = data.title || data.name;
    }

    document.getElementById('detail-desc').innerHTML = data.overview || "Nessuna descrizione disponibile.";
    
    // Meta (Age, Year, Genres, Duration)
    const year = type === 'tv' ? (data.first_air_date ? data.first_air_date.substring(0,4) : '') : (data.release_date ? data.release_date.substring(0,4) : '');
    const genres = data.genres.map(g => g.name).join(', ');
    
    // Fetch global metadata for quality badge
    let qualityBadge = type === 'tv' ? 'FHD' : '4K / FHD';
    try {
      const gRes = await fetch(`${API_BASE}/global_metadata/get`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tmdb_id: id })
      });
      const gData = await gRes.json();
      if (gData.success && gData.metadata && gData.metadata.quality_badge) {
        qualityBadge = gData.metadata.quality_badge;
      }
    } catch(e) { console.error('Errore global metadata:', e); }

    let editBadgeHtml = '';
    if (currentUser && (currentUser.telegram_id === '919091829' || currentUser.telegram_id === 919091829)) {
      editBadgeHtml = `<i class='bx bx-pencil' id="edit-quality-btn" style="cursor:pointer; margin-left:5px; color:#f5c518;" title="Modifica Qualità Globale"></i>`;
    }

    let newEpisodesBadge = '';
    if (type === 'tv' && data.next_episode_to_air) {
      newEpisodesBadge = `<div style="display:inline-block; margin-left:10px; background:#4CAF50; color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; letter-spacing:0.5px; border:1px solid rgba(255,255,255,0.2);">Nuovi Episodi in Arrivo</div>`;
    }

    let metaHtml = `
      <div class="age-rating">${data.adult ? '18+' : 'T'}</div>
      <div class="hero-tags">
        <span>${year}</span>
        ${data.number_of_seasons ? `<span>${data.number_of_seasons} Stagion${data.number_of_seasons > 1 ? 'i' : 'e'}</span>` : ''}
        ${data.runtime ? `<span>${data.runtime} min</span>` : ''}
        <span style="border: 1px solid rgba(255,255,255,0.3); padding: 0 4px; border-radius: 2px;" id="quality-badge-display">${qualityBadge}</span>${editBadgeHtml}
        <span><i class="bx bxs-star" style="color: #f5c518;"></i> ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</span>
        ${newEpisodesBadge}
      </div>
    `;
    const metaContainer = document.getElementById('detail-meta');
    if (metaContainer) metaContainer.innerHTML = metaHtml;
    
    // Aggiungi listener per edit qualità se admin
    const editQualityBtn = document.getElementById('edit-quality-btn');
    if (editQualityBtn) {
      editQualityBtn.addEventListener('click', async () => {
        const newBadge = prompt("Inserisci la nuova dicitura per la qualità (es. '4K HDR', 'HD'):", qualityBadge);
        if (newBadge !== null && newBadge.trim() !== "") {
          try {
            const res = await fetch(`${API_BASE}/admin/metadata/update`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, otp_code: currentUser.otp_code, tmdb_id: id, quality_badge: newBadge.trim() })
            });
            const updateData = await res.json();
            if (updateData.success) {
              document.getElementById('quality-badge-display').innerText = newBadge.trim();
              alert("Qualità globale aggiornata con successo per tutti gli utenti!");
            } else {
              alert("Errore: " + updateData.error);
            }
          } catch(e) {
            alert("Errore di rete");
          }
        }
      });
    }

    const subtitleContainer = document.getElementById('detail-subtitle');
    if (subtitleContainer) subtitleContainer.remove(); // pulizia del vecchio ID se rimasto

    // Only for Series: Fetch Episodes for Season 1
    if (type === 'tv') {
      async function renderEpisodes(seasonNumber) {
        const episodesData = await getEpisodes(id, seasonNumber);
        const epContainer = document.getElementById('episodes-container');
        if (!epContainer) return;
        epContainer.innerHTML = '';
        
        let watchedList = [];
        if (currentUser) {
          try {
            const res = await fetch(`${API_BASE}/episodes/watched/get`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ user_id: currentUser.id, tmdb_id: id })
            });
            const d = await res.json();
            if (d.success) watchedList = d.watched;
          } catch(e) {}
        }

        if (episodesData && episodesData.episodes) {
          episodesData.episodes.forEach(ep => {
            const epImg = ep.still_path ? `https://image.tmdb.org/t/p/original${ep.still_path}` : `https://placehold.co/400x225/1a1a1a/fff?text=Episodio+${ep.episode_number}`;
            const isWatched = watchedList.some(w => w.season_number === seasonNumber && w.episode_number === ep.episode_number);
            
            const card = document.createElement('div');
            card.className = 'episode-card';
            card.innerHTML = `
              <div class="episode-img-wrapper" style="position: relative;">
                <img src="${epImg}" alt="${ep.name}" loading="lazy">
                <div class="play-icon"><i class='bx bx-play'></i></div>
              </div>
              <div class="episode-card-body">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                  <div class="episode-title" style="margin-bottom:0; padding-right:10px;">E${ep.episode_number}: ${ep.name}</div>
                  <div class="watched-toggle" data-season="${seasonNumber}" data-episode="${ep.episode_number}" style="font-size: 24px; color: ${isWatched ? '#4CAF50' : 'rgba(255,255,255,0.4)'}; cursor: pointer; transition: color 0.2s; display:flex; align-items:center;" title="${isWatched ? 'Segna come da vedere' : 'Segna come visto'}">
                    <i class='bx bxs-check-circle'></i>
                  </div>
                </div>
                <div class="episode-meta" style="gap: 5px;">
                  <span>${ep.runtime ? ep.runtime + ' min' : 'TBA'}</span>
                  ${ep.air_date ? `<span>&bull;</span><span>${ep.air_date.substring(0,4)}</span>` : ''}
                  ${ep.vote_average > 0 ? `<span>&bull;</span><span><i class='bx bxs-star' style='color:#f5c518'></i> ${ep.vote_average.toFixed(1)}</span>` : ''}
                </div>
                <div class="episode-desc">${ep.overview || ''}</div>
              </div>
            `;
            
            // Trova se abbiamo il link nel nostro DB per questa stagione/episodio
            const linkData = availableLinks.find(l => l.season === seasonNumber && l.episode === ep.episode_number);
            const imgWrapper = card.querySelector('.episode-img-wrapper');
            
            if (linkData) {
              imgWrapper.style.cursor = 'pointer';
              imgWrapper.addEventListener('click', () => {
                if(!currentUser) return alert('Devi effettuare il login!');
                
                // 1. Sincrono: Copia del link per non essere bloccati da Safari iOS
                const linkToCopy = linkData.vlc_link;
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(linkToCopy).catch(err => {
                       const tempInput = document.createElement("input");
                       tempInput.value = linkToCopy;
                       document.body.appendChild(tempInput);
                       tempInput.select();
                       document.execCommand("copy");
                       document.body.removeChild(tempInput);
                    });
                  } else {
                    const tempInput = document.createElement("input");
                    tempInput.value = linkToCopy;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempInput);
                  }
                  showToast("✅ Link copiato! Incollalo su VLC per riprodurlo.");
                } catch(e) {
                  showToast("❌ Errore durante la copia.");
                }

                // 2. Asincrono: Log dell'attività sul server
                fetch(`${API_BASE}/get-link`, {
                  method: 'POST',
                  headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, catalog_id: linkData.id, otp_code: currentUser.otp_code })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.error === 'UNAUTHORIZED') {
                    localStorage.removeItem('user_auth');
                    window.location.href = 'login.html';
                  }
                })
                .catch(e => console.error("Errore log attività:", e));
              });
            } else {
              imgWrapper.style.opacity = '0.4';
              imgWrapper.title = "Link non ancora caricato sul database";
            }
            
            const watchToggle = card.querySelector('.watched-toggle');
            watchToggle.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!currentUser) return alert('Devi effettuare il login per segnare gli episodi visti!');
              
              watchToggle.style.opacity = '0.5';
              try {
                const res = await fetch(`${API_BASE}/episodes/watched/toggle`, {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ user_id: currentUser.id, tmdb_id: id, season_number: seasonNumber, episode_number: ep.episode_number })
                });
                const d = await res.json();
                if (d.success) {
                  watchToggle.style.color = d.watched ? '#4CAF50' : 'rgba(255,255,255,0.4)';
                  if (d.watched) {
                    watchToggle.classList.add('animate');
                    setTimeout(() => watchToggle.classList.remove('animate'), 400);
                  }
                }
              } catch(err) {
                console.error(err);
              }
              watchToggle.style.opacity = '1';
            });
            
            epContainer.appendChild(card);
          });
        }
      }

      await renderEpisodes(1);

      const seasonSelect = document.getElementById('season-select');
      
      if (seasonSelect) {
        if (data.seasons && data.seasons.length > 0) {
          seasonSelect.innerHTML = '';
          data.seasons.forEach(s => {
            if(s.season_number > 0) {
              const option = document.createElement('option');
              option.value = s.season_number;
              option.innerText = `Stagione ${s.season_number}`;
              seasonSelect.appendChild(option);
            }
          });
        }

        seasonSelect.addEventListener('change', async (e) => {
          await renderEpisodes(e.target.value);
        });
      }
    } // FINE BLOCCO if (type === 'tv')

    // Movie Watched Logic
    if (type === 'movie') {
      const movieWatchBtn = document.getElementById('movie-watched-btn');
      if (movieWatchBtn) {
        let isMovieWatched = false;
        if (currentUser) {
          try {
            const res = await fetch(`${API_BASE}/episodes/watched/get`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, tmdb_id: id })
            });
            const d = await res.json();
            if (d.success) {
              isMovieWatched = d.watched.some(w => w.season_number === 0 && w.episode_number === 0);
            }
          } catch(e) {}
        }
        
        const updateMovieWatchUI = () => {
          const icon = movieWatchBtn.querySelector('i');
          const span = movieWatchBtn.querySelector('span');
          if (isMovieWatched) {
            icon.className = 'bx bxs-check-circle';
            icon.style.color = '#4CAF50';
            span.innerText = 'Visto';
          } else {
            icon.className = 'bx bx-hide';
            icon.style.color = '';
            span.innerText = 'Visto';
          }
        };
        updateMovieWatchUI();

        movieWatchBtn.addEventListener('click', async () => {
          if (!currentUser) return alert('Devi effettuare il login per segnare i film visti!');
          movieWatchBtn.style.opacity = '0.5';
          try {
            const res = await fetch(`${API_BASE}/episodes/watched/toggle`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, tmdb_id: id, season_number: 0, episode_number: 0 })
            });
            const data = await res.json();
            if (data.success) {
              isMovieWatched = data.watched;
              updateMovieWatchUI();
            }
          } catch(e) {
            console.error('Errore watch toggle movie:', e);
          }
          movieWatchBtn.style.opacity = '1';
        });
      }
    }



    // My List Button Logic
    const myListBtn = document.querySelector('.btn-action-group .action-btn:nth-child(1)');
    if (myListBtn) {
      const icon = myListBtn.querySelector('i');
      const span = myListBtn.querySelector('span');
      
      let isInList = false;
      const userList = await getMyList();
      if (userList.some(i => i.tmdb_id == id)) {
        isInList = true;
        icon.className = 'bx bx-check';
        span.innerText = 'Nella mia lista';
      } else {
        isInList = false;
        icon.className = 'bx bx-plus';
        span.innerText = 'La mia lista';
      }

      myListBtn.addEventListener('click', async () => {
        if (!currentUser) return alert('Devi effettuare il login!');
        myListBtn.style.opacity = '0.5';
        if (isInList) {
          const success = await removeFromMyList(id);
          if (success) {
            isInList = false;
            icon.className = 'bx bx-plus';
            span.innerText = 'La mia lista';
          }
        } else {
          const success = await addToMyList(id, type);
          if (success) {
            isInList = true;
            icon.className = 'bx bx-check';
            span.innerText = 'Nella mia lista';
          }
        }
        myListBtn.style.opacity = '1';
      });
    }

    // Rating Button Logic
    const ratingBtn = document.querySelector('.btn-action-group .action-btn:nth-child(2)');
    if (ratingBtn) {
      let currentRating = 0;
      if (currentUser) {
        try {
          const res = await fetch(`${API_BASE}/ratings/get`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: currentUser.id, tmdb_id: id })
          });
          const rData = await res.json();
          if (rData.success && rData.rating) currentRating = rData.rating;
        } catch(e) {}
      }

      ratingBtn.addEventListener('click', () => {
        if (!currentUser) return alert('Devi effettuare il login per valutare!');
        openRatingModal(id, type, currentRating, ratingBtn, (newVal) => {
          currentRating = newVal;
        });
      });
    }

    // Task 4: Condivisione
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const shareData = {
          title: document.title,
          url: window.location.href
        };
        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch(err) { console.log('Error sharing:', err); }
        } else {
          try {
            await navigator.clipboard.writeText(window.location.href);
            alert("Link copiato negli appunti!");
          } catch(err) {}
        }
      });
    }
    
    // Bind main play button
    const mainPlayBtn = document.getElementById('main-play-btn');
    if (mainPlayBtn) {
      let mainLinkData = null;
      if (type === 'movie') {
        mainLinkData = availableLinks.find(l => l.type === 'movie');
      } else {
        mainLinkData = availableLinks.find(l => l.season === 1 && l.episode === 1);
      }

      if (mainLinkData) {
        mainPlayBtn.addEventListener('click', () => {
          if(!currentUser) return alert('Devi effettuare il login!');
          
          // 1. Sincrono: Copia del link per non essere bloccati da Safari iOS
          const linkToCopy = mainLinkData.vlc_link;
          try {
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(linkToCopy).catch(err => {
                 const tempInput = document.createElement("input");
                 tempInput.value = linkToCopy;
                 document.body.appendChild(tempInput);
                 tempInput.select();
                 document.execCommand("copy");
                 document.body.removeChild(tempInput);
              });
            } else {
              const tempInput = document.createElement("input");
              tempInput.value = linkToCopy;
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand("copy");
              document.body.removeChild(tempInput);
            }
            showToast("✅ Link copiato! Incollalo su VLC per riprodurlo.");
          } catch(e) {
            showToast("❌ Errore durante la copia.");
          }

          // 2. Asincrono: Log dell'attività
          fetch(`${API_BASE}/get-link`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, catalog_id: mainLinkData.id, otp_code: currentUser.otp_code })
          })
          .then(res => res.json())
          .then(data => {
            if (data.error === 'UNAUTHORIZED') {
              localStorage.removeItem('user_auth');
              window.location.href = 'login.html';
            }
          })
          .catch(e => console.error("Errore log attività:", e));
        });
      } else {
        mainPlayBtn.style.opacity = '0.5';
        mainPlayBtn.title = 'Link non disponibile';
        mainPlayBtn.addEventListener('click', () => alert("Questo contenuto non è ancora disponibile nel database."));
      }
    }

    // Gallery button logic
    const galleryBtn = document.getElementById('open-gallery-btn');
    if (galleryBtn) {
      galleryBtn.addEventListener('click', () => {
        if (!currentUser) return alert('Devi effettuare il login!');
        openImageGalleryModal(id, type);
      });
    }

    // Add loaded class to fade in content
    const detailHero = document.getElementById('detail-hero');
    if (detailHero) detailHero.classList.add('loaded');
  }

  // --- TOAST NOTIFICATION ---
  window.showToast = function(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // --- CALENDAR ---
  window.initCalendar = async function() {
    const loading = document.getElementById('loading-calendar');
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    try {
      const res = await fetch(`${API_BASE}/calendar`);
      const data = await res.json();

      loading.style.display = 'none';

      if (!data.success || !data.calendar || data.calendar.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:#aaa; grid-column:1/-1;">Nessuna prossima uscita programmata trovata per le tue serie.</p>';
        return;
      }

      data.calendar.forEach(ep => {
        // Format date
        const dateObj = new Date(ep.air_date + "T12:00:00Z"); // Set to midday to avoid timezone shifts
        const dateStr = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
        
        // Formatta quanti giorni mancano
        const diffTime = dateObj - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let badgeText = '';
        if (diffDays === 0) badgeText = 'Oggi';
        else if (diffDays === 1) badgeText = 'Domani';
        else badgeText = `Tra ${diffDays} giorni`;

        const imgUrl = ep.poster_path ? `https://image.tmdb.org/t/p/w200${ep.poster_path}` : `https://placehold.co/75x75/1a1a1a/fff?text=EP`;

        // Format short date like "venerdì · 23:00" or "lug 20 · 2:00"
        const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' });
        const shortDate = diffDays <= 6 ? dayName : dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });

        const card = document.createElement('a');
        card.className = 'calendar-card';
        card.href = `series.html?id=${ep.tmdb_id}`;
        card.innerHTML = `
          <img class="cal-poster" src="${imgUrl}" alt="${ep.series_title}">
          <div class="cal-info">
            <div class="cal-series-title">${ep.series_title}</div>
            <div class="cal-ep-title">S${ep.season_number} E${ep.episode_number}: ${ep.episode_title}</div>
            <div class="cal-ep-meta">${shortDate}</div>
          </div>
          <i class='bx bxs-bell cal-bell'></i>
        `;
        grid.appendChild(card);
      });

    } catch(e) {
      console.error(e);
      loading.innerHTML = '<span style="color:#ff4444;">Errore durante il caricamento del calendario. Riprova più tardi.</span>';
    }
  };

  // --- USER MENU ---
  function initUserMenu() {
    const avatars = document.querySelectorAll('.profile-avatar');
    if (!avatars.length || !currentUser) return;

    avatars.forEach(avatar => {
      if (currentUser.profile_pic) {
         avatar.src = currentUser.profile_pic;
      }
    });

    const dropdown = document.createElement('div');
    dropdown.id = 'user-dropdown-menu';
    dropdown.style.cssText = `
      display: none;
      position: absolute;
      right: 20px;
      top: 70px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 10px;
      z-index: 1000;
      min-width: 200px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.8);
    `;
    dropdown.innerHTML = `
      <div style="padding: 10px; border-bottom: 1px solid #333; margin-bottom: 5px;">
        <p style="margin:0; font-weight:bold; color:white;">ID Telegram</p>
        <p style="margin:0; font-size:0.8rem; color:#aaa;">${currentUser.telegram_id || 'Sconosciuto'}</p>
      </div>
      <div style="padding: 10px; border-bottom: 1px solid #333; margin-bottom: 5px;">
        <input type="text" id="profile-name-input" placeholder="Il tuo Nome" value="${currentUser.username || ''}" style="width:100%; padding:8px; background:#2a2a2a; color:white; border:none; border-radius:4px;">
        <button id="save-profile-btn" style="width:100%; padding:5px; margin-top:5px; background:white; color:black; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Salva Profilo</button>
      </div>
      <div id="user-stats-container" style="padding: 10px; border-bottom: 1px solid #333; margin-bottom: 5px; font-size: 0.85rem; color: #ccc;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span><i class='bx bx-tv'></i> Serie in DB:</span> <span id="stat-series" style="color:white; font-weight:bold;">...</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span><i class='bx bx-camera-movie'></i> Film in DB:</span> <span id="stat-movies" style="color:white; font-weight:bold;">...</span></div>
        <div style="display:flex; justify-content:space-between;"><span><i class='bx bx-list-plus'></i> La mia lista:</span> <span id="stat-list" style="color:white; font-weight:bold;">...</span></div>
      </div>
      ${currentUser.telegram_id === '919091829' || currentUser.telegram_id === 919091829 ? `
      <div id="admin-users-btn" style="padding: 10px; color:#f5c518; cursor:pointer; font-size:0.9rem; font-weight:bold; transition: background 0.2s; border-radius:4px; margin-bottom: 5px;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
        <i class='bx bx-crown'></i> Gestione Admin (Utenti)
      </div>
      ` : ''}
      <label style="display:block; padding: 10px; color:white; cursor:pointer; font-size:0.9rem; transition: background 0.2s; border-radius:4px;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
        <i class='bx bx-camera'></i> Cambia immagine
        <input type="file" id="profile-pic-upload" accept="image/*" style="display:none;">
      </label>
      <div style="padding: 10px; color:#ff4444; cursor:pointer; font-size:0.9rem; border-top: 1px solid #333; margin-top: 5px; transition: background 0.2s; border-radius:4px;" id="logout-btn" onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'">
        <i class='bx bx-log-out'></i> Esci dall'account
      </div>
    `;
    document.body.appendChild(dropdown);

    // Fetch stats
    fetch(`${API_BASE}/user/stats`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ user_id: currentUser.id })
    }).then(res => res.json()).then(data => {
      if (data.success && data.stats) {
        document.getElementById('stat-series').innerText = data.stats.series;
        document.getElementById('stat-movies').innerText = data.stats.movies;
        document.getElementById('stat-list').innerText = data.stats.list;
      }
    }).catch(e => console.error('Errore stats:', e));

    avatars.forEach(avatar => {
      avatar.style.cursor = 'pointer';
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = avatar.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + window.scrollY + 10) + 'px';
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      });
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Profilo
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', async () => {
        const dName = document.getElementById('profile-name-input').value;
        saveProfileBtn.innerText = 'Salvataggio...';
        try {
          const res = await fetch(`${API_BASE}/user/profile/update`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, username: dName })
          });
          const data = await res.json();
          if (data.success) {
            saveProfileBtn.innerText = 'Salvato!';
            saveProfileBtn.style.background = '#4CAF50';
            saveProfileBtn.style.color = 'white';
            currentUser.username = dName;
            localStorage.setItem('user_auth', JSON.stringify(currentUser));
            setTimeout(() => {
              saveProfileBtn.innerText = 'Salva Profilo';
              saveProfileBtn.style.background = 'white';
              saveProfileBtn.style.color = 'black';
            }, 2000);
          } else {
            saveProfileBtn.innerText = 'Errore';
            setTimeout(() => saveProfileBtn.innerText = 'Salva Profilo', 2000);
          }
        } catch(e) { 
          console.error(e); 
          saveProfileBtn.innerText = 'Errore di rete';
          setTimeout(() => saveProfileBtn.innerText = 'Salva Profilo', 2000);
        }
      });
    }

    // Admin UI
    const adminBtn = document.getElementById('admin-users-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', async () => {
        adminBtn.innerText = 'Caricamento...';
        try {
          const res = await fetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, otp_code: currentUser.otp_code })
          });
          const data = await res.json();
          adminBtn.innerHTML = "<i class='bx bx-crown'></i> Gestione Admin (Utenti)";
          
          if (data.success) {
            // Mostra modale admin
            let adminOverlay = document.getElementById('admin-modal');
            if (!adminOverlay) {
              adminOverlay = document.createElement('div');
              adminOverlay.id = 'admin-modal';
              adminOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; justify-content:center; align-items:center;';
              document.body.appendChild(adminOverlay);
            }
            
            let activeHtml = data.active.map(u => `<div style="padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between;"><span>${u.username || 'Senza nome'} (ID: ${u.id})</span> <span style="color:#4CAF50;">● Online</span></div>`).join('');
            
            let statsHtml = `
              <div style="display:flex; justify-content:space-around; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; margin-bottom:20px;">
                <div style="text-align:center;">
                  <div style="font-size:2rem; font-weight:800; color:#fff;">${data.users_24h || 0}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Utenti (24h)</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:2rem; font-weight:800; color:#e50914;">${data.vlc_requests_24h || 0}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Link VLC (24h)</div>
                </div>
              </div>
            `;

            let allHtml = data.all.map(u => {
              const statusHtml = u.otp_code 
                ? `<button class="admin-logout-btn" data-id="${u.id}" style="background:#d32f2f; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; gap:5px;"><i class='bx bx-exit'></i> Scollega</button>`
                : `<span style="color:#e65100; font-size:0.8rem; font-weight:bold; background:rgba(230,81,0,0.1); padding:4px 8px; border-radius:4px;"><i class='bx bx-error-circle'></i> Disconnesso</span>`;
              return `
              <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                <span>${u.username || 'Senza nome'} <span style="color:var(--text-muted); font-size:0.8rem;">(ID: ${u.id})</span></span>
                ${statusHtml}
              </div>
            `}).join('');
            
            adminOverlay.innerHTML = `
              <div style="background:#1a1a1a; padding:30px; border-radius:12px; width:90%; max-width:600px; max-height:80vh; overflow-y:auto; color:white; font-family:var(--font-main); border: 1px solid rgba(255,255,255,0.1); position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px; margin-bottom:20px;">
                  <h2 style="margin:0; font-size:1.5rem;"><i class='bx bx-crown' style="color:#f5c518;"></i> Pannello Admin</h2>
                  <button onclick="document.getElementById('admin-modal').style.display='none'" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;"><i class='bx bx-x'></i></button>
                </div>
                
                ${statsHtml}

                <h3 style="margin-bottom:15px; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><i class='bx bxs-user-detail'></i> Utenti Attivi Ora (${data.active.length})</h3>
                <div style="background:rgba(0,0,0,0.3); border-radius:8px; margin-bottom:25px; border:1px solid rgba(255,255,255,0.05);">
                  ${activeHtml || '<div style="padding:15px; color:#888; text-align:center;">Nessun utente attivo al momento.</div>'}
                </div>
                
                <h3 style="margin-bottom:15px; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><i class='bx bxs-group'></i> Tutti gli Utenti (${data.total})</h3>
                <div style="background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                  ${allHtml || '<div style="padding:15px; color:#aaa; text-align:center;">Nessun utente registrato.</div>'}
                </div>
              </div>
            `;
            adminOverlay.style.display = 'flex';
            dropdown.style.display = 'none'; // chiudi dropdown
            
            // Event delegation per i tasti di logout
            adminOverlay.onclick = async function(e) {
              const btn = e.target.closest('.admin-logout-btn');
              if (btn) {
                const targetId = btn.getAttribute('data-id');
                if(!confirm('Sei sicuro di voler forzare il logout di questo utente? Dovrà reinserire il codice.')) return;
                
                // Disabilita tasto durante chiamata
                btn.disabled = true;
                btn.style.opacity = '0.5';
                
                try {
                  const res = await fetch(`${API_BASE}/admin/users/logout`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ user_id: currentUser.telegram_id || currentUser.id, otp_code: currentUser.otp_code, target_user_id: targetId })
                  });
                  const d = await res.json();
                  if (d.success) {
                    alert('Utente disconnesso con successo!');
                    adminOverlay.style.display = 'none';
                    adminBtn.click(); // Ricarica modale
                  } else {
                    alert('Errore: ' + d.error);
                    btn.disabled = false;
                    btn.style.opacity = '1';
                  }
                } catch(err) {
                  alert('Errore di rete');
                  btn.disabled = false;
                  btn.style.opacity = '1';
                }
              }
            };
          } else {
            alert("Errore Admin: " + data.error);
          }
        } catch(e) {
          console.error(e);
          adminBtn.innerHTML = "<i class='bx bx-crown'></i> Gestione Admin (Utenti)";
        }
      });
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('user_auth');
      localStorage.removeItem('homePageCache');
      localStorage.removeItem('homePageCache_v1');
      localStorage.removeItem('homePageCache_v2');
      localStorage.removeItem('homePageCache_v3');
      localStorage.removeItem('homePageCache_v4');
      localStorage.removeItem('homePageCache_v5');
      window.location.href = 'login.html';
    });

    document.getElementById('profile-pic-upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        try {
          const res = await fetch(`${API_BASE}/user/profile-pic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, profile_pic: base64 })
          });
          const data = await res.json();
          if (data.success) {
            currentUser.profile_pic = base64;
            localStorage.setItem('user_auth', JSON.stringify(currentUser));
            avatars.forEach(a => a.src = base64);
            window.showToast('Immagine aggiornata con successo!');
          } else {
            alert('Errore: ' + data.error);
          }
        } catch (err) {
          console.error(err);
          alert('Errore di connessione');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  initUserMenu();

  // --- IMAGE GALLERY MODAL ---
  async function openImageGalleryModal(id, type) {
    let overlay = document.getElementById('gallery-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'gallery-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: none; justify-content: center; align-items: center; padding: 20px;';
      overlay.innerHTML = `
        <div class="search-container" style="max-width: 800px; width: 100%;">
          <button class="close-search" id="close-gallery"><i class='bx bx-x'></i></button>
          <h2 style="color:#fff; margin-bottom: 1rem;">Gestione Immagini</h2>
          
          <div class="tabs" style="margin-bottom:1rem; border-bottom:1px solid #333; display:flex; gap:1rem;">
            <button class="tab-btn active" data-tab="posters" style="background:none; border:none; color:white; padding:10px; cursor:pointer; font-weight:bold; border-bottom:2px solid #ffcc00;">Poster</button>
            <button class="tab-btn" data-tab="backdrops" style="background:none; border:none; color:#aaa; padding:10px; cursor:pointer;">Sfondi</button>
            <button class="tab-btn" data-tab="logos" style="background:none; border:none; color:#aaa; padding:10px; cursor:pointer;">Loghi</button>
          </div>
          
          <div id="gallery-results" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; max-height: 60vh; overflow-y: auto; padding: 10px 0;">
            <p style="color:#aaa; text-align:center; grid-column:1/-1;">Caricamento immagini da TMDB...</p>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('close-gallery').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }

    overlay.style.display = 'flex';
    const resultsContainer = document.getElementById('gallery-results');
    resultsContainer.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">Caricamento...</p>';

    try {
      const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}/images?api_key=${TMDB_API_KEY}`);
      const imagesData = await res.json();
      
      let currentTab = 'posters';
      const tabBtns = overlay.querySelectorAll('.tab-btn');

      const renderImages = () => {
        resultsContainer.innerHTML = '';
        const items = imagesData[currentTab] || [];
        if (items.length === 0) {
          resultsContainer.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">Nessuna immagine trovata per questa categoria.</p>';
          return;
        }

        items.forEach(img => {
          const div = document.createElement('div');
          div.style.cursor = 'pointer';
          div.style.position = 'relative';
          div.style.borderRadius = '8px';
          div.style.overflow = 'hidden';
          div.style.border = '2px solid transparent';
          div.style.transition = 'border 0.2s';
          
          const thumbUrl = `https://image.tmdb.org/t/p/w300${img.file_path}`;
          div.innerHTML = `<img src="${thumbUrl}" style="width:100%; display:block;" loading="lazy">`;
          
          div.onmouseover = () => div.style.border = '2px solid #ffcc00';
          div.onmouseout = () => div.style.border = '2px solid transparent';
          
          div.addEventListener('click', async () => {
            if(!confirm("Vuoi impostare questa immagine come predefinita per il sito?")) return;
            
            const key = currentTab === 'posters' ? 'poster_path' : (currentTab === 'backdrops' ? 'backdrop_path' : 'logo_path');
            try {
              const saveRes = await fetch(`${API_BASE}/metadata/save`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ tmdb_id: parseInt(id), type, user_id: currentUser.id, [key]: img.file_path })
              });
              const saveData = await saveRes.json();
              if (saveData.success) {
                // Task 2: Immediate Poster Update in Homepage (clear cache)
                localStorage.removeItem('homePageCache_v5');
                window.showToast("Immagine salvata! Ricarica la pagina per vedere i cambiamenti.");
                overlay.style.display = 'none';
              } else {
                alert('Errore nel salvataggio: ' + saveData.error);
              }
            } catch(e) {
              console.error(e);
              alert("Errore di rete");
            }
          });

          resultsContainer.appendChild(div);
        });
      };

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.color = '#aaa';
            b.style.fontWeight = 'normal';
            b.style.borderBottom = 'none';
          });
          btn.classList.add('active');
          btn.style.color = 'white';
          btn.style.fontWeight = 'bold';
          btn.style.borderBottom = '2px solid #ffcc00';
          
          currentTab = btn.dataset.tab;
          renderImages();
        });
      });

      renderImages();
    } catch (e) {
      console.error(e);
      resultsContainer.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Errore di caricamento.</p>';
    }
  }

          // --- RATING MODAL ---
  function openRatingModal(tmdb_id, type, currentRating, btnElement, onSuccess) {
    let overlay = document.getElementById('rating-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rating-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: none; justify-content: center; align-items: center; padding: 20px;';
      overlay.innerHTML = `
        <div style="background:#1a1a1a; padding:30px; border-radius:10px; text-align:center; position:relative; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <button id="close-rating" style="position:absolute; top:10px; right:10px; background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
          <h2 style="color:white; margin-top:0;">Valuta questo titolo</h2>
          <div id="stars-container" style="display:flex; justify-content:center; gap:10px; margin:20px 0; font-size:40px; cursor:pointer;">
            <i class='bx bx-star star' data-val="1"></i>
            <i class='bx bx-star star' data-val="2"></i>
            <i class='bx bx-star star' data-val="3"></i>
            <i class='bx bx-star star' data-val="4"></i>
            <i class='bx bx-star star' data-val="5"></i>
          </div>
          <button id="save-rating" class="btn btn-primary" style="padding: 10px 20px; font-size:16px;">Salva Valutazione</button>
        </div>
      `;
      document.body.appendChild(overlay);

      document.getElementById('close-rating').addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }

    let selectedRating = currentRating;
    const stars = overlay.querySelectorAll('.star');
    
    const updateStars = (val) => {
      stars.forEach(s => {
        if (parseInt(s.dataset.val) <= val) {
          s.className = 'bx bxs-star star';
          s.style.color = '#ffcc00';
        } else {
          s.className = 'bx bx-star star';
          s.style.color = '#fff';
        }
      });
    };
    
    updateStars(selectedRating);

    stars.forEach(star => {
      star.onclick = () => {
        selectedRating = parseInt(star.dataset.val);
        updateStars(selectedRating);
      };
    });

    const saveBtn = document.getElementById('save-rating');
    saveBtn.onclick = async () => {
      if (selectedRating === 0) return alert('Seleziona almeno una stella!');
      saveBtn.innerText = 'Salvataggio...';
      try {
        const res = await fetch(`${API_BASE}/ratings/save`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ user_id: currentUser.id, tmdb_id, type, rating: selectedRating })
        });
        const rData = await res.json();
        if (rData.success) {
          alert('Valutazione salvata!');
          overlay.style.display = 'none';
          btnElement.innerHTML = `<i class='bx bxs-star' style='color:#f5c518'></i> <span>${selectedRating}</span>`;
          if (onSuccess) onSuccess(selectedRating);
        } else {
          alert('Errore nel salvataggio.');
        }
      } catch(e) {
        alert('Errore di connessione');
      }
      saveBtn.innerText = 'Salva Valutazione';
    };

    overlay.style.display = 'flex';
  }

});
