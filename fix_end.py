with open("script.js", "r") as f:
    lines = f.readlines()

# Find the end of bookmark block
for i, line in enumerate(lines):
    if "resultsContainer.appendChild(card);" in line:
        # Check a few lines down for the closure
        for j in range(i, i+10):
            if "      });" in lines[j] and "    }" in lines[j+1]:
                lines[j] = "      }));\n"
                break
        break

# Find the end of search block
for i, line in enumerate(lines):
    if "searchOverlay.classList.remove(\"active\");" in line:
        # Check a few lines down
        for j in range(i, i+10):
            if "    });" in lines[j] and "  }" in lines[j+1]:
                lines[j] = "    }));\n"
                break
        break
        
with open("script.js", "w") as f:
    f.writelines(lines)
