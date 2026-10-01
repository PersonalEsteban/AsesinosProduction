// Modal de login por código -> /api/login
// Se abre con cualquier enlace a #ingresar, o al llegar con /#ingresar
// (por ejemplo, cuando el panel redirige porque la sesión expiró).
const dlg = document.getElementById('dlg-login');
const form = document.getElementById('form-login');
const estado = document.getElementById('login-estado');

function abrir() {
  estado.className = 'estado';
  estado.textContent = '';
  if (!dlg.open) dlg.showModal();
  form.codigo.focus();
}

document.querySelectorAll('a[href="#ingresar"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    e.preventDefault();
    abrir();
  })
);
if (location.hash === '#ingresar') abrir();

// Cerrar: botón ×, tecla Escape (nativo del <dialog>) o clic fuera del cuadro
dlg.querySelector('[data-cerrar]').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => {
  if (e.target === dlg) dlg.close();
});
dlg.addEventListener('close', () => {
  form.reset();
  if (location.hash === '#ingresar') history.replaceState(null, '', location.pathname);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  estado.className = 'estado';
  estado.textContent = '';

  const codigo = form.codigo.value.trim();
  if (!codigo) {
    estado.className = 'estado error';
    estado.textContent = 'Ingresa tu código.';
    return;
  }

  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo ingresar.');
    location.href = '/app/';
  } catch (err) {
    estado.className = 'estado error';
    estado.textContent = err instanceof TypeError ? 'Error de conexión. Intenta de nuevo.' : err.message;
    boton.disabled = false;
  }
});
