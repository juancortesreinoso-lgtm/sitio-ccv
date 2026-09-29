#!/bin/bash
# ------------------------------------------------------------------
#  Publica "Control de Contrato CCV" en un servidor que YA usa Caddy
#  (por ejemplo el servidor "materiales" en Vultr). Se ejecuta una vez:
#
#     curl -fsSL https://controlccvdand.netlify.app/instalar_caddy.sh | sudo bash
#     curl -fsSL https://controlccvdand.netlify.app/instalar_caddy.sh | sudo bash -s -- ccv.midominio.cl
#
#  Sin argumento usa el nombre gratuito ccv.<IP con guiones>.sslip.io,
#  que resuelve a la IP del servidor y permite HTTPS automático.
#  Qué hace: quita nginx si quedó instalado, clona/actualiza el repo en
#  /var/www/sitio-ccv, agrega un bloque al Caddyfile (sin tocar los
#  existentes), recarga Caddy y programa "git pull" cada 2 minutos.
#  Volver a ejecutarlo es seguro.
# ------------------------------------------------------------------
set -euo pipefail
REPO="https://github.com/juancortesreinoso-lgtm/sitio-ccv.git"
DIR="/var/www/sitio-ccv"
CADDYFILE="/etc/caddy/Caddyfile"
if [ "$(id -u)" -ne 0 ]; then echo "Ejecute con sudo"; exit 1; fi
IP=$(curl -s -4 --max-time 5 ifconfig.me || hostname -I | awk '{print $1}')
HOST="${1:-ccv.${IP//./-}.sslip.io}"

echo "== 1/4 Paquetes (git; se retira nginx si quedó instalado)"
export DEBIAN_FRONTEND=noninteractive
apt-get install -y -q git >/dev/null
if dpkg -l nginx 2>/dev/null | grep -q '^ii'; then
  systemctl stop nginx 2>/dev/null || true
  apt-get purge -y -q nginx nginx-common python3-certbot-nginx >/dev/null 2>&1 || true
fi
rm -f /etc/nginx/sites-enabled/sitio-ccv /etc/nginx/sites-available/sitio-ccv 2>/dev/null || true

echo "== 2/4 Sitio desde GitHub"
mkdir -p /var/www
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull -q --ff-only origin main; else git clone -q "$REPO" "$DIR"; fi
chmod -R o+rX "$DIR"

echo "== 3/4 Bloque en Caddy para ${HOST}"
cp -n "$CADDYFILE" "${CADDYFILE}.bak-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
if ! grep -q "^${HOST} {" "$CADDYFILE"; then
cat >> "$CADDYFILE" <<EOF

# Control de Contrato CCV (sitio estático, se actualiza solo desde GitHub)
${HOST} {
    root * ${DIR}/sitio
    encode gzip
    file_server
    header /*.html Cache-Control "no-cache"
    header X-Content-Type-Options nosniff
}
EOF
fi
caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null
systemctl reload caddy

echo "== 4/4 Actualización automática (cada 2 min)"
cat > /etc/cron.d/sitio-ccv <<EOF
*/2 * * * * root cd ${DIR} && git pull -q --ff-only origin main >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/sitio-ccv

sleep 3
echo "== Listo. Abra: https://${HOST}"
echo "   (el certificado HTTPS se emite solo en el primer acceso; puede tardar ~30 s)"
