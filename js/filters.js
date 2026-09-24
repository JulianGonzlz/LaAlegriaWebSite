/* =========================================================
   FILTERS — categorías, panel "Filtrar", búsqueda y carga del JSON
   ========================================================= */

const RANGOS_PRECIO = [
  { clave: "hasta-5000", etiqueta: "Hasta $5.000", test: (precio) => precio > 0 && precio <= 5000 },
  { clave: "5000-15000", etiqueta: "$5.000 a $15.000", test: (precio) => precio > 5000 && precio <= 15000 },
  { clave: "mas-15000", etiqueta: "Más de $15.000", test: (precio) => precio > 15000 }
];

const DEMORA_BUSQUEDA = 150;

/* ---------- Utilidades ---------- */

function conjuntoDeGrupo(grupo) {
  if (grupo === "tipo") return tiposActivos;
  if (grupo === "variedad") return variedadesActivas;
  if (grupo === "precio") return preciosActivos;
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

function buscarRango(clave) {
  return RANGOS_PRECIO.find((rango) => rango.clave === clave) || null;
}

/* ---------- Filtrado ---------- */

function obtenerProductosFiltrados() {
  const texto = normalizarTexto(textoSearchActivo);

  return productos.filter((producto) => {
    // Explorar (selección única)
    if (categoriaActiva !== "todos" && producto.categoria !== categoriaActiva) return false;

    // Panel "Filtrar": OR dentro del grupo, AND entre grupos
    // "Tipo de pasta" = categoría del JSON (permite elegir varias a la vez)
    if (tiposActivos.size > 0 && !tiposActivos.has(producto.categoria)) return false;
    if (variedadesActivas.size > 0 && !variedadesActivas.has(producto.variedad)) return false;

    // Un producto entra en un rango si alguna de sus presentaciones cae en él
    if (preciosActivos.size > 0) {
      const precios = obtenerPresentaciones(producto).map((presentacion) => presentacion.precio);
      const cumplePrecio = [...preciosActivos].some((clave) => {
        const rango = buscarRango(clave);
        return rango && precios.some((precio) => rango.test(precio));
      });
      if (!cumplePrecio) return false;
    }

    // Búsqueda por texto
    if (texto) {
      const campos = [
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

  if (categoriaActiva !== "todos") partes.push(capitalizar(categoriaActiva));
  // No repite la categoría si también está marcada como "Tipo de pasta"
  const tiposTitulo = [...tiposActivos].filter((tipo) => tipo !== categoriaActiva);
  if (tiposTitulo.length) partes.push(tiposTitulo.map(capitalizar).join(", "));
  if (variedadesActivas.size) partes.push([...variedadesActivas].join(", "));
  if (preciosActivos.size) {
    partes.push(
      [...preciosActivos].map((clave) => buscarRango(clave)?.etiqueta).filter(Boolean).join(", ")
    );
  }
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

function marcarCategoriaActiva() {
  categoryFilters.querySelectorAll(".categoria-btn").forEach((boton) => {
    const activa = boton.dataset.categoria === categoriaActiva;
    boton.classList.toggle("activa", activa);
    if (activa) boton.setAttribute("aria-current", "true");
    else boton.removeAttribute("aria-current");
  });

  categoryFilters.querySelectorAll(".brand-list__btn").forEach((boton) => {
    const activa = boton.dataset.categoria === categoriaActiva && variedadesActivas.has(boton.dataset.variedad);
    boton.classList.toggle("activa", activa);
  });
}

function actualizarCatalogo() {
  const lista = obtenerProductosFiltrados();

  mostrarProductos(lista, catalogoContainer);
  sinResultados.classList.toggle("oculto", lista.length > 0);
  catalogoTitulo.innerHTML = construirTituloCatalogo();

  marcarCategoriaActiva();
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

function renderizarFiltros() {
  const categorias = valoresUnicos(productos, "categoria");

  // Categorías con sus subcategorías (variedades de esa categoría).
  // Si hay una sola variedad no se muestra sublista.
  const categoriasHTML = categorias
    .map((categoria, indice) => {
      const productosCategoria = productos.filter((p) => p.categoria === categoria);
      const subcategorias = valoresUnicos(productosCategoria, "variedad");
      const tieneSublista = subcategorias.length > 1;
      const idLista = `subcategorias-${indice}`;

      const sublistaHTML = tieneSublista
        ? `<ul class="brand-list" id="${idLista}" data-categoria="${escaparHTML(categoria)}"
               aria-label="${escaparHTML(`Variedades de ${capitalizar(categoria)}`)}" inert>
             ${subcategorias
               .map((variedad) => `
                 <li>
                   <button class="brand-list__btn" type="button"
                           data-categoria="${escaparHTML(categoria)}" data-variedad="${escaparHTML(variedad)}"
                           aria-label="${escaparHTML(`Ver ${capitalizar(categoria)}: ${variedad}`)}">${escaparHTML(variedad)}</button>
                 </li>`)
               .join("")}
           </ul>`
        : "";

      return `
        <div class="categoria-grupo" role="listitem">
          <button class="categoria-btn" type="button" data-categoria="${escaparHTML(categoria)}"
                  aria-label="${escaparHTML(`Ver categoría ${capitalizar(categoria)}`)}"
                  ${tieneSublista ? `aria-expanded="false" aria-controls="${idLista}"` : ""}>
            ${escaparHTML(capitalizar(categoria))}
          </button>
          ${sublistaHTML}
        </div>`;
    })
    .join("");

  categoryFilters.innerHTML = `
    <div class="categoria-grupo" role="listitem">
      <button class="categoria-btn" type="button" data-categoria="todos"
              aria-label="Ver todas las categorías">Todas</button>
    </div>
    ${categoriasHTML}`;

  categoryFilters.querySelectorAll(".categoria-btn").forEach((boton) => {
    boton.addEventListener("click", seleccionarCategoria);
  });
  categoryFilters.querySelectorAll(".brand-list__btn").forEach((boton) => {
    boton.addEventListener("click", seleccionarSubcategoria);
  });

  // Panel "Filtrar"
  filtroTipoContenedor.innerHTML = valoresUnicos(productos, "categoria")
    .map((categoria) => opcionFiltroHTML("tipo", categoria, capitalizar(categoria)))
    .join("");

  filtroVariedadContenedor.innerHTML = ordenarAlfabetico(valoresUnicos(productos, "variedad"))
    .map((variedad) => opcionFiltroHTML("variedad", variedad, capitalizar(variedad)))
    .join("");

  filtroPrecioContenedor.innerHTML = RANGOS_PRECIO
    .map((rango) => opcionFiltroHTML("precio", rango.clave, rango.etiqueta))
    .join("");

  sincronizarCheckboxesFiltro();
  marcarCategoriaActiva();
  actualizarResumenFiltros();
}

/* ---------- Categorías (Explorar) ---------- */

function cerrarSubcategorias(exceptoCategoria) {
  categoryFilters.querySelectorAll(".brand-list").forEach((lista) => {
    if (lista.dataset.categoria === exceptoCategoria) return;
    lista.classList.remove("abierta");
    lista.inert = true;
  });

  categoryFilters.querySelectorAll(".categoria-btn[aria-expanded]").forEach((boton) => {
    if (boton.dataset.categoria === exceptoCategoria) return;
    boton.setAttribute("aria-expanded", "false");
  });
}

function alternarSubcategorias(categoria) {
  const lista = [...categoryFilters.querySelectorAll(".brand-list")]
    .find((el) => el.dataset.categoria === categoria);
  if (!lista) return;

  const abrir = !lista.classList.contains("abierta");
  cerrarSubcategorias(categoria);

  lista.classList.toggle("abierta", abrir);
  lista.inert = !abrir;

  const boton = [...categoryFilters.querySelectorAll(".categoria-btn")]
    .find((el) => el.dataset.categoria === categoria);
  if (boton) boton.setAttribute("aria-expanded", String(abrir));
}

// Quita los tipos y variedades que no existen dentro de la categoría elegida,
// para no dejar el catálogo vacío por un filtro que quedó de otra categoría
function depurarFiltrosPorCategoria(categoria) {
  if (categoria === "todos") return;

  [...tiposActivos].forEach((tipo) => {
    if (tipo !== categoria) tiposActivos.delete(tipo);
  });

  const variedadesCategoria = new Set(
    productos.filter((p) => p.categoria === categoria).map((p) => p.variedad)
  );
  [...variedadesActivas].forEach((variedad) => {
    if (!variedadesCategoria.has(variedad)) variedadesActivas.delete(variedad);
  });
}

function seleccionarCategoria(evento) {
  const categoria = evento.currentTarget.dataset.categoria;
  if (categoria !== "todos" && !productos.some((p) => p.categoria === categoria)) return;

  const mismaCategoria = categoria === categoriaActiva;

  categoriaActiva = categoria;
  depurarFiltrosPorCategoria(categoria);
  borrarBusqueda();

  if (categoria === "todos") {
    cerrarSubcategorias();
  } else {
    if (!mismaCategoria) cerrarSubcategorias();
    alternarSubcategorias(categoria);
  }

  sincronizarCheckboxesFiltro();
  abrirCatalogo();
  actualizarCatalogo();
}

function seleccionarSubcategoria(evento) {
  const { categoria, variedad } = evento.currentTarget.dataset;
  const existe = productos.some((p) => p.categoria === categoria && p.variedad === variedad);
  if (!existe) return;

  categoriaActiva = categoria;
  depurarFiltrosPorCategoria(categoria);
  variedadesActivas.clear();
  variedadesActivas.add(variedad);
  borrarBusqueda();

  sincronizarCheckboxesFiltro();
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
  if (grupo === "precio" && !buscarRango(valor)) return;

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
  actualizarBadge("badge-precios", preciosActivos.size);

  const total = tiposActivos.size + variedadesActivas.size + preciosActivos.size;
  limpiarFiltrosButton.classList.toggle("oculto", total === 0);
  limpiarFiltrosButton.setAttribute(
    "aria-label",
    `Limpiar ${total} ${total === 1 ? "filtro activo" : "filtros activos"}`
  );
}

function limpiarFiltros() {
  tiposActivos.clear();
  variedadesActivas.clear();
  preciosActivos.clear();

  sincronizarCheckboxesFiltro();
  abrirCatalogo();
  actualizarCatalogo();
}

function reiniciarFiltros() {
  categoriaActiva = "todos";
  tiposActivos.clear();
  variedadesActivas.clear();
  preciosActivos.clear();

  cerrarSubcategorias();
  sincronizarCheckboxesFiltro();
  marcarCategoriaActiva();
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

  [filtroTipoContenedor, filtroVariedadContenedor, filtroPrecioContenedor].forEach((contenedor) => {
    contenedor.addEventListener("change", manejarCambioFiltro);
  });
}

/* ---------- Carga del catálogo ---------- */

// Descarta entradas mal formadas o con id repetido
function validarProductos(datos) {
  const lista = Array.isArray(datos) ? datos : Array.isArray(datos?.productos) ? datos.productos : [];
  const ids = new Set();

  return lista.filter((producto) => {
    if (typeof producto !== "object" || producto === null) return false;
    if (typeof producto.id !== "string" || typeof producto.nombre !== "string") return false;
    if (ids.has(producto.id)) return false;
    ids.add(producto.id);
    return true;
  });
}

async function cargarProductos() {
  try {
    const respuesta = await fetch("data/productos.json", { cache: "no-cache" });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

    productos = validarProductos(await respuesta.json());

    renderizarFiltros();
    mostrarDestacados(productos.filter((p) => p.featured === true));
    actualizarCatalogo();
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    const mensaje = `
      <p class="sin-resultados">
        No pudimos cargar el catálogo. Probá recargar la página o escribinos por WhatsApp.
      </p>`;
    featuredContainer.innerHTML = mensaje;
    catalogoContainer.innerHTML = mensaje;
  }
}
