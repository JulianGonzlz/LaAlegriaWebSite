/* =========================================================
   CARDS — tarjetas de producto
   ========================================================= */

function formatearPrecio(valor) {
  return Number(valor).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

// Presentaciones oficiales del producto: [{ tipo, etiqueta, precio }]
// La primera es siempre "completo" (precio + unidad base); después, cada opción del JSON.
// Tipos, etiquetas y precios salen de cart.js (única fuente de verdad del catálogo).
function obtenerPresentaciones(producto) {
  return obtenerTiposValidos(producto)
    .map((tipo) => ({
      tipo,
      etiqueta: obtenerEtiquetaTipo(producto, tipo),
      precio: obtenerPrecioCatalogo(producto, tipo)
    }))
    .filter((presentacion) => presentacion.precio !== null);
}

function normalizarEtiqueta(texto) {
  return String(texto).trim().toLowerCase();
}

function crearBotonAgregarHTML(producto, presentacion, esPrincipal) {
  const { tipo, etiqueta, precio } = presentacion;
  const clase = esPrincipal ? "btn-agregar" : "btn-agregar btn-agregar--secundario";
  const sinStock = producto.stock === false;
  const ariaLabel = sinStock
    ? `${producto.nombre}, ${etiqueta}: sin stock`
    : `Agregar ${producto.nombre}, ${etiqueta}, al carrito por $${formatearPrecio(precio)}`;

  return `
    <button class="${clase}" type="button"
            data-id="${escaparHTML(producto.id)}" data-type="${escaparHTML(tipo)}"
            aria-label="${escaparHTML(ariaLabel)}"${sinStock ? " disabled" : ""}>
      <span>${esPrincipal ? "Agregar · " : ""}${escaparHTML(etiqueta)}</span>
      <span class="btn-agregar__precio">$${escaparHTML(formatearPrecio(precio))}</span>
    </button>`;
}

function crearTarjetaHTML(producto) {
  const imagenes = Array.isArray(producto.imagenes)
    ? producto.imagenes.filter((src) => typeof src === "string" && src.trim() !== "")
    : [];
  const hayVarias = imagenes.length > 1;
  const sinStock = producto.stock === false;

  // Caso 1 (sin opciones): solo el botón principal "completo".
  // Caso 2 (con opciones): principal + un botón secundario por opción.
  // Se omite la opción idéntica al principal (misma etiqueta y precio) para no duplicar botones.
  const presentaciones = obtenerPresentaciones(producto);
  const principal = presentaciones.find((p) => p.tipo === TIPO_COMPLETO) || presentaciones[0];
  const secundarias = presentaciones.filter((p) =>
    p !== principal &&
    !(principal &&
      p.precio === principal.precio &&
      normalizarEtiqueta(p.etiqueta) === normalizarEtiqueta(principal.etiqueta))
  );

  const etiquetaCategoria = [capitalizar(producto.categoria), producto.variedad].filter(Boolean).join(" · ");

  // Imagen: <button> si se puede rotar, <div> si es una sola
  const imagenHTML = imagenes.length
    ? `<img class="perfume-card__img" src="${escaparHTML(imagenes[0])}"
            alt="${escaparHTML(producto.nombre)}" loading="lazy" decoding="async">
       <span class="perfume-card__placeholder oculto" aria-hidden="true"></span>`
    : `<span class="perfume-card__placeholder" aria-hidden="true"></span>`;

  const sinStockHTML = sinStock ? '<span class="perfume-card__sin-stock">Sin stock</span>' : "";

  const contenedorImagen = hayVarias
    ? `<button class="perfume-card__imagen" type="button"
               data-imagenes="${escaparHTML(JSON.stringify(imagenes))}" data-indice="0"
               aria-label="${escaparHTML(`Ver siguiente foto de ${producto.nombre}`)}">
         ${imagenHTML}
         <span class="perfume-card__indicador" aria-hidden="true">1/${imagenes.length}</span>
         ${sinStockHTML}
       </button>`
    : `<div class="perfume-card__imagen">
         ${imagenHTML}
         ${sinStockHTML}
       </div>`;

  const botonesHTML = principal
    ? crearBotonAgregarHTML(producto, principal, true) +
      (secundarias.length
        ? `<div class="perfume-card__secundarios">
             ${secundarias.map((presentacion) => crearBotonAgregarHTML(producto, presentacion, false)).join("")}
           </div>`
        : "")
    : "";

  const rindeHTML = typeof producto.rinde === "string" && producto.rinde.trim()
    ? `<p class="perfume-card__rinde">Rinde: ${escaparHTML(producto.rinde)}</p>`
    : "";

  return `
    <article class="perfume-card${sinStock ? " sin-stock" : ""}" data-id="${escaparHTML(producto.id)}">
      ${contenedorImagen}
      <div class="perfume-card__cuerpo">
        <span class="category">${escaparHTML(etiquetaCategoria)}</span>
        <h3 class="perfume-name">${escaparHTML(producto.nombre)}</h3>
        <p class="description">${escaparHTML(producto.descripcion)}</p>
        ${rindeHTML}
        <div class="cart-actions">${botonesHTML}</div>
      </div>
    </article>`;
}

/* ---------- Imágenes ---------- */

function mostrarPlaceholder(img) {
  img.classList.add("oculto");
  const placeholder = img.parentElement.querySelector(".perfume-card__placeholder");
  if (placeholder) placeholder.classList.remove("oculto");
}

function cambiarImagen(evento) {
  const contenedor = evento.currentTarget;
  const img = contenedor.querySelector(".perfume-card__img");
  const indicador = contenedor.querySelector(".perfume-card__indicador");
  const placeholder = contenedor.querySelector(".perfume-card__placeholder");

  let imagenes;
  try {
    imagenes = JSON.parse(contenedor.dataset.imagenes || "[]");
  } catch {
    return;
  }
  if (!Array.isArray(imagenes) || imagenes.length < 2 || !img) return;

  const indiceActual = Number.parseInt(contenedor.dataset.indice, 10) || 0;
  const siguiente = (indiceActual + 1) % imagenes.length;

  contenedor.dataset.indice = String(siguiente);
  img.classList.remove("oculto");
  if (placeholder) placeholder.classList.add("oculto");
  img.src = String(imagenes[siguiente]);

  if (indicador) indicador.textContent = `${siguiente + 1}/${imagenes.length}`;
}

/* ---------- Vitrina de destacados (una sola card que rota) ---------- */

// El avance lo marca la barra de progreso (animationend), así la pausa
// por hover / foco / botón se resuelve solo con CSS (animation-play-state).

function crearSlideDestacadoHTML(producto, indice, total) {
  const imagen = Array.isArray(producto.imagenes)
    ? producto.imagenes.find((src) => typeof src === "string" && src.trim() !== "")
    : null;
  const presentacion = obtenerPresentaciones(producto)[0];
  const numero = (n) => String(n).padStart(2, "0");

  const mediaHTML = imagen
    ? `<img class="vitrina__img" src="${escaparHTML(imagen)}" alt="${escaparHTML(producto.nombre)}"
            loading="${indice === 0 ? "eager" : "lazy"}" decoding="async">
       <span class="vitrina__placeholder oculto" aria-hidden="true"></span>`
    : `<span class="vitrina__placeholder" aria-hidden="true"></span>`;

  const rindeHTML = typeof producto.rinde === "string" && producto.rinde.trim()
    ? `<p class="vitrina__rinde">Rinde ${escaparHTML(producto.rinde)}</p>`
    : "";

  return `
    <article class="vitrina__slide" aria-roledescription="diapositiva"
             aria-label="${escaparHTML(`${indice + 1} de ${total}: ${producto.nombre}`)}">
      <div class="vitrina__media">
        <span class="vitrina__marca-agua" aria-hidden="true">${escaparHTML(capitalizar(producto.categoria))}</span>
        ${mediaHTML}
      </div>
      <div class="vitrina__info">
        <span class="vitrina__numero" aria-hidden="true">${numero(indice + 1)} <span>/ ${numero(total)}</span></span>
        <span class="vitrina__categoria">${escaparHTML([capitalizar(producto.categoria), producto.variedad].filter(Boolean).join(" · "))}</span>
        <h3 class="vitrina__nombre">${escaparHTML(producto.nombre)}</h3>
        <p class="vitrina__desc">${escaparHTML(producto.descripcion)}</p>
        ${rindeHTML}
        <div class="vitrina__accion">
          ${presentacion ? crearBotonAgregarHTML(producto, presentacion, true) : ""}
        </div>
      </div>
    </article>`;
}

function mostrarDestacados(lista) {
  if (!featuredContainer) return;

  if (!lista.length) {
    featuredContainer.innerHTML = "";
    return;
  }

  const total = lista.length;
  const variosProductos = total > 1;
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  indiceDestacado = 0;
  destacadosPausados = movimientoReducido;

  const puntosHTML = lista
    .map((producto, i) => `
      <button class="vitrina__punto" type="button" data-indice="${i}"
              aria-label="${escaparHTML(`Ver ${producto.nombre}`)}"></button>`)
    .join("");

  featuredContainer.innerHTML = `
    <div class="vitrina${destacadosPausados ? " pausada" : ""}" role="region"
         aria-roledescription="carrusel" aria-label="Los más pedidos">
      <div class="vitrina__escenario" aria-live="${destacadosPausados ? "polite" : "off"}">
        ${lista.map((producto, i) => crearSlideDestacadoHTML(producto, i, total)).join("")}
      </div>
      ${variosProductos ? `
        <div class="vitrina__controles">
          <div class="vitrina__progreso" aria-hidden="true"><span class="vitrina__progreso-barra"></span></div>
          <button class="vitrina__flecha vitrina__flecha--prev" type="button" aria-label="Producto anterior"></button>
          <div class="vitrina__puntos">${puntosHTML}</div>
          <button class="vitrina__flecha vitrina__flecha--next" type="button" aria-label="Producto siguiente"></button>
          <button class="vitrina__pausa" type="button"
                  aria-label="${destacadosPausados ? "Reproducir" : "Pausar"} rotación de destacados"
                  aria-pressed="${destacadosPausados}"></button>
        </div>` : ""}
    </div>`;

  const vitrina = featuredContainer.querySelector(".vitrina");

  // Imagen rota → placeholder
  vitrina.querySelectorAll(".vitrina__img").forEach((img) => {
    const fallar = () => {
      img.classList.add("oculto");
      img.parentElement.querySelector(".vitrina__placeholder")?.classList.remove("oculto");
    };
    img.addEventListener("error", fallar);
    if (img.complete && img.naturalWidth === 0) fallar();
  });

  conectarBotonesCarrito(featuredContainer);

  if (variosProductos) {
    vitrina.querySelector(".vitrina__progreso-barra")
      .addEventListener("animationend", () => avanzarDestacado(1));
    vitrina.querySelector(".vitrina__flecha--prev").addEventListener("click", () => avanzarDestacado(-1));
    vitrina.querySelector(".vitrina__flecha--next").addEventListener("click", () => avanzarDestacado(1));
    vitrina.querySelector(".vitrina__pausa").addEventListener("click", alternarPausaDestacados);
    vitrina.querySelectorAll(".vitrina__punto").forEach((punto) => {
      punto.addEventListener("click", () => irADestacado(Number(punto.dataset.indice)));
    });

    // Flechas del teclado
    vitrina.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowLeft") avanzarDestacado(-1);
      else if (evento.key === "ArrowRight") avanzarDestacado(1);
    });

    // Deslizar en pantallas táctiles
    let inicioToqueX = null;
    const escenario = vitrina.querySelector(".vitrina__escenario");
    escenario.addEventListener("touchstart", (e) => { inicioToqueX = e.touches[0].clientX; }, { passive: true });
    escenario.addEventListener("touchend", (e) => {
      if (inicioToqueX === null) return;
      const distancia = e.changedTouches[0].clientX - inicioToqueX;
      inicioToqueX = null;
      if (Math.abs(distancia) > 45) avanzarDestacado(distancia < 0 ? 1 : -1);
    }, { passive: true });
  }

  irADestacado(0);
}

function irADestacado(indice) {
  const slides = featuredContainer.querySelectorAll(".vitrina__slide");
  const total = slides.length;
  if (!total) return;

  indiceDestacado = ((indice % total) + total) % total;

  slides.forEach((slide, i) => {
    const activa = i === indiceDestacado;
    slide.classList.toggle("activa", activa);
    slide.inert = !activa;
    slide.setAttribute("aria-hidden", String(!activa));
  });

  featuredContainer.querySelectorAll(".vitrina__punto").forEach((punto, i) => {
    const activo = i === indiceDestacado;
    punto.classList.toggle("activo", activo);
    if (activo) punto.setAttribute("aria-current", "true");
    else punto.removeAttribute("aria-current");
  });

  // Reinicia la barra de progreso (el reflow fuerza a que la animación arranque de cero)
  const barra = featuredContainer.querySelector(".vitrina__progreso-barra");
  if (barra) {
    barra.classList.remove("corriendo");
    void barra.offsetWidth;
    barra.classList.add("corriendo");
  }
}

function avanzarDestacado(paso) {
  irADestacado(indiceDestacado + paso);
}

function alternarPausaDestacados() {
  const vitrina = featuredContainer.querySelector(".vitrina");
  if (!vitrina) return;

  destacadosPausados = !destacadosPausados;
  vitrina.classList.toggle("pausada", destacadosPausados);

  const boton = vitrina.querySelector(".vitrina__pausa");
  boton.setAttribute("aria-pressed", String(destacadosPausados));
  boton.setAttribute("aria-label", `${destacadosPausados ? "Reproducir" : "Pausar"} rotación de destacados`);

  // En pausa, los cambios se anuncian; rotando solos, no (evita ruido en lectores de pantalla)
  vitrina.querySelector(".vitrina__escenario")
    .setAttribute("aria-live", destacadosPausados ? "polite" : "off");
}

/* ---------- Render ---------- */

function mostrarProductos(lista, contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = lista.map(crearTarjetaHTML).join("");

  contenedor.querySelectorAll(".perfume-card__img").forEach((img) => {
    img.addEventListener("error", () => mostrarPlaceholder(img));
    // Por si la imagen ya falló antes de conectar el listener
    if (img.complete && img.naturalWidth === 0) mostrarPlaceholder(img);
  });

  contenedor.querySelectorAll("button.perfume-card__imagen").forEach((boton) => {
    boton.addEventListener("click", cambiarImagen);
  });

  conectarBotonesCarrito(contenedor);
}
