function formatearPrecioShowcase(valor) {
    const numero = Number(valor || 0);
    if (typeof formatCOP === "function") return formatCOP(numero);
    return `COP ${numero.toLocaleString("es-CO")}`;
}

function obtenerListaOfertasParaShowcase() {
    const guardadas = JSON.parse(localStorage.getItem("ofertasActivas") || "[]");
    if (Array.isArray(guardadas) && guardadas.length) return guardadas;

    try {
        if (Array.isArray(ofertasActivas) && ofertasActivas.length) return ofertasActivas;
    } catch (_err) {
        // Ignorar si el scope no está disponible aún.
    }

    return [];
}

function obtenerOfertaDestacada() {
    const ahora = Date.now();
    const ofertas = obtenerListaOfertasParaShowcase()
        .filter(o => Number(o.expiracion || 0) > ahora && Number(o.vendidos || 0) < Number(o.limite || 0));

    if (!ofertas.length) return null;

    ofertas.sort((a, b) => Number(b.descuento || 0) - Number(a.descuento || 0));
    return ofertas[0];
}

function buscarProductoParaShowcase(productoId) {
    if (!Array.isArray(productos)) return null;
    return productos.find(p => String(p.id) === String(productoId)) || null;
}

function getOfertaShowcaseActual() {
    return window.__showcaseOfertaActual || null;
}

function usuarioTieneProActivo() {
    return Boolean(usuarioData?.modoProActivo && usuarioData?.modoProHasta && new Date(usuarioData.modoProHasta).getTime() > Date.now());
}

function actualizarBotonProShowcase() {
    const proBtn = document.getElementById("showcaseProBtn");
    if (!proBtn) return;

    if (!usuarioActual) {
        proBtn.disabled = false;
        proBtn.textContent = "Inicia sesión para Pro";
        proBtn.classList.remove("pro-gold-btn");
        return;
    }

    if (usuarioTieneProActivo()) {
        proBtn.disabled = true;
        proBtn.textContent = "Modo Pro activo";
        proBtn.classList.add("pro-gold-btn");
        return;
    }

    proBtn.disabled = false;
    proBtn.textContent = "Comprar Modo Pro";
    proBtn.classList.remove("pro-gold-btn");
}

function comprarProShowcase(event) {
    if (event) event.stopPropagation();

    if (!usuarioActual) {
        notificarError("Inicia sesión para activar Modo Pro");
        showScreen("auth");
        return;
    }

    if (usuarioTieneProActivo()) {
        mostrarNotificacion("Tu cuenta ya tiene Modo Pro activo", "info", "Modo Pro");
        actualizarBotonProShowcase();
        return;
    }

    if (typeof activarModoPro === "function") {
        activarModoPro();
        setTimeout(() => {
            if (typeof actualizarPerfil === "function") void actualizarPerfil();
            actualizarBotonProShowcase();
        }, 80);
        return;
    }

    showScreen("profile");
    if (typeof mostrarSeccionPerfil === "function") mostrarSeccionPerfil("ajustes");
}

function actualizarOfertaPersistente(ofertaId) {
    const ofertaIdTexto = String(ofertaId);
    const ofertas = obtenerListaOfertasParaShowcase().map(o => ({ ...o }));
    const idx = ofertas.findIndex(o => String(o.id) === ofertaIdTexto);
    if (idx < 0) return;

    ofertas[idx].vendidos = Number(ofertas[idx].vendidos || 0) + 1;
    localStorage.setItem("ofertasActivas", JSON.stringify(ofertas));

    try {
        if (Array.isArray(ofertasActivas)) {
            const idxGlobal = ofertasActivas.findIndex(o => String(o.id) === ofertaIdTexto);
            if (idxGlobal >= 0) ofertasActivas[idxGlobal].vendidos = ofertas[idx].vendidos;
        }
    } catch (_err) {
        // Ignorar cuando la variable global no exista en este scope.
    }
}

function abrirOfertaShowcase() {
    const oferta = getOfertaShowcaseActual();
    if (!oferta) {
        notificarError("No hay una oferta activa para abrir ahora");
        return;
    }

    const producto = buscarProductoParaShowcase(oferta.productoId);
    if (!producto) return;

    showScreen("products");

    setTimeout(() => {
        const inputBusqueda = document.getElementById("searchInput");
        if (inputBusqueda) {
            inputBusqueda.value = producto.nombre;
            if (typeof buscarProductos === "function") buscarProductos();
        }

        mostrarNotificacion(`Mostrando oferta de ${producto.nombre}`, "info", "⚡ Oferta activa");
    }, 120);
}

async function comprarOfertaShowcase(event) {
    if (event) event.stopPropagation();

    const oferta = getOfertaShowcaseActual();
    if (!oferta) {
        notificarError("No hay oferta activa en este momento");
        return;
    }

    const disponibles = Number(oferta.limite || 0) - Number(oferta.vendidos || 0);
    if (disponibles <= 0 || Number(oferta.expiracion || 0) <= Date.now()) {
        notificarError("La oferta ya no está disponible");
        actualizarShowcaseOfertas();
        return;
    }

    await agregarAlCarrito(oferta.productoId);
    actualizarOfertaPersistente(oferta.id);
    actualizarShowcaseOfertas();
    showScreen("cart");
}

function tiempoRestanteShowcase(expiracion) {
    const restante = Math.max(0, Number(expiracion || 0) - Date.now());
    const horas = Math.floor(restante / 3600000);
    const minutos = Math.floor((restante % 3600000) / 60000);
    const segundos = Math.floor((restante % 60000) / 1000);
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function actualizarShowcaseOfertas() {
    const kicker = document.getElementById("showcaseKicker");
    const titulo = document.getElementById("showcaseTitulo");
    const descripcion = document.getElementById("showcaseDescripcion");
    const precio = document.getElementById("showcasePrecio");
    const stock = document.getElementById("showcaseStock");
    const mainCard = document.getElementById("showcaseMainCard");
    const ctaBtn = document.getElementById("showcaseCtaBtn");
    const sideTitulo = document.getElementById("showcaseSideTitulo");
    const sideTexto = document.getElementById("showcaseSideTexto");

    if (!kicker || !titulo || !descripcion || !precio || !stock || !sideTitulo || !sideTexto || !mainCard || !ctaBtn) return;

    actualizarBotonProShowcase();

    const oferta = obtenerOfertaDestacada();
    window.__showcaseOfertaActual = oferta || null;

    if (!oferta) {
        mainCard.classList.remove("clickable");
        ctaBtn.disabled = true;
        kicker.textContent = "ACTUALIZACIÓN AUTOMÁTICA";
        titulo.textContent = "Sin rebajas activas";
        descripcion.textContent = "No hay ofertas relámpago en este momento. Vuelve pronto para ver nuevos descuentos.";
        precio.innerHTML = "Próxima campaña <span>Muy pronto</span>";
        stock.textContent = "Estado: esperando nuevas promociones";
        ctaBtn.textContent = "Sin oferta activa";
        sideTitulo.textContent = "Envío Instantáneo";
        sideTexto.textContent = "Mantén las notificaciones activas para enterarte primero cuando salgan rebajas.";
        return;
    }

    const producto = buscarProductoParaShowcase(oferta.productoId);
    if (!producto) return;

    const base = Number(producto.precio || 0);
    const descuento = Number(oferta.descuento || 0);
    const final = Math.max(0, Math.round(base * (1 - descuento / 100)));
    const disponibles = Math.max(0, Number(oferta.limite || 0) - Number(oferta.vendidos || 0));

    mainCard.classList.add("clickable");
    ctaBtn.disabled = false;
    kicker.textContent = `REBAJA ACTIVA ${descuento}%`;
    titulo.textContent = `${producto.nombre}`;
    descripcion.textContent = `${producto.specs || "Oferta por tiempo limitado"}. Precio especial actualizado en tiempo real.`;
    precio.innerHTML = `${formatearPrecioShowcase(final)} <span>${formatearPrecioShowcase(base)}</span>`;
    stock.textContent = `Disponibles: ${disponibles} | Termina en: ${tiempoRestanteShowcase(oferta.expiracion)}`;
    ctaBtn.textContent = "Comprar ahora";
    sideTitulo.textContent = "Oferta en vivo";
    sideTexto.textContent = `Compra ahora y aprovecha ${descuento}% OFF antes de que se agoten las unidades.`;
}

window.abrirOfertaShowcase = abrirOfertaShowcase;
window.comprarOfertaShowcase = comprarOfertaShowcase;
window.comprarProShowcase = comprarProShowcase;

document.addEventListener("DOMContentLoaded", async () => {
    if (window.supabaseClient?.auth) {
        try {
            const { data: sessionData } = await window.supabaseClient.auth.getSession();
            const session = sessionData?.session;

            if (session?.user) {
                let perfil = null;
                const { data: perfilData } = await window.supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("uid", session.user.id)
                    .maybeSingle();

                perfil = perfilData;

                usuarioActual = {
                    id: perfil?.id || session.user.id,
                    uid: session.user.id,
                    nombre: perfil?.nombre || session.user.user_metadata?.nombre || String(session.user.email || "usuario").split("@")[0],
                    email: perfil?.email || session.user.email,
                    esAdmin: Boolean(perfil?.es_admin || perfil?.esAdmin || session.user.email === ADMIN_EMAIL),
                    es_admin: Boolean(perfil?.es_admin || perfil?.esAdmin || session.user.email === ADMIN_EMAIL)
                };

                localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
                localStorage.setItem("usuario", JSON.stringify(usuarioActual));
            }
        } catch (err) {
            console.error("Error restaurando sesión Supabase:", err);
        }
    }

    if (usuarioActual && typeof sincronizarUsuarioDataActual === "function") {
        sincronizarUsuarioDataActual();
    }

    if (usuarioActual) {
        const ultimaPantalla = localStorage.getItem("ultimaPantalla") || "products";
        showScreen(ultimaPantalla);
    } else {
        showScreen("auth");
    }

    mostrarProductos();
    actualizarContadorCarrito();
    if (typeof cargarCarritoNube === "function") await cargarCarritoNube();
    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
    if (usuarioActual) actualizarPerfil();

    actualizarShowcaseOfertas();
    if (!window.__showcaseOfertaInterval) {
        window.__showcaseOfertaInterval = setInterval(actualizarShowcaseOfertas, 1000);
    }

    setTimeout(() => {
        mostrarNotificacion("Explora nuestros productos con descuentos exclusivos", "info", "🎯 Bienvenido");
    }, 1000);

    setTimeout(() => {
        mostrarOfertaAleatoria();
    }, 3000);
});
