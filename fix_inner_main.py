files = [
    '/Users/niccolodebartolo/Downloads/archivio-main/catalog_series.html',
    '/Users/niccolodebartolo/Downloads/archivio-main/catalog_movies.html'
]
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # The inner main looks like:
    # <main class="catalog-grid" id="catalog-grid-series">
    #   <!-- Locandine inserite via JS -->
    # 
    
    # We just need to add </main> after the comment.
    content = content.replace('<!-- Locandine inserite via JS -->\n  \n', '<!-- Locandine inserite via JS -->\n  </main>\n')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
