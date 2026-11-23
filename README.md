Autor
Bryan De Jesús Cuadrado Pérez — ADSO, SENA.


---

### 3. `README.md` — para `AppIntegracionSena`
En la raíz de `AppIntegracionSena` (al lado de `index.html`), crea o reemplaza el archivo **`README.md`** con esto:

```markdown
# AppIntegracionSena

Portal web para la gestión de solicitudes técnicas, administración de usuarios y trazabilidad de calidad (PSP), integrado vía REST con el backend `Api-Proyecto-Sena`.

> Nota: El repositorio conserva en paralelo la estructura base de Android/Gradle utilizada en evidencias previas del proyecto formativo.

## Estructura del cliente web

- `index.html` — Estructura principal de las vistas (login, solicitudes, usuarios, calidad PSP y reportes).
- `css/styles.css` — Hoja de estilos y diseño responsivo.
- `js/app.js` — Lógica de autenticación, control de vistas por rol y consumo de la API con `fetch`.

## Control de acceso por roles

- **ADMIN:** Acceso completo a solicitudes, gestión de usuarios, auditoría PSP y exportación de reportes.
- **QA_LEAD:** Gestión y aprobación/rechazo de solicitudes, revisión de bitácora PSP y reportes.
- **USER (Cliente):** Registro de nuevas solicitudes y consulta exclusiva del estado de sus propios pedidos.

## Credenciales de prueba

- **Administrador:** `admin@admin.com` / `123456`
- **QA Lead:** `bryan.cuadrado@sena.edu.co` / `123456`

## Ejecución local

1. Iniciar el backend `Api-Proyecto-Sena` en Apache Tomcat (`http://localhost:8080/api-sena`).
2. Abrir `index.html` directamente en el navegador.
3. Si el servidor local no está activo, la aplicación opera automáticamente en modo respaldo local para permitir su navegación.

## Autor

Bryan De Jesús Cuadrado Pérez — ADSO, SENA.
