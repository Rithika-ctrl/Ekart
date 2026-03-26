#!/bin/bash

files=$(find "ekart-react/src/pages" -name "*.jsx")

for file in $files; do
  # Check if the file already has the complete import
  if grep -q "import.*Link.*useNavigate.*from.*react-router-dom" "$file"; then
    echo "✓ $file already has the import"
  else
    # Check if it has react-router-dom import at all
    if grep -q "from 'react-router-dom'" "$file"; then
      # Replace the existing react-router-dom import with the updated one
      sed -i '' "s/import { \([^}]*\) } from 'react-router-dom';/import { Link, \1 } from 'react-router-dom';/" "$file"
      # Remove duplicate Link if it exists
      sed -i '' "s/import { Link, Link, /import { Link, /" "$file"
      echo "✓ Updated: $file"
    else
      # No react-router-dom import, add it after React import
      sed -i '' "/^import React/a\\
import { Link, useNavigate } from 'react-router-dom';
" "$file"
      echo "✓ Added: $file"
    fi
  fi
done
