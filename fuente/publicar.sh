#!/bin/bash
# Publica la versión actual del sitio en GitHub (Netlify redespliega solo).
set -e
/home/claude/app/build.sh >/dev/null
R=${REPO:-/home/claude/sitio-ccv}
cp /home/claude/app/Control_Contrato_Andina_Cicloconvertidores.html $R/sitio/index.html
mkdir -p $R/sitio/simuladores && cp /home/claude/app/simuladores/*.html $R/sitio/simuladores/
cd $R
git add -A
if git diff --cached --quiet; then echo "Sin cambios que publicar"; exit 0; fi
git -c commit.gpgsign=false commit -q -m "${1:-Actualización de la app}

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012A9bNB4GWumSCjWzd6R22M"
if git remote get-url origin >/dev/null 2>&1; then git push -q origin main && echo "Publicado en GitHub → Netlify desplegará en ~1 min"; else echo "Commit listo; falta configurar el remoto origin"; fi
# Nota: en un entorno nuevo, clone el repo, copie fuente/ a /home/claude/app y ejecute fuente/publicar.sh
