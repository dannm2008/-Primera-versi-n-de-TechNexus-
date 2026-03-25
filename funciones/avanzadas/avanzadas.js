// ========== FUNCIONALIDADES AVANZADAS ==========

let resenas = JSON.parse(localStorage.getItem("resenas") || "[]");
let chatActivo = false;
let mensajesChat = JSON.parse(localStorage.getItem("chatGlobal") || "[]");
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
    return String(usuarioActual?.uid || usuarioActual?.id || "");
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

    if (!haComprado) {
        notificarError("Solo puedes reseñar productos que has comprado");
        return false;
    }

    if (window.supabaseClient) {
        const payload = {
            producto_id: String(productoId),
            usuario_id: getUsuarioUidActual(),
            usuario_nombre: usuarioActual.nombre,
            usuario_email: usuarioActual.email,
            calificacion: Number(calificacion),
            titulo,
            comentario
        };

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
        usuario: usuarioActual.nombre,
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
    if (Array.isArray(resenasRemotas)) return resenasRemotas;
    return resenas.filter(r => idsIguales(r.productoId, productoId));
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
                <button class="btn-outline" onclick="mostrarFormularioResena(${JSON.stringify(productoId)})">Escribir reseña</button>
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
                    <button onclick="likeResena(${JSON.stringify(r.id)})" aria-label="Dar like a reseña" title="Me gusta">👍 ${r.likes || 0}</button>
                    ${usuarioActual?.email === adminEmail ? `<button onclick="eliminarResena(${JSON.stringify(r.id)})" aria-label="Eliminar reseña" title="Eliminar reseña">🗑️</button>` : ""}
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
                    <button class="admin-btn" onclick="enviarResenaDesdeFormulario(${JSON.stringify(productoId)})">Publicar</button>
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

function abrirPanelNotificaciones() {
    if (!usuarioActual) {
        notificarError("Inicia sesión para ver notificaciones");
        return;
    }

    const existente = document.getElementById("notificacionesModal");
    if (existente) existente.remove();

    const lista = notificacionesUsuario.map(n => `
        <div class="noti-item ${n.leida ? "" : "no-leida"}">
            <div><strong>${n.titulo}</strong></div>
            <div>${n.mensaje}</div>
            <div class="noti-meta">${new Date(n.fecha).toLocaleString()}</div>
            <button class="btn-outline" style="margin-top: 8px;" onclick="marcarNotificacionLeida(${n.id})">Marcar leída</button>
        </div>
    `).join("") || "<div class='noti-vacio'>No tienes notificaciones</div>";

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
    const noti = notificacionesUsuario.find(n => Number(n.id) === Number(id));
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
                <div class="wishlist-remove" onclick="eliminarDeWishlist(${idArg})">✖</div>
                <div style="font-size: 48px; text-align: center;">${p.imagen}</div>
                <div class="product-title">${p.nombre}</div>
                <div class="product-price">$${Number(p.precio).toLocaleString()}</div>
                <button class="btn-add" onclick="agregarAlCarrito(${idArg})">Agregar +</button>
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
                <div style="font-size: 42px; text-align: center;">${producto.imagen}</div>
                <div class="product-title">${producto.nombre}</div>
                <div class="precio-normal">$${Number(producto.precio).toLocaleString()}</div>
                <div class="precio-oferta">$${Math.round(precioOferta).toLocaleString()}</div>
                <div class="stock-limitado">⚠️ Solo ${disponibles} disponibles</div>
                <div class="contador" data-expiracion="${oferta.expiracion}"></div>
                <button class="btn-add" onclick="comprarOferta(${oferta.id}, ${JSON.stringify(producto.id)})">Comprar ahora</button>
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

    const factura = `
====================================
        TECHNEXUS - FACTURA
====================================
N° Factura: INV-${orden.id}
Fecha: ${new Date(orden.fecha).toLocaleString()}
Cliente: ${usuarioActual.nombre}
Email: ${usuarioActual.email}
------------------------------------
PRODUCTOS:
${items.map(item => `  ${item.nombre} x${item.cantidad} = $${(Number(item.precio || 0) * Number(item.cantidad || 1)).toLocaleString()}`).join("\n")}
------------------------------------
Subtotal: $${subtotal.toLocaleString()}
Envío: ${envio === 0 ? "Gratis" : "$" + envio.toLocaleString()}
TOTAL: $${total.toLocaleString()}
------------------------------------
Método de pago: ${orden.metodoPago || "Pendiente"}
Estado: ${orden.estado || "pendiente"}
====================================
¡Gracias por tu compra!
====================================
    `.trim();

    const blob = new Blob([factura], { type: "text/plain" });
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

    const reporte = `
====================================
REPORTE DE VENTAS - TECHNEXUS
====================================
Fecha generación: ${new Date().toLocaleString()}
Total pedidos: ${historialGlobal.length}
Total ventas: $${historialGlobal.reduce((sum, o) => sum + Number(o.total || 0), 0).toLocaleString()}
====================================

VENTAS POR MES:
${Object.entries(ventasPorMes).map(([mes, total]) => `  ${mes}: $${total.toLocaleString()}`).join("\n")}

====================================
PRODUCTOS MÁS VENDIDOS:
${obtenerTopProductos(5) || "Sin datos"}
====================================
    `.trim();

    const blob = new Blob([reporte], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_ventas_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ========== CHAT EN VIVO ==========

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
        <div class="chat-input">
            <input type="text" id="chatInput" placeholder="Escribe tu mensaje..." onkeypress="if(event.key==='Enter') enviarMensaje()">
            <button onclick="enviarMensaje()">Enviar</button>
        </div>
    `;
    document.body.appendChild(chatWindow);

    cargarMensajesChat();
}

function cerrarChat() {
    const chat = document.querySelector(".chat-window");
    if (chat) chat.remove();
    chatActivo = false;
}

function enviarMensaje() {
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;

    const mensaje = {
        id: Date.now(),
        usuario: usuarioActual?.nombre || "Visitante",
        email: usuarioActual?.email || "anonimo",
        mensaje: input.value,
        fecha: new Date().toISOString(),
        tipo: "usuario"
    };

    mensajesChat.push(mensaje);
    localStorage.setItem("chatGlobal", JSON.stringify(mensajesChat));
    input.value = "";
    cargarMensajesChat();

    setTimeout(() => {
        const respuesta = {
            id: Date.now(),
            usuario: "Soporte",
            mensaje: "Gracias por contactarnos. Te atenderemos en breve.",
            fecha: new Date().toISOString(),
            tipo: "soporte"
        };
        mensajesChat.push(respuesta);
        localStorage.setItem("chatGlobal", JSON.stringify(mensajesChat));
        cargarMensajesChat();
    }, 1500);
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
        mostrarNotificacion("Ya estás suscrito", "info", "Newsletter");
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
            <div style="font-size: 22px;">📧 Newsletter TechNexus</div>
            <p style="margin: 6px 0 10px; color: #94A3B8;">Recibe ofertas exclusivas y novedades</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <input id="newsletterEmail" placeholder="tu@email.com" style="flex: 1; min-width: 180px; padding: 10px; border-radius: 12px; border: 1px solid #2563EB; background: #0F172A; color: white;">
                <button class="admin-btn" onclick="suscribir(document.getElementById('newsletterEmail')?.value)">Suscribirme</button>
            </div>
        `;
        productsScreen.appendChild(box);
    }
}

function inicializarFuncionalidadesAvanzadas() {
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
