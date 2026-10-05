# Control de Contrato — Reemplazo de Cicloconvertidores Molino SAG

- `sitio/` — lo que se publica en Netlify: `index.html` (portal de ingreso por perfil con la plataforma **cifrada**), `lib/`, `plantillas/` y `simuladores/`.
- El código fuente y los datos no se guardan en este repositorio: la página publicada solo contiene la plataforma cifrada (AES-256-GCM). Las claves las entrega el servicio Apps Script después de validar la contraseña del perfil.

Cada cambio en la rama `main` se despliega automáticamente en Netlify (carpeta `sitio`).
