/**
 * FinControl — fc-rescue.js
 *
 * Script de rescate: carga datos desde localStorage, los aplica al State
 * de la app y los sube a Supabase.
 *
 * CÓMO USAR (sin subir al servidor):
 *   1. Abrí la app en el navegador: codepitter.github.io/FinControl
 *   2. Iniciá sesión normalmente
 *   3. Abrí DevTools → Console (F12)
 *   4. Pegá TODO este código y presioná Enter
 *
 * También podés ejecutarlo sección por sección (ver funciones individuales).
 */

(async function fcRescue() {

  // ── 1. Leer sesión activa ────────────────────────────────────────────────
  const sessionRaw = localStorage.getItem('fc-session');
  if (!sessionRaw) {
    console.error('[RESCUE] ❌ No hay sesión guardada. Iniciá sesión primero y volvé a ejecutar.');
    return;
  }
  const session = JSON.parse(sessionRaw);
  console.log('[RESCUE] 👤 Usuario detectado:', session.email);

  // ── 2. Leer datos del localStorage ──────────────────────────────────────
  const dataKey = 'fc-data-' + session.email;
  const raw = localStorage.getItem(dataKey);
  if (!raw) {
    console.error('[RESCUE] ❌ No hay datos guardados para', session.email);
    console.log('[RESCUE] Claves disponibles en localStorage:',
      Object.keys(localStorage).filter(k => k.startsWith('fc-'))
    );
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[RESCUE] ❌ Datos corruptos en localStorage:', e);
    return;
  }

  console.log('[RESCUE] 📦 Datos encontrados en localStorage:');
  console.table({
    transacciones: data.transactions?.length ?? 0,
    eventos:       data.calEvents?.length ?? 0,
    deudas:        data.debts?.length ?? 0,
    metas:         data.goals?.length ?? 0,
    presupIncome:  data.budget?.income?.length ?? 0,
    presupFixed:   data.budget?.fixed?.length ?? 0,
    presupVar:     data.budget?.variable?.length ?? 0,
  });

  // ── 3. Aplicar al State de la app ────────────────────────────────────────
  if (typeof State === 'undefined' || typeof applyStateData === 'undefined') {
    console.error('[RESCUE] ❌ La app no está cargada. Asegurate de estar en codepitter.github.io/FinControl con sesión activa.');
    return;
  }

  applyStateData(data);
  console.log('[RESCUE] ✅ State de la app actualizado');

  // ── 4. Refrescar la UI ───────────────────────────────────────────────────
  if (typeof rerenderCurrentSection === 'function') {
    rerenderCurrentSection();
    console.log('[RESCUE] 🖥️  UI actualizada — los datos deberían verse en pantalla ahora');
  }

  // ── 5. Subir a Supabase ──────────────────────────────────────────────────
  if (typeof sb === 'undefined' || !sb) {
    console.warn('[RESCUE] ⚠️  Supabase no está inicializado. Los datos se aplicaron al State pero NO se subieron a la nube.');
    return;
  }

  // Obtener uid de Supabase
  let uid = State.user?.supabaseId ?? null;
  if (!uid) {
    try {
      const { data: { user }, error } = await sb.auth.getUser();
      if (error || !user) {
        console.warn('[RESCUE] ⚠️  No hay sesión activa de Supabase. Los datos se aplicaron localmente pero no se subieron.');
        console.log('[RESCUE] 💡 Tip: cerrá sesión, volvé a loguearte con email/contraseña vía Supabase y ejecutá este script de nuevo.');
        return;
      }
      uid = user.id;
      if (State.user) State.user.supabaseId = uid;
      console.log('[RESCUE] 🔑 UID de Supabase obtenido:', uid);
    } catch (e) {
      console.error('[RESCUE] ❌ Error al obtener usuario de Supabase:', e);
      return;
    }
  } else {
    console.log('[RESCUE] 🔑 UID de Supabase (desde State):', uid);
  }

  // Hacer el upsert
  try {
    const { error } = await sb
      .from('user_data')
      .upsert(
        { id: uid, data, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('[RESCUE] ❌ Error al guardar en Supabase:', error.message, error.details);
      console.log('[RESCUE] 💡 Tip: verificá que la tabla user_data existe y tiene RLS habilitado.');
    } else {
      console.log('[RESCUE] ☁️  ¡Datos subidos a Supabase exitosamente!');
      console.log('[RESCUE] 🎉 Todo listo. Recargá la página para confirmar que carga desde la nube.');
    }
  } catch (e) {
    console.error('[RESCUE] ❌ Excepción al hacer upsert:', e);
  }

})();
