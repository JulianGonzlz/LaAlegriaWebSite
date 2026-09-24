/* =========================================================
   CART — carrito con localStorage + pedido por WhatsApp
   ========================================================= */

const CLAVE_CARRITO = "pasta-carrito";
const NUMERO_WHATSAPP = "5492284466595";
const CANTIDAD_MAXIMA = 99;
const MAX_ITEMS_CARRITO = 100;
const DURACION_TOAST = 1800;
const DURACION_FADE_TOAST = 350;

/* ---------- Toast ---------- */

function mostrarToast(mensaje) {
  clearTimeout(temporizadorToast);
  clearTimeout(temporizadorOcultarToast);

  toastCarrito.classList.remove("oculto");

  // Un frame para que la transición de opacidad arranque desde display:block
  requestAnimationFrame(() => {
    toastCarrito.textContent = mensaje;
    toastCarrito.classList.add("visible");
  });

  temporizadorToast = setTimeout(() => {
    toastCarrito.classList.remove("visible");
    temporizadorOcultarToast = setTimeout(() => {
      toastCarrito.classList.add("oculto");
    }, DURACION_FADE_TOAST);
  }, DURACION_TOAST);
}

/* ---------- Catálogo oficial ---------- */

// Tipo del botón principal: usa "precio" y "unidad" del producto
const TIPO_COMPLETO = "completo";

function buscarProducto(productoId) {
  return productos.find((producto) => producto.id === productoId) || null;
}

function esPrecioValido(valor) {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0;
}

// Opciones bien formadas del JSON, sin tipos repetidos ni el reservado "completo"
function obtenerOpcionesValidas(producto) {
  if (!producto || !Array.isArray(producto.opciones)) return [];

  const vistos = new Set();
  return producto.opciones.filter((opcion) => {
    if (typeof opcion !== "object" || opcion === null) return false;
    const { tipo } = opcion;
    if (typeof tipo !== "string" || tipo.trim() === "" || tipo.length > 40) return false;
    if (tipo === TIPO_COMPLETO || vistos.has(tipo)) return false;
    if (!esPrecioValido(opcion.precio)) return false;
    vistos.add(tipo);
    return true;
  });
}

// TIPOS_VALIDOS dinámicos: "completo" (si hay precio base) + cada tipo de "opciones"
function obtenerTiposValidos(producto) {
  if (!producto) return [];
  const tipos = esPrecioValido(producto.precio) ? [TIPO_COMPLETO] : [];
  return tipos.concat(obtenerOpcionesValidas(producto).map((opcion) => opcion.tipo));
}

// Precio oficial de una presentación. Nunca se usa un precio guardado en localStorage.
function obtenerPrecioCatalogo(producto, tipo) {
  if (!producto || typeof tipo !== "string") return null;

  if (tipo === TIPO_COMPLETO) {
    return esPrecioValido(producto.precio) ? producto.precio : null;
  }

  const opcion = obtenerOpcionesValidas(producto).find((o) => o.tipo === tipo);
  return opcion ? opcion.precio : null;
}

/* ---------- Etiquetas de presentación ---------- */

// "kg" → "1 kg", "plancha" → "Plancha", "x14 unidades" → "x14 unidades"
function etiquetaDeUnidad(unidad) {
  const texto = typeof unidad === "string" ? unidad.trim() : "";
  if (!texto) return "Unidad";
  if (texto.toLowerCase() === "kg") return "1 kg";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Texto visible de la presentación ("1 kg", "Plancha", "x6 unidades"…)
function obtenerEtiquetaTipo(producto, tipo) {
  if (!producto) return "";
  if (tipo === TIPO_COMPLETO) return etiquetaDeUnidad(producto.unidad);

  const opcion = obtenerOpcionesValidas(producto).find((o) => o.tipo === tipo);
  if (!opcion) return "";
  return typeof opcion.etiqueta === "string" && opcion.etiqueta.trim()
    ? opcion.etiqueta.trim()
    : etiquetaDeUnidad(opcion.tipo);
}

// Versión para el mensaje de WhatsApp ("1 kg", "plancha", "x6 unidades"…)
function obtenerEtiquetaTipoPedido(producto, tipo) {
  const etiqueta = obtenerEtiquetaTipo(producto, tipo);
  return etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1);
}

/* ---------- Lectura / validación ---------- */

// Devuelve [{ id, tipo, cantidad }] validado contra el catálogo
function normalizarCarrito(guardado) {
  if (!Array.isArray(guardado)) return [];

  const resultado = [];

  for (const item of guardado.slice(0, MAX_ITEMS_CARRITO)) {
    if (typeof item !== "object" || item === null) continue;

    const { id, tipo } = item;
    if (typeof id !== "string" || id.length === 0 || id.length > 100) continue;
    if (typeof tipo !== "string" || tipo.length === 0 || tipo.length > 40) continue;

    const producto = buscarProducto(id);
    if (!producto || producto.stock === false) continue;
    if (obtenerPrecioCatalogo(producto, tipo) === null) continue;

    const cantidad = item.cantidad;
    if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 1) continue;

    // Unifica duplicados (mismo producto + presentación)
    const existente = resultado.find((r) => r.id === id && r.tipo === tipo);
    if (existente) {
      existente.cantidad = Math.min(existente.cantidad + cantidad, CANTIDAD_MAXIMA);
    } else {
      resultado.push({ id, tipo, cantidad: Math.min(cantidad, CANTIDAD_MAXIMA) });
    }
  }

  return resultado;
}

function leerCarrito() {
  try {
    const crudo = localStorage.getItem(CLAVE_CARRITO);
    return crudo ? normalizarCarrito(JSON.parse(crudo)) : [];
  } catch {
    return [];
  }
}

// Une cada item con los datos oficiales del producto
function resolverItemsCarrito(carritoActual) {
  return carritoActual
    .map((item) => {
      const producto = buscarProducto(item.id);
      const precio = obtenerPrecioCatalogo(producto, item.tipo);
      return producto && precio !== null ? { ...item, producto, precio } : null;
    })
    .filter(Boolean);
}

/* ---------- Escritura ---------- */

function guardarCarrito(carritoActual) {
  const limpio = carritoActual.map(({ id, tipo, cantidad }) => ({ id, tipo, cantidad }));
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(limpio));
  } catch {
    // localStorage lleno o bloqueado: el carrito sigue funcionando en esta vista
  }
  actualizarContadorCarrito(limpio);
}

function actualizarContadorCarrito(carritoActual = leerCarrito()) {
  const total = carritoActual.reduce((suma, item) => suma + item.cantidad, 0);

  cartCount.textContent = String(total);
  cartCount.classList.toggle("oculto", total === 0);
  cartButton.setAttribute(
    "aria-label",
    `Abrir carrito. ${total} ${total === 1 ? "producto" : "productos"}`
  );
}

function animarContador() {
  cartCount.classList.add("pulso");
  setTimeout(() => cartCount.classList.remove("pulso"), 200);
}

function agregarAlCarrito(productoId, tipo) {
  const producto = buscarProducto(productoId);
  if (!producto || producto.stock === false) return;
  if (obtenerPrecioCatalogo(producto, tipo) === null) return;

  const carritoActual = leerCarrito();
  const existente = carritoActual.find((item) => item.id === productoId && item.tipo === tipo);

  if (existente) {
    if (existente.cantidad >= CANTIDAD_MAXIMA) {
      mostrarToast(`Máximo ${CANTIDAD_MAXIMA} unidades por producto`);
      return;
    }
    existente.cantidad += 1;
  } else {
    if (carritoActual.length >= MAX_ITEMS_CARRITO) return;
    carritoActual.push({ id: productoId, tipo, cantidad: 1 });
  }

  guardarCarrito(carritoActual);
  animarContador();
  mostrarToast(`${producto.nombre} agregado al carrito`);

  if (carrito.classList.contains("abierto")) renderizarCarrito();
}

function cambiarCantidad(productoId, tipo, diferencia) {
  const carritoActual = leerCarrito();
  const item = carritoActual.find((i) => i.id === productoId && i.tipo === tipo);
  if (!item) return;

  item.cantidad = Math.min(Math.max(item.cantidad + diferencia, 1), CANTIDAD_MAXIMA);
  guardarCarrito(carritoActual);
}

function quitarDelCarrito(productoId, tipo) {
  const carritoActual = leerCarrito().filter((i) => !(i.id === productoId && i.tipo === tipo));
  guardarCarrito(carritoActual);
}

/* ---------- Conexión con las tarjetas ---------- */

function conectarBotonesCarrito(contenedor) {
  contenedor.querySelectorAll(".btn-agregar").forEach((boton) => {
    boton.addEventListener("click", () => {
      agregarAlCarrito(boton.dataset.id, boton.dataset.type);
    });
  });
}

/* ---------- Render del drawer ---------- */

function crearItemCarritoHTML(item) {
  const { producto, tipo, cantidad, precio } = item;
  const nombre = producto.nombre;
  const etiqueta = obtenerEtiquetaTipo(producto, tipo);

  return `
    <li class="carrito-item" data-id="${escaparHTML(producto.id)}" data-type="${escaparHTML(tipo)}">
      <div class="carrito-item__info">
        <span class="carrito-item__nombre">${escaparHTML(nombre)}</span>
        <span class="carrito-item__tipo">${escaparHTML(etiqueta)} · $${escaparHTML(formatearPrecio(precio))} c/u</span>
        <span class="carrito-item__precio">$${escaparHTML(formatearPrecio(precio * cantidad))}</span>
      </div>
      <div class="carrito-item__acciones">
        <div class="carrito-item__controles">
          <button class="cantidad-btn" type="button" data-accion="restar"
                  aria-label="${escaparHTML(`Restar una unidad de ${nombre}, ${etiqueta}`)}"
                  ${cantidad <= 1 ? "disabled" : ""}>−</button>
          <span class="cantidad-valor" aria-label="${escaparHTML(`Cantidad: ${cantidad}`)}">${cantidad}</span>
          <button class="cantidad-btn" type="button" data-accion="sumar"
                  aria-label="${escaparHTML(`Sumar una unidad de ${nombre}, ${etiqueta}`)}"
                  ${cantidad >= CANTIDAD_MAXIMA ? "disabled" : ""}>+</button>
        </div>
        <button class="btn-quitar" type="button" data-accion="quitar"
                aria-label="${escaparHTML(`Quitar ${nombre}, ${etiqueta}, del carrito`)}">Quitar</button>
      </div>
    </li>`;
}

function renderizarCarrito() {
  const items = resolverItemsCarrito(leerCarrito());

  if (items.length === 0) {
    cartContainer.innerHTML = `
      <p class="carrito__vacio">Todavía no agregaste pastas a tu pedido.</p>`;
    return;
  }

  const total = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const enlace = crearEnlaceWhatsApp(items, total);

  cartContainer.innerHTML = `
    <ul class="carrito__lista" aria-label="Productos en el carrito">
      ${items.map(crearItemCarritoHTML).join("")}
    </ul>
    <div class="carrito__pie">
      <div class="carrito__total">
        <span>Total</span>
        <strong>$${escaparHTML(formatearPrecio(total))}</strong>
      </div>
      <a class="btn-principal btn-whatsapp" href="${escaparHTML(enlace)}"
         target="_blank" rel="noopener noreferrer"
         aria-label="Consultar el pedido por WhatsApp (se abre en una pestaña nueva)">
        Consultar por WhatsApp
      </a>
    </div>`;

  conectarControlesCarrito();
}

function conectarControlesCarrito() {
  cartContainer.querySelectorAll("[data-accion]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const item = boton.closest(".carrito-item");
      if (!item) return;

      const { id, type } = item.dataset;
      const accion = boton.dataset.accion;

      if (accion === "sumar") cambiarCantidad(id, type, 1);
      else if (accion === "restar") cambiarCantidad(id, type, -1);
      else if (accion === "quitar") quitarDelCarrito(id, type);

      renderizarCarrito();
      restaurarFoco(id, type, accion);
    });
  });
}

// Tras re-renderizar, devuelve el foco al mismo control (accesibilidad de teclado)
function restaurarFoco(id, tipo, accion) {
  const selector =
    `.carrito-item[data-id="${CSS.escape(id)}"][data-type="${CSS.escape(tipo)}"] ` +
    `[data-accion="${CSS.escape(accion)}"]`;
  const control = cartContainer.querySelector(selector);

  if (control && !control.disabled) control.focus();
  else cartBackButton.focus();
}

/* ---------- WhatsApp ---------- */

function crearEnlaceWhatsApp(carritoActual, total) {
  const lineas = carritoActual.map((item) =>
    `- ${item.producto.nombre} (${obtenerEtiquetaTipoPedido(item.producto, item.tipo)}) ` +
    `x${item.cantidad} - $${formatearPrecio(item.precio * item.cantidad)}`
  );

  const texto =
    "Hola, te quiero consultar por el siguiente pedido:\n\n" +
    lineas.join("\n") +
    `\n\nTotal: $${formatearPrecio(total)}` +
    "\n\nQuedo atento a la confirmación, gracias.";

  return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

/* ---------- Apertura ---------- */

function mostrarCarrito() {
  renderizarCarrito();
  abrirDrawer(carrito); // definida en drawers.js
}
