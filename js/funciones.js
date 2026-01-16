// Variable global para saber qué libro estamos reseñando
let libroEnEdicionId = null;

//FUNCIONES AUXILIARES --- pintar estrellas valoracion usuario
function generarEstrellas(rating) {
    let estrellas = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            estrellas += '<span class="star-filled">★</span>';
        } else {
            estrellas += '<span class="star-empty">☆</span>';
        }
    }
    return estrellas;
}

// FUNCIONES RENDERIZADO DATOS DEL JSON
// Paso 1: Crear el HTML de una tarjeta individual
function crearCardLibro(libro) {
    const esLeido = libro.status === "leido";
    
    // Distinguimos las valoraciones:
    // Si es leído -> Estrellas doradas (las tuyas)
    // Si es TBR -> Nota simple (Goodreads)
    const ratingHTML = esLeido 
        ? `<div class="user-rating">${generarEstrellas(libro.user_rating)}</div>` 
        : `<div class="book-status">★ ${libro.goodreads}</div>`;
    
    // Solo mostramos el comentario si existe y es un libro leído
    const comentarioHTML = (esLeido && libro.user_comment) 
        ? `<p class="user-comment">"${libro.user_comment}"</p>` 
        : "";

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
// Paso 2: Pintar todos los libros en el contenedor
function renderizarBiblioteca(librosParaPintar) {
    const contenedor = document.getElementById("grid-biblioteca");
    
    // Verificamos que el contenedor existe (para evitar errores en otras páginas)
    if (!contenedor) return;

    // Limpiamos el contenedor por si hay contenido estático previo
    contenedor.innerHTML = "";

    // Recorremos el array y acumulamos el HTML
    librosParaPintar.forEach(libro => {
        const cardHTML = crearCardLibro(libro);
        contenedor.innerHTML += cardHTML;
    });

    console.log(`🚀 Se han renderizado ${librosParaPintar.length} libros.`);
}

// TBR - Función para pintar los libros en la página de TBR
function renderizarTBR(librosParaPintar) {
    const contenedor = document.getElementById("grid-tbr-full"); // Asegúrate de que este ID existe en tbr.html
    if (!contenedor) return;

    contenedor.innerHTML = "";
    librosParaPintar.forEach(libro => {
        contenedor.innerHTML += crearCardLibro(libro);
    });
    console.log(`⏳ Se han renderizado ${librosParaPintar.length} libros en el TBR.`);
}

// Función para las 4 últimas lecturas en la Home
function renderizarUltimasLecturas(libros) {
    const contenedor = document.getElementById("grid-ultimas-lecturas");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    libros.forEach(libro => {
        contenedor.innerHTML += crearCardLibro(libro);
    });
    console.log(`📖 Home: Renderizadas ${libros.length} últimas lecturas.`);
}

// Función para los 10 aleatorios del TBR en la Home
function renderizarTBRHome(libros) {
    const contenedor = document.getElementById("grid-tbr-home");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    libros.forEach(libro => {
        contenedor.innerHTML += crearCardLibro(libro);
    });
    console.log(`🎲 Home: Renderizados ${libros.length} libros aleatorios del TBR.`);
}

// Función para actualizar las estadísticas de progreso en la Home
function actualizarProgreso(todosLosLibros) {
    // 1. Filtramos los libros que ya has terminado
    const leidos = todosLosLibros.filter(libro => libro.status === "leido");
    
    // 2. Buscamos el elemento del "Gran Número" en el HTML
    const contadorLeidos = document.querySelector('.big-number');

    // 3. Si el elemento existe, actualizamos su texto con el total
    if (contadorLeidos) {
        contadorLeidos.innerText = leidos.length;
    }

    // Opcional: Si quieres actualizar otros datos (como el % de reto de lectura)
    // aquí podrías añadir más lógica en el futuro.
}

// home - Seccion Progreso - actualizar mood lector

function actualizarMoodLector(todosLosLibros) {
    const leidos = todosLosLibros.filter(l => l.status === "leido");
    if (leidos.length === 0) return;

    // 1. Mapeo de géneros a tus archivos PNG
    const mapaIconos = {
        "Fantasía": "fantasia.png",
        "Ficción Histórica": "historica.png",
        "Romántica": "romantica.png",
        "Thriller": "thriller.png",
        "Ciencia ficción": "ciencia-ficcion.png"
    };

    // 2. Contar frecuencias
    const conteo = {};
    leidos.forEach(libro => {
        libro.genre.forEach(g => {
            if (mapaIconos[g]) { // Solo contamos los que tenemos iconos
                conteo[g] = (conteo[g] || 0) + 1;
            }
        });
    });

    // 3. Encontrar el número máximo de libros de un mismo género
    const maxLibros = Math.max(...Object.values(conteo));
    
    // 4. Filtrar qué géneros han alcanzado ese máximo (para detectar empates)
    const ganadores = Object.keys(conteo).filter(g => conteo[g] === maxLibros);

    let generoFinal;

    if (ganadores.length === 1) {
        generoFinal = ganadores[0];
    } else {
        // EMPATE: Buscamos en el último libro catalogado (el último del array leidos)
        // Ordenamos por fecha de lectura para estar seguros
        const ultimoLibro = [...leidos].sort((a, b) => new Date(b.date_read) - new Date(a.date_read))[0];
        
        // Buscamos cuál de sus géneros está en la lista de "ganadores"
        generoFinal = ultimoLibro.genre.find(g => ganadores.includes(g)) || ganadores[0];
    }

    // 5. Actualizar la interfaz
    const imgMood = document.getElementById('mood-icon');
    const txtMood = document.getElementById('mood-text');

    if (imgMood && generoFinal) {
        imgMood.src = `img/${mapaIconos[generoFinal]}`;
        txtMood.innerText = `Tu género más leído es ${generoFinal}`;
    }
}

function actualizarLecturaActual(todosLosLibros) {
    console.log("Ejecutando actualizarLecturaActual...");
    // 1. Buscamos el libro que estás leyendo
    const libroActual = todosLosLibros.find(l => l.status === "leyendo");
    console.log("Libro encontrado:", libroActual);
    
    // 2. Capturamos todos los elementos del DOM que preparamos en el HTML
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

// MODAL LIBRO - Funciones para abrir y cerrar el modal con info del libro

function abrirModalLibro(libroId) {
    // 1. Buscamos el libro en nuestro array global
    const libro = misLibros.find(l => l.id === libroId);
    
    if (!libro) return;

    // 2. Rellenamos el modal con la info del libro
    document.getElementById('modal-cover-img').src = libro.cover;
    document.getElementById('modal-title').innerText = libro.title;
    document.getElementById('modal-author').innerText = libro.author;
    document.getElementById('modal-synopsis').innerText = libro.synopsis;
    document.getElementById('modal-status').innerText = libro.status.toUpperCase();
    document.getElementById('modal-pages').innerText = `${libro.pages_read || 0} / ${libro.total_pages || '?'}`;

    // 3. Rellenamos los géneros
    const containerGeneros = document.getElementById('modal-genres');
    containerGeneros.innerHTML = ''; // Limpiar anteriores
    libro.genre.forEach(g => {
        const span = document.createElement('span');
        span.className = 'genre-tag';
        span.innerText = g;
        containerGeneros.appendChild(span);
    });

    // 4. Mostramos el modal
    const modal = document.getElementById('book-modal');
    modal.style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('book-modal').style.display = 'none';
}

// Cerrar si se hace clic fuera del contenido blanco
window.onclick = function(event) {
    const modal = document.getElementById('book-modal');
    if (event.target == modal) {
        cerrarModal();
    }
}

// MODAL INFO LIBRO - Escuchamos el clic en el botón con id "close-info"
document.getElementById('close-info')?.addEventListener('click', () => {
    document.getElementById('modal-info').classList.remove('active');
});

// Único escuchador para cerrar cualquier modal al hacer clic fuera de la caja del modal
// funciones.js

// ÚNICO escuchador para cerrar cualquier modal al hacer clic en el fondo oscuro
window.addEventListener('click', (e) => {
    // Verificamos si el elemento clicado tiene la clase 'modal'
    if (e.target.classList.contains('modal')) {
        
        // 1. Cerramos los que usan la clase 'active' (after, info, editor)
        e.target.classList.remove('active');

        // 2. Cerramos el que usa display: none (book-modal)
        // Usamos la función global que ya tienes definida en la línea 208
        if (e.target.id === 'book-modal') {
            cerrarModal();
        }

        // 3. Limpieza específica para el modal de edición (Solo si existe)
        if (e.target.id === 'modal-after') {
            const tituloAfter = document.getElementById('after-title');
            if (tituloAfter) { // Verificamos que el elemento no sea null
                tituloAfter.innerText = "Cuéntame qué tal la experiencia";
            }
        }
        
        console.log("Modal cerrado por clic exterior");
    }
});

//FUNCIONES DE LÓGICA

// Función para abrir el modal y rellenar los datos del libro
function abrirModalAfter(id) {
    const libro = misLibros.find(l => l.id === id); // Busca en el array global de data.js
    const modal = document.getElementById('modal-after');
    
    if (libro && modal) {
        document.getElementById('after-cover-img').src = libro.cover;
        document.getElementById('after-title').innerHTML = `Tu reseña de: <span class="book-title-highlight">${libro.title}</span>`;
        document.getElementById('after-author').innerText = `una obra de ${libro.author}`;
        modal.classList.add('active');
    }
}

// Función para mostrar la información en modo lectura (sin editar)
function mostrarInfoLibro(id) {
    const libro = misLibros.find(l => l.id === id);
    const modal = document.getElementById('modal-info');
    
    if (libro && modal) {
        document.getElementById('info-title').innerText = libro.title;
        document.getElementById('info-author').innerText = `de ${libro.author}`;
        // Pintamos tus estrellas doradas
        document.getElementById('info-rating').innerHTML = generarEstrellas(libro.user_rating);
        
        // Rellenamos textos (si están vacíos ponemos un mensaje por defecto)
        document.getElementById('info-comment').innerText = libro.user_comment || "Aún no has escrito tus pensamientos sobre este libro.";
        document.getElementById('info-quotes').innerText = libro.user_quotes || "No hay citas guardadas para este libro.";
        
        modal.classList.add('active');
    }
}

// Escuchador para cerrar el modal informativo
document.getElementById('close-info')?.addEventListener('click', () => {
    document.getElementById('modal-info').classList.remove('active');
});

// Lógica para procesar el formulario cuando le das a "Mover a mi estantería"
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

            alert(`¡"${libro.title}" ya descansa en tu biblioteca!`);
            gestionarRenderizadoSegunPagina();
        }
    });
}

// Cerrar el modal (haciendo clic en la X)
document.getElementById('close-after')?.addEventListener('click', () => {
    document.getElementById('modal-after').classList.remove('active');
    document.getElementById('after-title').innerText = "Cuéntame qué tal la experiencia";
});

// Función para borrar un libro con confirmación
function confirmarBorrado(id) {
    const libro = misLibros.find(l => l.id === id);
    if (!libro) return;

    if (confirm(`¿Seguro que quieres eliminar "${libro.title}"? Esta acción es permanente.`)) {
        // Filtramos el array global (esta variable viene de data.js)
        misLibros = misLibros.filter(l => l.id !== id);
        
        // Guardamos los cambios y refrescamos la página
        guardarEnLocalStorage();
        gestionarRenderizadoSegunPagina();
        console.log("🗑️ Libro eliminado.");
    }
}

// Función para editar la reseña de un libro
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

// funcion para generar recomendacion aleatoria en el hero de la home
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

    // 1. FILTRADO
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

        return cumpleTexto && cumpleGenero && cumpleRating;
    });

    // 2. ORDENACIÓN
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
//ESCUCHADORES DE EVENTOS

// TOPBAR - MENÚ HAMBURGUESA Y FILTROS
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

    if (burger && nav) {
        burger.addEventListener('click', () => {
            nav.classList.toggle('nav-active');
            burger.classList.toggle('open');

            // Bloquear scroll del body cuando el menú está abierto
            document.body.style.overflow = nav.classList.contains('nav-active') ? 'hidden' : 'auto';
        });
    }

    const navLinks = document.querySelectorAll('.topbar nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('nav-active');
            burger.classList.remove('open');
            document.body.style.overflow = 'auto';
        });
    });
});

// BIBLIOTECA - GESTIÓN DEL SIDEBAR DE FILTROS EN MÓVIL
document.addEventListener('DOMContentLoaded', () => {
    const btnOpen = document.getElementById('open-filters-mobile');
    const btnClose = document.getElementById('close-filters');
    const sidebar = document.getElementById('sidebar-filters');

    if (btnOpen && sidebar) {
        btnOpen.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

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

// MODO EDITOR - GESTIÓN DEL MODAL DE ACCESO
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

    //CERRAR EL MODAL
    /*
    const cerrarModal = () => {
        modalEditor.classList.remove('active');
        inputPass.value = ''; // Limpia el campo al cerrar
    };

    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModal);
    };

    // Cerrar si se hace clic fuera del contenido blanco
    window.addEventListener('click', (e) => {
        if (e.target === modalEditor) {
            cerrarModal();
        }
    });*/

    // VALIDACIÓN DEL ACCESO
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault(); // Evita que la página se recargue

            const passwordCorrecta = "admin123"; // Define aquí tu contraseña temporal

            if (inputPass.value === passwordCorrecta) {
                // ÉXITO: Activamos el Modo Editor
                document.body.classList.add('is-editor'); // Esta clase mostrará los botones de edición
                // No usamos cerrarModal() porque esa función solo apunta al book-modal
                modalEditor.classList.remove('active');
                inputPass.value = ''; // Limpiamos la clave por seguridad
                    
                // Opcional: Guardar en localStorage para que no se pierda al recargar
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

// MODO EDITOR - cerrar sesion
const btnLogout = document.getElementById('logout-btn');

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        // 1. Eliminar la clase del body para que desaparezcan los botones de edición
        document.body.classList.remove('is-editor');
        
        // 2. Borrar el estado de localStorage para que la sesión se cierre de verdad
        localStorage.removeItem('modoEditor');
        
        // 3. Feedback al usuario
        alert("Modo editor desactivado.");
        
        // 4. (Opcional) Recargar la página para limpiar estados
        window.location.reload();
    });
}

// ÚNICO ESCUCHADOR DE EVENTOS (MODO EDITOR Y LECTURA)
// funciones.js - Línea 537 aprox.

// ÚNICO ESCUCHADOR DE EVENTOS (MODO EDITOR Y LECTURA)
document.addEventListener('click', (e) => {
    const card = e.target.closest('.book-card');
    if (!card) return; 
    
    const id = parseInt(card.getAttribute('data-id'));

    // 1. Si clicamos en un BOTÓN de administración, no hacemos nada más aquí
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

    // 2. Si clicamos en la TARJETA (fuera de los botones):
    if (card.classList.contains('card-leido')) {
        // Si ya está leído, mostramos tu reseña y estrellas doradas
        mostrarInfoLibro(id);
    } else {
        // SI NO ESTÁ LEÍDO (TBR o Leyendo), mostramos la ficha técnica (el modal nuevo)
        abrirModalLibro(id);
    }
});

/*document.addEventListener('click', (e) => {
    const card = e.target.closest('.book-card');
    if (!card) return; 
    
    const id = parseInt(card.getAttribute('data-id'));

    // --- CAMBIO AQUÍ: Clic en la tarjeta (fuera de botones) ---
    // Si la tarjeta es de un libro LEÍDO, siempre abrimos el modal INFORMATIVO
    if (card.classList.contains('card-leido') && e.target.tagName !== 'BUTTON') {
        mostrarInfoLibro(id);
        return;
    }

    // LÓGICA DE BOTONES (Solo funcionan si pulsas el botón directamente)
    if (e.target.classList.contains('btn-read')) {
        libroEnEdicionId = id;
        abrirModalAfter(id); 
    }

    if (e.target.classList.contains('btn-delete')) {
        confirmarBorrado(id); 
    }

    if (e.target.classList.contains('btn-edit')) {
        libroEnEdicionId = id;
        prepararEdicion(id); // Este sigue abriendo el editable para ti como administradora
    }
});*/
