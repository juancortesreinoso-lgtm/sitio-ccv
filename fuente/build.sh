#!/bin/bash
set -e
cd /home/claude/app
cat part2.js part3a.js part3.js part4.js part5.js part6.js part8b.js part8.js part9.js part10data.js part10.js part11.js part12.js part13data.js part13.js part7.js > /tmp/claude-0/-home-claude/825c44a4-043a-5deb-ab67-a5c3e94678f2/scratchpad/all.js
JS=/tmp/claude-0/-home-claude/825c44a4-043a-5deb-ab67-a5c3e94678f2/scratchpad/all.js
{ cat part1.html; echo '<script>'; cat "$JS"; echo '</script>'; echo '</body>'; echo '</html>'; } > Control_Contrato_Andina_Cicloconvertidores.html
python3 - <<'PY'
import re
h=open('/home/claude/app/part1.html',encoding='utf-8').read()
h=re.sub(r'^\s*<!DOCTYPE html>\s*','',h); h=re.sub(r'<html[^>]*>\s*','',h,1); h=re.sub(r'\s*<head>\s*','',h,1)
h=re.sub(r'<meta[^>]*>\s*','',h)
h=h.replace('</head>\n<body>\n','')
js=open('/tmp/claude-0/-home-claude/825c44a4-043a-5deb-ab67-a5c3e94678f2/scratchpad/all.js',encoding='utf-8').read()
open('/home/claude/app/artifact_ccv.html','w',encoding='utf-8').write(h+'<script>\n'+js+'</script>\n')
PY
node -e "new Function(require('fs').readFileSync('$JS','utf8'))" && echo "SYNTAX OK"
ls -la Control_Contrato_Andina_Cicloconvertidores.html artifact_ccv.html
