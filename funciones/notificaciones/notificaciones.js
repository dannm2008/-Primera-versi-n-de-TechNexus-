// ========== SISTEMA DE NOTIFICACIONES ==========

function traducirMensajeSistema(mensaje) {
    const texto = String(mensaje || "").trim();
    if (!texto) return "";

    const normalizado = texto.toLowerCase();

    const reglas = [
        { test: /invalid login credentials/i, value: "Credenciales inválidas" },
        { test: /email not confirmed|confirm/i, value: "Debes confirmar tu correo para iniciar sesión" },
        { test: /too many|rate limit|429/i, value: "Demasiados intentos. Espera unos segundos e inténtalo de nuevo" },
        { test: /user already registered|already registered/i, value: "Este correo ya está registrado" },
        { test: /invalid email|email address/i, value: "El correo electrónico no es válido" },
        { test: /password should be at least|min(imum)?\s*\d+\s*characters/i, value: "La contraseña no cumple con los requisitos mínimos" },
        { test: /network|fetch failed|failed to fetch|network request failed|timeout/i, value: "Error de conexión. Verifica tu internet e inténtalo de nuevo" },
        { test: /jwt|token|session/i, value: "Tu sesión expiró. Inicia sesión de nuevo" },
        { test: /permission denied|not authorized|unauthorized|forbidden|insufficient privileges|row-level security|rls/i, value: "No tienes permisos para realizar esta acción" }
    ];

    for (const regla of reglas) {
        if (regla.test.test(normalizado)) return regla.value;
    }

    return texto;
}

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
    const mensajeTraducido = traducirMensajeSistema(mensaje);

    const config = {
        success: { icon: "✅", titulo: titulo || "Éxito" },
        error: { icon: "❌", titulo: titulo || "Error" },
        info: { icon: "ℹ️", titulo: titulo || "Información" },
        warning: { icon: "⚠️", titulo: titulo || "Atención" },
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
            <div class="notification-message">${mensajeTraducido}</div>
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
    mostrarNotificacion(`Compra realizada por ${formatCOP(Math.round(total))}`, "success", "🎉 Compra exitosa");
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
