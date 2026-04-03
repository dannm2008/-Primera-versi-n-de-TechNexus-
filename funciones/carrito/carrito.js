function idsIgualesCarrito(a, b) {
    return String(a) === String(b);
}

async function cargarCarritoNube() {
    if (!usuarioActual || !window.supabaseClient) return;
    const usuarioId = usuarioActual.uid || usuarioActual.id;
    if (!usuarioId) return;

    try {
        const { data, error } = await window.supabaseClient
            .from("carritos")
            .select("items")
            .eq("usuario_id", usuarioId)
            .maybeSingle();

        if (error) {
            console.error("Error al cargar carrito nube:", error.message);
            return;
        }

        if (data && Array.isArray(data.items)) {
            guardarCarritoUsuario(data.items);
            actualizarContadorCarrito();
        }
    } catch (err) {
        console.error("Error de conexión al cargar carrito nube:", err);
    }
}

async function guardarCarritoNube(items = null) {
    if (!window.supabaseClient) return;
    const usuarioId = usuarioActual?.uid || usuarioActual?.id;
    if (!usuarioId) {
        console.log("⚠️ No hay usuario, no se guarda carrito");
        return;
    }

    const payloadItems = Array.isArray(items) ? items : getCarritoUsuario();
    console.log("💾 Guardando carrito en nube:", payloadItems);

    try {
        const { error } = await window.supabaseClient
            .from("carritos")
            .upsert({
                usuario_id: usuarioId,
                items: payloadItems,
                ultima_actualizacion: new Date().toISOString()
            }, {
                onConflict: "usuario_id"
            });

        if (error) {
            console.error("❌ Error guardando carrito:", error);
        } else {
            console.log("✅ Carrito guardado en nube");
        }
    } catch (err) {
        console.error("Error de conexión al guardar carrito nube:", err);
    }
}

async function obtenerProductoPorId(productId) {
    const local = productos.find(p => idsIgualesCarrito(p.id, productId));
    if (local) return local;

    if (!window.supabaseClient) return null;

    const { data, error } = await window.supabaseClient
        .from("productos")
        .select("*")
        .eq("id", String(productId))
        .limit(1);

    if (error) {
        console.error("Error al buscar producto en Supabase:", error.message);
        return null;
    }

    const producto = data?.[0];
    if (!producto) return null;

    const normalizado = {
        id: String(producto.id),
        nombre: producto.nombre || "Producto sin nombre",
        precio: Number(producto.precio || 0),
        imagen: producto.imagen || "📦",
        specs: producto.specs || "",
        categoria: producto.categoria || "accesorios",
        stock: Number(producto.stock || 0)
    };

    productos.push(normalizado);
    return normalizado;
}

async function agregarAlCarrito(productId) {
    if (!usuarioActual) {
        notificarError("Inicia sesión para agregar productos");
        showScreen("auth");
        return;
    }

    const producto = await obtenerProductoPorId(productId);
    if (!producto) {
        notificarError("No se pudo cargar el producto");
        return;
    }

    const carritoUsuario = getCarritoUsuario();
    const existente = carritoUsuario.find(item => idsIgualesCarrito(item.id, productId));
    if (existente) {
        existente.cantidad += 1;
        notificarProductoAgregado(`${producto.nombre} (x${existente.cantidad})`);
    } else {
        carritoUsuario.push({ ...producto, cantidad: 1 });
        notificarProductoAgregado(producto.nombre);

        if (typeof producto.stock === "number" && producto.stock < 5) {
            notificarStockBajo(producto.nombre, producto.stock);
        }
    }

    guardarCarritoUsuario(carritoUsuario);
    guardarCarritoNube(carritoUsuario);
    actualizarContadorCarrito();
}

function eliminarDelCarrito(productId) {
    if (!usuarioActual) return;
    let carritoUsuario = getCarritoUsuario();
    carritoUsuario = carritoUsuario.filter(item => !idsIgualesCarrito(item.id, productId));
    guardarCarritoUsuario(carritoUsuario);
    guardarCarritoNube(carritoUsuario);
    actualizarContadorCarrito();
    mostrarCarrito();
    notificarCarritoActualizado();
}

function aumentarCantidad(productId) {
    if (!usuarioActual) return;
    const carritoUsuario = getCarritoUsuario();
    const item = carritoUsuario.find(i => idsIgualesCarrito(i.id, productId));
    if (!item) return;
    item.cantidad += 1;
    guardarCarritoUsuario(carritoUsuario);
    guardarCarritoNube(carritoUsuario);
    mostrarCarrito();
    actualizarContadorCarrito();
    notificarCarritoActualizado();
}

function disminuirCantidad(productId) {
    if (!usuarioActual) return;
    const carritoUsuario = getCarritoUsuario();
    const item = carritoUsuario.find(i => idsIgualesCarrito(i.id, productId));
    if (!item || item.cantidad <= 1) return;
    item.cantidad -= 1;
    guardarCarritoUsuario(carritoUsuario);
    guardarCarritoNube(carritoUsuario);
    mostrarCarrito();
    actualizarContadorCarrito();
    notificarCarritoActualizado();
}

function guardarCarrito() {
    guardarCarritoUsuario(carrito);
    guardarCarritoNube(carrito);
}

function mostrarCarrito() {
    const container = document.getElementById("cartContainer");
    if (!container) return;

    if (!usuarioActual) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Inicia sesión para ver tu carrito</h3>
                <button class="btn-primary" style="width: auto; margin:0 auto;" onclick="showScreen('auth')">Iniciar sesión</button>
            </div>
        `;
        return;
    }

    const carritoUsuario = getCarritoUsuario();

    if (carritoUsuario.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Tu carrito está vacío</h3>
                <button class="btn-primary" style="width: auto; margin:0 auto;" onclick="showScreen('products')">Ver productos</button>
            </div>
        `;
        return;
    }

    let subtotal = 0;
    let itemsHtml = "";

    carritoUsuario.forEach(item => {
        const idArg = JSON.stringify(item.id);
        subtotal += item.precio * item.cantidad;
        itemsHtml += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <div class="cart-item-price">${formatCOP(item.precio)}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="cart-quantity">
                        <span onclick="disminuirCantidad(${idArg})">-</span>
                        <span>${item.cantidad}</span>
                        <span onclick="aumentarCantidad(${idArg})">+</span>
                    </div>
                    <span style="color: #999; cursor: pointer;" onclick="eliminarDelCarrito(${idArg})">X</span>
                </div>
            </div>
        `;
    });

    let descuento = 0;
    let subtotalConDescuento = subtotal;
    if (cuponActivo) {
        if (cuponActivo.tipo === "porcentaje") descuento = subtotal * (cuponActivo.descuento / 100);
        if (cuponActivo.tipo === "fijo") descuento = Math.min(cuponActivo.descuento, subtotal);
        subtotalConDescuento -= descuento;
    }

    const descuentoNivel = typeof calcularDescuentoNivel === "function" ? calcularDescuentoNivel(subtotalConDescuento) : 0;
    subtotalConDescuento -= descuentoNivel;

    const descuentoPuntos = typeof aplicarDescuentoPuntos === "function" ? aplicarDescuentoPuntos(subtotalConDescuento) : 0;
    subtotalConDescuento -= descuentoPuntos;

    const envio = subtotalConDescuento > 500000 ? 0 : 10000;
    const total = subtotalConDescuento + envio;

    container.innerHTML = `
        ${itemsHtml}
        <div class="cart-summary">
            <div class="summary-row"><span>Subtotal</span><span>${formatCOP(subtotal)}</span></div>
            ${cuponActivo ? `<div class="summary-row" style="color: #4ade80;"><span>Descuento (${cuponActivo.codigo})</span><span>-${formatCOP(Math.round(descuento))}</span></div>` : ""}
            ${descuentoNivel > 0 ? `<div class="summary-row" style="color: #facc15;"><span>Beneficio por nivel</span><span>-${formatCOP(Math.round(descuentoNivel))}</span></div>` : ""}
            ${descuentoPuntos > 0 ? `<div class="summary-row" style="color: #a78bfa;"><span>Canje de puntos</span><span>-${formatCOP(Math.round(descuentoPuntos))}</span></div>` : ""}
            <div class="summary-row"><span>Envío</span><span>${envio === 0 ? "Gratis" : formatCOP(envio)}</span></div>
            <div class="summary-total"><span>Total</span><span>${formatCOP(Math.round(total))}</span></div>
            ${!cuponActivo ? `<div style="margin-top: 15px;"><div style="display: flex; gap: 10px;"><input type="text" id="codigoCuponCarrito" placeholder="Codigo cupon" style="flex:1; padding: 12px; background: #0F172A; border: 1px solid #2563EB; border-radius: 40px; color: white;"><button class="btn-outline" onclick="aplicarCuponCarrito()">Aplicar</button></div></div>` : ""}
        </div>
        <button class="btn-primary" onclick="comprar()" style="margin-top: 20px;">Proceder al pago</button>
    `;
}

async function comprar() {
    if (!usuarioActual) {
        notificarError("Inicia sesión para comprar");
        showScreen("auth");
        return;
    }

    const carritoUsuario = getCarritoUsuario();

    if (carritoUsuario.length === 0) {
        notificarError("Tu carrito está vacío");
        return;
    }

    const subtotal = carritoUsuario.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    let descuentoCupon = 0;
    let subtotalConDescuento = subtotal;
    if (cuponActivo) {
        if (cuponActivo.tipo === "porcentaje") descuentoCupon = subtotal * (cuponActivo.descuento / 100);
        if (cuponActivo.tipo === "fijo") descuentoCupon = Math.min(cuponActivo.descuento, subtotal);
        subtotalConDescuento -= descuentoCupon;
    }

    const descuentoNivel = typeof calcularDescuentoNivel === "function" ? calcularDescuentoNivel(subtotalConDescuento) : 0;
    subtotalConDescuento -= descuentoNivel;

    const descuentoPuntos = typeof aplicarDescuentoPuntos === "function" ? aplicarDescuentoPuntos(subtotalConDescuento) : 0;
    subtotalConDescuento -= descuentoPuntos;

    const envio = subtotalConDescuento > 500000 ? 0 : 10000;
    const totalFinal = subtotalConDescuento + envio;
    const ordenId = Math.floor(Math.random() * 10000);
    const itemsPedido = carritoUsuario.map(item => ({
        id: item.id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad
    }));

    const orden = {
        id: ordenId,
        fecha: new Date().toISOString(),
        productos: carritoUsuario.map(item => item.nombre),
        items: itemsPedido,
        subtotal: Math.round(subtotal),
        envio,
        total: Math.round(totalFinal),
        estado: "pagado"
    };

    if (window.supabaseClient) {
        try {
            const ordenNube = {
                usuario_id: String(usuarioActual.uid || usuarioActual.id || usuarioActual.email),
                usuario_nombre: usuarioActual.nombre,
                usuario_email: usuarioActual.email,
                fecha: orden.fecha,
                items: orden.items,
                subtotal: orden.subtotal,
                envio: orden.envio,
                total: orden.total,
                estado: "pagado",
                metodo_pago: "pendiente"
            };

            console.log("📦 Guardando orden:", ordenNube);

            const { error } = await window.supabaseClient
                .from("ordenes")
                .insert(ordenNube);

            if (error) {
                console.error("❌ Error guardando orden:", error);
                notificarError("Error al procesar la compra");
                return;
            }
        } catch (err) {
            console.error("Error guardando orden en Supabase:", err);
            notificarError("Error al procesar la compra");
            return;
        }
    }

    agregarAlHistorial(orden);

    if (typeof agregarPuntosPorCompra === "function") {
        agregarPuntosPorCompra(totalFinal);
    }

    if (typeof registrarPedidoAdmin === "function") registrarPedidoAdmin(orden);

    if (descuentoPuntos > 0 && typeof usarDescuentoPuntos === "function") {
        usarDescuentoPuntos();
    }

    cuponActivo = null;
    const cuponBox = document.getElementById("cuponActivo");
    if (cuponBox) {
        cuponBox.style.display = "none";
        cuponBox.textContent = "";
    }

    guardarCarritoUsuario([]);
    guardarCarritoNube([]);
    actualizarContadorCarrito();
    mostrarCarrito();
    notificarCompraExitosa(totalFinal);
    notificarEnvio(ordenId);
    if (typeof notificarPedidoEnviado === "function") notificarPedidoEnviado(ordenId);
    if (typeof actualizarPerfil === "function") actualizarPerfil();
    showScreen("products");
}

function actualizarContadorCarrito() {
    const total = getCarritoUsuario().reduce((sum, item) => sum + item.cantidad, 0);
    const badge = document.getElementById("cartCount");
    if (badge) badge.textContent = String(total);
}
