/* =========================================================
   APP — se carga ÚLTIMO: conecta eventos e inicializa
   ========================================================= */

// Drawers
menuButton.addEventListener("click", cambiarMenu);
cartButton.addEventListener("click", mostrarCarrito);
cartBackButton.addEventListener("click", cerrarCarrito);
closeMenuButton.addEventListener("click", cerrarMenu);
overlay.addEventListener("click", cerrarDrawers);

// Navegación del menú
menuHomeButton.addEventListener("click", manejarClickInicioMenu);
menuFaqButton.addEventListener("click", abrirPreguntasFrecuentes);

// Filtros
verTodosButton.addEventListener("click", verTodosLosProductos);
limpiarFiltrosButton.addEventListener("click", limpiarFiltros);
conectarFiltros();

// Botón "Ver catálogo" del hero
const heroCta = document.getElementById("hero-cta");
if (heroCta) heroCta.addEventListener("click", verTodosLosProductos);

// Logo
if (logo) logo.addEventListener("click", manejarClickLogo);

// Header según scroll
window.addEventListener("scroll", manejarScroll, { passive: true });

// Si el foco de teclado entra al header, se muestra aunque se esté scrolleando
header.addEventListener("focusin", () => {
  scrollHaciaAbajo = false;
  actualizarVisibilidadHeader();
});

// Búsqueda
if (searchInput) {
  searchInput.addEventListener("input", manejarBusqueda);

  // Enter no recarga la página: aplica la búsqueda al instante
  searchInput.form?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    manejarBusqueda({ target: searchInput });
    searchInput.blur();
  });
}

// Escape cierra cualquier drawer abierto
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && document.body.classList.contains("drawer-abierto")) {
    cerrarDrawers();
  }
});

// Inicialización: el contador se calcula después de cargar el catálogo,
// porque el carrito se valida contra los productos oficiales
cargarProductos().then(actualizarContadorCarrito);
actualizarEstadoDrawers();
