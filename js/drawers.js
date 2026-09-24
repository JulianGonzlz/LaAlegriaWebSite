/* =========================================================
   DRAWERS — menú y carrito, mutuamente excluyentes
   ========================================================= */

function actualizarEstadoDrawers() {
  const menuAbierto = menuLateral.classList.contains("abierto");
  const carritoAbierto = carrito.classList.contains("abierto");
  const hayAbierto = menuAbierto || carritoAbierto;

  overlay.classList.toggle("visible", hayAbierto);
  document.body.classList.toggle("drawer-abierto", hayAbierto);

  menuLateral.setAttribute("aria-hidden", String(!menuAbierto));
  carrito.setAttribute("aria-hidden", String(!carritoAbierto));
  menuButton.setAttribute("aria-expanded", String(menuAbierto));
  cartButton.setAttribute("aria-expanded", String(carritoAbierto));

  actualizarVisibilidadHeader();
}

// Abre un drawer y cierra el otro (usada también por mostrarCarrito)
function abrirDrawer(drawer) {
  const otro = drawer === menuLateral ? carrito : menuLateral;
  otro.classList.remove("abierto");
  drawer.classList.add("abierto");
  actualizarEstadoDrawers();

  const primerControl = drawer === menuLateral ? closeMenuButton : cartBackButton;
  primerControl.focus({ preventScroll: true });
}

// Cierra un drawer y, si el foco estaba adentro, lo devuelve a su botón
function cerrarDrawer(drawer, botonOrigen) {
  if (!drawer.classList.contains("abierto")) return;

  const teniaFoco = drawer.contains(document.activeElement);
  drawer.classList.remove("abierto");
  actualizarEstadoDrawers();

  if (teniaFoco) botonOrigen.focus({ preventScroll: true });
}

function cambiarMenu() {
  if (menuLateral.classList.contains("abierto")) cerrarMenu();
  else abrirDrawer(menuLateral);
}

function cerrarMenu() {
  cerrarDrawer(menuLateral, menuButton);
}

function cerrarCarrito() {
  cerrarDrawer(carrito, cartButton);
}

function cerrarDrawers() {
  cerrarMenu();
  cerrarCarrito();
}
