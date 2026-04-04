// ========== PANEL DE ADMINISTRACION ==========

const ADMIN_EMAIL = "admin@technexus.com";
const ADMIN_PASSWORD = "admin123";

let esAdmin = false;

function getPedidosAdmin() {
    return getAllPedidos();
}

function setPedidosAdmin(pedidos) {
    guardarAllPedidos(pedidos);
}

function registrarPedidoAdmin(pedido) {
    if (!pedido) return;
    const pedidoGlobal = {
        ...pedido,
        usuarioEmail: usuarioActual?.email || "cliente@local",
        usuarioNombre: usuarioActual?.nombre || "Cliente"
    };
    const pedidos = getAllPedidos();
    pedidos.unshift(pedidoGlobal);
    guardarAllPedidos(pedidos);
}

function crearAdminPorDefecto() {
    const adminExiste = usuariosRegistrados.some(u => u.email === ADMIN_EMAIL);
    if (adminExiste) return;

    usuariosRegistrados.push({
        id: Date.now(),
        nombre: "Administrador",
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        esAdmin: true,
        fechaRegistro: new Date().toISOString()
    });

    localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
}

function verificarAdmin() {
    esAdmin = Boolean(usuarioActual && usuarioActual.email === ADMIN_EMAIL);
    if (esAdmin) mostrarBotonAdmin();
    else ocultarBotonAdmin();
    return esAdmin;
}

function mostrarBotonAdmin() {
    let adminBtn = document.querySelector(".nav-item.admin-nav-btn");
    if (adminBtn) return;

    const bottomNav = document.querySelector(".bottom-nav");
    if (!bottomNav) return;

    adminBtn = document.createElement("div");
    adminBtn.className = "nav-item admin-nav-btn";
    adminBtn.setAttribute("onclick", "showAdminPanel()");
    adminBtn.innerHTML = "<span>👨‍💼</span><span>Admin</span>";
    bottomNav.appendChild(adminBtn);
}

function ocultarBotonAdmin() {
    const adminBtn = document.querySelector(".nav-item.admin-nav-btn");
    if (adminBtn) adminBtn.remove();
}

function cerrarAdminModal() {
    const modal = document.getElementById("adminModal");
    if (modal) modal.remove();
}

function cerrarAdminSubModal() {
    const modal = document.getElementById("adminSubModal");
    if (modal) modal.remove();
}

function showAdminPanel() {
    if (!verificarAdmin()) {
        notificarError("Acceso denegado. Solo administradores.");
        return;
    }

    cerrarAdminModal();
    cerrarAdminSubModal();

    const stats = obtenerEstadisticasAdmin();

    const modalHtml = `
        <div id="adminModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 1000px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 10px;">
                    <h2 style="margin: 0;">👨‍💼 Panel de Administracion</h2>
                    <button onclick="cerrarAdminModal()" aria-label="Cerrar panel de administración" title="Cerrar" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">✖</button>
                </div>

                <div class="admin-stats">
                    <div class="admin-stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">${formatCOP(Math.round(stats.ventasMes))}</div>
                        <div class="stat-label">Ventas este mes</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${stats.totalUsuarios}</div>
                        <div class="stat-label">Usuarios registrados</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-value">${stats.totalProductos}</div>
                        <div class="stat-label">Productos en stock</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">🔄</div>
                        <div class="stat-value">${stats.pedidosPendientes}</div>
                        <div class="stat-label">Pedidos pendientes</div>
                    </div>
                </div>

                <div class="admin-actions">
                    <button class="admin-btn" onclick="adminAgregarProducto()">➕ Agregar producto</button>
                    <button class="admin-btn" onclick="adminEditarProductos()">✏️ Editar productos</button>
                    <button class="admin-btn" onclick="adminVerPedidos()">📦 Ver pedidos</button>
                    <button class="admin-btn" onclick="adminVerUsuarios()">👥 Ver usuarios</button>
                    <button class="admin-btn" onclick="adminCrearCupon()">🏷️ Crear cupon</button>
                    <button class="admin-btn" onclick="adminVerReportes()">📈 Ver reportes</button>
                    <button class="admin-btn admin-btn-danger" onclick="adminResetTienda()">⚠️ Resetear tienda</button>
                </div>

                <div class="admin-chart">
                    <h3 style="color: white; margin-bottom: 15px;">📈 Ventas ultimos 7 dias</h3>
                    <div id="ventasChart"></div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    adminMostrarGraficoVentas();
}

function obtenerEstadisticasAdmin() {
    const pedidos = getPedidosAdmin();
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const ventasMes = pedidos
        .filter(p => {
            const f = new Date(p.fecha);
            return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        })
        .reduce((sum, p) => sum + Number(p.total || 0), 0);

    const pedidosPendientes = pedidos.filter(p => p.estado === "pendiente" || !p.estado).length;

    return {
        ventasMes,
        totalUsuarios: usuariosRegistrados.length,
        totalProductos: productos.length,
        pedidosPendientes
    };
}

function adminMostrarGraficoVentas() {
    const chart = document.getElementById("ventasChart");
    if (!chart) return;

    const pedidos = getPedidosAdmin();
    const dias = [];
    const ventas = [];

    for (let i = 6; i >= 0; i -= 1) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const key = fecha.toISOString().slice(0, 10);
        dias.push({
            key,
            nombre: fecha.toLocaleDateString("es-CO", { weekday: "short" })
        });
        ventas.push(0);
    }

    pedidos.forEach(p => {
        const key = new Date(p.fecha).toISOString().slice(0, 10);
        const idx = dias.findIndex(d => d.key === key);
        if (idx >= 0) ventas[idx] += Number(p.total || 0);
    });

    const maxVenta = Math.max(1, ...ventas);

    chart.innerHTML = dias.map((d, i) => {
        const ancho = Math.max(8, Math.round((ventas[i] / maxVenta) * 100));
        return `
            <div style="display: flex; align-items: center; margin-bottom: 10px; gap: 10px;">
                <div style="width: 55px; color: #94A3B8; text-transform: capitalize;">${d.nombre}</div>
                <div style="flex: 1; background: #0F172A; border-radius: 8px; height: 30px; overflow: hidden;">
                    <div class="chart-bar" style="width: ${ancho}%; background: linear-gradient(90deg, #2563EB, #8B5CF6); margin: 0;">
                        ${formatCOP(Math.round(ventas[i]))}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function adminAgregarProducto() {
    cerrarAdminSubModal();
    const modalHtml = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content">
                <h3>➕ Agregar nuevo producto</h3>

                <div class="form-group">
                    <label>Nombre del producto</label>
                    <input type="text" id="newProductName" placeholder="Ej: Laptop Gamer X">
                </div>

                <div class="form-group">
                    <label>Precio (COP)</label>
                    <input type="number" id="newProductPrice" placeholder="5200000">
                </div>

                <div class="form-group">
                    <label>Categoria</label>
                    <select id="newProductCategory">
                        <option value="laptops">💻 Laptops</option>
                        <option value="desktops">🖥️ Desktops</option>
                        <option value="monitores">🖥️ Monitores</option>
                        <option value="accesorios">🎧 Accesorios</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Especificaciones</label>
                    <input type="text" id="newProductSpecs" placeholder="Intel i7 • 16GB RAM • RTX 3060">
                </div>

                <div class="form-group">
                    <label>Stock</label>
                    <input type="number" id="newProductStock" value="10">
                </div>

                <div class="form-group">
                    <label>Subir imagen (archivo)</label>
                    <input type="file" id="newProductImageFile" accept="image/*">
                </div>

                <div class="form-group">
                    <label>O link de imagen (URL)</label>
                    <input type="text" id="newProductImageUrl" placeholder="https://.../imagen.png o assets/images/...">
                </div>

                <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="admin-btn" onclick="adminGuardarProducto()">Guardar producto</button>
                    <button class="admin-btn admin-btn-danger" onclick="cerrarAdminSubModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function adminEsRutaImagenValida(valor) {
    const v = String(valor || "").trim();
    if (!v) return false;
    return /^(https?:\/\/|\.\/|\.\.\/|\/|assets\/|images\/|data:image\/)/i.test(v)
        || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v);
}

function adminLeerArchivoComoDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
    });
}

async function adminGuardarProducto() {
    const nombre = (document.getElementById("newProductName")?.value || "").trim();
    const precio = parseInt(document.getElementById("newProductPrice")?.value || "0", 10);
    const categoria = document.getElementById("newProductCategory")?.value || "accesorios";
    const specs = (document.getElementById("newProductSpecs")?.value || "").trim();
    const stock = parseInt(document.getElementById("newProductStock")?.value || "0", 10);
    const imageUrlInput = (document.getElementById("newProductImageUrl")?.value || "").trim();
    const imageFile = document.getElementById("newProductImageFile")?.files?.[0] || null;

    let imagen = "assets/images/products/producto-generico.svg";

    if (imageFile) {
        if (!String(imageFile.type || "").startsWith("image/")) {
            notificarError("El archivo debe ser una imagen");
            return;
        }

        try {
            imagen = await adminLeerArchivoComoDataUrl(imageFile);
        } catch (_) {
            notificarError("No se pudo procesar la imagen seleccionada");
            return;
        }
    } else if (imageUrlInput) {
        if (!adminEsRutaImagenValida(imageUrlInput)) {
            notificarError("Ingresa un link/ruta de imagen válida");
            return;
        }
        imagen = imageUrlInput;
    }

    if (!nombre || !precio || precio <= 0) {
        notificarError("Completa los campos obligatorios");
        return;
    }

    const nextId = productos.length ? Math.max(...productos.map(p => Number(p.id) || 0)) + 1 : 1;
    const nuevoProducto = { id: nextId, nombre, precio, imagen, specs, categoria, stock: Math.max(0, stock) };

    productos.push(nuevoProducto);
    localStorage.setItem("productos", JSON.stringify(productos));

    notificarExito(`Producto ${nuevoProducto.nombre} agregado`);
    cerrarAdminSubModal();
    if (typeof buscarProductos === "function") buscarProductos();
    if (typeof mostrarProductosEmpresa === "function") mostrarProductosEmpresa();
    showAdminPanel();
}

function adminEditarProductos() {
    cerrarAdminSubModal();

    let html = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 800px;">
                <h3>✏️ Editar productos</h3>
                <div class="productos-list">
    `;

    productos.forEach(p => {
        html += `
            <div class="producto-edit-item">
                <div class="producto-edit-info">
                    <strong>${p.nombre}</strong>
                    <span>${formatCOP(Number(p.precio || 0))} | Stock: ${Number(p.stock || 0)}</span>
                </div>
                <div class="producto-edit-actions">
                    <button class="btn-edit" onclick="adminEditarProducto(${p.id})" aria-label="Editar ${p.nombre}" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="adminEliminarProducto(${p.id})" aria-label="Eliminar ${p.nombre}" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    });

    html += `
                </div>
                <button class="admin-btn" style="margin-top: 20px;" onclick="cerrarAdminSubModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

function adminEditarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    cerrarAdminSubModal();

    const modalHtml = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content">
                <h3>✏️ Editar: ${producto.nombre}</h3>

                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="editProductName" value="${producto.nombre}">
                </div>

                <div class="form-group">
                    <label>Precio</label>
                    <input type="number" id="editProductPrice" value="${producto.precio}">
                </div>

                <div class="form-group">
                    <label>Stock</label>
                    <input type="number" id="editProductStock" value="${producto.stock}">
                </div>

                <div class="form-group">
                    <label>Especificaciones</label>
                    <input type="text" id="editProductSpecs" value="${producto.specs}">
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="admin-btn" onclick="adminGuardarEdicion(${id})">Guardar</button>
                    <button class="admin-btn admin-btn-danger" onclick="adminEditarProductos()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function adminGuardarEdicion(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    producto.nombre = (document.getElementById("editProductName")?.value || "").trim() || producto.nombre;
    producto.precio = parseInt(document.getElementById("editProductPrice")?.value || String(producto.precio), 10);
    producto.stock = parseInt(document.getElementById("editProductStock")?.value || String(producto.stock), 10);
    producto.specs = (document.getElementById("editProductSpecs")?.value || "").trim();

    localStorage.setItem("productos", JSON.stringify(productos));
    notificarExito("Producto actualizado");

    if (typeof buscarProductos === "function") buscarProductos();
    if (typeof mostrarProductosEmpresa === "function") mostrarProductosEmpresa();

    adminEditarProductos();
}

function adminEliminarProducto(id) {
    if (!window.confirm("¿Eliminar este producto permanentemente?")) return;

    const index = productos.findIndex(p => p.id === id);
    if (index < 0) return;

    productos.splice(index, 1);
    localStorage.setItem("productos", JSON.stringify(productos));

    notificarExito("Producto eliminado");
    if (typeof buscarProductos === "function") buscarProductos();
    if (typeof mostrarProductosEmpresa === "function") mostrarProductosEmpresa();
    adminEditarProductos();
}

function adminVerPedidos() {
    const pedidos = getPedidosAdmin();
    if (!pedidos.length) {
        mostrarNotificacion("No hay pedidos registrados", "info", "Admin");
        return;
    }

    cerrarAdminSubModal();

    let html = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 900px;">
                <h3>📦 Todos los pedidos de la tienda</h3>
                <div style="overflow-x: auto;">
                    <table class="admin-table">
                        <thead>
                            <tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Total</th><th>Estado</th><th>Accion</th></tr>
                        </thead>
                        <tbody>
    `;

    pedidos.forEach(p => {
        const productosLista = (p.items || []).map(i => `${i.nombre} x${i.cantidad}`).join(", ");
        html += `
            <tr>
                <td>#${p.id}</td>
                <td>${new Date(p.fecha).toLocaleDateString()}</td>
                <td><strong>${p.usuarioNombre || p.usuarioEmail || p.usuario || "Cliente"}</strong><br><span style="font-size: 11px;">${p.usuarioEmail || p.usuario || ""}</span></td>
                <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${productosLista}</td>
                <td>${formatCOP(Number(p.total || 0))}</td>
                <td>
                    <select onchange="adminCambiarEstado(${p.id}, this.value)" style="background: #0F172A; color: white; border: 1px solid #2563EB; padding: 4px 8px; border-radius: 8px;">
                        <option value="pendiente" ${p.estado === "pendiente" ? "selected" : ""}>pendiente</option>
                        <option value="pagado" ${p.estado === "pagado" ? "selected" : ""}>pagado</option>
                        <option value="enviado" ${p.estado === "enviado" ? "selected" : ""}>enviado</option>
                        <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>entregado</option>
                    </select>
                </td>
                <td><button onclick="adminVerDetallePedido(${p.id})" style="background: #2563EB; border: none; color: white; padding: 4px 12px; border-radius: 8px; cursor: pointer;">Ver</button></td>
            </tr>
        `;
    });

    html += `
                        </tbody>
                    </table>
                </div>
                <button class="admin-btn" style="margin-top: 20px;" onclick="cerrarAdminSubModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

function adminCambiarEstado(ordenId, nuevoEstado) {
    const pedidos = getPedidosAdmin();
    const pedido = pedidos.find(p => p.id === ordenId);
    if (!pedido) return;

    pedido.estado = nuevoEstado;
    setPedidosAdmin(pedidos);

    if (pedido.usuarioEmail) {
        actualizarEstadoPedidoUsuario(pedido.usuarioEmail, ordenId, nuevoEstado);
    }

    notificarExito(`Pedido #${ordenId} actualizado a ${nuevoEstado}`);
}

function adminVerDetallePedido(ordenId) {
    const pedidos = getPedidosAdmin();
    const pedido = pedidos.find(p => p.id === ordenId);
    if (!pedido) return;

    let itemsHtml = "";
    const items = Array.isArray(pedido.items) ? pedido.items : [];
    items.forEach(item => {
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2563EB;">
                <span>${item.nombre} x${item.cantidad}</span>
                <span>${formatCOP(Math.round((item.precio || 0) * (item.cantidad || 1)))}</span>
            </div>
        `;
    });

    if (!itemsHtml) {
        itemsHtml = "<div style=\"padding: 8px 0; color: #94A3B8;\">Sin detalle de items</div>";
    }

    cerrarAdminSubModal();

    const modalHtml = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content">
                <h3>📦 Detalle del pedido #${pedido.id}</h3>

                <div style="background: #0F172A; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                    <div><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleString()}</div>
                    <div><strong>Cliente:</strong> ${pedido.usuarioNombre || pedido.usuarioEmail || pedido.usuario || "Cliente"}</div>
                    <div><strong>Email:</strong> ${pedido.usuarioEmail || pedido.usuario || "--"}</div>
                    <div><strong>Estado:</strong> ${pedido.estado || "pendiente"}</div>
                </div>

                <div style="margin: 15px 0;">
                    <strong>Productos:</strong>
                    ${itemsHtml}
                </div>

                <div style="background: #0F172A; border-radius: 12px; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 18px;">
                        <strong>Total</strong>
                        <strong>${formatCOP(Number(pedido.total || 0))}</strong>
                    </div>
                </div>

                <button class="admin-btn" style="margin-top: 20px;" onclick="cerrarAdminSubModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function adminVerUsuarios() {
    if (!usuariosRegistrados.length) {
        mostrarNotificacion("No hay usuarios registrados", "info", "Admin");
        return;
    }

    cerrarAdminSubModal();

    let html = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 700px;">
                <h3>👥 Usuarios registrados</h3>
                <div class="productos-list">
    `;

    usuariosRegistrados.forEach(u => {
        html += `
            <div class="producto-edit-item">
                <div class="producto-edit-info">
                    <strong>${u.nombre}</strong>
                    <span>${u.email}</span>
                    <span style="font-size: 12px;">${new Date(u.fechaRegistro || Date.now()).toLocaleDateString()}</span>
                </div>
                <div class="producto-edit-actions">
                    ${u.email !== ADMIN_EMAIL ? `<button class="btn-delete" onclick="adminEliminarUsuario('${u.email}')" aria-label="Eliminar usuario ${u.email}" title="Eliminar usuario">🗑️</button>` : '<span style="color: #FFD700;">👑 Admin</span>'}
                </div>
            </div>
        `;
    });

    html += `
                </div>
                <button class="admin-btn" style="margin-top: 20px;" onclick="cerrarAdminSubModal()">Cerrar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
}

function adminEliminarUsuario(email) {
    if (!window.confirm(`¿Eliminar usuario ${email}?`)) return;

    usuariosRegistrados = usuariosRegistrados.filter(u => u.email !== email);
    localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    notificarExito("Usuario eliminado");
    adminVerUsuarios();
}

function adminCrearCupon() {
    cerrarAdminSubModal();

    const modalHtml = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content">
                <h3>🏷️ Crear cupon de descuento</h3>

                <div class="form-group">
                    <label>Codigo del cupon</label>
                    <input type="text" id="cuponCodigo" placeholder="DESCUENTO20">
                </div>

                <div class="form-group">
                    <label>Tipo de descuento</label>
                    <select id="cuponTipo">
                        <option value="porcentaje">Porcentaje (%)</option>
                        <option value="fijo">Monto fijo (COP)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Valor del descuento</label>
                    <input type="number" id="cuponValor" placeholder="20">
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="admin-btn" onclick="adminGuardarCupon()">Crear cupon</button>
                    <button class="admin-btn admin-btn-danger" onclick="cerrarAdminSubModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function adminGuardarCupon() {
    const codigo = (document.getElementById("cuponCodigo")?.value || "").toUpperCase().trim();
    const tipo = document.getElementById("cuponTipo")?.value || "porcentaje";
    const valor = parseInt(document.getElementById("cuponValor")?.value || "0", 10);

    if (!codigo || !valor || valor <= 0) {
        notificarError("Completa todos los campos");
        return;
    }

    if (cuponesDisponibles.some(c => c.codigo === codigo)) {
        notificarError("Ese codigo ya existe");
        return;
    }

    cuponesDisponibles.push({ codigo, descuento: valor, tipo, usado: false });
    localStorage.setItem("cupones", JSON.stringify(cuponesDisponibles));

    notificarExito(`Cupon ${codigo} creado`);
    cerrarAdminSubModal();
}

function obtenerProductoMasVendido() {
    const pedidos = getPedidosAdmin();
    const ventasPorProducto = {};

    pedidos.forEach(p => {
        const items = Array.isArray(p.items) ? p.items : [];
        items.forEach(item => {
            const nombre = item.nombre;
            ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + Number(item.cantidad || 1);
        });
    });

    let maxProducto = null;
    let maxCantidad = 0;

    Object.entries(ventasPorProducto).forEach(([nombre, cantidad]) => {
        if (cantidad > maxCantidad) {
            maxCantidad = cantidad;
            maxProducto = { nombre, cantidad };
        }
    });

    return maxProducto;
}

function adminVerReportes() {
    const pedidos = getPedidosAdmin();
    const ventasTotales = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const productoMasVendido = obtenerProductoMasVendido();

    cerrarAdminSubModal();

    const modalHtml = `
        <div id="adminSubModal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 800px;">
                <h3>📈 Reportes de la tienda</h3>

                <div class="admin-stats" style="grid-template-columns: 1fr 1fr;">
                    <div class="admin-stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-value">${formatCOP(Math.round(ventasTotales))}</div>
                        <div class="stat-label">Ventas totales</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-value">${pedidos.length}</div>
                        <div class="stat-label">Pedidos totales</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-value">${usuariosRegistrados.length}</div>
                        <div class="stat-label">Clientes</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">⭐</div>
                        <div class="stat-value">4.8</div>
                        <div class="stat-label">Calificacion promedio</div>
                    </div>
                </div>

                ${productoMasVendido ? `
                <div style="background: #1E293B; border-radius: 16px; padding: 15px; margin-top: 15px; border: 1px solid #2563EB;">
                    <div style="color: #FFD700;">🏆 Producto mas vendido</div>
                    <div style="font-size: 20px; font-weight: 700; margin-top: 5px;">${productoMasVendido.nombre}</div>
                    <div>${productoMasVendido.cantidad} unidades vendidas</div>
                </div>
                ` : ""}

                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top: 20px;">
                    <button class="admin-btn" onclick="generarReporteVentas()">📄 Descargar reporte</button>
                    <button class="admin-btn" onclick="cerrarAdminSubModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function adminResetTienda() {
    if (!window.confirm("⚠️ ¿Resetear toda la tienda? Esta accion no se puede deshacer.")) return;
    if (!window.confirm("¿Estas completamente seguro? Se perderan los datos.")) return;

    localStorage.clear();

    productos.length = 0;
    productos.push(
        { id: 1, nombre: "Laptop Gamer Nitro X", precio: 5200000, imagen: "assets/images/sin-fondo/laptop-gamer-nitro-x.png", specs: "Intel i7 • RTX 3050 • 16GB RAM", categoria: "laptops", stock: 10 },
        { id: 2, nombre: "Desktop Pro Gamer", precio: 8900000, imagen: "assets/images/sin-fondo/desktop-pro-gamer.png", specs: "Ryzen 9 • RTX 4080 • 32GB RAM", categoria: "desktops", stock: 5 },
        { id: 3, nombre: "Monitor Curvo 27\"", precio: 1200000, imagen: "assets/images/sin-fondo/monitor-curvo-27.png", specs: "240Hz • 1ms • QHD", categoria: "monitores", stock: 15 },
        { id: 4, nombre: "Teclado Mecánico RGB", precio: 350000, imagen: "assets/images/sin-fondo/teclado-mecanico-rgb.png", specs: "Switches Red • RGB", categoria: "accesorios", stock: 25 },
        { id: 5, nombre: "Mouse Gamer Pro", precio: 280000, imagen: "assets/images/sin-fondo/mouse-gamer-pro.png", specs: "26000 DPI • Inalámbrico", categoria: "accesorios", stock: 30 },
        { id: 6, nombre: "Auriculares 7.1", precio: 450000, imagen: "assets/images/sin-fondo/auriculares-7-1.png", specs: "Sonido envolvente • RGB", categoria: "accesorios", stock: 20 },
        { id: 101, nombre: "Workstation Empresarial Z9", precio: 12900000, imagen: "assets/images/sin-fondo/workstation-empresarial-z9.png", specs: "Intel Xeon • 64GB RAM • SSD 2TB", categoria: "empresa", stock: 8 },
        { id: 102, nombre: "Servidor Rack Mini 8 Bahías", precio: 15900000, imagen: "assets/images/sin-fondo/servidor-rack-mini-8-bahias.png", specs: "32 Cores • ECC 128GB • RAID", categoria: "empresa", stock: 5 },
        { id: 103, nombre: "Laptop Ejecutiva Carbon Pro 14", precio: 7400000, imagen: "assets/images/sin-fondo/laptop-ejecutiva-carbon-pro-14.png", specs: "Intel Ultra 7 • 32GB RAM • 1TB SSD", categoria: "empresa", stock: 14 },
        { id: 104, nombre: "Kit Videoconferencia 4K Team", precio: 3100000, imagen: "assets/images/sin-fondo/kit-videoconferencia-4k-team.png", specs: "Cámara 4K • Micrófono 360° • AI Noise Cancel", categoria: "empresa", stock: 20 },
        { id: 105, nombre: "Firewall Corporativo SecureGate X", precio: 5600000, imagen: "assets/images/sin-fondo/firewall-corporativo-securegate-x.png", specs: "VPN • IDS/IPS • Gestión centralizada", categoria: "empresa", stock: 10 }
    );
    localStorage.setItem("productos", JSON.stringify(productos));

    cuponesDisponibles = [
        { codigo: "BIENVENIDA", descuento: 10, tipo: "porcentaje", usado: false },
        { codigo: "TECNEXUS20", descuento: 20, tipo: "porcentaje", usado: false },
        { codigo: "ENVIOGRATIS", descuento: 10000, tipo: "fijo", usado: false },
        { codigo: "OFERTA30", descuento: 30, tipo: "porcentaje", usado: false }
    ];
    localStorage.setItem("cupones", JSON.stringify(cuponesDisponibles));

    usuariosRegistrados = [];
    localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    crearAdminPorDefecto();

    carrito = [];
    usuarioActual = null;
    cuponActivo = null;

    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();

    notificarExito("Tienda reseteada correctamente");
    cerrarAdminSubModal();
    cerrarAdminModal();

    setTimeout(() => {
        location.reload();
    }, 1000);
}

function hookAdminAuthFunctions() {
    if (typeof login === "function" && !window.__adminHookLogin) {
        const originalLogin = login;
        window.login = async function loginWithAdminHook() {
            await Promise.resolve(originalLogin());
            verificarAdmin();
        };
        window.__adminHookLogin = true;
    }

    if (typeof register === "function" && !window.__adminHookRegister) {
        const originalRegister = register;
        window.register = async function registerWithAdminHook() {
            await Promise.resolve(originalRegister());
            verificarAdmin();
        };
        window.__adminHookRegister = true;
    }

    if (typeof socialLogin === "function" && !window.__adminHookSocialLogin) {
        const originalSocialLogin = socialLogin;
        window.socialLogin = async function socialLoginWithAdminHook(provider) {
            await Promise.resolve(originalSocialLogin(provider));
            verificarAdmin();
        };
        window.__adminHookSocialLogin = true;
    }

    if (typeof cerrarSesion === "function" && !window.__adminHookCerrarSesion) {
        const originalCerrarSesion = cerrarSesion;
        window.cerrarSesion = async function cerrarSesionWithAdminHook() {
            await Promise.resolve(originalCerrarSesion());
            verificarAdmin();
        };
        window.__adminHookCerrarSesion = true;
    }
}

crearAdminPorDefecto();

document.addEventListener("DOMContentLoaded", () => {
    hookAdminAuthFunctions();
    verificarAdmin();
});
