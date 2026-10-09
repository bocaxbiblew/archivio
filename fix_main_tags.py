import re

files = [
    '/Users/niccolodebartolo/Downloads/archivio-main/catalog_series.html',
    '/Users/niccolodebartolo/Downloads/archivio-main/catalog_movies.html',
    '/Users/niccolodebartolo/Downloads/archivio-main/calendar.html',
    '/Users/niccolodebartolo/Downloads/archivio-main/admin_users.html'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # if there is a rogue </main> we remove it first, to be safe.
    # except we know it failed because of ?v=7. In catalog_series it added </main> near modal.
    # let's just make it simple: replace </main> everywhere and add exactly one before modal/body.
    if filepath != '/Users/niccolodebartolo/Downloads/archivio-main/admin_users.html':
        content = content.replace('</main>', '')
        
        # Now add </main> right before cinematic modal
        content = content.replace('<!-- Cinematic Modal -->', '</main>\n  <!-- Cinematic Modal -->')
        
    else:
        # admin_users
        content = content.replace('</main>', '')
        content = content.replace('</body>', '</main>\n</body>')
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Main tags fixed!")
