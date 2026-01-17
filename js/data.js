// CAPA DE DATOS Y ENRUTAMIENTO
// Este archivo centraliza el estado global de la aplicación.

let misLibros = []; // Estado global de la colección

//Carga inicial de datos: Prioriza LocalStorage y recurre al JSON si es la primera vez
async function obtenerLibros() {
    try {
        // 1. Intentamos recuperar la sesión previa del usuario
        const librosEnMemoria = localStorage.getItem('misLibros');

        if (librosEnMemoria) {
            // Deserializamos el string de LocalStorage a un objeto manipulable
            misLibros = JSON.parse(librosEnMemoria);
        } else {
            // Si es un usuario nuevo, hacemos una petición asíncrona al archivo estático
            const response = await fetch("data/books.json");
            if (!response.ok) throw new Error("Error al cargar el archivo JSON");
            
            misLibros = await response.json();
            
            // Inicializamos la persistencia local con los datos semilla
            guardarEnLocalStorage();
        }

        // 2. Una vez sincronizados los datos, lanzamos el renderizado de la página actual
        gestionarRenderizadoSegunPagina();

    } catch (error) {
        console.error("Fallo crítico en la carga de datos:", error);
    }
}

// Sincroniza el estado de JavaScript con el almacenamiento del navegador
function guardarEnLocalStorage() {
    // Convertimos el array a texto plano para poder guardarlo en el cliente
    localStorage.setItem('misLibros', JSON.stringify(misLibros));
}

obtenerLibros(); // Ejecución automática al cargar el script

// SISTEMA DE ENRUTAMIENTO: Decide qué componentes pintar basándose en la URL
function gestionarRenderizadoSegunPagina() {
    const path = window.location.pathname;

    // --- LÓGICA DE PÁGINA BIBLIOTECA ---
    if (path.includes("biblioteca")) {
        const leidos = misLibros.filter(l => l.status === "leido");
        // Aplicamos la lógica de filtrado y ordenación antes de pasar los datos a la vista
        renderizarBiblioteca(filtrarYOrdenarLibros(leidos));
    } 
    
    // --- LÓGICA DE PÁGINA TBR (Pendientes) ---
    else if (path.includes("tbr")) {
        const tbr = misLibros.filter(l => l.status === "tbr");
        renderizarTBR(filtrarYOrdenarLibros(tbr));
    }

    // --- LÓGICA DE LA HOME (INDEX) ---
    else if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
        const pendientes = misLibros.filter(libro => libro.status === "tbr");
        const leidos = misLibros.filter(libro => libro.status === "leido");

        // Configuración del botón de recomendación (Usa los libros pendientes)
        const btnRecomendar = document.getElementById('btn-recomendar');
        if (btnRecomendar) {
            btnRecomendar.addEventListener('click', () => {
                generarRecomendacionAleatoria(pendientes);
            });
        }

        // Actualización de widgets y estadísticas de la Home
        actualizarProgreso(misLibros);
        actualizarMoodLector(misLibros);
        actualizarLecturaActual(misLibros); 

        // Generamos sub-colecciones específicas para la Home (Últimos 4 y 10 aleatorios)
        const ultimasLecturas = leidos.slice(-4).reverse(); 
        renderizarUltimasLecturas(ultimasLecturas);

        const tbrAleatorio = [...pendientes].sort(() => 0.5 - Math.random()).slice(0, 10);
        renderizarTBRHome(tbrAleatorio);
    }
}