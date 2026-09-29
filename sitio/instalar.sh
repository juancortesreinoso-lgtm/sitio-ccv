#!/bin/bash
# ------------------------------------------------------------------
#  Instalador del sitio "Control de Contrato CCV" en un servidor
#  Ubuntu/Debian (Vultr u otro VPS).  Se ejecuta UNA sola vez:
#
#     curl -fsSL https://controlccvdand.netlify.app/instalar.sh | sudo bash -s -- SU.DOMINIO.CL correo@ejemplo.cl
#
#  Qué hace:
#    1. instala nginx, git y certbot;
#    2. clona el repositorio público sitio-ccv en /var/www/sitio-ccv
#       y publica la carpeta "sitio";
#    3. programa "git pull" cada 2 minutos: cada cambio subido a
#       GitHub aparece solo en el servidor (igual que en Netlify);
#    4. pide un certificado HTTPS (Let's Encrypt) para el dominio.
#  Volver a ejecutarlo es seguro (no duplica nada).
# ------------------------------------------------------------------
set -euo pipefail
DOM="${1:-}"; MAIL="${2:-}"
REPO="https://github.com/juancortesreinoso-lgtm/sitio-ccv.git"
DIR="/var/www/sitio-ccv"
# Sin dominio: se publica por IP en http:// (sin certificado). Con dominio: HTTPS automático.
[ -z "$MAIL" ] && [ -n "$DOM" ] && MAIL="admin@${DOM#*.}"
SERVER_NAME="${DOM:-_}"
if [ "$(id -u)" -ne 0 ]; then echo "Ejecute con sudo"; exit 1; fi

echo "== 1/4 Paquetes"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -q
apt-get install -y -q nginx git certbot python3-certbot-nginx

echo "== 2/4 Sitio desde GitHub"
mkdir -p /var/www
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull -q --ff-only origin main
else
  git clone -q "$REPO" "$DIR"
fi
cat > /etc/nginx/sites-available/sitio-ccv <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};
    root ${DIR}/sitio;
    index index.html;
    charset utf-8;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
    location / { try_files \$uri \$uri/ =404; }
    location ~* \.html\$ { add_header Cache-Control "no-cache"; }
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
EOF
ln -sf /etc/nginx/sites-available/sitio-ccv /etc/nginx/sites-enabled/sitio-ccv
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable -q nginx
systemctl reload nginx

echo "== 3/4 Actualización automática (cada 2 min)"
cat > /etc/cron.d/sitio-ccv <<EOF
*/2 * * * * root cd ${DIR} && git pull -q --ff-only origin main >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/sitio-ccv

echo "== 4/4 HTTPS (Let's Encrypt)"
if [ -z "$DOM" ]; then
  echo "Sin dominio: el sitio queda disponible en http://$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  echo "Cuando tenga el dominio apuntando a este servidor, ejecute de nuevo el instalador con el dominio para activar HTTPS."
elif certbot --nginx -d "$DOM" --non-interactive --agree-tos -m "$MAIL" --redirect; then
  echo "HTTPS listo: https://${DOM}"
else
  echo "No se pudo emitir el certificado todavía. Verifique que el DNS de ${DOM} apunte a la IP de este servidor y vuelva a ejecutar:"
  echo "   sudo certbot --nginx -d ${DOM} --redirect -m ${MAIL} --agree-tos"
  echo "Mientras tanto el sitio funciona en http://${DOM}"
fi
echo "== Listo. Sitio en /var/www/sitio-ccv/sitio, se actualiza solo desde GitHub."
