let misLibros = [];

async function obtenerLibros() {
    try {
        // 1. Intentamos obtener los libros desde el LocalStorage
        const librosEnMemoria = localStorage.getItem('misLibros');

        if (librosEnMemoria) {
            // SI EXISTEN: Los convertimos de texto a objeto JS
            misLibros = JSON.parse(librosEnMemoria);
            console.log("📦 Datos cargados desde LocalStorage (con tus cambios).");
        } else {
            // NO EXISTEN: Es la primera vez, leemos el JSON original
            const response = await fetch("data/books.json");
            if (!response.ok) throw new Error("Error al cargar el archivo JSON");
            
            misLibros = await response.json();
            
            // Los guardamos en LocalStorage para futuras visitas
            guardarEnLocalStorage();
            console.log("🌐 Datos cargados desde el archivo JSON original.");
        }

        // 2. Una vez que tenemos los datos (de donde sea), mandamos a pintar
        gestionarRenderizadoSegunPagina();

    } catch (error) {
        console.error("Error en la carga de datos:", error);
    }
}

// Función auxiliar para guardar el estado actual del array en la memoria del navegador
function guardarEnLocalStorage() {
    localStorage.setItem('misLibros', JSON.stringify(misLibros));
}

obtenerLibros();

function gestionarRenderizadoSegunPagina() {
    const path = window.location.pathname;

    // PÁGINA BIBLIOTECA (detectamos solo la palabra 'biblioteca')
    if (path.includes("biblioteca")) {
        const leidos = misLibros.filter(l => l.status === "leido");
        // Filtramos y ordenamos los leídos antes de mandarlos a pintar
        const librosAMostrar = filtrarYOrdenarLibros(leidos);
        renderizarBiblioteca(librosAMostrar);
    } 
    
    // PÁGINA TBR (detectamos solo la palabra 'tbr')
    else if (path.includes("tbr")) {
        const tbr = misLibros.filter(l => l.status === "tbr");
        // Filtramos y ordenamos los pendientes antes de mandarlos a pintar
        const librosAMostrar = filtrarYOrdenarLibros(tbr);
        renderizarTBR(librosAMostrar);
    }

    // 3. CASO: HOME (INDEX)
    else if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
        
        //Hero
        const btnRecomendar = document.getElementById('btn-recomendar');

        // boton para generar recomendacion aleatoria en el hero
        if (btnRecomendar) {
            btnRecomendar.addEventListener('click', () => {
                console.log("🎲 Generando recomendación aleatoria...");
                generarRecomendacionAleatoria(pendientes);
            });
        }
        //home - seccion Progreso
        actualizarProgreso(misLibros);

        //home - seccion progreso - mood lector
        actualizarMoodLector(misLibros);

        // Lógica para Lectura Actual
        actualizarLecturaActual(misLibros); 

        // Lógica para Últimas Lecturas (4 libros)
        const leidos = misLibros.filter(libro => libro.status === "leido");
        const ultimasLecturas = leidos.slice(-4).reverse(); 
        renderizarUltimasLecturas(ultimasLecturas);

        // Lógica para TBR Aleatorio (10 libros)
        const pendientes = misLibros.filter(libro => libro.status === "tbr");
        const tbrAleatorio = [...pendientes].sort(() => 0.5 - Math.random()).slice(0, 10);
        renderizarTBRHome(tbrAleatorio);
    }
}