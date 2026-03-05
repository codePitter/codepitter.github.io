# ◈ FinControl — Economía Personal

> Aplicación web de gestión financiera personal. Sin frameworks, sin dependencias de servidor: HTML + CSS + JS puro, desplegable en cualquier hosting estático.

---

## Índice

- [Demo rápida](#demo-rápida)
- [Características](#características)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tecnologías](#tecnologías)
- [Configuración de Google OAuth](#configuración-de-google-oauth)
- [Autenticación local (email/contraseña)](#autenticación-local-emailcontraseña)
- [Temas visuales](#temas-visuales)
- [Módulos de la app](#módulos-de-la-app)
- [Estado de la aplicación](#estado-de-la-aplicación)
- [Cómo correr en local](#cómo-correr-en-local)
- [Deploy](#deploy)
- [Roadmap](#roadmap)

---

## Demo rápida

Abrí `index.html` en un navegador o iniciá Live Server, y usá el botón **"Entrar en modo demostración"** para explorar sin registrarte.

---

## Características

| Módulo         | Descripción                                                          |
|----------------|----------------------------------------------------------------------|
| 📊 Dashboard    | KPIs del mes, alertas financieras, gráficos de torta y barras, regla 50/30/20 |
| 💸 Gastos       | Registro de transacciones con filtros por categoría, tipo y mes     |
| 📋 Presupuesto  | Comparación presupuestado vs real, objetivos de ahorro con slider   |
| 📅 Calendario   | Vista mensual de eventos financieros: cobros, vencimientos, recordatorios |
| 🚨 Deudas       | Gestión de deudas con cuotas, interés compuesto y calculadora de pago |
| 📈 Anual        | Proyección de 12 meses con tabla detallada y gráfico de líneas      |
| 🎨 Temas        | 6 temas visuales × 2 modos (oscuro/claro)                          |
| 🔐 Auth         | Google OAuth 2.0 + email/contraseña local + modo demo               |
| 📤 Export       | Exportación de datos a JSON                                         |

---

## Estructura del proyecto

```
fincontrol/
│
├── index.html              # Shell HTML: auth screen + app shell completo
│
├── css/
│   └── style.css           # Todos los estilos: tokens de tema, layout, componentes
│
├── js/
│   └── main.js             # Toda la lógica: estado, auth, render, charts, export
│
├── .gitignore
├── README.md
└── STRUCTURE.md            # Referencia técnica detallada
```

> **Nota:** El proyecto no usa bundler. Las rutas de los assets siguen esta estructura de carpetas. Si servís `index.html` directamente desde la raíz, asegurate de que el servidor respete las rutas `css/` y `js/`.

---

## Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| HTML5 | — | Estructura semántica |
| CSS3 | — | Variables CSS, Grid, Flexbox, animaciones |
| JavaScript | ES2022 | Lógica de app, Web Crypto API |
| Chart.js | 4.4.1 | Gráficos de torta, barra y línea |
| Google Identity Services | latest | OAuth 2.0 popup flow |
| Google Fonts | — | Orbitron, Inter, Exo 2, Rajdhani, Cinzel, Syncopate, Cormorant Garamond, Share Tech Mono |

**Sin frameworks. Sin build step. Sin backend.**

---

## Configuración de Google OAuth

### 1. Crear credenciales en Google Cloud

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear o seleccionar un proyecto
3. **APIs y servicios → Credenciales → Crear credencial → ID de cliente OAuth 2.0**
4. Tipo: **Aplicación web**
5. Agregar en **Orígenes JavaScript autorizados**:
   ```
   http://localhost:5501        ← desarrollo con Live Server
   https://tu-dominio.com       ← producción
   ```
6. Copiar el **Client ID** generado

### 2. Pegarlo en `main.js`

```js
// main.js — línea 5
const GOOGLE_CLIENT_ID = 'TU_CLIENT_ID.apps.googleusercontent.com';
```

### 3. Flujo de autenticación

```
Usuario hace click en "Continuar con Google"
        ↓
google.accounts.id.prompt()  ← One Tap o popup
        ↓
handleGoogleCredential(response)
        ↓
Decodifica JWT (name, email, picture)
        ↓
enterApp(user)  ←  guarda en localStorage + renderiza app
```

---

## Autenticación local (email/contraseña)

Los usuarios se almacenan en `localStorage` bajo la clave `fc-users`:

```json
{
  "usuario@email.com": {
    "name": "Nombre",
    "email": "usuario@email.com",
    "hash": "<sha-256 de la contraseña>",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

- El hash se genera con **Web Crypto API** (`crypto.subtle.digest('SHA-256', ...)`), nativo del navegador, sin dependencias.
- La sesión activa se persiste en `fc-session`. Se restaura automáticamente al recargar (excepto el modo demo).
- Las sesiones demo **no se persisten** entre recargas.

> ⚠️ Esta auth es adecuada para uso personal/local. Para producción con múltiples usuarios se recomienda implementar un backend con JWT firmados.

---

## Temas visuales

| ID | Nombre | Tipografía | Acento |
|---|---|---|---|
| `cyber` | Cyberpunk | Orbitron + Rajdhani | `#ff00ff` |
| `future` | Futurista | Exo 2 | `#00c8ff` |
| `scifi` | Sci-Fi | Syncopate + Rajdhani | `#00ff64` |
| `gold` | Sofisticado | Cinzel + Cormorant Garamond | `#d4af37` |
| `windows` | Windows 11 | Inter | `#0078d4` |
| `mac` | macOS | Inter | `#0a84ff` |

Cada tema tiene variante **oscura** y **clara**. El tema y modo se persisten en `localStorage` bajo `fc-theme` y `fc-mode`.

Los temas se aplican como atributos en `<html>`:
```html
<html data-theme="cyber" data-mode="dark">
```

---

## Módulos de la app

### Estado global (`State`)

```js
const State = {
  user,             // { name, email, picture?, avatar, provider }
  theme,            // 'cyber' | 'future' | 'scifi' | 'gold' | 'windows' | 'mac'
  mode,             // 'dark' | 'light'
  currentSection,   // 'dashboard' | 'gastos' | 'presupuesto' | 'calendario' | 'deudas' | 'anual'
  calYear,          // número de año para calendario y dashboard
  calMonth,         // 0-11
  anualYear,        // año de proyección anual
  transactions[],   // { id, type, date, desc, amount, cat, freq, notes }
  calEvents[],      // { id, date, type, desc, amount }
  debts[],          // { id, name, total, remaining, cuotas, interest, due, paid }
  budget: {
    income[],       // { id, name, amount, actual }
    fixed[],        // { id, name, amount, actual }
    variable[]      // { id, name, amount, actual }
  },
  goals[]           // { id, name, target, saved }
}
```

### Categorías de transacción

`vivienda`, `servicios`, `transporte`, `alimentacion`, `salud`, `educacion`, `hijos`, `ocio`, `ropa`, `mascotas`, `impuestos`, `ahorro`, `deuda`, `otros`

### Ciclo de render

```
showSection(id)
    └── renderSection(id)
            ├── renderDashboard()
            ├── renderGastos()
            ├── renderBudget()
            ├── renderCalendar()
            ├── renderDebts()
            └── renderAnual()
```

Cada función de render construye el HTML mediante template literals y actualiza el DOM directamente. Los gráficos se destruyen y recrean en cada render vía `makeChart()` / `destroyChart()`.

---

## Cómo correr en local

### Opción A — VS Code Live Server (recomendado)

1. Instalar la extensión **Live Server** en VS Code
2. Click derecho en `index.html` → **Open with Live Server**
3. Se abre en `http://localhost:5501` (según `settings.json`)

### Opción B — Python (sin instalación extra)

```bash
# Python 3
python -m http.server 5501

# Abrir en http://localhost:5501
```

### Opción C — Node.js

```bash
npx serve .
```

> ⚠️ Google OAuth **no funciona** si abrís el archivo directamente como `file://`. Necesitás un servidor HTTP aunque sea local.

---

## Deploy

Al ser un sitio estático puro, podés desplegarlo en:

| Plataforma | Cómo |
|---|---|
| **GitHub Pages** | Push a rama `main` o `gh-pages`, activar Pages en Settings |
| **Netlify** | Drag & drop de la carpeta del proyecto en netlify.com |
| **Vercel** | `vercel --prod` desde la raíz |
| **Cloudflare Pages** | Conectar repo de GitHub, build command vacío |

Recordá agregar el dominio de producción en los **Orígenes autorizados** de Google Cloud Console.

---

## Roadmap

- [ ] Persistencia en la nube (Supabase / Firebase)
- [ ] Auth real de Google con backend para múltiples usuarios
- [ ] Importación de extractos bancarios (CSV/OFX)
- [ ] Notificaciones de vencimientos (Service Worker / Push API)
- [ ] Modo PWA (installable, offline)
- [ ] Reportes en PDF
- [ ] Multi-moneda
- [ ] Modo compartido (pareja / familia)
