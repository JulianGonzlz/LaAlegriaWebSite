/* =========================================================
   HEADER — visibilidad según scroll + navegación entre vistas
   ========================================================= */

const UMBRAL_SCROLL = 6;
const DEMORA_HEADER = 150;

function actualizarVisibilidadHeader() {
  const hayDrawer = document.body.classList.contains("drawer-abierto");
  const lejosDelTope = window.scrollY > header.offsetHeight;

  header.classList.toggle("header-oculto", hayDrawer || (scrollHaciaAbajo && lejosDelTope));
}

function actualizarHeaderAlScrollear() {
  frameScrollPendiente = false;

  const posicion = Math.max(window.scrollY, 0);
  const diferencia = posicion - ultimaPosicionScroll;

  // Ignora movimientos mínimos (rebote en iOS, trackpads)
  if (Math.abs(diferencia) < UMBRAL_SCROLL) return;

  scrollHaciaAbajo = diferencia > 0;
  ultimaPosicionScroll = posicion;
  actualizarVisibilidadHeader();
}

function manejarScroll() {
  if (!frameScrollPendiente) {
    frameScrollPendiente = true;
    requestAnimationFrame(actualizarHeaderAlScrollear);
  }

  // Cuando el scroll se detiene, el header reaparece
  clearTimeout(temporizadorHeader);
  temporizadorHeader = setTimeout(() => {
    scrollHaciaAbajo = false;
    actualizarVisibilidadHeader();
  }, DEMORA_HEADER);
}

/* ---------- Navegación entre vistas ---------- */

function volverAlInicio(suave = false) {
  inicio.classList.remove("oculto");
  destacados.classList.remove("oculto");
  catalogo.classList.add("oculto");
  preguntasFrecuentes.classList.add("oculto");

  window.scrollTo({ top: 0, behavior: suave ? "smooth" : "instant" });
}

function abrirPreguntasFrecuentes() {
  inicio.classList.add("oculto");
  destacados.classList.add("oculto");
  catalogo.classList.add("oculto");
  preguntasFrecuentes.classList.remove("oculto");

  cerrarMenu();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function manejarClickInicioMenu() {
  cerrarMenu();
  volverAlInicio();
}

function manejarClickLogo(evento) {
  evento.preventDefault();
  cerrarDrawers();
  volverAlInicio(true);
}
