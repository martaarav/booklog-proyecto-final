// VARIABLES GLOBALES Y AUXILIARES
// ==========================================
// Estado global para sincronizar la identidad del libro seleccionado con las acciones de los modales
let libroEnEdicionId = null;

// USO: Transforma la calificación numérica del JSON en una interfaz visual de estrellas
// IMPORTANTE: El bucle 'for' garantiza que siempre se rendericen 5 elementos, manteniendo la consistencia visual
function generarEstrellas(rating) {
    let estrellas = "";
    for (let i = 1; i <= 5; i++) {
        // Lógica condicional para asignar clases CSS distintas según la puntuación
        if (i <= rating) {
            estrellas += '<span class="star-filled">★</span>';
        } else {
            estrellas += '<span class="star-empty">☆</span>';
        }
    }
    return estrellas;
}

// FUNCIONES DE RENDERIZADO (HTML DINÁMICO)
// ==========================================
    // CREAR UNA TARJETA DE LIBRO
    // USO: Genera el bloque de HTML para representar un libro individual
    // IMPORTANTE: Utiliza renderizado condicional mediante operadores ternarios para adaptar la interfaz al estado del libro (leído o pendiente)
    function crearCardLibro(libro) {
        // Definimos una constante booleana para simplificar las comprobaciones de estado posteriores
        const esLeido = libro.status === "leido";
        // Generamos el HTML de la puntuación: si está leído llama a la función de estrellas, si no, usa la nota de Goodreads
        const ratingHTML = esLeido 
            ? `<div class="user-rating">${generarEstrellas(libro.user_rating)}</div>` 
            : `<div class="book-status">★ ${libro.goodreads}</div>`;
        // Evaluamos si debe mostrarse el comentario (solo si el libro está leído y el texto no está vacío)
        const comentarioHTML = (esLeido && libro.user_comment) 
            ? `<p class="user-comment">"${libro.user_comment}"</p>` 
            : "";

        // El uso de 'data-id' es crucial para permitir que otras funciones identifiquen qué libro se ha clicado
        return `
            <article class="book-card ${esLeido ? 'card-leido' : ''}" data-id="${libro.id}">
                <img class="book-cover" src="${libro.cover}" alt="Portada de ${libro.title}">
                <div class="book-meta">
                    <h4 class="book-title">${libro.title}</h4>
                    <p class="book-author">${libro.author}</p>
                    ${ratingHTML}
                    ${comentarioHTML}
                </div>
                <div class="admin-actions">
                    ${!esLeido ? '<button class="btn-admin btn-read">Leído</button>' : ''}
                    ${esLeido ? '<button class="btn-admin btn-edit">Editar</button>' : ''}
                    <button class="btn-admin btn-delete">Borrar</button>
                </div>
            </article>
        `;
    }

    // PAGINA HOME - SECCION PROGRESO -> CONTADOR LIBROS LEIDOS
    // USO: Función para actualizar las estadísticas de progreso de lectura mediante el filtrado dinámico de datos en la sección Progreso de la Home 
    /* LÍNEAS IMPORTANTES:
        - todosLosLibros.filter(...) -> Es la clave de la función, ya que separa la lógica de datos (el estado del libro) de la lógica de presentación.
        - if (contadorLeidos) -> Implementación de programación defensiva para evitar errores de ejecución en páginas donde no se muestra este contador estadístico. */
    function actualizarProgreso(todosLosLibros) {
        const leidos = todosLosLibros.filter(libro => libro.status === "leido");
        const contadorLeidos = document.querySelector('.big-number');

        if (contadorLeidos) {
            contadorLeidos.innerText = leidos.length;
        }
    }

    // PAGINA HOME - SECCION PROGRESO -> MOOD LECTOR
    // USO: Implementa un algoritmo de análisis de datos para personalizar la interfaz según el perfil del lector
    /* PUNTOS CLAVE:
        - Algoritmo de frecuencia: Utiliza un objeto 'conteo' para realizar un agregado dinámico de géneros.
        - Resolución de conflictos (Tie-break): En caso de empate técnico entre géneros, la función prioriza el interés más actual analizando la cronología de 'date_read'.
        - Mapeo de recursos: Separa la lógica de datos de la ruta de archivos mediante el objeto 'mapaIconos' */
    function actualizarMoodLector(todosLosLibros) {
        const leidos = todosLosLibros.filter(l => l.status === "leido");
        const imgMood = document.getElementById('mood-icon');
        const txtMood = document.getElementById('mood-text');

        if (leidos.length === 0) {
            if (imgMood && txtMood) {
                imgMood.src = 'img/progress.png'; 
                txtMood.innerText = "Añade libros para descubrir tu mood lector";
            }
            return; 
        }

        const mapaIconos = {
            "Fantasía": "fantasia.png",
            "Ficción Histórica": "historica.png",
            "Romántica": "romantica.png",
            "Thriller": "thriller.png",
            "Ciencia ficción": "ciencia-ficcion.png"
        };

        const conteo = {};
        leidos.forEach(libro => {
            libro.genre.forEach(g => {
                if (mapaIconos[g]) { 
                    conteo[g] = (conteo[g] || 0) + 1;
                }
            });
        });
        // Uso de 'Object.values' y 'Math.max' para encontrar el máximo de forma eficiente
        const maxLibros = Math.max(...Object.values(conteo));
        const ganadores = Object.keys(conteo).filter(g => conteo[g] === maxLibros);

        let generoFinal;
        if (ganadores.length === 1) {
            generoFinal = ganadores[0];
        } else {
            const ultimoLibro = [...leidos].sort((a, b) => new Date(b.date_read) - new Date(a.date_read))[0];
            generoFinal = ultimoLibro.genre.find(g => ganadores.includes(g)) || ganadores[0];
        }

        // Actualización reactiva de la UI basada en el análisis previo
        if (imgMood && generoFinal) {
            imgMood.src = `img/${mapaIconos[generoFinal]}`;
            txtMood.innerText = `Tu género más leído es ${generoFinal}`;
        }
    }

    // PAGINA HOME - SECCION LECTURA ACTUAL
    // USO: Actualizar dinámicamente la sección "Lectura Actual" de la Home mediante el procesamiento de datos del JSON
    /* LÍNEAS IMPORTANTES:
    - todosLosLibros.find(...) -> Identifica el objeto único con status activo, permitiendo una búsqueda eficiente en el array.
    - const porcentaje = Math.round(...) -> Lógica de cálculo para transformar el progreso de páginas en un valor relativo.
    - barraProgreso.style.width -> Manipulación directa del CSS (DOM) para reflejar visualmente el progreso calculado.
    - Bloque 'else' -> Implementación de un estado de "fallback" o reserva para cuando el usuario no tiene lecturas en curso */
    function actualizarLecturaActual(todosLosLibros) {
        console.log("Ejecutando actualizarLecturaActual...");
        // Buscamos el libro que estás leyendo
        const libroActual = todosLosLibros.find(l => l.status === "leyendo");
        console.log("Libro encontrado:", libroActual);
        
        // Capturamos todos los elementos del DOM que preparamos en el HTML
        const contenedorPortada = document.getElementById('current-book-cover');
        const txtTitulo = document.getElementById('current-book-title');
        const txtGenero = document.getElementById('current-book-genre');
        const txtSinopsis = document.getElementById('current-book-synopsis');
        const barraProgreso = document.getElementById('progress-bar-fill');
        const statsProgreso = document.getElementById('progress-stats');

        if (libroActual) {
            // Rellenamos la portada
            contenedorPortada.innerHTML = `<img src="${libroActual.cover}" alt="Portada" class="current-img">`;
            
            // Rellenamos textos
            txtTitulo.innerText = libroActual.title;
            txtGenero.innerText = libroActual.genre.join(", ");
            txtSinopsis.innerText = libroActual.synopsis;

            // --- LÓGICA DE LA BARRA DE PROGRESO ---
            const leidas = libroActual.pages_read || 0;
            const totales = libroActual.total_pages || 1; // Evitamos división por cero
            const porcentaje = Math.round((leidas / totales) * 100);

            // Aplicamos el ancho a la barra de CSS y actualizamos el texto
            barraProgreso.style.width = `${porcentaje}%`;
            statsProgreso.innerText = `Página ${leidas} de ${totales} (${porcentaje}%)`;

        } else {
            // Si no hay ningún libro con status "leyendo"
            contenedorPortada.innerHTML = `<div class="placeholder-loading">¡Busca un libro!</div>`;
            txtTitulo.innerText = "No hay lecturas activas";
            txtSinopsis.innerText = "Ve a tu biblioteca y elige tu próxima historia.";
            barraProgreso.style.width = "0%";
        }
    }

    // PAGINA HOME - SECCIÓN ULTIMAS LECTURAS
    // USO: Muestra las 4 últimas lecturas en la sección de la home
    /* LÍNEAS IMPORTANTES:
        - if (!contenedor) return; -> Permite que esta función coexista en un archivo global sin generar errores en páginas donde esta sección específica de la Home no está presente.
        - crearCardLibro(libro) -> Ejemplo de reutilización de componentes: usamos la misma lógica de construcción visual para Biblioteca, TBR y Home, facilitando el mantenimiento. */
    function renderizarUltimasLecturas(libros) {
        const contenedor = document.getElementById("grid-ultimas-lecturas");
        if (!contenedor) return;

        contenedor.innerHTML = "";
        libros.forEach(libro => {
            contenedor.innerHTML += crearCardLibro(libro);
        });
        console.log(`📖 Home: Renderizadas ${libros.length} últimas lecturas.`);
    }
    
    // PAGINA HOME - SECCION TBR
    // USO: Muestra una selección aleatoria del TBR en la home
    /* LÍNEAS IMPORTANTES:
        - if (!contenedor) return; -> Garantiza que el código sea seguro en un entorno multi-página, evitando errores de ejecución si el usuario no se encuentra en la Landing Page.
        - contenedor.innerHTML = ""; -> Es fundamental para el dinamismo de la web, ya que permite que la selección de libros se refresque totalmente sin dejar rastro de la carga anterior. */
    function renderizarTBRHome(libros) {
        const contenedor = document.getElementById("grid-tbr-home");
        if (!contenedor) return;

        contenedor.innerHTML = "";
        libros.forEach(libro => {
            contenedor.innerHTML += crearCardLibro(libro);
        });
    }

    // PAGINA BIBLIOTECA
    // USO: Renderiza dinámicamente la colección de libros en el grid de la página de Biblioteca
    /* LINEAS IMPORTANTES:
        - if (!contenedor) return; -> Crucial para la estabilidad del script, ya que permite compartir el mismo archivo JS entre varias páginas HTML sin lanzar errores cuando el contenedor no existe
       - contenedor.innerHTML = ""; -> Garantiza que la interfaz se refresque correctamente tras aplicar filtros o cambios en la ordenación */
    function renderizarBiblioteca(librosParaPintar) {
        const contenedor = document.getElementById("grid-biblioteca");
        if (!contenedor) return;

        contenedor.innerHTML = "";
        
        // Iteramos por cada objeto del array recibido
        librosParaPintar.forEach(libro => {
            // Generamos el string HTML llamando a la función constructora
            const cardHTML = crearCardLibro(libro);
            // Inyectamos el HTML generado dentro del contenedor del DOM
            contenedor.innerHTML += cardHTML;
        });
    }

    // PAGINA TBR
    // USO: Dibuja los libros en el grid de la página TBR con las tarjetas de libros pendientes
    /* LÍNEAS IMPORTANTES:
        - document.getElementById("grid-tbr-full") -> Vincula el script con el contenedor específico definido en tbr.html
        - console.log(...) -> Proporciona una trazabilidad útil durante el desarrollo para verificar el volumen de datos procesados */
    function renderizarTBR(librosParaPintar) {
        const contenedor = document.getElementById("grid-tbr-full"); 
        if (!contenedor) return;

        contenedor.innerHTML = "";
        
        // Reutilización del componente 'crearCardLibro' para mantener la consistencia visual en toda la app
        librosParaPintar.forEach(libro => {
            contenedor.innerHTML += crearCardLibro(libro);
        });
    }

// VENTANAS MODALES //

    // MODAL INFO LIBRO - Funciones para abrir y cerrar el modal con info del libro
    // USO: Función encargada de poblar y activar el modal de información detallada de un libro
    /* LÍNEAS IMPORTANTES:
        - misLibros.find(...) -> Realiza una búsqueda eficiente en la base de datos para recuperar la información del libro seleccionado.
        - containerGeneros.innerHTML = '' -> Paso crítico para limpiar el estado del modal antes de una nueva carga de datos.
        - document.createElement('span') -> Demuestra el uso de la API del DOM para generar contenido dinámico basado en listas variables (géneros).
        - modal.style.display = 'flex' -> Controla la visibilidad de la interfaz mediante la manipulación directa de estilos CSS. */
    function abrirModalLibro(libroId) {
        // Buscamos el libro en nuestro array global
        const libro = misLibros.find(l => l.id === libroId);
        
        if (!libro) return;
        // Rellenamos el modal con la info del libro
        document.getElementById('modal-cover-img').src = libro.cover;
        document.getElementById('modal-title').innerText = libro.title;
        document.getElementById('modal-author').innerText = libro.author;
        document.getElementById('modal-synopsis').innerText = libro.synopsis;
        document.getElementById('modal-status').innerText = libro.status.toUpperCase();
        document.getElementById('modal-pages').innerText = `${libro.pages_read || 0} / ${libro.total_pages || '?'}`;

        // Rellenamos los géneros
        const containerGeneros = document.getElementById('modal-genres');
        containerGeneros.innerHTML = ''; // Limpiar anteriores
        libro.genre.forEach(g => {
            const span = document.createElement('span');
            span.className = 'genre-tag';
            span.innerText = g;
            containerGeneros.appendChild(span);
        });

        // Generación dinámica de etiquetas de género según el contenido del array 'libro.genre'
        const modal = document.getElementById('book-modal');
        modal.style.display = 'flex';
    }

    // MODAL INFO LIBRO - Función para cerrar este modal
    // USO: Gestionar el cierre del componente modal modificando el flujo del DOM
    /* LÍNEAS IMPORTANTES:
        - style.display = 'none' -> Finaliza la interacción visual con el modal de forma inmediata.
        - event.target == modal -> Implementación de una mejora de UX; permite cerrar la ventana haciendo clic en el "overlay" (fondo oscuro), facilitando la navegación sin necesidad de buscar la 'X'. */
    function cerrarModal() {
        document.getElementById('book-modal').style.display = 'none';
    }
    // Escuchador global para mejorar la accesibilidad del cierre de componentes emergentes
    window.onclick = function(event) {
        const modal = document.getElementById('book-modal');
        if (event.target == modal) {
            cerrarModal();
        }
    }

    // MODAL RESEÑAS LIBRO (introducidas por el usuario) - Función para cerrar este modal
    //USO: Gestión del cierre del modal de reseñas personales mediante la manipulación de clases CSS
    /* LÍNEAS IMPORTANTES:
        - document.getElementById('close-info')? -> El uso del operador de encadenamiento opcional (?) es una técnica de programación defensiva que asegura que el script sea compatible con todas las páginas del sitio, aunque el botón no esté presente en el DOM.
        - classList.remove('active') -> Método eficiente para revertir el estado visual del modal sin necesidad de manipular estilos inline pesados. */
    document.getElementById('close-info')?.addEventListener('click', () => {
        document.getElementById('modal-info').classList.remove('active');
    });

    // CIERRE MODALES - ÚNICO escuchador para cerrar cualquier modal al hacer clic fuera del modal
    //USO: Gestor centralizado de eventos de cierre para todos los componentes modales de la aplicación
    /* LÍNEAS IMPORTANTES:
        - window.addEventListener('click', ...) -> Centralización de eventos: en lugar de múltiples listeners, un único evento global gestiona la interacción, mejorando el rendimiento de la memoria.
        - e.target.classList.contains('modal') -> Lógica de filtrado de objetivos: detecta si el clic ha ocurrido en el overlay (fondo) para facilitar una navegación fluida y sin fricciones.
        - if (e.target.id === 'modal-after') -> Gestión de limpieza de estado: garantiza que el contenido dinámico de los modales se resetee al cerrarse, manteniendo la integridad visual en usos posteriores. */
    window.addEventListener('click', (e) => {
        // Verificamos si el elemento clicado tiene la clase 'modal'
        if (e.target.classList.contains('modal')) {
            // Cerramos los que usan la clase 'active' (after, info, editor)
            e.target.classList.remove('active');

            if (e.target.id === 'book-modal') {
                cerrarModal();
            }

            if (e.target.id === 'modal-after') {
                const tituloAfter = document.getElementById('after-title');
                if (tituloAfter) { // Verificamos que el elemento no sea null
                    tituloAfter.innerText = "Cuéntame qué tal la experiencia";
                }
            }
        }
    });

// FUNCIONES DE LÓGICA
// ==========================================

    // USO: Preparar y desplegar la interfaz de reseña donde el usuario introduce o edita la reseña.
    /* LÍNEAS IMPORTANTES:
        - misLibros.find(...) -> Conexión crítica con la capa de datos (data.js) para recuperar la información persistente del libro.
        - innerHTML vs innerText -> El uso de innerHTML permite inyectar etiquetas de estilo dinámicas dentro del título del modal.
        - modal.classList.add('active') -> Gestiona el estado de visibilidad mediante el sistema de clases CSS, permitiendo animaciones fluidas. */
    function abrirModalAfter(id) {
        const libro = misLibros.find(l => l.id === id); 
        const modal = document.getElementById('modal-after');
        
        if (libro && modal) {
            // Relleno dinámico de la cabecera del modal basado en el objeto recuperado
            document.getElementById('after-cover-img').src = libro.cover;
            document.getElementById('after-title').innerHTML = `Tu reseña de: <span class="book-title-highlight">${libro.title}</span>`;
            modal.classList.add('active');
        }
    }

    //USO: Recupera la reseña guardada por el usuario y la muestra en un modal de solo lectura
    function mostrarInfoLibro(id) {
        const libro = misLibros.find(l => l.id === id);
        const modal = document.getElementById('modal-info');
        
        // Verificación de seguridad para asegurar que el libro existe en la base de datos
        if (libro && modal) {
            document.getElementById('info-title').innerText = libro.title;
            document.getElementById('info-author').innerText = `de ${libro.author}`;
            
            // Transformamos la nota numérica guardada en estrellas HTML llamando a la función auxiliar
            // Usamos innerHTML porque la función 'generarEstrellas' devuelve etiquetas <span>
            document.getElementById('info-rating').innerHTML = generarEstrellas(libro.user_rating);
            
            // --- GESTIÓN DE CONTENIDO VACÍO ---
            // Usamos el operador lógico OR (||) para mostrar un mensaje amigable si el usuario no escribió nada en el comentario o en las citas en su momento
            document.getElementById('info-comment').innerText = libro.user_comment || "Aún no has escrito tus pensamientos sobre este libro.";
            document.getElementById('info-quotes').innerText = libro.user_quotes || "No hay citas guardadas para este libro.";
            
            // Hacemos visible el modal activando la clase CSS correspondiente
            modal.classList.add('active');
        }
    }

    //USO: Gestión del cierre del modal de reseñas (en el modo usuario y editor) mediante la eliminación de la clase de activación
    // Buscamos el elemento 'close-info'. Usamos '?' (optional chaining) para que, si el botón no está en el HTML de la página actual, el código no se rompa.
    document.getElementById('close-info')?.addEventListener('click', () => {
        // Al hacer clic, buscamos el contenedor del modal de información.
        // Eliminamos la clase 'active'. Esto hace que el CSS oculte el modal.
        document.getElementById('modal-info').classList.remove('active');
    });

    //USO: Procesar el envío del formulario de reseña, actualizando el estado del libro a leido
    /* LÍNEAS IMPORTANTES:
        - e.preventDefault() -> Fundamental para gestionar el envío del formulario mediante JavaScript sin recargar la página.
        - parseInt(...) -> Garantiza la integridad de los datos al convertir la entrada del formulario en un tipo numérico antes de guardarla.
        - guardarEnLocalStorage() -> Punto crítico donde los cambios se vuelven permanentes en el navegador del usuario.
        - gestionarRenderizadoSegunPagina() -> Asegura que la interfaz de usuario se actualice reactivamente para reflejar el nuevo estado del libro. */
    const formAfter = document.getElementById('after-form');
    if (formAfter) {
        formAfter.addEventListener('submit', (e) => {
            e.preventDefault();

            const libro = misLibros.find(l => l.id === libroEnEdicionId);
            
            if (libro) {
                libro.status = "leido";
                libro.user_rating = parseInt(document.getElementById('rating').value);
                libro.user_comment = document.getElementById('comment').value;
                libro.user_quotes = document.getElementById('quotes').value;
                libro.date_read = new Date().toISOString();

                guardarEnLocalStorage();
                document.getElementById('modal-after').classList.remove('active');
                formAfter.reset();
                
                document.getElementById('after-title').innerText = "Cuéntame qué tal la experiencia";

                gestionarRenderizadoSegunPagina();
            }
        });
    }

    //USO: Función para borrar un libro con confirmaciónde la base de datos local
    /* PUNTOS CLAVE:
        - confirm(...) -> Implementación de una interfaz de confirmación para prevenir la pérdida accidental de datos.
        - misLibros.filter(...) -> Aplicación de programación funcional para mutar el estado global de la aplicación de forma segura.
        - Persistencia y Reactividad -> El flujo garantiza que el cambio se guarde en LocalStorage y se refleje instantáneamente en el DOM. */
    function confirmarBorrado(id) {
        const libro = misLibros.find(l => l.id === id);
        if (!libro) return;

        if (confirm(`¿Seguro que quieres eliminar "${libro.title}"? Esta acción es permanente.`)) {
            // Filtramos el array global (esta variable viene de data.js)
            misLibros = misLibros.filter(l => l.id !== id);
            
            // Guardamos los cambios y refrescamos la página
            guardarEnLocalStorage();
            gestionarRenderizadoSegunPagina();
        }
    }

    //USO: Función para habilitar la edición de reseñas existentes
    /* LÍNEAS IMPORTANTES:
        - innerHTML -> Actualiza el encabezado del modal para diferenciar visualmente una edición de una nueva reseña.
        - .value = libro... -> Técnica de precarga de inputs: inyecta los valores persistentes en el formulario para permitir al usuario modificar información previa sin empezar de cero.
        - modal-after -> Reutilización de componentes: usamos el mismo modal de creación para tareas de edición, optimizando el código y la consistencia de la interfaz. */
    function prepararEdicion(id) {
        const libro = misLibros.find(l => l.id === id);
        const modal = document.getElementById('modal-after');

        if (libro && modal) {
            document.getElementById('after-cover-img').src = libro.cover;
            // Cambiamos el título para que el usuario sepa que está editando
            document.getElementById('after-title').innerHTML = `Editando: <span class="book-title-highlight"> ${libro.title}</span>`;
            
            // Rellenamos los inputs con lo que ya había guardado
            document.getElementById('rating').value = libro.user_rating || 5;
            document.getElementById('comment').value = libro.user_comment || "";
            document.getElementById('quotes').value = libro.user_quotes || "";
            
            modal.classList.add('active');
        }
    }

    //USO: funcion para generar recomendacion aleatoria en el hero de la home
    /* PUNTOS CLAVE:
        - Algoritmo de aleatoriedad -> Utiliza Math.random() para ofrecer dinamismo al usuario cada vez que interactúa con el botón.
        - Gestión de estados de animación -> Emplea la técnica de forzado de "reflow" (void offsetWidth) para asegurar que el efecto visual se ejecute en cada clic, mejorando la interactividad.
        - Sincronización de contenidos -> Actualiza simultáneamente nodos de texto e imagen para mantener la coherencia de la recomendación mostrada. */
    function generarRecomendacionAleatoria(librosDisponibles) {
        const tituloHero = document.querySelector('.hero-text h2');
        const imgPortada = document.getElementById('hero-book-cover');
        // Verificamos que los elementos existan y haya libros para recomendar
        if (!tituloHero || !imgPortada || librosDisponibles.length === 0) {
            console.warn("No hay libros disponibles para recomendar o faltan elementos en el DOM.");
            return;
        }
        // Reiniciamos la animación
        imgPortada.classList.remove('animar-portada');
        void imgPortada.offsetWidth; // Truco para forzar el reinicio de la animación
        // Elegimos un libro al azar de la lista filtrada
        const indiceAleatorio = Math.floor(Math.random() * librosDisponibles.length);
        const libroElegido = librosDisponibles[indiceAleatorio];
        // Actualizamos la interfaz: Inyección de contenido dinámico en el Hero
        tituloHero.innerText = `¿Qué tal si hoy empiezas "${libroElegido.title}"?`;
        imgPortada.src = libroElegido.cover;
        imgPortada.alt = `Portada de ${libroElegido.title}`;
        // Disparamos la animación
        imgPortada.classList.add('animar-portada');
    }

    //USO: El "cerebro" que controla qué libros se muestran en la pantalla y en qué orden. Se encarga de la lógica de búsqueda y filtros de las páginas de Biblioteca y TBR
    /* PUNTOS CLAVE:
        - Selección condicional de UI -> Utiliza window.innerWidth para sincronizar la lógica con el diseño responsive.
        - Programación Funcional -> Emplea métodos nativos .filter() y .some() para procesar colecciones de datos complejas.
        - Normalización de datos -> Realiza conversiones de tipos (parseFloat, toLowerCase) para garantizar la precisión de la búsqueda y ordenación.
        - localeCompare() -> Asegura una ordenación alfabética robusta que respeta caracteres especiales. */
    function filtrarYOrdenarLibros(listaOriginal) {
        const textoBusqueda = document.getElementById('search-input')?.value.toLowerCase() || "";
        
        // Captura del orden: Priorizamos el móvil en pantallas pequeñas
        const selectDk = document.getElementById('sort-select');
        const selectMb = document.getElementById('sort-select-mobile');
        let criterioOrden = "default";

        if (window.innerWidth <= 768 && selectMb) {
            criterioOrden = selectMb.value;
        } else if (selectDk) {
            criterioOrden = selectDk.value;
        }

        // Captura de filtros marcados
        const generosSeleccionados = Array.from(document.querySelectorAll('#filter-genres input:checked')).map(cb => cb.value);
        const ratingsSeleccionadas = Array.from(document.querySelectorAll('#filter-ratings input:checked')).map(cb => cb.value);

        // 1. FILTRADO: Aplicación de predicados lógicos para el filtrado de la colección
        let filtrados = listaOriginal.filter(libro => {
            const cumpleTexto = libro.title.toLowerCase().includes(textoBusqueda) || 
                                libro.author.toLowerCase().includes(textoBusqueda);
            const cumpleGenero = generosSeleccionados.length === 0 || 
                                libro.genre.some(g => generosSeleccionados.includes(g));
            
            let cumpleRating = true;
            if (ratingsSeleccionadas.length > 0) {
                const nota = libro.status === "leido" 
                    ? Math.floor(libro.user_rating || 0) 
                    : Math.floor(parseFloat(libro.goodreads) || 0);
                cumpleRating = ratingsSeleccionadas.includes(nota.toString());
            }
            // Lógica de coincidencia parcial para texto y pertenencia a conjuntos para géneros
            return cumpleTexto && cumpleGenero && cumpleRating;
        });

        // 2. ORDENACIÓN: Implementación de algoritmo de ordenación basado en comparadores numéricos y cronológicos
        filtrados.sort((a, b) => {
            const notaA = a.user_rating || parseFloat(a.goodreads) || 0;
            const notaB = b.user_rating || parseFloat(b.goodreads) || 0;
            const fechaA = new Date(a.date_read || 0);
            const fechaB = new Date(b.date_read || 0);

            switch (criterioOrden) {
                case 'rating-desc': return notaB - notaA;
                case 'rating-asc': return notaA - notaB;
                case 'date-new': return fechaB - fechaA;
                case 'date-old': return fechaA - fechaB;
                case 'title-az': return a.title.localeCompare(b.title);
                default: return 0;
            }
        });

        return filtrados;
    }

// ESCUCHADORES DE EVENTOS
// ==========================================

    // TOPBAR - MENÚ HAMBURGUESA Y FILTROS
    // USO: Configurar la interactividad global del topbar y controles de filtrado tras la carga del DOM
    /* PUNTOS CLAVE:
        - DOMContentLoaded -> Garantiza que los selectores de ID no devuelvan 'null' al ejecutarse tras el parseo del HTML.
        - Evento 'input' y 'change' -> Implementación de una interfaz reactiva que actualiza la vista (via gestionarRenderizadoSegunPagina) ante cualquier cambio en los controles de búsqueda o sorteo.
        - Gestión de estados CSS -> Uso de classList.toggle y classList.remove para manipular la visibilidad del menú hamburguesa de forma eficiente.
        - Control de Scroll -> Lógica condicional sobre document.body para optimizar la usabilidad en dispositivos móviles. */
    document.addEventListener('DOMContentLoaded', () => {
        const burger = document.getElementById('burger-menu');
        const nav = document.getElementById('nav-menu');
        const inputBusqueda = document.getElementById('search-input');
        const selectOrden = document.getElementById('sort-select');
        const selectOrdenMobile = document.getElementById('sort-select-mobile');

        // Cada vez que cambien, avisamos a data.js para que refresque
        if (inputBusqueda) {
            inputBusqueda.addEventListener('input', () => {
                gestionarRenderizadoSegunPagina(); // Avisamos a data.js que refresque
            });
        }
        // Escuchador para escritorio
        if (selectOrden) {
            selectOrden.addEventListener('change', () => {
                gestionarRenderizadoSegunPagina(); // Avisamos a data.js que refresque
            });
        }
        // Escuchador para móvil (Añade este bloque)
        if (selectOrdenMobile) {
            selectOrdenMobile.addEventListener('change', () => {
                gestionarRenderizadoSegunPagina();
            });
        }
        // MENÚ HAMBURGUESA: Gestiona la apertura/cierre del menú lateral en móviles
        if (burger && nav) {
            burger.addEventListener('click', () => {
                // Alternamos clases CSS para animar el icono y mostrar el menú
                nav.classList.toggle('nav-active');
                burger.classList.toggle('open');
                // Bloquear scroll del body cuando el menú está abierto
                document.body.style.overflow = nav.classList.contains('nav-active') ? 'hidden' : 'auto';
            });
        }
        // AUTO-CIERRE: Si el usuario clica en un enlace del menú, este se cierra automáticamente
        const navLinks = document.querySelectorAll('.topbar nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('nav-active');
                burger.classList.remove('open');
                document.body.style.overflow = 'auto'; // Restauramos el scroll
            });
        });
    });

    // USO: Gestión del panel de filtros lateral (Sidebar) y reactividad de los checkboxes
    document.addEventListener('DOMContentLoaded', () => {
        // Localizamos los elementos: botón de abrir, botón de cerrar y el contenedor del panel
        const btnOpen = document.getElementById('open-filters-mobile');
        const btnClose = document.getElementById('close-filters');
        const sidebar = document.getElementById('sidebar-filters');
        // CONTROL DE APERTURA: Al pulsar el botón de filtros en móvil, se activa el panel lateral
        if (btnOpen && sidebar) {
            btnOpen.addEventListener('click', () => {
                sidebar.classList.add('active');
            });
        }
        // CONTROL DE CIERRE: Permite ocultar el panel al pulsar la 'X' o el botón de cerrar
        if (btnClose && sidebar) {
            btnClose.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        }
        // Escuchar cambios en los checkboxes de género
        const containerGeneros = document.getElementById('filter-genres');
        if (containerGeneros) {
            containerGeneros.addEventListener('change', () => {
                gestionarRenderizadoSegunPagina(); // Refrescamos la lista al marcar/desmarcar
            });
        }
        // Escuchar los checkboxes de PUNTUACIÓN
        const containerRatings = document.getElementById('filter-ratings');
        if (containerRatings) {
            containerRatings.addEventListener('change', () => {
                gestionarRenderizadoSegunPagina();
            });
        }
    });

    //USO: Implementar un control de acceso sencillo para habilitar el Modo Editor en la aplicación
    document.addEventListener('DOMContentLoaded', () => {
        const btnAbrirEditor = document.querySelector('.editor-btn'); // Botón con icono de usuario
        const modalEditor = document.getElementById('modal-editor'); // El contenedor del modal
        const btnCerrarModal = document.getElementById('close-login'); // La 'X' para cerrar
        const formLogin = document.getElementById('login-form'); // El formulario de acceso
        const inputPass = document.getElementById('editor-key'); // El campo de la contraseña
        // ABRIR EL MODAL
        if (btnAbrirEditor && modalEditor) {
            btnAbrirEditor.addEventListener('click', () => {
                modalEditor.classList.add('active'); // Añade la clase que tiene display: grid
                inputPass.focus(); // Pone el cursor automáticamente en el campo de texto
            });
        }
        // VALIDACIÓN DEL ACCESO
        if (formLogin) {
            formLogin.addEventListener('submit', (e) => {
                e.preventDefault(); // Evita que la página se recargue
                const passwordCorrecta = "admin123"; // Define aquí la contraseña temporal
                if (inputPass.value === passwordCorrecta) {
                    // ÉXITO: Activamos el Modo Editor
                    document.body.classList.add('is-editor'); // Esta clase mostrará los botones de edición
                    // No usamos cerrarModal() porque esa función solo apunta al book-modal
                    modalEditor.classList.remove('active');
                    inputPass.value = ''; // Limpiamos la clave por seguridad
                    // Guardar en localStorage para que no se pierda al recargar
                    localStorage.setItem('modoEditor', 'activo');
                } else {
                    // ERROR
                    alert("Contraseña incorrecta. Inténtalo de nuevo.");
                    inputPass.value = '';
                }
            });
        }   
        // COMPROBAR ESTADO AL CARGAR LA PÁGINA
        if (localStorage.getItem('modoEditor') === 'activo') {
            document.body.classList.add('is-editor');
            }
    });

    // USO: Finaliza la sesión del Modo Editor, restaura la interfaz de usuario y limpia los estados persistentes
    const btnLogout = document.getElementById('logout-btn');

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            // Eliminar la clase del body para que desaparezcan los botones de edición
            document.body.classList.remove('is-editor');
            // Borrar el estado de localStorage para que la sesión se cierre de verdad
            localStorage.removeItem('modoEditor');
            // Feedback al usuario
            alert("Modo editor desactivado.");
            // Recargar la página para limpiar estados
            window.location.reload();
        });
    }

    //USO: LA GRAN CENTRALITA: Gestor único de eventos para todas las tarjetas de libros
    /* PUNTOS CLAVE:
        - Escalabilidad: Al usar un solo listener en el 'document', el código funciona automáticamente para libros añadidos dinámicamente sin necesidad de reasignar eventos.
        - Optimización de Memoria: Reduce la carga del navegador al evitar múltiples escuchadores individuales.
        - Lógica de Bifurcación: Separa eficazmente las acciones administrativas (CRUD) de las acciones de consulta mediante el análisis de etiquetas (tagName) y clases CSS.
        - .closest() y data-attributes: Aseguran la recuperación precisa de la identidad del objeto independientemente de la profundidad del nodo clicado. */
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.book-card');
        // Si el clic ocurrió fuera de una tarjeta (en el fondo o el header), salimos sin hacer nada.
        if (!card) return; 
        
        const id = parseInt(card.getAttribute('data-id'));
        // Si clicamos en un BOTÓN de administración, no hacemos nada más aquí
        if (e.target.tagName === 'BUTTON') {
            if (e.target.classList.contains('btn-read')) {
                libroEnEdicionId = id;
                abrirModalAfter(id); 
            }
            if (e.target.classList.contains('btn-delete')) {
                confirmarBorrado(id); 
            }
            if (e.target.classList.contains('btn-edit')) {
                libroEnEdicionId = id;
                prepararEdicion(id);
            }
            return; // Salimos para que no se abra el modal de ficha al pulsar un botón
        }
        // Si clicamos en la TARJETA (fuera de los botones):
        if (card.classList.contains('card-leido')) {
            // Si ya está leído, mostramos tu reseña y estrellas doradas
            mostrarInfoLibro(id);
        } else {
            // SI NO ESTÁ LEÍDO (TBR o Leyendo), mostramos la ficha técnica (el modal nuevo)
            abrirModalLibro(id);
        }
    });

    //USO: gestionar el cierre manual del modal de reseñas o edición, asegurando que la interfaz vuelva a su estado original
    /* LÍNEAS IMPORTANTES:
        - ?.addEventListener -> Implementación de encadenamiento opcional para asegurar la estabilidad del script en toda la web.
        - classList.remove('active') -> Control de visibilidad basado en clases, facilitando la integración con animaciones CSS.
        - innerText = "..." -> Garantiza la consistencia de la experiencia de usuario (UX) al resetear elementos dinámicos tras el cierre. */
    document.getElementById('close-after')?.addEventListener('click', () => {
        document.getElementById('modal-after').classList.remove('active');
        document.getElementById('after-title').innerText = "Cuéntame qué tal la experiencia";
    });