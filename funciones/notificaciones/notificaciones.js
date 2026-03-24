// ========== SISTEMA DE NOTIFICACIONES ==========

function getNotificationContainer() {
    let container = document.querySelector(".notification-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "notification-container";
        document.body.appendChild(container);
    }
    return container;
}

function mostrarNotificacion(mensaje, tipo = "success", titulo = "") {
    const container = getNotificationContainer();

    const config = {
        success: { icon: "✅", titulo: titulo || "Exito" },
        error: { icon: "❌", titulo: titulo || "Error" },
        info: { icon: "ℹ️", titulo: titulo || "Informacion" },
        warning: { icon: "⚠️", titulo: titulo || "Atencion" },
        cart: { icon: "🛒", titulo: titulo || "Carrito" },
        gift: { icon: "🎁", titulo: titulo || "Oferta" }
    };

    const cfg = config[tipo] || config.success;
    const notification = document.createElement("div");
    notification.className = `notification notification-${tipo}`;
    notification.innerHTML = `
        <div class="notification-icon">${cfg.icon}</div>
        <div class="notification-content">
            <div class="notification-title">${cfg.titulo}</div>
            <div class="notification-message">${mensaje}</div>
        </div>
        <div class="notification-close" onclick="cerrarNotificacion(this)">✖</div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            cerrarNotificacion(notification.querySelector(".notification-close"));
        }
    }, 4000);
}

function cerrarNotificacion(element) {
    const notification = element?.closest(".notification");
    if (!notification) return;

    notification.classList.add("notification-exit");
    setTimeout(() => {
        notification.remove();
    }, 300);
}

// ========== NOTIFICACIONES PRE-DEFINIDAS ==========

function notificarBienvenida(nombre) {
    mostrarNotificacion(`Bienvenido a TechNexus, ${nombre}`, "success", "🎉 Bienvenido");
}

function notificarProductoAgregado(productoNombre) {
    mostrarNotificacion(`${productoNombre} agregado al carrito`, "cart", "🛒 Producto agregado");
}

function notificarCarritoActualizado() {
    mostrarNotificacion("Carrito actualizado correctamente", "info", "🔄 Carrito");
}

function notificarCuponAplicado(codigo, descripcion) {
    mostrarNotificacion(`Cupon ${codigo} aplicado: ${descripcion}`, "gift", "🎫 Cupon aplicado");
}

function notificarCompraExitosa(total) {
    mostrarNotificacion(`Compra realizada por $${Math.round(total).toLocaleString()}`, "success", "🎉 Compra exitosa");
}

function notificarOferta(productoNombre, descuento) {
    mostrarNotificacion(`${productoNombre} con ${descuento}% OFF`, "warning", "🔥 Oferta especial");
}

function notificarStockBajo(productoNombre, stock) {
    mostrarNotificacion(`${productoNombre} - Solo quedan ${stock} unidades`, "warning", "⚠️ Stock limitado");
}

function notificarEnvio(ordenId) {
    mostrarNotificacion(`Tu pedido #${ordenId} esta en camino`, "info", "📦 Pedido enviado");
}

function notificarResenaPublicada() {
    mostrarNotificacion("Gracias por tu resena", "success", "⭐ Resena publicada");
}

function notificarPuntosGanados(puntos) {
    mostrarNotificacion(`Ganaste ${puntos} puntos`, "gift", "✨ Puntos acumulados");
}

function notificarError(mensaje) {
    mostrarNotificacion(mensaje, "error", "❌ Error");
}

function notificarExito(mensaje) {
    mostrarNotificacion(mensaje, "success", "✅ Completado");
}

function mostrarOfertaAleatoria() {
    const ofertas = [
        { producto: "Laptop Gamer", descuento: 20 },
        { producto: "Teclado Mecanico", descuento: 15 },
        { producto: "Mouse Gamer", descuento: 25 },
        { producto: "Auriculares 7.1", descuento: 30 }
    ];

    const oferta = ofertas[Math.floor(Math.random() * ofertas.length)];
    if (usuarioActual) {
        notificarOferta(oferta.producto, oferta.descuento);
    }
}
