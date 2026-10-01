// Panel privado. Muestra los módulos según el rol de la sesión:
//   admin   -> Proyectos (crear, avances, códigos de cliente) + Usuarios
//   empresa -> Proyectos (cargar avances)
//   cliente -> solo el avance de su proyecto
const vista = document.getElementById('vista');
const nav = document.getElementById('nav');
let yo = null;

const ROL_NOMBRE = { admin: 'Administrador', empresa: 'Empresa', cliente: 'Cliente' };

// ---------- Utilidades ----------

// Crea elementos sin innerHTML: los datos de la base nunca se interpretan como HTML
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

async function api(metodo, url, cuerpo) {
  let res;
  try {
    res = await fetch(url, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error('Error de conexión. Intenta de nuevo.');
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.href = '/#ingresar';
    throw new Error('Tu sesión expiró.');
  }
  if (!res.ok || !json.ok) throw new Error(json.error || 'Ocurrió un error.');
  return json;
}

const fecha = (iso) =>
  iso ? new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function barra(pct) {
  const relleno = h('div', { class: 'barra-relleno' });
  relleno.style.width = `${pct}%`;
  return h('div', {
    class: 'barra', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
  }, relleno);
}

// Formulario con mensaje de error y botón deshabilitado mientras envía
function formulario(campos, textoBoton, alEnviar) {
  const estado = h('p', { class: 'estado', role: 'status' });
  const boton = h('button', { type: 'submit', class: 'btn' }, textoBoton);
  const form = h('form', { class: 'form', novalidate: true }, campos, boton, estado);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    estado.className = 'estado';
    estado.textContent = '';
    boton.disabled = true;
    try {
      await alEnviar(Object.fromEntries(new FormData(form)));
    } catch (err) {
      estado.className = 'estado error';
      estado.textContent = err.message;
    } finally {
      boton.disabled = false;
    }
  });
  return form;
}

function botonAccion(texto, accion) {
  const b = h('button', { type: 'button', class: 'btn btn-sec btn-chico' }, texto);
  b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await accion();
    } catch (err) {
      alert(err.message);
    } finally {
      b.disabled = false;
    }
  });
  return b;
}

function tabla(cabeceras, filas) {
  return h('div', { class: 'tabla-scroll' },
    h('table', { class: 'tabla' },
      h('thead', {}, h('tr', {}, cabeceras.map((c) => h('th', {}, c)))),
      h('tbody', {}, filas.map((f) => h('tr', {}, f.map((c) => h('td', {}, c)))))));
}

// Los códigos solo se guardan cifrados: este es el único momento en que se ven
function codigoNuevo(titulo, codigo) {
  const copiar = h('button', { type: 'button', class: 'btn btn-sec btn-chico' }, 'Copiar');
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      copiar.textContent = 'Copiado';
    } catch {
      copiar.textContent = 'Cópialo manualmente';
    }
  });
  return h('div', { class: 'codigo-nuevo', role: 'alert' },
    h('p', {}, titulo),
    h('div', { class: 'codigo-fila' }, h('code', { class: 'codigo' }, codigo), copiar),
    h('p', { class: 'muted chico' }, 'Guárdalo ahora: por seguridad no se volverá a mostrar.'));
}

// ---------- Vistas ----------

async function vistaProyectos() {
  const { proyectos } = await api('GET', '/api/proyectos');

  const lista = proyectos.length
    ? h('div', { class: 'lista' }, proyectos.map((p) =>
        h('a', { class: 'tarjeta', href: `#/proyectos/${p.id}` },
          h('div', { class: 'fila-entre' }, h('strong', {}, p.nombre), h('span', { class: 'pct' }, `${p.avance}%`)),
          barra(p.avance),
          h('p', { class: 'muted chico' }, `Actualizado: ${fecha(p.actualizado_en)}`))))
    : h('p', { class: 'muted' }, 'Aún no hay proyectos.');

  const crear = yo.rol === 'admin'
    ? h('section', { class: 'block' },
        h('h2', {}, 'Nuevo proyecto'),
        formulario([
          h('label', {}, 'Nombre', h('input', { name: 'nombre', required: true, maxlength: 150 })),
          h('label', {}, 'Descripción (opcional)', h('textarea', { name: 'descripcion', rows: 3, maxlength: 2000 })),
        ], 'Crear proyecto', async (d) => {
          const { proyecto } = await api('POST', '/api/proyectos', d);
          location.hash = `#/proyectos/${proyecto.id}`;
        }))
    : null;

  return h('div', {}, h('section', { class: 'block' }, h('h2', {}, 'Proyectos'), lista), crear);
}

async function vistaProyecto(id) {
  const { proyecto: p, avances, codigos } = await api('GET', `/api/proyectos/${id}`);
  const partes = [];

  partes.push(h('section', { class: 'block' },
    yo.rol !== 'cliente' ? h('a', { href: '#/proyectos', class: 'volver' }, '← Proyectos') : null,
    h('h2', {}, p.nombre),
    p.descripcion ? h('p', { class: 'muted pre' }, p.descripcion) : null,
    h('div', { class: 'avance-grande' }, h('span', { class: 'pct' }, `${p.avance}%`), barra(p.avance)),
    h('p', { class: 'muted chico' }, `Última actualización: ${fecha(p.actualizado_en)}`)));

  if (yo.rol !== 'cliente') {
    partes.push(h('section', { class: 'block' },
      h('h2', {}, 'Registrar avance'),
      formulario([
        h('label', {}, 'Porcentaje de avance total (0–100)',
          h('input', { name: 'porcentaje', type: 'number', min: 0, max: 100, step: 1, value: p.avance, required: true })),
        h('label', {}, 'Descripción', h('textarea', { name: 'descripcion', rows: 3, maxlength: 2000, required: true })),
      ], 'Guardar avance', async (d) => {
        if (d.porcentaje === '') throw new Error('Indica el porcentaje.');
        await api('POST', `/api/proyectos/${id}/avances`, {
          porcentaje: Number(d.porcentaje),
          descripcion: d.descripcion,
        });
        await router();
      })));
  }

  partes.push(h('section', { class: 'block' },
    h('h2', {}, 'Historial de avances'),
    avances.length
      ? h('ol', { class: 'historial' }, avances.map((a) =>
          h('li', {},
            h('div', { class: 'fila-entre' },
              h('strong', {}, `${a.porcentaje}%`),
              h('span', { class: 'muted chico' }, fecha(a.creado_en) + (a.autor ? ` · ${a.autor}` : ''))),
            h('p', { class: 'pre' }, a.descripcion))))
      : h('p', { class: 'muted' }, 'Sin avances registrados.')));

  if (codigos) {
    partes.push(h('section', { class: 'block' },
      h('h2', {}, 'Códigos de acceso para clientes'),
      h('p', { class: 'muted chico' }, 'Quien tenga un código activo puede ver el avance de este proyecto.'),
      formulario([
        h('label', {}, 'Etiqueta (opcional, ej: nombre del cliente)', h('input', { name: 'etiqueta', maxlength: 100 })),
      ], 'Generar código', async (d) => {
        const { valor } = await api('POST', `/api/proyectos/${id}/codigos`, d);
        await router(codigoNuevo(`Código de acceso para "${p.nombre}"`, valor));
      }),
      codigos.length
        ? tabla(['Etiqueta', 'Estado', 'Creado', 'Último acceso', ''], codigos.map((c) => [
            c.etiqueta || '—',
            c.activo ? 'Activo' : 'Revocado',
            fecha(c.creado_en),
            fecha(c.ultimo_acceso),
            botonAccion(c.activo ? 'Revocar' : 'Reactivar', async () => {
              if (c.activo && !confirm('¿Revocar este código? Quien lo use perderá el acceso de inmediato.')) return;
              await api('PATCH', `/api/codigos/${c.id}`, { accion: c.activo ? 'desactivar' : 'activar' });
              await router();
            }),
          ]))
        : null));
  }

  return h('div', {}, partes);
}

async function vistaUsuarios() {
  const { usuarios } = await api('GET', '/api/usuarios');

  const acciones = (u) => {
    const propio = u.id === yo.usuarioId;
    return [
      botonAccion('Nuevo código', async () => {
        const aviso = propio
          ? '¿Generar un nuevo código para ti? Tu código actual dejará de servir y se cerrará tu sesión.'
          : `¿Generar un nuevo código para ${u.nombre}? El actual dejará de servir y se cerrarán sus sesiones.`;
        if (!confirm(aviso)) return;
        const { codigo } = await api('PATCH', `/api/usuarios/${u.id}`, { accion: 'regenerar' });
        const caja = codigoNuevo(`Nuevo código de ${u.nombre}`, codigo);
        if (propio) {
          // La sesión actual ya fue cerrada en el servidor
          vista.replaceChildren(caja, h('a', { href: '/#ingresar', class: 'btn' }, 'Ingresar con el nuevo código'));
        } else {
          await router(caja);
        }
      }),
      propio ? null : botonAccion(u.activo ? 'Desactivar' : 'Activar', async () => {
        if (u.activo && !confirm(`¿Desactivar a ${u.nombre}? Perderá el acceso de inmediato.`)) return;
        await api('PATCH', `/api/usuarios/${u.id}`, { accion: u.activo ? 'desactivar' : 'activar' });
        await router();
      }),
    ];
  };

  return h('div', {},
    h('section', { class: 'block' },
      h('h2', {}, 'Nuevo usuario'),
      formulario([
        h('label', {}, 'Nombre', h('input', { name: 'nombre', required: true, maxlength: 100 })),
        h('label', {}, 'Tipo',
          h('select', { name: 'rol' },
            h('option', { value: 'empresa' }, 'Empresa (carga avances de proyectos)'),
            h('option', { value: 'admin' }, 'Administrador (acceso total)'))),
      ], 'Crear usuario', async (d) => {
        const { usuario, codigo } = await api('POST', '/api/usuarios', d);
        await router(codigoNuevo(`Código de acceso de ${usuario.nombre}`, codigo));
      })),
    h('section', { class: 'block' },
      h('h2', {}, 'Usuarios'),
      tabla(['Nombre', 'Tipo', 'Estado', 'Último acceso', ''], usuarios.map((u) => [
        u.nombre + (u.id === yo.usuarioId ? ' (tú)' : ''),
        ROL_NOMBRE[u.rol],
        u.activo ? 'Activo' : 'Inactivo',
        fecha(u.ultimo_acceso),
        h('div', { class: 'acciones' }, acciones(u)),
      ]))));
}

// ---------- Navegación (#/proyectos, #/proyectos/5, #/usuarios) ----------

function armarNav() {
  if (yo.rol === 'cliente') return;
  const links = [['proyectos', 'Proyectos']];
  if (yo.rol === 'admin') links.push(['usuarios', 'Usuarios']);
  nav.replaceChildren(...links.map(([s, t]) => h('a', { href: `#/${s}`, 'data-seccion': s }, t)));
}

async function router(aviso = null) {
  const [, seccion = 'proyectos', id] = location.hash.split('/');
  for (const a of nav.children) a.classList.toggle('activo', a.dataset.seccion === seccion);

  try {
    let contenido;
    if (yo.rol === 'cliente') contenido = await vistaProyecto(yo.proyecto.id);
    else if (seccion === 'usuarios' && yo.rol === 'admin') contenido = await vistaUsuarios();
    else if (seccion === 'proyectos' && id) contenido = await vistaProyecto(id);
    else contenido = await vistaProyectos();
    vista.replaceChildren(...[aviso, contenido].filter(Boolean));
    if (aviso) window.scrollTo(0, 0);
  } catch (err) {
    vista.replaceChildren(h('p', { class: 'estado error' }, err.message));
  }
}

window.addEventListener('hashchange', () => router());

document.getElementById('salir').addEventListener('click', async () => {
  try {
    await api('POST', '/api/logout');
  } catch {
    // Igual se redirige al login
  }
  location.href = '/';
});

(async () => {
  try {
    yo = await api('GET', '/api/me');
  } catch (err) {
    vista.replaceChildren(h('p', { class: 'estado error' }, err.message));
    return;
  }
  document.getElementById('quien').textContent = `${yo.nombre} · ${ROL_NOMBRE[yo.rol]}`;
  armarNav();
  await router();
})();
