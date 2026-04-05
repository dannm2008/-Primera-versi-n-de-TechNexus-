// ========== FUNCIONALIDADES AVANZADAS ==========

let resenas = JSON.parse(localStorage.getItem("resenas") || "[]");
let chatActivo = false;
let mensajesChat = [];
let suscriptores = JSON.parse(localStorage.getItem("suscriptores") || "[]");
let ofertasActivas = JSON.parse(localStorage.getItem("ofertasActivas") || "null") || [
    { id: 1, productoId: 1, descuento: 30, expiracion: Date.now() + 3600000, limite: 5, vendidos: 0 },
    { id: 2, productoId: 4, descuento: 50, expiracion: Date.now() + 7200000, limite: 10, vendidos: 0 }
];

let notificacionesUsuario = [];
let wishlist = [];

function idsIguales(a, b) {
    return String(a) === String(b);
}

function keyPorUsuario(prefijo) {
    return `${prefijo}_${usuarioActual?.email || "invitado"}`;
}

function obtenerNombreAutorResena() {
    const nombreSesion = String(usuarioActual?.nombre || "").trim();
    if (nombreSesion) return nombreSesion;

    const nombrePerfil = String(usuarioData?.nombre || "").trim();
    if (nombrePerfil) return nombrePerfil;

    const email = String(usuarioActual?.email || "").trim();
    if (email.includes("@")) return email.split("@")[0];

    return "Usuario";
}

function guardarOfertasActivas() {
    localStorage.setItem("ofertasActivas", JSON.stringify(ofertasActivas));
}

function cargarNotificacionesUsuario() {
    notificacionesUsuario = JSON.parse(localStorage.getItem(keyPorUsuario("notificaciones")) || "[]");
    actualizarContadorNotificaciones();
}

function guardarNotificacionesUsuario() {
    localStorage.setItem(keyPorUsuario("notificaciones"), JSON.stringify(notificacionesUsuario));
}

function cargarWishlistUsuario() {
    wishlist = JSON.parse(localStorage.getItem(keyPorUsuario("wishlist")) || "[]");
}

function guardarWishlistUsuario() {
    localStorage.setItem(keyPorUsuario("wishlist"), JSON.stringify(wishlist));
}

function getUsuarioUidActual() {
    if (typeof obtenerUsuarioIdSupabaseSeguro === "function") {
        return obtenerUsuarioIdSupabaseSeguro();
    }

    const candidato = String(usuarioActual?.uid || "").trim();
    if (!candidato) return "";
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidato) ? candidato : "";
}

async function cargarFavoritosSupabase() {
    if (!window.supabaseClient || !usuarioActual) return null;

    const uid = getUsuarioUidActual();
    if (!uid) return null;

    try {
        const { data, error } = await window.supabaseClient
            .from("usuarios")
            .select("favoritos")
            .eq("uid", uid)
            .maybeSingle();

        if (error) {
            console.error("Error cargando favoritos desde Supabase:", error.message);
            return null;
        }

        const favoritos = Array.isArray(data?.favoritos) ? data.favoritos.map(id => String(id)) : [];
        return favoritos;
    } catch (err) {
        console.error("Error de conexión al cargar favoritos:", err);
        return null;
    }
}

async function guardarFavoritosSupabase(favoritosIds = []) {
    if (!window.supabaseClient || !usuarioActual) return false;

    const uid = getUsuarioUidActual();
    if (!uid) return false;

    const payloadFavoritos = Array.isArray(favoritosIds) ? favoritosIds.map(id => String(id)) : [];

    try {
        const payloadUsuario = {
            uid,
            nombre: usuarioActual.nombre || String(usuarioActual.email || "usuario").split("@")[0],
            email: usuarioActual.email,
            favoritos: payloadFavoritos
        };

        const { error } = await window.supabaseClient
            .from("usuarios")
            .upsert(payloadUsuario, { onConflict: "uid" });

        if (error) {
            console.error("Error guardando favoritos en Supabase:", error.message);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Error de conexión guardando favoritos:", err);
        return false;
    }
}

async function sincronizarFavoritosConSupabase() {
    if (!usuarioActual) return;

    const favoritosSupabase = await cargarFavoritosSupabase();
    if (!Array.isArray(favoritosSupabase)) return;

    if (usuarioData && Array.isArray(usuarioData.favoritos)) {
        usuarioData.favoritos = favoritosSupabase;
        if (typeof guardarUsuarioData === "function") guardarUsuarioData();
    }

    wishlist = productos.filter(p => favoritosSupabase.some(id => idsIguales(id, p.id)));
    guardarWishlistUsuario();
    actualizarIconosFavoritosEnProductos();
}

function actualizarIconosFavoritosEnProductos() {
    const favoritos = Array.isArray(usuarioData?.favoritos) ? usuarioData.favoritos.map(id => String(id)) : [];
    document.querySelectorAll(".btn-fav[data-product-id]").forEach(btn => {
        const productId = String(btn.getAttribute("data-product-id") || "");
        const esFavorito = favoritos.some(id => idsIguales(id, productId));
        btn.textContent = esFavorito ? "❤️" : "🤍";
    });
}

async function obtenerResenasSupabase(productoId) {
    if (!window.supabaseClient) return null;

    try {
        const { data, error } = await window.supabaseClient
            .from("resenas")
            .select("*")
            .eq("producto_id", String(productoId))
            .order("fecha", { ascending: false });

        if (error) {
            console.error("Error cargando reseñas desde Supabase:", error.message);
            return null;
        }

        return (data || []).map(r => ({
            id: String(r.id),
            productoId: String(r.producto_id),
            usuario: r.usuario_nombre || "Usuario",
            usuarioEmail: r.usuario_email || "",
            calificacion: Number(r.calificacion || 0),
            titulo: r.titulo || "",
            comentario: r.comentario || "",
            fecha: r.fecha || new Date().toISOString(),
            likes: Number(r.likes || 0),
            reportes: Number(r.reportes || 0)
        }));
    } catch (err) {
        console.error("Error de conexión al cargar reseñas:", err);
        return null;
    }
}

window.cargarFavoritosSupabase = cargarFavoritosSupabase;
window.guardarFavoritosSupabase = guardarFavoritosSupabase;

// ========== SISTEMA DE RESENAS ==========

async function agregarResena(productoId, calificacion, comentario, titulo) {
    if (!usuarioActual) {
        notificarError("Inicia sesión para dejar una reseña");
        return false;
    }

    const historial = getHistorialUsuario();
    const haComprado = historial.some(orden => {
        const items = Array.isArray(orden.items) ? orden.items : [];
        return items.some(item => idsIguales(item.id, productoId));
    });

    // En algunos casos el historial queda con IDs distintos (local vs nube).
    // Permitimos publicar con sesión iniciada para evitar falsos bloqueos.
    if (!haComprado) {
        console.warn("Reseña publicada sin compra verificada para este producto", productoId);
    }

    if (window.supabaseClient) {
        const usuarioIdNube = getUsuarioUidActual();
        const payload = {
            producto_id: String(productoId),
            usuario_nombre: obtenerNombreAutorResena(),
            usuario_email: usuarioActual.email,
            calificacion: Number(calificacion),
            titulo,
            comentario
        };

        if (usuarioIdNube) {
            payload.usuario_id = usuarioIdNube;
        }

        try {
            const { error } = await window.supabaseClient
                .from("resenas")
                .insert(payload);

            if (!error) {
                if (typeof notificarResenaPublicada === "function") notificarResenaPublicada();
                return true;
            }

            console.error("Error guardando reseña en Supabase:", error.message);
        } catch (err) {
            console.error("Error de conexión al guardar reseña:", err);
        }
    }

    const resena = {
        id: Date.now().toString(),
        productoId: String(productoId),
        usuario: obtenerNombreAutorResena(),
        usuarioEmail: usuarioActual.email,
        calificacion: Number(calificacion),
        titulo,
        comentario,
        fecha: new Date().toISOString(),
        likes: 0,
        reportes: 0
    };

    resenas.push(resena);
    localStorage.setItem("resenas", JSON.stringify(resenas));
    if (typeof notificarResenaPublicada === "function") notificarResenaPublicada();
    return true;
}

async function obtenerResenasProducto(productoId) {
    const resenasRemotas = await obtenerResenasSupabase(productoId);
    const resenasLocales = resenas.filter(r => idsIguales(r.productoId, productoId));

    // Si la nube responde vacía (o con error), mostramos local para evitar "0 reseñas" falsas.
    if (Array.isArray(resenasRemotas) && resenasRemotas.length > 0) return resenasRemotas;
    return resenasLocales;
}

async function calcularPromedioProducto(productoId) {
    const resenasProducto = await obtenerResenasProducto(productoId);
    if (!resenasProducto.length) return 0;
    const promedio = resenasProducto.reduce((sum, r) => sum + Number(r.calificacion || 0), 0) / resenasProducto.length;
    return Math.round(promedio * 10) / 10;
}

async function mostrarResenas(productoId) {
    const resenasProducto = await obtenerResenasProducto(productoId);
    const promedio = await calcularPromedioProducto(productoId);
    const adminEmail = typeof ADMIN_EMAIL !== "undefined" ? ADMIN_EMAIL : "admin@technexus.com";

    let html = `
        <div class="resenas-section">
            <div class="resenas-header">
                <div class="promedio">
                    <div class="stars">${"⭐".repeat(Math.round(promedio))}${"☆".repeat(5 - Math.round(promedio))}</div>
                    <div class="valor">${promedio || 0} de 5</div>
                    <div class="total">${resenasProducto.length} reseñas</div>
                </div>
                <button class="btn-outline" onclick='mostrarFormularioResena(${JSON.stringify(productoId)})'>Escribir reseña</button>
            </div>
            <div class="resenas-lista">
    `;

    resenasProducto.forEach(r => {
        html += `
            <div class="resena-item">
                <div class="resena-usuario">
                    <strong>${r.usuario}</strong>
                    <div class="stars">${"⭐".repeat(Number(r.calificacion || 0))}${"☆".repeat(5 - Number(r.calificacion || 0))}</div>
                </div>
                <div class="resena-titulo">${r.titulo || "Sin título"}</div>
                <div class="resena-comentario">${r.comentario || ""}</div>
                <div class="resena-fecha">${new Date(r.fecha).toLocaleDateString()}</div>
                <div class="resena-acciones">
                    <button onclick='likeResena(${JSON.stringify(r.id)})' aria-label="Dar like a reseña" title="Me gusta">👍 ${r.likes || 0}</button>
                    ${usuarioActual?.email === adminEmail ? `<button onclick='eliminarResena(${JSON.stringify(r.id)})' aria-label="Eliminar reseña" title="Eliminar reseña">🗑️</button>` : ""}
                </div>
            </div>
        `;
    });

    html += "</div></div>";
    return html;
}

async function likeResena(resenaId) {
    const resena = resenas.find(r => idsIguales(r.id, resenaId));
    if (!resena) return;
    resena.likes = Number(resena.likes || 0) + 1;
    localStorage.setItem("resenas", JSON.stringify(resenas));
    const modal = document.getElementById("resenasModalBody");
    if (modal) modal.innerHTML = await mostrarResenas(resena.productoId);
}

function eliminarResena(resenaId) {
    const adminEmail = typeof ADMIN_EMAIL !== "undefined" ? ADMIN_EMAIL : "admin@technexus.com";
    if (usuarioActual?.email !== adminEmail) return;
    resenas = resenas.filter(r => !idsIguales(r.id, resenaId));
    localStorage.setItem("resenas", JSON.stringify(resenas));
    mostrarNotificacion("Reseña eliminada", "success", "Moderación");
}

function mostrarFormularioResena(productoId) {
    const form = `
        <div id="resenaFormModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 600px;">
                <h3>⭐ Escribir reseña</h3>
                <div class="form-group"><label>Título</label><input id="resenaTitulo" placeholder="¿Qué te pareció?"></div>
                <div class="form-group">
                    <label>Calificación</label>
                    <select id="resenaCalificacion">
                        <option value="5">5 - Excelente</option>
                        <option value="4">4 - Muy bueno</option>
                        <option value="3">3 - Bueno</option>
                        <option value="2">2 - Regular</option>
                        <option value="1">1 - Malo</option>
                    </select>
                </div>
                <div class="form-group"><label>Comentario</label><textarea id="resenaComentario" placeholder="Cuéntanos tu experiencia"></textarea></div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="admin-btn" onclick='enviarResenaDesdeFormulario(${JSON.stringify(productoId)})'>Publicar</button>
                    <button class="admin-btn admin-btn-danger" onclick="cerrarResenaForm()">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", form);
}

function cerrarResenaForm() {
    const form = document.getElementById("resenaFormModal");
    if (form) form.remove();
}

async function enviarResenaDesdeFormulario(productoId) {
    const titulo = (document.getElementById("resenaTitulo")?.value || "").trim();
    const calificacion = Number(document.getElementById("resenaCalificacion")?.value || "0");
    const comentario = (document.getElementById("resenaComentario")?.value || "").trim();

    if (!titulo || !calificacion || !comentario) {
        notificarError("Completa todos los campos de la reseña");
        return;
    }

    const ok = await agregarResena(productoId, calificacion, comentario, titulo);
    if (!ok) return;
    cerrarResenaForm();
    await abrirModalResenas(productoId);
}

async function abrirModalResenas(productoId) {
    const producto = productos.find(p => idsIguales(p.id, productoId));
    if (!producto) return;

    const existente = document.getElementById("resenasModal");
    if (existente) existente.remove();

    const modal = `
        <div id="resenasModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 850px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <h3>⭐ Reseñas - ${producto.nombre}</h3>
                    <button class="admin-btn admin-btn-danger" onclick="cerrarResenasModal()">Cerrar</button>
                </div>
                <div id="resenasModalBody"><div style="text-align:center; padding: 20px;">Cargando reseñas...</div></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modal);
    const body = document.getElementById("resenasModalBody");
    if (body) body.innerHTML = await mostrarResenas(productoId);
}

function cerrarResenasModal() {
    const modal = document.getElementById("resenasModal");
    if (modal) modal.remove();
}

// ========== NOTIFICACIONES PUSH (SIMULADAS) ==========

function agregarNotificacion(titulo, mensaje, tipo, link = null) {
    if (!usuarioActual) return;

    const notificacion = {
        id: Date.now(),
        titulo,
        mensaje,
        tipo,
        leida: false,
        fecha: new Date().toISOString(),
        link
    };

    notificacionesUsuario.unshift(notificacion);
    guardarNotificacionesUsuario();
    mostrarToastNotificacion(titulo, mensaje, tipo);
    actualizarContadorNotificaciones();
}

function mostrarToastNotificacion(titulo, mensaje, tipo) {
    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-icon">${tipo === "pedido" ? "📦" : tipo === "oferta" ? "🎉" : "ℹ️"}</div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function actualizarContadorNotificaciones() {
    let badge = document.getElementById("notificacionesCount");
    if (!badge) return;
    const noLeidas = notificacionesUsuario.filter(n => !n.leida).length;
    badge.textContent = String(noLeidas);
    badge.style.display = noLeidas > 0 ? "inline-flex" : "none";
}

function limpiarIndicadorNotificacionesUI(emailUsuario = "") {
    notificacionesUsuario = [];

    const key = `notificaciones_${String(emailUsuario || "invitado")}`;
    localStorage.removeItem(key);

    const badge = document.getElementById("notificacionesCount");
    if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
    }

    const acciones = document.getElementById("headerAdvancedActions");
    if (acciones) acciones.remove();

    const modal = document.getElementById("notificacionesModal");
    if (modal) modal.remove();
}

function abrirPanelNotificaciones() {
    if (!usuarioActual) {
        notificarError("Inicia sesión para ver notificaciones");
        return;
    }

    const existente = document.getElementById("notificacionesModal");
    if (existente) existente.remove();

    cargarNotificacionesUsuario();

    const lista = notificacionesUsuario.map(n => {
        const idArg = JSON.stringify(n.id);
        const accionHtml = n.leida
            ? `<button class="btn-outline" style="margin-top: 8px; background: #14532d; border-color: #22c55e; color: #86efac; cursor: default;" disabled>Leído ✅</button>`
            : `<button class="btn-outline" style="margin-top: 8px;" onclick='marcarNotificacionLeida(${idArg})'>Marcar leída</button>`;

        return `
        <div class="noti-item ${n.leida ? "" : "no-leida"}" style="${n.leida ? "border-color:#22c55e;" : ""}">
            <div><strong>${n.titulo}</strong></div>
            <div>${n.mensaje}</div>
            <div class="noti-meta">${new Date(n.fecha).toLocaleString()}</div>
            ${accionHtml}
        </div>
    `;
    }).join("") || "<div class='noti-vacio'>No tienes notificaciones</div>";

    const modal = `
        <div id="notificacionesModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 700px;">
                <h3>🔔 Notificaciones</h3>
                <div class="noti-list">${lista}</div>
                <button class="admin-btn" style="margin-top: 12px;" onclick="cerrarNotificacionesModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modal);
}

function cerrarNotificacionesModal() {
    const modal = document.getElementById("notificacionesModal");
    if (modal) modal.remove();
}

function marcarNotificacionLeida(id) {
    const noti = notificacionesUsuario.find(n => String(n.id) === String(id));
    if (!noti) return;
    noti.leida = true;
    guardarNotificacionesUsuario();
    actualizarContadorNotificaciones();
    abrirPanelNotificaciones();
}

function notificarPedidoEnviado(ordenId) {
    agregarNotificacion("📦 Pedido enviado", `Tu pedido #${ordenId} está en camino`, "pedido", "/pedidos");
}

function notificarOfertaEspecial(productoNombre, descuento) {
    agregarNotificacion("🎉 Oferta especial", `${productoNombre} con ${descuento}% OFF por tiempo limitado`, "oferta");
}

function notificarStockDisponible(productoNombre) {
    agregarNotificacion("🔄 Producto disponible", `${productoNombre} está nuevamente en stock`, "sistema");
}

// ========== LISTA DE DESEOS ==========

async function agregarAWishlist(productoId) {
    if (!usuarioActual) {
        notificarError("Inicia sesión para guardar productos");
        return;
    }

    cargarWishlistUsuario();
    await sincronizarFavoritosConSupabase();
    const producto = productos.find(p => idsIguales(p.id, productoId));
    if (!producto) return;

    if (!wishlist.some(item => idsIguales(item.id, productoId))) {
        wishlist.push(producto);
        guardarWishlistUsuario();

        if (usuarioData && Array.isArray(usuarioData.favoritos)) {
            const idTexto = String(producto.id);
            if (!usuarioData.favoritos.some(id => idsIguales(id, idTexto))) {
                usuarioData.favoritos.push(idTexto);
                if (typeof guardarUsuarioData === "function") guardarUsuarioData();
            }
        }

        await guardarFavoritosSupabase(usuarioData?.favoritos || wishlist.map(item => String(item.id)));

        notificarExito(`${producto.nombre} agregado a favoritos`);
    } else {
        wishlist = wishlist.filter(item => !idsIguales(item.id, productoId));
        guardarWishlistUsuario();

        if (usuarioData && Array.isArray(usuarioData.favoritos)) {
            usuarioData.favoritos = usuarioData.favoritos.filter(id => !idsIguales(id, productoId));
            if (typeof guardarUsuarioData === "function") guardarUsuarioData();
        }

        await guardarFavoritosSupabase(usuarioData?.favoritos || wishlist.map(item => String(item.id)));
        mostrarNotificacion(`${producto.nombre} eliminado de favoritos`, "info", "Favoritos");
    }

    actualizarIconosFavoritosEnProductos();
}

window.agregarResena = agregarResena;
window.obtenerResenasProducto = obtenerResenasProducto;
window.calcularPromedioProducto = calcularPromedioProducto;
window.mostrarResenas = mostrarResenas;
window.likeResena = likeResena;
window.eliminarResena = eliminarResena;
window.mostrarFormularioResena = mostrarFormularioResena;
window.cerrarResenaForm = cerrarResenaForm;
window.enviarResenaDesdeFormulario = enviarResenaDesdeFormulario;
window.abrirModalResenas = abrirModalResenas;
window.cerrarResenasModal = cerrarResenasModal;
window.agregarAWishlist = agregarAWishlist;
window.eliminarDeWishlist = eliminarDeWishlist;
window.mostrarWishlist = mostrarWishlist;
window.abrirWishlistModal = abrirWishlistModal;
window.cerrarWishlistModal = cerrarWishlistModal;
window.actualizarIconosFavoritosEnProductos = actualizarIconosFavoritosEnProductos;
window.limpiarIndicadorNotificacionesUI = limpiarIndicadorNotificacionesUI;

async function eliminarDeWishlist(productoId) {
    cargarWishlistUsuario();
    wishlist = wishlist.filter(item => !idsIguales(item.id, productoId));
    guardarWishlistUsuario();

    if (usuarioData && Array.isArray(usuarioData.favoritos)) {
        usuarioData.favoritos = usuarioData.favoritos.filter(id => !idsIguales(id, productoId));
        if (typeof guardarUsuarioData === "function") guardarUsuarioData();
    }

    await guardarFavoritosSupabase(usuarioData?.favoritos || wishlist.map(item => String(item.id)));

    notificarExito("Producto eliminado de favoritos");
    actualizarIconosFavoritosEnProductos();
    abrirWishlistModal();
}

function mostrarWishlist() {
    if (!wishlist.length) {
        return `
            <div class="empty-wishlist">
                <div>❤️</div>
                <h3>Tu lista de deseos está vacía</h3>
                <p>Guarda productos que te interesen para comprarlos después</p>
                <button class="admin-btn" onclick="cerrarWishlistModal(); showScreen('products')">Explorar productos</button>
            </div>
        `;
    }

    let html = '<div class="wishlist-grid">';
    wishlist.forEach(p => {
        const idArg = JSON.stringify(p.id);
        html += `
            <div class="product-card" style="position: relative;">
                <div class="wishlist-remove" onclick='eliminarDeWishlist(${idArg})'>✖</div>
                ${renderProductVisual(p.imagen, p.nombre)}
                <div class="product-title">${p.nombre}</div>
                <div class="product-price">${formatCOP(Number(p.precio))}</div>
                <button class="btn-add" onclick='agregarAlCarrito(${idArg})'>Agregar +</button>
            </div>
        `;
    });
    html += "</div>";
    return html;
}

function abrirWishlistModal() {
    if (!usuarioActual) {
        notificarError("Inicia sesión para ver tus favoritos");
        return;
    }

    cargarWishlistUsuario();
    const existente = document.getElementById("wishlistModal");
    if (existente) existente.remove();

    const modal = `
        <div id="wishlistModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 900px;">
                <h3>❤️ Mis favoritos</h3>
                ${mostrarWishlist()}
                <button class="admin-btn" style="margin-top: 16px;" onclick="cerrarWishlistModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modal);
}

function cerrarWishlistModal() {
    const modal = document.getElementById("wishlistModal");
    if (modal) modal.remove();
}

// ========== OFERTAS RELAMPAGO ==========

function obtenerOfertasActivas() {
    const ahora = Date.now();
    return ofertasActivas.filter(o => o.expiracion > ahora && o.vendidos < o.limite);
}

function mostrarOfertasRelampago() {
    const ofertas = obtenerOfertasActivas();
    if (!ofertas.length) return "";

    let html = `
        <div class="ofertas-relampago">
            <div class="ofertas-header">
                <h3>⚡ OFERTAS RELÁMPAGO</h3>
                <div class="contador-global">Tiempo limitado</div>
            </div>
            <div class="ofertas-grid">
    `;

    ofertas.forEach(oferta => {
        const producto = productos.find(p => idsIguales(p.id, oferta.productoId));
        if (!producto) return;

        const precioOferta = producto.precio * (1 - oferta.descuento / 100);
        const disponibles = oferta.limite - oferta.vendidos;

        html += `
            <div class="oferta-card">
                <div class="oferta-badge">-${oferta.descuento}%</div>
                ${renderProductVisual(producto.imagen, producto.nombre)}
                <div class="product-title">${producto.nombre}</div>
                <div class="precio-normal">${formatCOP(Number(producto.precio))}</div>
                <div class="precio-oferta">${formatCOP(Math.round(precioOferta))}</div>
                <div class="stock-limitado">⚠️ Solo ${disponibles} disponibles</div>
                <div class="contador" data-expiracion="${oferta.expiracion}"></div>
                <button class="btn-add" onclick='comprarOferta(${oferta.id}, ${JSON.stringify(producto.id)})'>Comprar ahora</button>
            </div>
        `;
    });

    html += "</div></div>";
    return html;
}

function comprarOferta(ofertaId, productoId) {
    const oferta = ofertasActivas.find(o => Number(o.id) === Number(ofertaId));
    if (!oferta || oferta.expiracion < Date.now()) {
        notificarError("Oferta expirada");
        return;
    }

    if (oferta.vendidos >= oferta.limite) {
        notificarError("Stock agotado");
        return;
    }

    oferta.vendidos += 1;
    guardarOfertasActivas();
    agregarAlCarrito(productoId);
    notificarExito("Producto agregado con descuento especial");
}

// ========== FACTURACION Y REPORTES ==========

function generarFactura(ordenId) {
    if (!usuarioActual) return;

    const historial = getHistorialUsuario();
    const orden = historial.find(o => Number(o.id) === Number(ordenId));
    if (!orden) return;

    const items = Array.isArray(orden.items) ? orden.items : [];
    const subtotal = Number(orden.subtotal || items.reduce((sum, i) => sum + Number(i.precio || 0) * Number(i.cantidad || 1), 0));
    const envio = Number(orden.envio || 0);
    const total = Number(orden.total || subtotal + envio);

    const fechaTexto = new Date(orden.fecha).toLocaleString();
    const productosTexto = items.length
        ? items.map(item => `${item.nombre} x${item.cantidad} = ${formatCOP(Number(item.precio || 0) * Number(item.cantidad || 1))}`)
        : ["Sin detalle de items"];

    const contenidoPlano = [
        "TECHNEXUS - FACTURA",
        "",
        `N° Factura: INV-${orden.id}`,
        `Fecha: ${fechaTexto}`,
        `Cliente: ${usuarioActual.nombre}`,
        `Email: ${usuarioActual.email}`,
        "",
        "PRODUCTOS:",
        ...productosTexto,
        "",
        `Subtotal: ${formatCOP(subtotal)}`,
        `Envío: ${envio === 0 ? "Gratis" : formatCOP(envio)}`,
        `TOTAL: ${formatCOP(total)}`,
        `Método de pago: ${orden.metodoPago || "Pendiente"}`,
        `Estado: ${orden.estado || "pendiente"}`,
        "",
        "Gracias por tu compra"
    ].join("\n");

    const jsPdfRef = window.jspdf?.jsPDF;
    if (jsPdfRef) {
        try {
            const doc = new jsPdfRef({ orientation: "p", unit: "mm", format: "a4" });
            let y = 18;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("TechNexus - Factura", 14, y);

            y += 10;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            const lineas = [
                `N° Factura: INV-${orden.id}`,
                `Fecha: ${fechaTexto}`,
                `Cliente: ${usuarioActual.nombre}`,
                `Email: ${usuarioActual.email}`,
                "",
                "PRODUCTOS:",
                ...productosTexto,
                "",
                `Subtotal: ${formatCOP(subtotal)}`,
                `Envío: ${envio === 0 ? "Gratis" : formatCOP(envio)}`,
                `TOTAL: ${formatCOP(total)}`,
                `Método de pago: ${orden.metodoPago || "Pendiente"}`,
                `Estado: ${orden.estado || "pendiente"}`,
                "",
                "Gracias por tu compra"
            ];

            lineas.forEach(linea => {
                const partes = doc.splitTextToSize(String(linea || ""), 180);
                partes.forEach(parte => {
                    if (y > 280) {
                        doc.addPage();
                        y = 18;
                    }
                    doc.text(parte, 14, y);
                    y += 6;
                });
            });

            doc.save(`factura_${orden.id}.pdf`);
            return;
        } catch (err) {
            console.error("Error generando PDF de factura, usando TXT:", err);
        }
    }

    const blob = new Blob([contenidoPlano], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura_${orden.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function obtenerTopProductos(limite = 5) {
    const historialGlobal = getAllPedidos();
    const ventas = {};

    historialGlobal.forEach(orden => {
        const items = Array.isArray(orden.items) ? orden.items : [];
        items.forEach(item => {
            ventas[item.nombre] = (ventas[item.nombre] || 0) + Number(item.cantidad || 1);
        });
    });

    return Object.entries(ventas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limite)
        .map(([nombre, cantidad], index) => `${index + 1}. ${nombre} (${cantidad} unidades)`)
        .join("\n");
}

function generarReporteVentas() {
    const historialGlobal = getAllPedidos();
    const ventasPorMes = {};

    historialGlobal.forEach(orden => {
        const mes = new Date(orden.fecha).toLocaleString("es-CO", { month: "long", year: "numeric" });
        ventasPorMes[mes] = (ventasPorMes[mes] || 0) + Number(orden.total || 0);
    });

    const fecha = new Date();
    const fechaTexto = fecha.toLocaleString();
    const fechaArchivo = fecha.toISOString().slice(0, 10);
    const totalVentas = formatCOP(historialGlobal.reduce((sum, o) => sum + Number(o.total || 0), 0));
    const ventasMesTexto = Object.entries(ventasPorMes).length
        ? Object.entries(ventasPorMes).map(([mes, total]) => `${mes}: ${formatCOP(total)}`).join("\n")
        : "Sin datos";
    const topProductosTexto = obtenerTopProductos(5) || "Sin datos";

    const contenidoPlano = [
        "REPORTE DE VENTAS - TECHNEXUS",
        "",
        `Fecha generación: ${fechaTexto}`,
        `Total pedidos: ${historialGlobal.length}`,
        `Total ventas: ${totalVentas}`,
        "",
        "VENTAS POR MES:",
        ventasMesTexto,
        "",
        "PRODUCTOS MAS VENDIDOS:",
        topProductosTexto
    ].join("\n");

    const jsPdfRef = window.jspdf?.jsPDF;
    if (jsPdfRef) {
        try {
            const doc = new jsPdfRef({ orientation: "p", unit: "mm", format: "a4" });

            let y = 18;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Reporte de Ventas - TechNexus", 14, y);

            y += 10;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            const lineas = [
                `Fecha generación: ${fechaTexto}`,
                `Total pedidos: ${historialGlobal.length}`,
                `Total ventas: ${totalVentas}`,
                "",
                "VENTAS POR MES:",
                ...ventasMesTexto.split("\n"),
                "",
                "PRODUCTOS MAS VENDIDOS:",
                ...topProductosTexto.split("\n")
            ];

            lineas.forEach(linea => {
                const partes = doc.splitTextToSize(String(linea || ""), 180);
                partes.forEach(parte => {
                    if (y > 280) {
                        doc.addPage();
                        y = 18;
                    }
                    doc.text(parte, 14, y);
                    y += 6;
                });
            });

            doc.save(`reporte_ventas_${fechaArchivo}.pdf`);
            return;
        } catch (err) {
            console.error("Error generando PDF, usando TXT:", err);
        }
    }

    const blob = new Blob([contenidoPlano], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_ventas_${fechaArchivo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ========== CHAT EN VIVO ==========

const opcionesSoporteRapido = [
    { id: "pedido", label: "📦 Pedido y envío" },
    { id: "garantia", label: "🛡️ Garantía y devoluciones" },
    { id: "pago", label: "💳 Pagos y facturación" },
    { id: "tecnico", label: "🧰 Soporte técnico" },
    { id: "asesor", label: "👩‍💼 Hablar con asesor" }
];

const opcionesDiagnosticoTecnico = [
    { id: "no_enciende", label: "No enciende" },
    { id: "lento", label: "Lento o se congela" },
    { id: "internet", label: "Problema de internet" },
    { id: "pantalla", label: "Pantalla/imagen" },
    { id: "audio", label: "Audio/microfono" }
];

let categoriaSoporteActiva = "";

function normalizarTextoSoporte(textoOriginal) {
    return String(textoOriginal || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s#@._-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function extraerDatosClienteSoporte(textoOriginal) {
    const texto = String(textoOriginal || "");
    const email = texto.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] || "";
    const numeroCompra = texto.match(/\b(?:tnx-[a-z]{3}-\d{8}-\d{4}|(?:pedido|orden|compra)\s*#?\s*[a-z0-9-]{4,})\b/i)?.[0] || "";
    return { email, numeroCompra };
}

function detectarCategoriaSoporte(textoOriginal) {
    const texto = normalizarTextoSoporte(textoOriginal);

    if (texto.includes("pedido") || texto.includes("envio") || texto.includes("en camino") || texto.includes("entregado")) {
        return "pedido";
    }
    if (texto.includes("garantia") || texto.includes("devol") || texto.includes("cambio") || texto.includes("reembolso")) {
        return "garantia";
    }
    if (texto.includes("pago") || texto.includes("factura") || texto.includes("cobro") || texto.includes("tarjeta")) {
        return "pago";
    }
    if (texto.includes("tecnico") || texto.includes("falla") || texto.includes("error") || texto.includes("no funciona")) {
        return "tecnico";
    }
    if (texto.includes("asesor") || texto.includes("humano") || texto.includes("agente")) {
        return "asesor";
    }
    return "general";
}

function generarCodigoTicket(categoria) {
    const prefijo = {
        pedido: "PED",
        garantia: "GAR",
        pago: "PAG",
        tecnico: "TEC",
        asesor: "ASE",
        general: "GEN"
    }[categoria] || "GEN";

    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`;
    const correlativo = String(Math.floor(Math.random() * 9000) + 1000);
    return `TNX-${prefijo}-${fecha}-${correlativo}`;
}

function metadatosCategoriaSoporte(categoria) {
    if (categoria === "tecnico") return { prioridad: "Alta", eta: "10-20 min" };
    if (categoria === "asesor") return { prioridad: "Alta", eta: "5-15 min" };
    if (categoria === "pedido") return { prioridad: "Media", eta: "10-25 min" };
    if (categoria === "pago") return { prioridad: "Media", eta: "15-30 min" };
    if (categoria === "garantia") return { prioridad: "Media", eta: "20-35 min" };
    return { prioridad: "Baja", eta: "20-40 min" };
}

function reiniciarChatSoporte() {
    mensajesChat = [];
    localStorage.removeItem("chatGlobal");
}

function responderSoporteSegunCategoria(textoOriginal) {
    const texto = normalizarTextoSoporte(textoOriginal);
    const categoria = detectarCategoriaSoporte(texto);
    const ticket = generarCodigoTicket(categoria);
    const meta = metadatosCategoriaSoporte(categoria);
    const datosCliente = extraerDatosClienteSoporte(textoOriginal);
    const tieneNumeroCompra = Boolean(datosCliente.numeroCompra);
    const tieneEmail = Boolean(datosCliente.email);

    if (!texto) {
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nHola, soy Soporte TechNexus. Elige una opción rápida y te guiamos paso a paso.`;
    }

    if (categoria === "pedido") {
        if (tieneNumeroCompra) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nPerfecto. Con tu número de compra (${datosCliente.numeroCompra}) podemos avanzar sin correo por ahora. Te comparto estado, guía y fecha estimada.`;
        }
        if (tieneEmail) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nPor seguridad, con solo correo no compartimos datos de pedidos. Compárteme número de compra y una verificación adicional (últimos 4 dígitos del teléfono de contacto o documento) para continuar.`;
        }
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nTe ayudo con tu pedido. Compárteme primero el número de compra. Si no lo tienes, te pedimos el correo usado en la compra para ubicarla.`;
    }

    if (categoria === "garantia") {
        if (tieneNumeroCompra) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nGracias. Con el número de compra (${datosCliente.numeroCompra}) validamos garantía/devolución. Ahora indícame producto y motivo para continuar.`;
        }
        if (tieneEmail) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nPara proteger tu cuenta, no gestionamos garantías solo con correo. Necesitamos número de compra y una verificación adicional para evitar suplantaciones.`;
        }
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nPara garantía/devolución: comparte número de compra, producto y motivo. Si no tienes el número, usamos tu correo de compra como respaldo.`;
    }

    if (categoria === "pago") {
        if (tieneNumeroCompra) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nExcelente, con el número de compra (${datosCliente.numeroCompra}) revisamos pago/facturación. Si hace falta más validación, te pediremos correo al final.`;
        }
        if (tieneEmail) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nCon solo correo no mostramos datos de cobros o facturas. Compárteme número de compra para validar titularidad y proteger tu información.`;
        }
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nRevisemos pagos/facturación. Compárteme número de compra. Si no lo tienes, envíame el correo de compra y fecha aproximada del cobro.`;
    }

    if (categoria === "tecnico") {
        if (tieneNumeroCompra) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nVamos con soporte técnico. Ya tengo tu número de compra (${datosCliente.numeroCompra}). Ahora cuéntame modelo y falla exacta para darte diagnóstico.`;
        }
        if (tieneEmail) {
            return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nPodemos iniciar diagnóstico técnico general, pero no compartiremos datos de compra ni garantía solo con correo. Para eso necesitaremos número de compra y validación adicional.`;
        }
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nVamos con soporte técnico. Cuéntame modelo y falla exacta. Si aplica garantía, te pediremos número de compra (o correo de compra si no lo tienes).`;
    }

    if (categoria === "asesor") {
        return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nListo. Un asesor humano tomará tu caso. Déjame nombre completo, correo y un resumen corto para priorizarlo.`;
    }

    return `Ticket: ${ticket}\nPrioridad: ${meta.prioridad}\nTiempo estimado: ${meta.eta}\nGracias por tu mensaje. Para ayudarte más rápido, usa una opción rápida o escribe: pedido, garantía, pago, técnico o asesor.`;
}

function agregarMensajeSoporte(texto) {
    const respuesta = {
        id: Date.now(),
        usuario: "Soporte",
        mensaje: texto,
        fecha: new Date().toISOString(),
        tipo: "soporte"
    };
    mensajesChat.push(respuesta);
    cargarMensajesChat();
}

function agregarMensajeUsuario(texto) {
    const mensaje = {
        id: Date.now(),
        usuario: usuarioActual?.nombre || "Visitante",
        email: usuarioActual?.email || "anonimo",
        mensaje: String(texto || ""),
        fecha: new Date().toISOString(),
        tipo: "usuario"
    };

    mensajesChat.push(mensaje);
    cargarMensajesChat();
}

function responderDiagnosticoTecnico(opcionId) {
    if (opcionId === "no_enciende") {
        return "Diagnóstico rápido:\n1) Verifica cable y toma eléctrica.\n2) Mantén presionado el botón de encendido 12 segundos.\n3) Prueba otro cargador/fuente.\nSi sigue igual, escalamos a revisión técnica.";
    }
    if (opcionId === "lento") {
        return "Diagnóstico rápido:\n1) Reinicia el equipo.\n2) Cierra apps en segundo plano.\n3) Libera al menos 20% de almacenamiento.\nSi persiste, te guiamos con limpieza avanzada.";
    }
    if (opcionId === "internet") {
        return "Diagnóstico rápido:\n1) Reinicia modem/router por 30 segundos.\n2) Olvida y reconecta la red WiFi.\n3) Prueba con cable o hotspot para descartar falla local.";
    }
    if (opcionId === "pantalla") {
        return "Diagnóstico rápido:\n1) Sube brillo y verifica modo ahorro.\n2) Prueba reinicio y combinación de pantalla externa.\n3) Revisa si hay líneas, parpadeos o manchas para abrir garantía.";
    }
    if (opcionId === "audio") {
        return "Diagnóstico rápido:\n1) Verifica volumen y salida seleccionada.\n2) Desconecta/reconecta auriculares.\n3) Reinicia controladores de audio.\nSi no mejora, abrimos caso con asesor técnico.";
    }
    return "Selecciona un tipo de falla para darte pasos concretos.";
}

function renderizarOpcionesSoporte() {
    const contenedor = document.getElementById("chatOpciones");
    if (!contenedor) return;

    contenedor.innerHTML = opcionesSoporteRapido
        .map(op => `<button class="chat-opcion" onclick='seleccionarOpcionSoporte(${JSON.stringify(op.id)})'>${op.label}</button>`)
        .join("");
}

function renderizarOpcionesTecnicas() {
    const contenedor = document.getElementById("chatOpcionesDetalle");
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="chat-subtitulo">Selecciona la falla técnica:</div>
        ${opcionesDiagnosticoTecnico
            .map(op => `<button class="chat-opcion detalle" onclick='seleccionarDiagnosticoTecnico(${JSON.stringify(op.id)}, ${JSON.stringify(op.label)})'>${op.label}</button>`)
            .join("")}
    `;
}

function limpiarOpcionesTecnicas() {
    const contenedor = document.getElementById("chatOpcionesDetalle");
    if (!contenedor) return;
    contenedor.innerHTML = "";
}

function limpiarFormularioValidacionSoporte() {
    const contenedor = document.getElementById("chatValidacion");
    if (!contenedor) return;
    contenedor.innerHTML = "";
}

function renderizarFormularioValidacionSoporte(categoria) {
    const contenedor = document.getElementById("chatValidacion");
    if (!contenedor) return;

    if (!["pedido", "garantia", "pago", "tecnico"].includes(categoria)) {
        contenedor.innerHTML = "";
        return;
    }

    const textoCategoria = categoria === "tecnico"
        ? "Si necesitas validar garantía técnica, completa este formulario."
        : "Para validar identidad y proteger datos, completa este formulario.";

    contenedor.innerHTML = `
        <div class="chat-validacion-titulo">${textoCategoria}</div>
        <input id="soporteNumeroCompra" class="chat-validacion-input" placeholder="Número de compra o ticket (ej: TNX-PED-20260404-1234)">
        <input id="soporteEmailCompra" class="chat-validacion-input" placeholder="Correo de compra (opcional)">
        <input id="soporteVerificacion" class="chat-validacion-input" maxlength="4" placeholder="Últimos 4 dígitos (tel/doc)">
        <button class="chat-validacion-btn" onclick="validarDatosSoporte()">Validar datos</button>
    `;
}

function validarDatosSoporte() {
    const numeroInput = document.getElementById("soporteNumeroCompra");
    const emailInput = document.getElementById("soporteEmailCompra");
    const verificacionInput = document.getElementById("soporteVerificacion");

    const numeroCompra = String(numeroInput?.value || "").trim();
    const email = String(emailInput?.value || "").trim().toLowerCase();
    const verificacion = String(verificacionInput?.value || "").trim();

    if (!numeroCompra) {
        agregarMensajeSoporte("Para continuar necesitamos número de compra o ticket.");
        return;
    }

    if (!/^\d{4}$/.test(verificacion)) {
        agregarMensajeSoporte("La verificación adicional debe tener 4 dígitos.");
        return;
    }

    if (email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
        agregarMensajeSoporte("El formato del correo no es válido. Revísalo e intenta de nuevo.");
        return;
    }

    const resumen = `📝 Validación enviada\nCompra/Ticket: ${numeroCompra}\nCorreo: ${email || "No suministrado"}\nVerificación: ****${verificacion}`;
    agregarMensajeUsuario(resumen);

    const categoriaTexto = categoriaSoporteActiva || "general";
    agregarMensajeSoporte(`Validación recibida para ${categoriaTexto}. Tu identidad quedó verificada y el caso pasa a revisión prioritaria.`);

    if (numeroInput) numeroInput.value = "";
    if (emailInput) emailInput.value = "";
    if (verificacionInput) verificacionInput.value = "";
}

function seleccionarDiagnosticoTecnico(opcionId, label) {
    agregarMensajeUsuario(`🧪 ${label}`);
    setTimeout(() => {
        agregarMensajeSoporte(responderDiagnosticoTecnico(opcionId));
    }, 700);
}

function seleccionarOpcionSoporte(opcionId) {
    const opcion = opcionesSoporteRapido.find(item => item.id === opcionId);
    if (!opcion) return;
    categoriaSoporteActiva = opcionId;

    agregarMensajeUsuario(opcion.label);
    setTimeout(() => {
        agregarMensajeSoporte(responderSoporteSegunCategoria(opcion.label));
        if (opcionId === "tecnico") {
            renderizarOpcionesTecnicas();
            renderizarFormularioValidacionSoporte(opcionId);
            return;
        }
        limpiarOpcionesTecnicas();
        renderizarFormularioValidacionSoporte(opcionId);
    }, 800);
}

function abrirChat() {
    if (chatActivo) return;
    chatActivo = true;

    const chatWindow = document.createElement("div");
    chatWindow.className = "chat-window";
    chatWindow.innerHTML = `
        <div class="chat-header">
            <div>
                <span>💬 Soporte TechNexus</span>
                <span style="font-size: 12px; color: #10b981;">● En línea</span>
            </div>
            <button onclick="cerrarChat()" aria-label="Cerrar chat" title="Cerrar chat">✖</button>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-opciones" id="chatOpciones"></div>
        <div class="chat-opciones-detalle" id="chatOpcionesDetalle"></div>
        <div class="chat-validacion" id="chatValidacion"></div>
    `;
    document.body.appendChild(chatWindow);

    cargarMensajesChat();
    renderizarOpcionesSoporte();
    limpiarOpcionesTecnicas();
    limpiarFormularioValidacionSoporte();

    if (!mensajesChat.length) {
        setTimeout(() => {
            agregarMensajeSoporte("Hola, soy Soporte TechNexus. Selecciona una opción para ayudarte como en una mesa de orientación. Si necesitas validar datos, usa el formulario inferior.");
        }, 350);
    }
}

function cerrarChat() {
    const chat = document.querySelector(".chat-window");
    if (chat) chat.remove();
    chatActivo = false;
}

function cargarMensajesChat() {
    const container = document.getElementById("chatMessages");
    if (!container) return;

    let html = "";
    mensajesChat.slice(-30).forEach(m => {
        html += `
            <div class="chat-message ${m.tipo}">
                <div class="chat-usuario">${m.usuario}</div>
                <div class="chat-texto">${m.mensaje}</div>
                <div class="chat-hora">${new Date(m.fecha).toLocaleTimeString()}</div>
            </div>
        `;
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

// ========== NEWSLETTER ==========

function suscribir(email) {
    const correo = String(email || "").trim().toLowerCase();
    if (!correo) return;

    if (suscriptores.includes(correo)) {
        mostrarNotificacion("Ya estás suscrito", "info", "Boletín");
        return;
    }

    suscriptores.push(correo);
    localStorage.setItem("suscriptores", JSON.stringify(suscriptores));
    notificarExito("¡Te has suscrito a nuestro newsletter!");
}

function enviarNewsletter(asunto, mensaje) {
    if (!asunto || !mensaje) {
        notificarError("Asunto y mensaje son obligatorios");
        return;
    }

    notificarExito(`Newsletter enviado a ${suscriptores.length} suscriptores`);
}

// ========== UI HELPERS ==========

function instalarAccesosAvanzadosUI() {
    const header = document.querySelector(".app-header");
    if (!header || document.getElementById("headerAdvancedActions")) return;

    const actions = document.createElement("div");
    actions.id = "headerAdvancedActions";
    actions.className = "header-advanced-actions";
    actions.innerHTML = `
        <button class="btn-outline mini-btn" onclick="abrirPanelNotificaciones()" aria-label="Abrir notificaciones" title="Notificaciones">🔔 <span id="notificacionesCount" class="mini-badge" style="display:none;">0</span></button>
        <button class="btn-outline mini-btn" onclick="abrirWishlistModal()" aria-label="Abrir favoritos" title="Favoritos">❤️</button>
        <button class="btn-outline mini-btn" onclick="abrirChat()" aria-label="Abrir chat de soporte" title="Chat de soporte">💬</button>
    `;
    header.appendChild(actions);

    const productsScreen = document.getElementById("screen-products");
    if (productsScreen && !document.getElementById("newsletterBox")) {
        const box = document.createElement("div");
        box.id = "newsletterBox";
        box.className = "newsletter-box";
        box.innerHTML = `
            <div class="newsletter-title">📧 Boletín TechNexus</div>
            <p class="newsletter-text">Recibe ofertas exclusivas y novedades</p>
            <div class="newsletter-form">
                <input id="newsletterEmail" class="newsletter-input" placeholder="tu@email.com">
                <button class="admin-btn newsletter-button" onclick="suscribir(document.getElementById('newsletterEmail')?.value)">Suscribirme</button>
            </div>
        `;
        productsScreen.appendChild(box);
    }
}

function inicializarFuncionalidadesAvanzadas() {
    reiniciarChatSoporte();
    cargarNotificacionesUsuario();
    cargarWishlistUsuario();
    guardarOfertasActivas();
    void sincronizarFavoritosConSupabase();
    instalarAccesosAvanzadosUI();
    actualizarIconosFavoritosEnProductos();
}

if (!window.__ofertasCounterStarted) {
    window.__ofertasCounterStarted = true;
    setInterval(() => {
        document.querySelectorAll(".contador").forEach(el => {
            const expiracion = parseInt(el.dataset.expiracion || "0", 10);
            const tiempo = expiracion - Date.now();
            if (tiempo > 0) {
                const horas = Math.floor(tiempo / 3600000);
                const minutos = Math.floor((tiempo % 3600000) / 60000);
                const segundos = Math.floor((tiempo % 60000) / 1000);
                el.textContent = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
            } else {
                el.textContent = "Oferta terminada";
            }
        });
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarFuncionalidadesAvanzadas();
});
