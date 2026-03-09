# Clarita la Cuenta — Master Reference
> Documento completo para retomar el proyecto en cualquier sesión de Claude AI.
> Última actualización: 9 de marzo 2026

---

## 1. CONTEXTO DEL USUARIO

**Perfil:** Trabajador en Argentina, 2026. Dos hijos (manutención en proceso de reactivación).

**Situación financiera real:**
- Ingresos: ~$550.000/mes (adelantos de sueldo)
- Gastos fijos: ~$425.000/mes
- Saldo libre: ~$125.000/mes
- Deuda crítica activa: EPE (luz) ~$435.801 · TGI ~$144.169
- Manutención reactivada genera déficit adicional de ~$345.000/mes

**Uso principal del proyecto:**
Gestión personal de finanzas para Argentina con inflación alta: control de gastos, deudas, ahorro por objetivos y proyección anual. No es un proyecto comercial, es uso personal directo.

---

## 2. PROYECTO: Clarita la Cuenta

### Deploy
- **URL pública:** `https://codepitter.github.io` ← repo renombrado a raíz
- **Repo:** `https://github.com/codePitter/codepitter.github.io`
- **Deploy automático:** GitHub Actions

> ℹ️ El repo fue renombrado de `FinControl` → `ClaritaLaCuenta` → `codepitter.github.io` para que el sitio quede en el dominio raíz, requerido por Google AdSense.

### Stack
| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JS ES2022 — sin frameworks |
| Gráficos | Chart.js 4.4.1 (CDN) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Base de datos | Supabase (PostgreSQL, tabla `user_data` con JSONB) |
| Persistencia offline | localStorage |
| Deploy | GitHub Pages (dominio raíz) |
| Publicidad | Google AdSense ✅ Cuenta creada · Publisher ID activo · Pendiente aprobación |

### Estructura de archivos
```
codepitter.github.io/
├── index.html           (~894 líneas)
├── css/style.css        (~1300 líneas)
├── js/main.js           (~1895 líneas, ~105 funciones)
├── js/config.js         ← Credenciales (gitignored, opcional — main.js tiene fallback)
├── js/config.example.js
├── ads.txt              ← Google AdSense verificación ✅
├── fc-rescue.js         ← Script de rescate para consola del navegador
├── supabase_schema.sql
├── .gitignore
├── README.md
└── CLARITALACUENTA_MASTER.md ← Este archivo
```

> ⚠️ **Regla de trabajo:** Siempre subir los 3 archivos (main.js, index.html, style.css) al inicio de cada sesión de Claude. Los outputs de Claude no persisten entre sesiones.

---

## 3. CREDENCIALES

### Supabase + Google (embebidas en main.js como fallback)
```js
// Embebidas en js/main.js como fallback (líneas 234-235, 382)
// js/config.js es OPCIONAL — si existe lo sobreescribe, si no existe main.js usa estos valores
const SUPABASE_URL  = '...supabaseUrl...'    || 'https://vqlbxuoowzgnlqyahink.supabase.co';
const SUPABASE_KEY  = '...supabaseKey...'    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const GOOGLE_CLIENT_ID = '...googleClientId...' || '175409993499-v38h85aqn2of4qqem2dfrl2ahu19rmfq.apps.googleusercontent.com';
```

> ℹ️ La `supabaseKey` es la **anon key** (pública por diseño). No es riesgo de seguridad — el acceso a los datos está protegido por las políticas RLS. Sin autenticación válida, la key es inútil para leer o modificar datos de otros usuarios.

**Supabase dashboard:** `supabase.com/dashboard/project/vqlbxuoowzgnlqyahink`

### Google AdSense
- **Publisher ID:** `ca-pub-2282157571185363`
- **ads.txt:** `google.com, pub-2282157571185363, DIRECT, f08c47fec0942fa0`
- **Estado:** ✅ Sitio verificado · ⏳ Pendiente aprobación (1–14 días)
- **Panel:** `adsense.google.com/adsense/u/0/pub-2282157571185363`

---

## 4. BASE DE DATOS SUPABASE

### Tabla `user_data` ✅ (creada y verificada)
```sql
create table user_data (
  id         uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
-- RLS habilitado
-- 4 policies: select/insert/update/delete por auth.uid() = id
-- Trigger: actualiza updated_at automáticamente
```

**Verificar:** `select id from user_data limit 1;` → "Success. No rows returned" es correcto (tabla vacía).

---

## 5. ARQUITECTURA DE LA APP

### State (objeto global central)
```js
const State = {
  // Usuario
  user: null,           // { name, email, picture?, avatar, provider, supabaseId? }

  // UI
  theme: 'windows',     // default: 'windows'
  mode: 'light',        // default: 'light'  ← (no 'dark')
  currentSection: 'dashboard',
  dashPeriod: 'month',
  budgetYear: <año actual>,
  budgetMonth: <mes actual>,

  // Calendarios
  calYear: <año actual>,
  calMonth: <mes actual>,
  anualYear: 2026,

  // Contadores de ID
  txIdCounter: 1,
  calIdCounter: 1,
  debtIdCounter: 1,
  budgetIdCounter: 10,
  goalIdCounter: 1,
  savingIdCounter: 1,

  // Datos
  transactions: [],     // [{ id, type, date, desc, amount, cat, freq, notes }]
  calEvents: [],        // [{ id, date, type, desc, amount }]
  debts: [],            // [{ id, name, total, remaining, cuotas, interest, due, paid }]
  budget: {
    income:   [],       // [{ id, name, amount, actual, cat }]
    fixed:    [],       // [{ id, name, amount, actual, cat }]
    variable: []        // [{ id, name, amount, actual, cat }]
  },
  goals: [],            // [{ id, name, target, saved }]   ← objetivos simples
  savings: [],          // [{ id, name, goal, dueDate, notes, saved, deposits[], createdAt }]
}
```

### Persistencia (doble capa)
```
saveState()
  ├── localStorage['fc-data-{email}']  ← SIEMPRE (offline first)
  └── Supabase user_data WHERE id = supabaseId  ← si hay sesión activa

loadState()
  ├── provider === 'local' → solo localStorage
  ├── supabaseId disponible → Supabase primero
  │     └── PGRST116 (no rows) → caer a localStorage
  └── fallback → localStorage
```

**localStorage keys:**
| Clave | Tipo | Descripción |
|---|---|---|
| `fc-theme` | string | Tema activo: `'windows'`, `'cyber'`, etc. |
| `fc-mode` | string | Modo: `'dark'` o `'light'` |
| `fc-session` | JSON | Usuario logueado (`User` object, sin supabaseId) |
| `fc-data-{email}` | JSON | Todos los datos del usuario (State serializado) |

### Flujo de autenticación
```
window.load
  ├── initSupabase() → crea cliente sb
  ├── sb.auth.onAuthStateChange() → si session → enterApp()
  └── sb.auth.getSession() → si session activa → enterApp() directamente
        └── sin sesión Supabase → localStorage['fc-session'] → enterApp()

enterApp(user)
  ├── Guard: si ya inicializado → return
  ├── Guarda en State.user
  ├── localStorage['fc-session'] = user
  ├── Oculta #authScreen, muestra #appShell
  └── initApp() → loadState() → showSection('dashboard')
```

---

## 6. SECCIONES DE LA APP

| Sección | ID | Función render | Descripción |
|---------|-----|---------------|-------------|
| Dashboard | `sec-dashboard` | `renderDashboard()` | KPIs, alertas, gráfico torta, barras 6 meses, regla 50/30/20, transacciones recientes |
| Gastos | `sec-gastos` | `renderGastos()` | Listado con filtros por mes/categoría/tipo, totales |
| Presupuesto | `sec-presupuesto` | `renderBudget()` | Tabla editable con navegador de mes, auto-cálculo de real, resumen, objetivos y gráfico |
| Calendario | `sec-calendario` | `renderCalendar()` | Calendario mensual + eventos financieros + próximos vencimientos |
| Deudas | `sec-deudas` | `renderDebts()` | Gestión de deudas con calculadora de cuotas |
| Ahorro | `sec-ahorro` | `renderSavings()` | Alcancías con progreso, depósitos y fechas objetivo |
| Anual | `sec-anual` | `renderAnual()` | Proyección 12 meses con datos reales + presupuesto como base |

---

## 7. CÓMO FUNCIONA EL PRESUPUESTO

### Estructura
Tres categorías editables con navegador de mes:
- **Ingresos** — lo que esperás cobrar
- **Gastos Fijos** — alquiler, servicios, cuotas
- **Variables / Estimados** — alimentación, transporte, ocio

Cada ítem: **Pres.** (presupuestado) y **Real** (lo que realmente ocurrió).

### Auto-cálculo del campo "Real"
Cada BudgetItem tiene el campo `cat`. Si está asignado:
- `getItemActual(type, item, year, month)` suma automáticamente las transacciones del mes seleccionado con esa categoría
- El campo "Real" muestra `🔒 $xxx.xxx` (verde, read-only)

Si `cat` está vacío → el campo "Real" es editable manualmente.

### Navegador de mes
```
◀  Marzo 2026  ▶
```
Controla `State.budgetYear` / `State.budgetMonth`. El auto-cálculo siempre filtra por el mes/año del navegador.

### Relación con otras secciones
- **Vista Anual:** usa budget como baseline de proyección para meses futuros sin transacciones reales
- **Regla 50/30/20** del Dashboard: usa ingresos reales de transacciones (no del presupuesto)

### Dos sistemas de ahorro
| | Objetivos (Presupuesto) | Alcancías (Ahorro) |
|--|------------------------|---------------------|
| Ubicación | Sección Presupuesto | Sección Ahorro |
| Control | Slider manual | Depósitos con fecha |
| Fecha objetivo | No | Sí |
| Historial | No | Sí |
| Dashboard | No | Sí (KPI + alerta) |

---

## 8. PUBLICIDAD (Google AdSense)

### Estado actual
- ✅ Publisher ID activo: `ca-pub-2282157571185363`
- ✅ Script en `<head>` del `index.html` (una sola instancia, línea 32)
- ✅ `ads.txt` en raíz del repo
- ✅ Sitio verificado por AdSense
- ⏳ Pendiente aprobación de cuenta (1–14 días)
- ⏳ Pendiente: reemplazar `data-ad-slot="XXXXXXXXXX"` con Slot IDs reales (una vez aprobado)

### Bloques implementados (6 en total)
| Ubicación | ID | Tipo | Visible en |
|-----------|-----|------|-----------|
| Dashboard — encima de KPIs | `adBannerDash` | Banner horizontal auto | Todos |
| Gastos — pie de sección | — | Footer horizontal auto | Todos |
| Presupuesto — pie de sección | — | Footer horizontal auto | Todos |
| Deudas — pie de sección | — | Footer horizontal auto | Todos |
| Anual — pie de sección | — | Footer horizontal auto | Todos |
| Sidebar derecha (sticky) | `adSidebar` | 160×600 | Solo ≥ 1200px |

### Diseño no-intrusivo
- Los banners van **al final** de la sección, nunca interrumpiendo el contenido
- Etiqueta `<span class="ad-label">Publicidad</span>` discreta (9px, opacity 0.6)
- El sidebar desaparece en pantallas < 1200px

### Para activar los anuncios (una vez aprobado)
1. Ir a AdSense → Anuncios → Por unidad de anuncio → crear 6 unidades
2. Reemplazar cada `data-ad-slot="XXXXXXXXXX"` con el Slot ID correspondiente
3. Pasarle los 6 Slot IDs a Claude para actualizar `index.html`

---

## 9. SEO

### Implementado en `<head>` de index.html
- **Favicon SVG inline:** fondo verde esmeralda `#059669` con ícono blanco
- `apple-touch-icon` y `theme-color` para dispositivos móviles
- Meta: description (~155 chars), keywords, author, robots, canonical
- Open Graph completo: og:type, og:url, og:title, og:description, og:locale (`es_AR`), og:site_name
- Twitter Card (summary)
- JSON-LD `schema.org/WebApplication` con precio 0 ARS, idioma es-AR

### Pendiente
Agregar `<meta property="og:image">` → guardar screenshot como `/og-image.png` en el repo.

---

## 10. TEMAS VISUALES

| Tema | Estilo | Estado |
|------|--------|--------|
| `windows` | Windows 11 Fluent Design, acrylic blur | ✅ **Default (light)** |
| `cyber` | Cyberpunk, magenta/cian, scanlines | ✅ |
| `future` | Futurista, azul profundo, HUD dots | ✅ |
| `scifi` | Sci-Fi, verde alienígena, hexágonos | ✅ |
| `gold` | Sofisticado, dorado/negro | ✅ |
| `mac` | macOS style | ⚠️ Parcial |

Default definido en 4 lugares: `State`, `initApp()` fallback, IIFE anti-flash, y `<html data-theme="windows" data-mode="light">`.

---

## 11. CATEGORÍAS DE TRANSACCIONES

```
vivienda · servicios · transporte · alimentacion · salud
educacion · hijos · ocio · ropa · mascotas · impuestos · ahorro · deuda · otros
```

---

## 12. FEATURES ESPECIALES

### Math Input
Los campos de monto aceptan expresiones: `550000 / 4` → `137500`. Preview en tiempo real, se resuelve al perder el foco o presionar Enter.

### Calculadora flotante
Botón FAB azul (bottom-right) → calculadora accesible desde cualquier sección.

### Pago de deudas integrado
Registrar un pago en Deudas → crea automáticamente una transacción de gasto con categoría `deuda`.

### Vista Anual inteligente
Meses pasados/actual → transacciones reales. Meses futuros → proyección desde presupuesto × variación estacional hardcodeada.

### Dot de sync
Pequeño indicador verde/naranja en el nav que muestra si el último guardado fue exitoso en Supabase.

---

## 13. FIXES APLICADOS (historial)

| Fix | Descripción |
|-----|-------------|
| Fix 1 | `getSupabaseUid()` evita round-trip a `getUser()` usando `State.user.supabaseId` |
| Fix 2 | `onAuthStateChange` pasa `supabaseId: u.id` directamente |
| Fix 3 | Guard en `enterApp()` evita re-inicialización múltiple |
| Fix 4 | `PGRST116` ignorado en `loadState()` (primera vez, sin fila aún) |
| Fix 5 | `showSyncStatus()` — dot visual de estado de sync |
| Fix 6 | `getSession()` llama `enterApp()` directamente en vez de esperar `onAuthStateChange` |
| Fix 7 | Usuarios `provider: 'local'` saltan Supabase en `loadState()` |
| Fix 8 | Anti-flash: auth screen oculto antes de pintar si hay sesión en localStorage |
| Fix 9 | Sidebar: eliminado `toggleSidebar()` redundante en botones del menú |
| Fix 10 | `overflow-y: scroll` en html para scrollbar siempre visible |
| Fix 11 | Credenciales embebidas en `main.js` como fallback — elimina dependencia de `config.js` en producción |
| Fix 12 | Script AdSense duplicado eliminado del `<head>` — quedó una sola instancia con Publisher ID real |

---

## 14. SCRIPT DE RESCATE (consola del navegador)

Si los datos no cargan, ejecutar `fc-rescue.js` en la consola:
1. Abrí la app → logueate
2. F12 → Console
3. Pegá el contenido de `fc-rescue.js` → Enter

El script: lee localStorage → aplica al State → actualiza UI → sube a Supabase.

---

## 15. MEJORAS PROPUESTAS

### 🔴 Críticas

**A. Presupuesto mensual con historial**
El presupuesto actual es estático — al cambiar de mes se pierden los valores. Falta guardar snapshots por mes (`YYYY-MM`), comparativa y autocompletar desde el mes anterior.

**B. Manutención hijos como módulo**
Módulo dedicado: monto acordado/pagado/pendiente por mes, alertas de vencimiento, historial por hijo.

**C. Importar/exportar datos**
`exportData()` existe pero no tiene botón en la UI. Crucial para respaldo manual ante riesgo de pérdida en localStorage.

### 🟡 Importantes

**D. Cuotas de deuda en presupuesto**
Las cuotas calculadas en Deudas deberían sugerirse automáticamente como gasto fijo en el presupuesto.

**E. Ajuste por inflación en proyección anual**
Permitir ingresar % de inflación mensual esperado (en lugar del array `variation` hardcodeado).

**F. Notificaciones / recordatorios**
Alertas de vencimiento de deudas, alcancías próximas a vencer, presupuesto excedido por categoría.

**G. Modo offline completo (PWA)**
`manifest.json` + Service Worker básico para instalar como app en el celular.

**H. Categoría "Hijos" más visible**
Filtros rápidos por `hijos`, resumen mensual en el Dashboard.

### 🟢 Mejoras de UX

**I. Agregar transacción rápida desde Dashboard**
Modal precargado con fecha de hoy y tipos más usados.

**J. Búsqueda en transacciones**
Campo de búsqueda por descripción (actualmente solo hay filtros).

**K. Gráfico de deuda en el tiempo**
Proyección de cuándo quedarán saldadas las deudas si se paga la cuota sugerida.

**L. Tema `mac` completo**
El tema macOS tiene tokens pero le falta definición completa dark/light.

**M. og:image para Open Graph**
Guardar screenshot de la app como `/og-image.png` y referenciarlo en el `<head>`.

---

## 16. INSTRUCCIONES PARA CLAUDE (próxima sesión)

Al inicio de cada sesión:
1. El usuario sube `main.js`, `index.html`, `style.css`
2. Claude **siempre trabaja sobre los archivos subidos** como base
3. Nunca asumir que outputs de sesiones anteriores están disponibles
4. Verificar con `node --check main.js` antes de entregar
5. Siempre entregar los 3 archivos aunque solo se modificó uno

**Comandos de verificación rápida:**
```bash
node --check main.js
grep -c "function " main.js          # debe ser ~105+
wc -l main.js index.html style.css  # ~1895 / ~894 / ~1300
grep "budgetYear" main.js            # debe existir (navegador de mes)
grep "getItemActual" main.js         # debe existir (auto-cálculo presupuesto)
grep "ad-footer-wrap" index.html     # debe existir (4 ocurrencias)
grep "sec-ahorro" index.html         # debe existir
grep "\.ad-label" style.css          # debe existir (CSS publicidad)
grep "ca-pub-2282157571185363" index.html  # debe existir (Publisher ID AdSense)
grep "fincontrol\|FinControl" main.js      # debe ser 0 resultados
```

**Estado esperado de los archivos correctos:**
- `main.js`: ~1895+ líneas, ~105+ funciones, sin errores de sintaxis, credenciales Supabase embebidas como fallback, sin referencias a FinControl
- `index.html`: ~894+ líneas, secciones: dashboard, gastos, presupuesto, calendario, deudas, ahorro, anual. SEO completo, favicon SVG, 6 bloques de publicidad, Publisher ID `ca-pub-2282157571185363` en una sola instancia del script AdSense
- `style.css`: ~1300+ líneas, incluye temas y sección de publicidad al final (`.ad-banner-wrap`, `.ad-footer-wrap`, `.ad-sidebar`)