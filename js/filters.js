/* =========================================================
   FILTERS — secciones, categorías, panel "Filtrar", búsqueda y carga de los JSON
   ========================================================= */

// Cada sección del catálogo sale de su propio JSON
const SECCIONES = [
  { clave: "pastas", nombre: "Pastas frescas", archivo: "data/productos.json" },
  { clave: "bebidas", nombre: "Bebidas", archivo: "data/bebidas.json" },
  { clave: "lacteos", nombre: "Lácteos", archivo: "data/lacteos.json" },
  { clave: "panaderia", nombre: "Panadería", archivo: "data/panaderia.json" },
  { clave: "almacen", nombre: "Almacén", archivo: "data/almacen.json" }
];

const DEMORA_BUSQUEDA = 150;

/* ---------- Utilidades ---------- */

function conjuntoDeGrupo(grupo) {
  if (grupo === "tipo") return tiposActivos;
  if (grupo === "variedad") return variedadesActivas;
  return null;
}

function capitalizar(texto) {
  const limpio = String(texto ?? "").trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// Minúsculas y sin tildes, para comparar búsquedas
function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function valoresUnicos(lista, campo) {
  const vistos = new Set();
  lista.forEach((producto) => {
    const valor = producto[campo];
    if (typeof valor === "string" && valor.trim() !== "") vistos.add(valor.trim());
  });
  return [...vistos];
}

function ordenarAlfabetico(lista) {
  return [...lista].sort((a, b) => a.localeCompare(b, "es"));
}

function buscarSeccion(clave) {
  return SECCIONES.find((seccion) => seccion.clave === clave) || null;
}

function productosDeSeccion(clave) {
  return clave === "todos" ? productos : productos.filter((p) => p.seccion === clave);
}

/* ---------- Filtrado ---------- */

function obtenerProductosFiltrados() {
  const texto = normalizarTexto(textoSearchActivo);

  return productos.filter((producto) => {
    // Explorar (selección única)
    if (seccionActiva !== "todos" && producto.seccion !== seccionActiva) return false;
    if (categoriaActiva !== "todos" && producto.categoria !== categoriaActiva) return false;

    // Panel "Filtrar": OR dentro del grupo, AND entre grupos
    // "Tipo de producto" = categoría del JSON (permite elegir varias a la vez)
    if (tiposActivos.size > 0 && !tiposActivos.has(producto.categoria)) return false;
    if (variedadesActivas.size > 0 && !variedadesActivas.has(producto.variedad)) return false;

    // Búsqueda por texto
    if (texto) {
      const campos = [
        buscarSeccion(producto.seccion)?.nombre,
        producto.nombre,
        producto.categoria,
        producto.variedad,
        producto.descripcion
      ].map(normalizarTexto).join(" ");
      if (!campos.includes(texto)) return false;
    }

    return true;
  });
}

/* ---------- Vista catálogo ---------- */

function construirTituloCatalogo() {
  const partes = [];

  if (seccionActiva !== "todos") partes.push(buscarSeccion(seccionActiva)?.nombre ?? capitalizar(seccionActiva));
  if (categoriaActiva !== "todos") partes.push(capitalizar(categoriaActiva));
  // No repite la categoría si también está marcada como "Tipo de producto"
  const tiposTitulo = [...tiposActivos].filter((tipo) => tipo !== categoriaActiva);
  if (tiposTitulo.length) partes.push(tiposTitulo.map(capitalizar).join(", "));
  if (variedadesActivas.size) partes.push([...variedadesActivas].join(", "));
  if (textoSearchActivo) partes.push(`"${textoSearchActivo}"`);

  return (
    "Catálogo" +
    partes
      .map((parte) =>
        `<span class="breadcrumb-sep" aria-hidden="true">/</span>` +
        `<span class="breadcrumb-item">${escaparHTML(parte)}</span>`
      )
      .join("")
  );
}

function abrirCatalogo() {
  const yaVisible = !catalogo.classList.contains("oculto");

  inicio.classList.add("oculto");
  destacados.classList.add("oculto");
  preguntasFrecuentes.classList.add("oculto");
  catalogo.classList.remove("oculto");

  if (!yaVisible) window.scrollTo({ top: 0, behavior: "instant" });
}

function marcarSeccionActiva() {
  categoryFilters.querySelectorAll(".categoria-btn").forEach((boton) => {
    const activa = boton.dataset.seccion === seccionActiva;
    boton.classList.toggle("activa", activa);
    if (activa) boton.setAttribute("aria-current", "true");
    else boton.removeAttribute("aria-current");
  });

  categoryFilters.querySelectorAll(".brand-list__btn").forEach((boton) => {
    const activa = boton.dataset.seccion === seccionActiva && boton.dataset.categoria === categoriaActiva;
    boton.classList.toggle("activa", activa);
  });
}

function actualizarCatalogo() {
  const lista = obtenerProductosFiltrados();

  mostrarProductos(lista, catalogoContainer);
  sinResultados.textContent = productosDeSeccion(seccionActiva).length === 0
    ? "Estamos preparando esta sección. Muy pronto vas a encontrar productos acá."
    : "No encontramos productos con esos filtros. Probá con otra búsqueda.";
  sinResultados.classList.toggle("oculto", lista.length > 0);
  catalogoTitulo.innerHTML = construirTituloCatalogo();

  marcarSeccionActiva();
  actualizarResumenFiltros();
}

/* ---------- Render de filtros ---------- */

function opcionFiltroHTML(grupo, valor, etiqueta) {
  return `
    <label class="filtro-opcion">
      <input type="checkbox" class="filtro-check"
             data-grupo="${escaparHTML(grupo)}" value="${escaparHTML(valor)}">
      <span>${escaparHTML(etiqueta)}</span>
    </label>`;
}

// Secciones con sus categorías. Si la sección tiene una sola categoría no se muestra sublista.
function renderizarExplorar() {
  const seccionesHTML = SECCIONES
    .map((seccion) => {
      const categorias = valoresUnicos(productosDeSeccion(seccion.clave), "categoria");
      const tieneSublista = categorias.length > 1;
      const idLista = `subcategorias-${seccion.clave}`;

      const sublistaHTML = tieneSublista
        ? `<ul class="brand-list" id="${idLista}" data-seccion="${escaparHTML(seccion.clave)}"
               aria-label="${escaparHTML(`Categorías de ${seccion.nombre}`)}" inert>
             ${categorias
               .map((categoria) => `
                 <li>
                   <button class="brand-list__btn" type="button"
                           data-seccion="${escaparHTML(seccion.clave)}" data-categoria="${escaparHTML(categoria)}"
                           aria-label="${escaparHTML(`Ver ${seccion.nombre}: ${capitalizar(categoria)}`)}">${escaparHTML(capitalizar(categoria))}</button>
                 </li>`)
               .join("")}
           </ul>`
        : "";

      return `
        <div class="categoria-grupo" role="listitem">
          <button class="categoria-btn" type="button" data-seccion="${escaparHTML(seccion.clave)}"
                  aria-label="${escaparHTML(`Ver sección ${seccion.nombre}`)}"
                  ${tieneSublista ? `aria-expanded="false" aria-controls="${idLista}"` : ""}>
            ${escaparHTML(seccion.nombre)}
          </button>
          ${sublistaHTML}
        </div>`;
    })
    .join("");

  categoryFilters.innerHTML = `
    <div class="categoria-grupo" role="listitem">
      <button class="categoria-btn" type="button" data-seccion="todos"
              aria-label="Ver todas las secciones">Todas</button>
    </div>
    ${seccionesHTML}`;

  categoryFilters.querySelectorAll(".categoria-btn").forEach((boton) => {
    boton.addEventListener("click", seleccionarSeccion);
  });
  categoryFilters.querySelectorAll(".brand-list__btn").forEach((boton) => {
    boton.addEventListener("click", seleccionarCategoria);
  });
}

// Panel "Filtrar": las opciones de tipo y variedad son las de la sección elegida
function renderizarOpcionesFiltro() {
  const disponibles = productosDeSeccion(seccionActiva);

  filtroTipoContenedor.innerHTML = valoresUnicos(disponibles, "categoria")
    .map((categoria) => opcionFiltroHTML("tipo", categoria, capitalizar(categoria)))
    .join("");

  filtroVariedadContenedor.innerHTML = ordenarAlfabetico(valoresUnicos(disponibles, "variedad"))
    .map((variedad) => opcionFiltroHTML("variedad", variedad, capitalizar(variedad)))
    .join("");

  sincronizarCheckboxesFiltro();
}

function renderizarFiltros() {
  renderizarExplorar();
  renderizarOpcionesFiltro();
  marcarSeccionActiva();
  actualizarResumenFiltros();
}

/* ---------- Secciones y categorías (Explorar) ---------- */

function cerrarSubcategorias(exceptoSeccion) {
  categoryFilters.querySelectorAll(".brand-list").forEach((lista) => {
    if (lista.dataset.seccion === exceptoSeccion) return;
    lista.classList.remove("abierta");
    lista.inert = true;
  });

  categoryFilters.querySelectorAll(".categoria-btn[aria-expanded]").forEach((boton) => {
    if (boton.dataset.seccion === exceptoSeccion) return;
    boton.setAttribute("aria-expanded", "false");
  });
}

function alternarSubcategorias(seccion) {
  const lista = [...categoryFilters.querySelectorAll(".brand-list")]
    .find((el) => el.dataset.seccion === seccion);
  if (!lista) return;

  const abrir = !lista.classList.contains("abierta");
  cerrarSubcategorias(seccion);

  lista.classList.toggle("abierta", abrir);
  lista.inert = !abrir;

  const boton = [...categoryFilters.querySelectorAll(".categoria-btn")]
    .find((el) => el.dataset.seccion === seccion);
  if (boton) boton.setAttribute("aria-expanded", String(abrir));
}

// Quita los tipos y variedades que no existen dentro de la sección y categoría elegidas,
// para no dejar el catálogo vacío por un filtro que quedó de otra sección
function depurarFiltros() {
  const disponibles = productos.filter((p) =>
    (seccionActiva === "todos" || p.seccion === seccionActiva) &&
    (categoriaActiva === "todos" || p.categoria === categoriaActiva)
  );
  const categorias = new Set(disponibles.map((p) => p.categoria));
  const variedades = new Set(disponibles.map((p) => p.variedad));

  [...tiposActivos].forEach((tipo) => {
    if (!categorias.has(tipo)) tiposActivos.delete(tipo);
  });
  [...variedadesActivas].forEach((variedad) => {
    if (!variedades.has(variedad)) variedadesActivas.delete(variedad);
  });
}

function seleccionarSeccion(evento) {
  const seccion = evento.currentTarget.dataset.seccion;
  if (seccion !== "todos" && !buscarSeccion(seccion)) return;

  const mismaSeccion = seccion === seccionActiva;

  seccionActiva = seccion;
  categoriaActiva = "todos";
  depurarFiltros();
  borrarBusqueda();

  if (seccion === "todos") {
    cerrarSubcategorias();
  } else {
    if (!mismaSeccion) cerrarSubcategorias();
    alternarSubcategorias(seccion);
  }

  renderizarOpcionesFiltro();
  abrirCatalogo();
  actualizarCatalogo();
}

function seleccionarCategoria(evento) {
  const { seccion, categoria } = evento.currentTarget.dataset;
  const existe = productos.some((p) => p.seccion === seccion && p.categoria === categoria);
  if (!existe) return;

  seccionActiva = seccion;
  categoriaActiva = categoria;
  depurarFiltros();
  borrarBusqueda();

  renderizarOpcionesFiltro();
  abrirCatalogo();
  actualizarCatalogo();
  cerrarMenu();
}

/* ---------- Panel "Filtrar" ---------- */

function alternarGrupoFiltro(evento) {
  const boton = evento.currentTarget;
  const panel = document.getElementById(boton.getAttribute("aria-controls"));
  if (!panel) return;

  const abierto = boton.getAttribute("aria-expanded") === "true";
  boton.setAttribute("aria-expanded", String(!abierto));
  panel.classList.toggle("oculto", abierto);
}

function manejarCambioFiltro(evento) {
  const input = evento.target;
  if (!input.classList.contains("filtro-check")) return;

  const grupo = input.dataset.grupo;
  const conjunto = conjuntoDeGrupo(grupo);
  if (!conjunto) return;

  const valor = input.value;

  if (input.checked) conjunto.add(valor);
  else conjunto.delete(valor);

  borrarBusqueda();
  abrirCatalogo();
  actualizarCatalogo();
}

function sincronizarCheckboxesFiltro() {
  document.querySelectorAll("#panel-filtrar .filtro-check").forEach((input) => {
    const conjunto = conjuntoDeGrupo(input.dataset.grupo);
    input.checked = conjunto ? conjunto.has(input.value) : false;
  });
}

function actualizarBadge(id, cantidad) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = String(cantidad);
  badge.classList.toggle("oculto", cantidad === 0);
}

function actualizarResumenFiltros() {
  actualizarBadge("badge-tipos", tiposActivos.size);
  actualizarBadge("badge-variedades", variedadesActivas.size);

  const total = tiposActivos.size + variedadesActivas.size;
  limpiarFiltrosButton.classList.toggle("oculto", total === 0);
  limpiarFiltrosButton.setAttribute(
    "aria-label",
    `Limpiar ${total} ${total === 1 ? "filtro activo" : "filtros activos"}`
  );
}

function limpiarFiltros() {
  tiposActivos.clear();
  variedadesActivas.clear();

  sincronizarCheckboxesFiltro();
  abrirCatalogo();
  actualizarCatalogo();
}

function reiniciarFiltros() {
  seccionActiva = "todos";
  categoriaActiva = "todos";
  tiposActivos.clear();
  variedadesActivas.clear();

  cerrarSubcategorias();
  renderizarOpcionesFiltro();
  marcarSeccionActiva();
  actualizarResumenFiltros();
}

function verTodosLosProductos() {
  reiniciarFiltros();
  borrarBusqueda();
  cerrarMenu();
  abrirCatalogo();
  actualizarCatalogo();
}

/* ---------- Búsqueda ---------- */

// Tocar un filtro borra el texto de búsqueda
function borrarBusqueda() {
  clearTimeout(temporizadorSearch);
  textoSearchActivo = "";
  if (searchInput) searchInput.value = "";
}

function manejarBusqueda(evento) {
  clearTimeout(temporizadorSearch);
  const valor = evento.target.value;

  temporizadorSearch = setTimeout(() => {
    const texto = valor.trim().slice(0, 60);
    if (texto === textoSearchActivo) return;

    // La búsqueda es independiente: al escribir se reinician los filtros
    textoSearchActivo = texto;
    reiniciarFiltros();
    abrirCatalogo();
    actualizarCatalogo();
  }, DEMORA_BUSQUEDA);
}

/* ---------- Conexión ---------- */

function conectarFiltros() {
  document.querySelectorAll(".grupo-filtro__toggle").forEach((boton) => {
    boton.addEventListener("click", alternarGrupoFiltro);
  });

  [filtroTipoContenedor, filtroVariedadContenedor].forEach((contenedor) => {
    contenedor.addEventListener("change", manejarCambioFiltro);
  });
}

/* ---------- Carga del catálogo ---------- */

// Descarta entradas mal formadas o con id repetido (el id debe ser único entre todos los JSON)
function validarProductos(lista) {
  const ids = new Set();

  return lista.filter((producto) => {
    if (typeof producto !== "object" || producto === null) return false;
    if (typeof producto.id !== "string" || typeof producto.nombre !== "string") return false;
    if (ids.has(producto.id)) return false;
    ids.add(producto.id);
    return true;
  });
}

// Descarga el JSON de una sección y marca cada producto con la sección de la que vino
async function cargarSeccion(seccion) {
  const respuesta = await fetch(seccion.archivo, { cache: "no-cache" });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

  const datos = await respuesta.json();
  const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.productos) ? datos.productos : [];

  return lista.map((producto) =>
    typeof producto === "object" && producto !== null ? { ...producto, seccion: seccion.clave } : producto
  );
}

async function cargarProductos() {
  // Si falla una sección se muestran las demás
  const resultados = await Promise.allSettled(SECCIONES.map(cargarSeccion));
  const cargados = [];

  resultados.forEach((resultado, indice) => {
    if (resultado.status === "fulfilled") cargados.push(...resultado.value);
    else console.error(`No se pudo cargar ${SECCIONES[indice].archivo}:`, resultado.reason);
  });

  if (resultados.every((resultado) => resultado.status === "rejected")) {
    const mensaje = `
      <p class="sin-resultados">
        No pudimos cargar el catálogo. Probá recargar la página o escribinos por WhatsApp.
      </p>`;
    featuredContainer.innerHTML = mensaje;
    catalogoContainer.innerHTML = mensaje;
    return;
  }

  productos = validarProductos(cargados);

  renderizarFiltros();
  mostrarDestacados(productos.filter((p) => p.featured === true));
  actualizarCatalogo();
}
