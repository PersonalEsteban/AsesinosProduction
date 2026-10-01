// Año actual en el footer
document.getElementById('anio').textContent = new Date().getFullYear();

// Formulario de contacto -> /api/contacto (Pages Function)
const form = document.getElementById('form-contacto');
const estado = document.getElementById('form-estado');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  estado.className = '';
  estado.textContent = '';

  const datos = Object.fromEntries(new FormData(form));

  if (!datos.nombre?.trim() || !datos.email?.trim() || !datos.mensaje?.trim()) {
    estado.className = 'error';
    estado.textContent = 'Completa todos los campos.';
    return;
  }

  const boton = form.querySelector('button');
  boton.disabled = true;
  boton.textContent = 'Enviando…';

  try {
    const res = await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      estado.className = 'ok';
      estado.textContent = '¡Mensaje enviado! Te responderemos pronto.';
      form.reset();
    } else {
      throw new Error(json.error || 'No se pudo enviar el mensaje.');
    }
  } catch (err) {
    estado.className = 'error';
    estado.textContent = err.message;
  } finally {
    boton.disabled = false;
    boton.textContent = 'Enviar';
  }
});
