# FinControl — Referencia Técnica Completa

> Este documento describe en detalle la arquitectura, convenciones, flujos y decisiones de implementación del proyecto.

---

## Estructura de archivos

```
fincontrol/
│
├── index.html
│   ├── <head>
│   │   ├── Google Fonts (8 familias)
│   │   ├── Chart.js 4.4.1 (CDN)
│   │   └── Google Identity Services (CDN, async)
│   │
│   ├── #authScreen              ← pantalla de login/registro
│   │   ├── #loginForm           ← tab login
│   │   └── #registerForm        ← tab registro
│   │
│   └── #appShell  (hidden hasta login)
│       ├── <nav.topnav>         ← barra superior fija
│       ├── <aside.sidebar>      ← menú móvil
│       ├── <main.app-main>
│       │   ├── #sec-dashboard
│       │   ├── #sec-gastos
│       │   ├── #sec-presupuesto
│       │   ├── #sec-calendario
│       │   ├── #sec-deudas
│       │   └── #sec-anual
│       ├── <aside.theme-panel>  ← panel de temas (slide-in)
│       └── Modals
│           ├── #txOverlay       ← nueva transacción
│           ├── #calOverlay      ← nuevo evento de calendario
│           └── #debtOverlay     ← nueva deuda
│
├── css/style.css
│   ├── Reset & base
│   ├── Theme tokens (6 temas × 2 modos = 12 bloques de variables)
│   ├── Swatch classes para theme panel
│   ├── Efectos de fondo por tema (::before / ::after)
│   ├── Auth screen
│   ├── Topnav
│   ├── Sidebar
│   ├── App layout
│   ├── Componentes (cards, KPIs, buttons, chips, badges, tables,
│   │              forms, progress bars, calendar, debt cards,
│   │              calc result, goals, budget rows, charts, grids)
│   ├── Modals
│   ├── Theme panel + mini preview
│   ├── Toast
│   └── Responsive (1024px, 768px, 480px)
│
└── js/main.js
    ├── GOOGLE_CLIENT_ID         ← configurar aquí
    ├── State {}                 ← estado global centralizado
    ├── CATS []                  ← categorías de transacción
    ├── Utils (fmt, today, getMonthTxs, calcTotals, showToast,
    │          makeChart, destroyChart, chartDefaults)
    ├── Theme & Mode (setTheme, setMode, toggleMode,
    │                openThemePanel, closeThemePanel)
    ├── Auth
    │   ├── Google (initGoogleAuth, loginWithGoogle,
    │   │           handleGoogleCredential)
    │   ├── Email  (getLocalUsers, saveLocalUsers, hashPass,
    │   │           registerWithEmail, loginWithEmail)
    │   └── Common (showAuthError, clearAuthErrors, enterApp,
    │               switchAuthTab, loginDemo, logout,
    │               toggleUserMenu)
    ├── App Init (initApp)
    ├── Navigation (showSection, rerenderCurrentSection,
    │              renderSection, toggleSidebar)
    ├── Populate selects
    ├── Dashboard (renderDashboard, isThisMonth, renderTxRows)
    ├── Gastos (renderGastos, clearFilters)
    ├── Transactions (openTxModal, closeTxModal, saveTx, deleteTx)
    ├── Presupuesto (renderBudget, renderBudgetSection,
    │               addBudgetRow, removeBudgetRow,
    │               updateBudgetName, updateBudgetAmt,
    │               renderBudgetSummary, renderBudgetChart,
    │               renderGoals, addGoal, removeGoal,
    │               updateGoalSaved, saveBudgetFeedback)
    ├── Calendario (renderCalendar, prevMonth, nextMonth,
    │              openCalModal, closeCalModal,
    │              saveCalEvent, deleteCalEvent)
    ├── Deudas (renderDebts, openDebtModal, closeDebtModal,
    │           saveDebt, deleteDebt, payDebt, calcPayment)
    ├── Anual (setYear, renderAnual)
    ├── Chips (setChipActive)
    ├── Export (exportData)
    └── Startup (IIFE para tema, window.onload para sesión + Google)
```

---

## Variables CSS (Design Tokens)

Cada combinación `[data-theme][data-mode]` define el mismo conjunto de tokens:

```css
--clr-bg          /* fondo principal */
--clr-bg2         /* fondo secundario (cards, modals) */
--clr-bg3         /* fondo terciario (inputs, calendarios) */
--clr-border      /* bordes y separadores */
--clr-text        /* texto principal */
--clr-muted       /* texto secundario / labels */
--clr-accent      /* color de acento primario */
--clr-accent2     /* color de acento secundario */
--clr-success     /* verde positivo */
--clr-danger      /* rojo negativo */
--clr-warn        /* amarillo advertencia */
--clr-purple      /* acento adicional */
--clr-nav-bg      /* fondo de la barra de navegación */
--clr-card        /* fondo de tarjetas */
--clr-input       /* fondo de inputs */
--clr-hover       /* fondo en estado hover */
--card-radius     /* radio de bordes de tarjetas */
--font-display    /* tipografía para títulos y KPIs */
--font-mono       /* tipografía monoespaciada */
--font-body       /* tipografía de cuerpo */
--nav-height      /* altura de la barra de navegación */
--shadow-card     /* sombra de tarjetas */
--shadow-accent   /* sombra con color de acento */
--shadow-modal    /* sombra de modales y paneles */
--glow-text       /* text-shadow para temas con glow */
--border-top-bar  /* gradiente decorativo superior */
```

---

## Modelo de datos

### Transaction

```js
{
  id:     number,   // autoincremental desde State.txIdCounter
  type:   'gasto' | 'ingreso',
  date:   'YYYY-MM-DD',
  desc:   string,
  amount: number,   // siempre positivo
  cat:    string,   // id de CATS[]
  freq:   'único' | 'diario' | 'semanal' | 'mensual' | 'anual',
  notes:  string
}
```

### CalEvent

```js
{
  id:     number,
  date:   'YYYY-MM-DD',
  type:   'vencimiento' | 'cobro' | 'recordatorio' | 'gasto',
  desc:   string,
  amount: number
}
```

### Debt

```js
{
  id:       number,
  name:     string,
  total:    number,     // monto original
  remaining:number,     // saldo pendiente
  cuotas:   number,
  interest: number,     // tasa mensual en %
  due:      'YYYY-MM-DD',
  paid:     number      // total pagado
}
```

### BudgetItem

```js
{
  id:     number,
  name:   string,
  amount: number,   // presupuestado
  actual: number    // gasto real
}
```

### Goal

```js
{
  id:     number,
  name:   string,
  target: number,
  saved:  number
}
```

### User (State.user)

```js
{
  name:     string,
  email:    string,
  picture:  string | undefined,   // URL foto de Google
  avatar:   string,               // inicial para fallback
  provider: 'google' | 'local' | 'demo'
}
```

---

## Flujo de autenticación

```
┌─────────────────────────────────────────────────────┐
│                  window.onload                      │
│  1. initGoogleAuth()  ← inicializa GIS              │
│  2. localStorage.getItem('fc-session')              │
│     └── si existe y provider !== 'demo' → enterApp()│
└─────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  Auth Screen │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     Google OAuth    Email/Password     Demo mode
           │               │               │
   GIS popup/One Tap  SHA-256 hash     enterApp()
           │           localStorage         │
   handleGoogleCredential()  │              │
           │           enterApp()           │
           └───────────────┴───────────────┘
                           │
                      enterApp(user)
                           │
              ┌────────────┼────────────┐
              │            │            │
         guarda        muestra       initApp()
      fc-session      avatar/foto
```

---

## Cálculo de cuotas (interés compuesto)

La app usa la fórmula estándar de amortización francesa (cuota fija):

```
       r × (1 + r)^n
C = D × ─────────────
        (1 + r)^n - 1

donde:
  C = cuota mensual
  D = deuda (capital)
  r = tasa de interés mensual (decimal)
  n = número de cuotas
```

Si la tasa es 0%, se divide el capital directamente:
```
C = D / n
```

Implementado en `calcPayment()` y `renderDebts()`.

---

## Proyección anual

La sección "Anual" aplica un array de variación estacional sobre los totales del presupuesto:

```js
const variation = [0.9, 0.92, 1, 1.02, 0.95, 1.05, 1.1, 0.98, 1, 1.02, 1.15, 1.3];
//                 Ene  Feb  Mar Abr   May   Jun  Jul  Ago  Sep  Oct  Nov  Dic
```

Diciembre tiene factor 1.3 (gastos navideños), Enero 0.9 (post-fiestas). Es solo visual/estimativo.

---

## Gráficos (Chart.js)

| Canvas ID     | Tipo      | Sección       | Descripción |
|---------------|-----------|---------------|-------------|
| `chartPie`    | doughnut  | Dashboard     | Distribución de gastos por categoría |
| `chartBar`    | bar       | Dashboard     | Ingresos vs gastos últimos 6 meses |
| `chartDaily`  | bar       | Gastos        | Gasto diario del mes actual |
| `chartBudget` | bar       | Presupuesto   | Presupuestado vs real por ítem |
| `chartAnual`  | line      | Anual         | Proyección de 12 meses (ingresos, egresos, saldo) |

Todos los gráficos se destruyen y recrean en cada render usando `destroyChart()` + `makeChart()` para evitar memory leaks de Chart.js.

```js
function makeChart(canvasId, config) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  const inst = new Chart(canvas, config);
  canvas._chartInst = inst;   // ← referencia manual en el DOM
  return inst;
}
```

---

## Convenciones de código

| Convención | Descripción |
|---|---|
| `State.*` | Todo el estado mutable vive en el objeto global `State` |
| `render*()` | Funciones que actualizan el DOM. Siempre idempotentes |
| `open/close*Modal()` | Abrir/cerrar overlays de modales |
| `save*()` | Leer formulario, validar, pushear al State, cerrar modal, toast, re-render |
| `delete*(id)` | Filtrar el array correspondiente del State, re-render |
| `fmt(n)` | Formatea un número como `$1.234.567` (locale es-AR) |
| `GOOGLE_CLIENT_ID` | Única constante de configuración externa |
| `fc-*` | Prefijo de todas las claves de `localStorage` del proyecto |

---

## LocalStorage keys

| Clave | Tipo | Descripción |
|---|---|---|
| `fc-theme` | string | Tema activo: `'cyber'`, `'future'`, etc. |
| `fc-mode` | string | Modo: `'dark'` o `'light'` |
| `fc-session` | JSON | Usuario logueado (`User` object) |
| `fc-users` | JSON | Mapa `{ email → UserRecord }` de cuentas locales |

---

## Responsive breakpoints

| Breakpoint | Cambios |
|---|---|
| `≤ 1024px` | KPI grid pasa a 2 columnas; grid-3 pasa a 2 columnas |
| `≤ 768px` | Nav central se oculta, aparece hamburger; grids a 1 columna; theme panel a ancho completo |
| `≤ 480px` | KPI grid a 1 columna; padding reducido en main y cards; auth card con menos padding |

---

## Checklist para nuevo desarrollo

- [ ] ¿El nuevo estado va en `State`?
- [ ] ¿La función de render es idempotente (puede llamarse múltiples veces sin efectos secundarios)?
- [ ] ¿Los gráficos nuevos usan `makeChart()` / `destroyChart()`?
- [ ] ¿Los estilos van en `style.css` (sin `style=` inline en HTML)?
- [ ] ¿Las nuevas claves de `localStorage` usan el prefijo `fc-`?
- [ ] ¿El `GOOGLE_CLIENT_ID` y otros secrets están en `.gitignore`?
- [ ] ¿Se actualizó `STRUCTURE.md`?
