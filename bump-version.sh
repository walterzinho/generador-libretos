#!/bin/bash
# bump-version.sh - Incrementa la versión de SisGelfram
# Uso: ./bump-version.sh [patch|minor|major] "mensaje del cambio"
# Ejemplos:
#   ./bump-version.sh patch "Fix base de datos en VPS"
#   ./bump-version.sh minor "Nueva funcionalidad de exportar"
#   ./bump-version.sh major "Rediseño completo de UI"

set -e

TYPE=${1:-patch}
MESSAGE=${2:-"Actualización"}

VERSION_FILE="version.json"

# Leer versión actual
CURRENT=$(python3 -c "import json; print(json.load(open('$VERSION_FILE'))['version'])")

# Separar major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Calcular nueva versión
case "$TYPE" in
  patch)
    PATCH=$((PATCH + 1))
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  *)
    echo "Uso: $0 [patch|minor|major] \"mensaje\""
    echo "  patch = 1.1.0 -> 1.1.1 (fixes)"
    echo "  minor = 1.1.0 -> 1.2.0 (nuevas features)"
    echo "  major = 1.1.0 -> 2.0.0 (cambios grandes)"
    exit 1
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
DATE=$(date +%Y-%m-%d)

echo "SisGelfram $CURRENT -> $NEW_VERSION ($TYPE: $MESSAGE)"

# Actualizar version.json
python3 -c "
import json
with open('$VERSION_FILE', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
data['changelog'].insert(0, '$NEW_VERSION - $DATE | $MESSAGE')
with open('$VERSION_FILE', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
"

# Actualizar package.json
python3 -c "
import json
with open('package.json', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('package.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"

echo "Version actualizada a $NEW_VERSION"
echo "Changelog: $MESSAGE"