/* =========================================================
   ESTADO — se carga PRIMERO
   Referencias al DOM, estado global y utilidades compartidas.
   ========================================================= */

/* ---------- Referencias al DOM ---------- */

// Menú lateral
const menuButton = document.getElementById("btn-menu");
const closeMenuButton = document.getElementById("cerrar-menu");
const menuHomeButton = document.getElementById("btn-inicio");
const menuFaqButton = document.getElementById("btn-faq");
const menuLateral = document.getElementById("menu-lateral");
const overlay = document.getElementById("overlay");

// Vistas
const inicio = document.getElementById("inicio");
const destacados = document.getElementById("destacados");
const catalogo = document.getElementById("catalogo");
const preguntasFrecuentes = document.getElementById("preguntas-frecuentes");

// Contenedores de productos
const featuredContainer = document.getElementById("featured-container");
const catalogoContainer = document.getElementById("catalogo-container");
const catalogoTitulo = document.getElementById("titulo-catalogo");
const sinResultados = document.getElementById("sin-resultados");

// Filtros
const categoryFilters = document.getElementById("lista-categorias");
const filtroTipoContenedor = document.getElementById("opciones-tipos");
const filtroVariedadContenedor = document.getElementById("opciones-variedades");
const verTodosButton = document.getElementById("btn-ver-todos");
const limpiarFiltrosButton = document.getElementById("btn-limpiar-filtros");

// Carrito
const cartButton = document.getElementById("btn-carrito");
const cartCount = document.getElementById("contador-carrito");
const carrito = document.getElementById("carrito");
const cartContainer = document.getElementById("cart-container");
const cartBackButton = document.getElementById("cerrar-carrito");

// Otros
const toastCarrito = document.getElementById("toast");
const header = document.getElementById("header");
const logo = document.querySelector(".logo");
const searchInput = document.getElementById("buscador");

/* ---------- Utilidades ---------- */

// Escapa todo texto que vaya a insertarse con innerHTML
function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Estado global ---------- */

let productos = [];

// "Explorar": selección única de sección ("todos" o una clave de SECCIONES)
// y, dentro de ella, de categoría ("todos" o una categoría del JSON)
let seccionActiva = "todos";
let categoriaActiva = "todos";

// "Filtrar": selección múltiple (OR dentro del grupo, AND entre grupos)
let tiposActivos = new Set();
let variedadesActivas = new Set();

let textoSearchActivo = "";

/* ---------- Vitrina de destacados ---------- */
let indiceDestacado = 0;
let destacadosPausados = false;

/* ---------- Scroll del header ---------- */
let ultimaPosicionScroll = 0;
let frameScrollPendiente = false;
let scrollHaciaAbajo = false;

/* ---------- Temporizadores ---------- */
let temporizadorHeader = null;
let temporizadorToast = null;
let temporizadorOcultarToast = null;
let temporizadorSearch = null;
