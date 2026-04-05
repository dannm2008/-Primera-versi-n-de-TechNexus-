function idsIgualesCarrito(a, b) {
    return String(a) === String(b);
}

function obtenerUsuarioIdNube() {
    if (typeof obtenerUsuarioIdSupabaseSeguro === "function") {
        return obtenerUsuarioIdSupabaseSeguro();
    }

    const candidato = String(usuarioActual?.uid || "").trim();
    if (!candidato) return "";
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidato) ? candidato : "";
}

async function cargarCarritoNube() {
    if (!usuarioActual || !window.supabaseClient) return;
    const usuarioId = obtenerUsuarioIdNube();
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
        } else {
            // Evita arrastrar contador previo cuando el usuario no tiene carrito en nube.
            guardarCarritoUsuario([]);
        }

        actualizarContadorCarrito();
    } catch (err) {
        console.error("Error de conexión al cargar carrito nube:", err);
        actualizarContadorCarrito();
    }
}

async function guardarCarritoNube(items = null) {
    if (!window.supabaseClient) return;
    const usuarioId = obtenerUsuarioIdNube();
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

function esProductoEmpresarialCarrito(item) {
    if (!item) return false;

    const categoriaItem = String(item.categoria || "").toLowerCase();
    if (categoriaItem === "empresa") return true;

    const idNumerico = Number(item.id || 0);
    if (Number.isFinite(idNumerico) && idNumerico >= 101) return true;

    const enCatalogo = Array.isArray(productos)
        ? productos.find(p => idsIgualesCarrito(p.id, item.id))
        : null;

    return String(enCatalogo?.categoria || "").toLowerCase() === "empresa";
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
    const direccionGuardada = String(usuarioData?.ultimaDireccionCompra || "").trim();

    if (carritoUsuario.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Tu carrito está vacío</h3>
                <button class="btn-primary btn-gold-cta" style="width: auto; margin:0 auto;" onclick="showScreen('products')">Ver productos</button>
            </div>
        `;
        return;
    }

    let subtotalBase = 0;
    let descuentoEmpresaTotal = 0;
    let subtotal = 0;
    let itemsHtml = "";

    carritoUsuario.forEach(item => {
        const idArg = JSON.stringify(item.id);
        const esItemEmpresarial = Boolean(
            usuarioActual?.esEmpresa
            && esProductoEmpresarialCarrito(item)
        );
        const descuentoEmpresaPctItem = esItemEmpresarial ? Number(usuarioActual?.empresa?.descuento || 15) : 0;
        const precioUnitarioFinal = descuentoEmpresaPctItem > 0
            ? Math.round(item.precio * (1 - descuentoEmpresaPctItem / 100))
            : item.precio;
        const totalLineaBase = item.precio * item.cantidad;
        const totalLineaFinal = precioUnitarioFinal * item.cantidad;

        subtotalBase += totalLineaBase;
        subtotal += totalLineaFinal;
        descuentoEmpresaTotal += Math.max(0, totalLineaBase - totalLineaFinal);

        const precioLineaHtml = descuentoEmpresaPctItem > 0
            ? `<div class="cart-item-price"><span style="text-decoration: line-through; color:#94A3B8; font-weight:500; margin-right:8px;">${formatCOP(item.precio)}</span>${formatCOP(precioUnitarioFinal)} <span style="background:#e8f5e9; color:#2e7d32; padding:2px 7px; border-radius:999px; font-size:11px; font-weight:700; margin-left:8px;">-${descuentoEmpresaPctItem}%</span></div>`
            : `<div class="cart-item-price">${formatCOP(item.precio)}</div>`;

        itemsHtml += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    ${precioLineaHtml}
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="cart-quantity">
                        <span onclick='disminuirCantidad(${idArg})'>-</span>
                        <span>${item.cantidad}</span>
                        <span onclick='aumentarCantidad(${idArg})'>+</span>
                    </div>
                    <span style="color: #999; cursor: pointer;" onclick='eliminarDelCarrito(${idArg})'>X</span>
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

    const proActivo = Boolean(usuarioData?.modoProActivo && usuarioData?.modoProHasta && new Date(usuarioData.modoProHasta).getTime() > Date.now());
    const envio = proActivo ? 0 : (subtotalConDescuento > 500000 ? 0 : 10000);
    const total = subtotalConDescuento + envio;
    const esCompraEmpresarial = descuentoEmpresaTotal > 0;
    const textoBotonCompra = esCompraEmpresarial
        ? "Confirmar compra empresarial"
        : "Confirmar pedido y seguimiento";

    container.innerHTML = `
        ${itemsHtml}
        <div class="cart-summary">
            <div class="summary-row"><span>Subtotal</span><span>${formatCOP(subtotalBase)}</span></div>
            ${descuentoEmpresaTotal > 0 ? `<div class="summary-row" style="color: #4ade80;"><span>Descuento empresarial (15%)</span><span>-${formatCOP(Math.round(descuentoEmpresaTotal))}</span></div>` : ""}
            <div class="summary-row"><span>Subtotal final</span><span>${formatCOP(subtotal)}</span></div>
            ${cuponActivo ? `<div class="summary-row" style="color: #4ade80;"><span>Descuento (${cuponActivo.codigo})</span><span>-${formatCOP(Math.round(descuento))}</span></div>` : ""}
            ${descuentoNivel > 0 ? `<div class="summary-row" style="color: #facc15;"><span>Beneficio por nivel</span><span>-${formatCOP(Math.round(descuentoNivel))}</span></div>` : ""}
            ${descuentoPuntos > 0 ? `<div class="summary-row" style="color: #a78bfa;"><span>Canje de puntos</span><span>-${formatCOP(Math.round(descuentoPuntos))}</span></div>` : ""}
            ${proActivo ? `<div class="summary-row" style="color: #60a5fa;"><span>Beneficio Modo Pro</span><span>Envío prioritario gratis</span></div>` : ""}
            <div class="summary-row"><span>Envío</span><span>${envio === 0 ? "Gratis" : formatCOP(envio)}</span></div>
            <div class="summary-total"><span>Total</span><span>${formatCOP(Math.round(total))}</span></div>
            ${!cuponActivo ? `<div style="margin-top: 15px;"><div style="display: flex; gap: 10px;"><input type="text" id="codigoCuponCarrito" placeholder="Codigo cupon" style="flex:1; padding: 12px; background: #0F172A; border: 1px solid #2563EB; border-radius: 40px; color: white;"><button class="btn-outline" onclick="aplicarCuponCarrito()">Aplicar</button></div></div>` : ""}
            <div style="margin-top: 15px;">
                <label for="direccionEntrega" style="color:#93C5FD; font-size: 13px; display:block; margin-bottom:6px;">Dirección de entrega (obligatoria)</label>
                <textarea id="direccionEntrega" placeholder="Ej: Calle 45 # 10-30, Apto 502, Bogotá" style="width:100%; min-height:70px; padding:10px; background:#0F172A; border:1px solid #2563EB; border-radius:12px; color:white; resize:vertical;">${direccionGuardada}</textarea>
            </div>
        </div>
        ${esCompraEmpresarial ? `<div style="margin-top: 16px; background:#e8f5e9; color:#2e7d32; border:1px solid #86efac; border-radius:999px; display:inline-flex; align-items:center; gap:8px; padding:8px 12px; font-size:12px; font-weight:700;">🏢 Compra empresarial aplicada (-15%)</div>` : ""}
        <button class="btn-primary" onclick="comprar()" style="margin-top: 20px;">${textoBotonCompra}</button>
    `;
}

async function comprar() {
    if (!usuarioActual) {
        notificarError("Inicia sesión para comprar");
        showScreen("auth");
        return;
    }

    const carritoUsuario = getCarritoUsuario();
    const direccionInput = document.getElementById("direccionEntrega");
    const direccionEntrega = String(direccionInput?.value || "").trim();

    if (carritoUsuario.length === 0) {
        notificarError("Tu carrito está vacío");
        return;
    }

    if (direccionEntrega.length < 10) {
        notificarError("Ingresa una dirección de entrega válida");
        return;
    }

    const descuentoEmpresaPctCuenta = Number(usuarioActual?.esEmpresa ? (usuarioActual?.empresa?.descuento || 15) : 0);
    const resumenEmpresa = carritoUsuario.reduce((acc, item) => {
        const esItemEmpresarial = Boolean(
            descuentoEmpresaPctCuenta > 0
            && esProductoEmpresarialCarrito(item)
        );

        const baseLinea = item.precio * item.cantidad;
        const finalLinea = esItemEmpresarial
            ? Math.round(item.precio * (1 - descuentoEmpresaPctCuenta / 100)) * item.cantidad
            : baseLinea;

        acc.base += baseLinea;
        acc.final += finalLinea;
        acc.descuento += Math.max(0, baseLinea - finalLinea);
        return acc;
    }, { base: 0, final: 0, descuento: 0 });

    const subtotal = resumenEmpresa.final;
    const descuentoEmpresaTotal = resumenEmpresa.descuento;

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

    const proActivo = Boolean(usuarioData?.modoProActivo && usuarioData?.modoProHasta && new Date(usuarioData.modoProHasta).getTime() > Date.now());
    const descuentoEmpresaPct = descuentoEmpresaTotal > 0 ? descuentoEmpresaPctCuenta : 0;
    const envio = proActivo ? 0 : (subtotalConDescuento > 500000 ? 0 : 10000);
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
        estado: "preparacion",
        direccionEntrega,
        esCompraEmpresarial: descuentoEmpresaTotal > 0,
        descuentoEmpresaPct,
        descuentoEmpresaValor: Math.round(descuentoEmpresaTotal)
    };

    usuarioData.ultimaDireccionCompra = direccionEntrega;
    if (typeof guardarUsuarioData === "function") guardarUsuarioData();

    if (window.supabaseClient) {
        try {
            const usuarioIdNube = obtenerUsuarioIdNube();
            if (!usuarioIdNube) {
                console.warn("Compra guardada solo en local: sesión sin uid/id de Supabase");
            } else {
            const ordenNube = {
                usuario_id: usuarioIdNube,
                usuario_nombre: usuarioActual.nombre,
                usuario_email: usuarioActual.email,
                fecha: orden.fecha,
                items: orden.items,
                subtotal: orden.subtotal,
                envio: orden.envio,
                total: orden.total,
                estado: "preparacion",
                metodo_pago: "pendiente",
                es_compra_empresarial: orden.esCompraEmpresarial,
                descuento_empresa_pct: orden.descuentoEmpresaPct,
                descuento_empresa_valor: orden.descuentoEmpresaValor
            };

            console.log("📦 Guardando orden:", ordenNube);

            const { error } = await window.supabaseClient
                .from("ordenes")
                .insert(ordenNube);

            if (error) {
                console.error("❌ Error guardando orden:", error);
                if (typeof mostrarNotificacion === "function") {
                    mostrarNotificacion("Compra realizada, pero no se pudo sincronizar con la nube", "warning", "Sincronización");
                }
            }
            }
        } catch (err) {
            console.error("Error guardando orden en Supabase:", err);
            if (typeof mostrarNotificacion === "function") {
                mostrarNotificacion("Compra realizada, pero hubo un error de sincronización", "warning", "Sincronización");
            }
        }
    }

    agregarAlHistorial(orden);

    if (orden.esCompraEmpresarial && usuarioActual?.empresa) {
        const comprasActuales = Number(usuarioActual.empresa.comprasEsteMes || 0);
        const ahorroActual = Number(usuarioActual.empresa.ahorroAnual || 0);
        usuarioActual.empresa.comprasEsteMes = comprasActuales + 1;
        usuarioActual.empresa.ahorroAnual = ahorroActual + Number(orden.descuentoEmpresaValor || 0);

        if (typeof guardarUsuarioData === "function") guardarUsuarioData();
        localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
        localStorage.setItem("usuario", JSON.stringify(usuarioActual));
    }

    if (typeof actualizarEstadosPedidosAutomatico === "function") {
        actualizarEstadosPedidosAutomatico();
    }

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
    if (proActivo && typeof lanzarConfetiPro === "function") {
        lanzarConfetiPro(30);
    }
    if (typeof actualizarPerfil === "function") actualizarPerfil();
    showScreen("products");
}

function actualizarContadorCarrito() {
    const total = getCarritoUsuario().reduce((sum, item) => sum + item.cantidad, 0);
    const badge = document.getElementById("cartCount");
    if (!badge) return;

    badge.textContent = String(total);
    badge.style.display = total > 0 ? "inline-flex" : "none";
}

window.agregarAlCarrito = agregarAlCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.aumentarCantidad = aumentarCantidad;
window.disminuirCantidad = disminuirCantidad;
window.comprar = comprar;
window.actualizarContadorCarrito = actualizarContadorCarrito;
