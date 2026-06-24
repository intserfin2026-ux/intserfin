# Seguridad · Intserfin

Política y configuración de seguridad de la landing page.

## Headers HTTP aplicados

| Header | Valor | Propósito |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS por 2 años y permite el preload en navegadores. |
| `X-Frame-Options` | `SAMEORIGIN` | Previene clickjacking. |
| `X-Content-Type-Options` | `nosniff` | Evita MIME-sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita la fuga de URLs en `Referer`. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Desactiva APIs sensibles. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Aísla el contexto de ventana. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Evita carga cross-origin. |
| `Content-Security-Policy` | (ver archivos) | Whitelist estricta de fuentes, scripts, imágenes y conexiones. |
| `X-XSS-Protection` | `0` | Desactiva el filtro XSS obsoleto (CSP es la fuente de verdad). |
| `X-Robots-Tag` | `index, follow, max-image-preview:large` | SEO técnico. |

## Política de seguridad de contenido (CSP)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://wa.me https://api.whatsapp.com;
frame-ancestors 'self';
form-action 'self' https://wa.me;
base-uri 'self';
object-src 'none';
upgrade-insecure-requests
```

- **No hay `unsafe-eval`**, ni scripts inline.
- **No hay CDNs de terceros**: ni jQuery, ni analytics inline. Si en el futuro se requiere analytics, ampliar `connect-src` con el dominio del proveedor.
- **`'unsafe-inline'` en CSS** se permite únicamente porque la hoja de estilos está embebida en el documento. Si se externaliza el CSS a un archivo `.css`, eliminar este flag.
- **`data:` en `img-src`** se permite porque el hero usa un patrón SVG inline como textura de fondo.

## Privacidad y datos personales

- El formulario **no envía datos a un backend**: serializa los datos a un mensaje de WhatsApp y abre `https://wa.me/...` con `target="_blank"`.
- **No hay cookies** de rastreo, **no hay analytics de terceros** y **no hay fingerprinting**.
- Los PDFs adjuntos se procesan únicamente en el navegador (`FileReader`-equivalente) y **no se suben** a ningún servidor.
- El sitio no requiere registro y no guarda estado de usuario.

## Despliegue

| Plataforma | Archivo de configuración |
|---|---|
| Netlify | `_headers` |
| Vercel | `vercel.json` |
| Apache | `.htaccess` |
| Nginx | `nginx.conf.example` |

## Reporte de vulnerabilidades

Si encuentras una vulnerabilidad, escribe a `seguridad@intserfin.co`. No la divulgues públicamente hasta que se corrija.
