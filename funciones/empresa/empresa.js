function mostrarZonaEmpresarial() {
    const noRegistrada = document.getElementById("empresaNoRegistrada");
    const content = document.getElementById("empresaContent");

    if (usuarioActual && usuarioActual.esEmpresa) {
        if (noRegistrada) noRegistrada.style.display = "none";
        if (content) content.style.display = "block";

        const empresa = usuarioActual.empresa || {};
        setText("empresaNombre", empresa.nombre || "Empresa");
        setText("empresaNit", empresa.nit || "");
        setText("empresaDescuento", `${empresa.descuento || 0}%`);
        const historialEmpresarial = obtenerHistorialEmpresaUsuario();
        const ahorroEmpresarial = historialEmpresarial.reduce((sum, orden) => sum + calcularAhorroOrdenEmpresarial(orden), 0);

        setText("empresaCompras", String(historialEmpresarial.length || empresa.comprasEsteMes || 0));
        setText("empresaAhorro", formatCOP(ahorroEmpresarial || Number(empresa.ahorroAnual || 0)));
        setText("empresaUsuarios", String(empresa.usuarios || 1));

        mostrarProductosEmpresa();
        mostrarHistorialEmpresa();
    } else {
        if (noRegistrada) noRegistrada.style.display = "block";
        if (content) content.style.display = "none";
    }
}

function solicitarRegistroEmpresa() {
    if (!usuarioActual) {
        mostrarMensaje("Inicia sesión primero", "error");
        showScreen("auth");
        return;
    }

    const formHtml = `
        <div class="card" style="max-width: 500px; margin: 0 auto;">
            <h3>Registro empresarial</h3>
            <p style="color: #666;">Completa los datos para verificar tu empresa</p>

            <div class="form-group"><label>Nombre de la empresa</label><input type="text" id="empresaNombreInput" placeholder="Tech Solutions SAS"></div>
            <div class="form-group"><label>NIT</label><input type="text" id="empresaNitInput" placeholder="901.123.456-7"></div>
            <div class="form-group"><label>Teléfono de contacto</label><input type="text" id="empresaTelInput" placeholder="300 123 4567"></div>

            <button class="btn-primary" onclick="enviarSolicitudEmpresa()">Enviar solicitud</button>
            <button class="btn-outline" style="width:100%; margin-top:10px;" onclick="cerrarModalEmpresa()">Cancelar</button>
        </div>
    `;

    mostrarModalEmpresa(formHtml);
}

function enviarSolicitudEmpresa() {
    const nombre = (document.getElementById("empresaNombreInput")?.value || "").trim();
    const nit = (document.getElementById("empresaNitInput")?.value || "").trim();
    const telefono = (document.getElementById("empresaTelInput")?.value || "").trim();

    if (!nombre || !nit || !telefono) {
        mostrarMensaje("Completa todos los campos", "error");
        return;
    }

    usuarioActual.esEmpresa = true;
    usuarioActual.empresa = {
        nombre,
        nit,
        telefono,
        descuento: 15,
        comprasEsteMes: 0,
        ahorroAnual: 0,
        usuarios: 1
    };

    localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
    localStorage.setItem("usuario", JSON.stringify(usuarioActual));

    const idxUsuario = usuariosRegistrados.findIndex(u => String(u.email || "").toLowerCase() === String(usuarioActual?.email || "").toLowerCase());
    if (idxUsuario >= 0) {
        usuariosRegistrados[idxUsuario].esEmpresa = true;
        usuariosRegistrados[idxUsuario].empresa = { ...usuarioActual.empresa };
        localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    }

    cerrarModalEmpresa();
    mostrarZonaEmpresarial();
    mostrarMensaje("Solicitud enviada. Te contactaremos pronto");
}

function mostrarProductosEmpresa() {
    const container = document.getElementById("productosEmpresa");
    if (!container) return;

    const descuentoEmpresa = usuarioActual?.empresa?.descuento || 0;
    let html = "";

    productos.forEach(producto => {
        const idArg = JSON.stringify(producto.id);
        const precioConDescuento = Math.round(producto.precio * (1 - descuentoEmpresa / 100));
        html += `
            <div class="product-card">
                ${renderProductVisual(producto.imagen, producto.nombre)}
                <div class="product-title">${producto.nombre}</div>
                <div class="product-spec">${producto.specs}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #999; text-decoration: line-through;">${formatCOP(producto.precio)}</div>
                        <div class="product-price">${formatCOP(precioConDescuento)}</div>
                    </div>
                    <div style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 600;">-${descuentoEmpresa}%</div>
                </div>
                <button class="btn-add" onclick='agregarAlCarrito(${idArg})'>Agregar +</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function mostrarHistorialEmpresa() {
    const container = document.getElementById("historialEmpresa");
    if (!container) return;

    const historialEmpresarial = obtenerHistorialEmpresaUsuario();

    if (!historialEmpresarial.length) {
        container.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 20px; color: #999;">
                    <p>No hay compras empresariales registradas aún</p>
                </div>
            </div>
        `;
        return;
    }

    const meses = [...new Set(historialEmpresarial.map(obtenerMesClaveOrden))].sort((a, b) => b.localeCompare(a));
    const filtroActual = String(window.__filtroMesEmpresa || "todos");
    const filtroValido = filtroActual === "todos" || meses.includes(filtroActual) ? filtroActual : "todos";

    window.__historialEmpresaLista = historialEmpresarial;
    window.__filtroMesEmpresa = filtroValido;

    const opcionesMes = meses.map(mes => `<option value="${mes}" ${mes === filtroValido ? "selected" : ""}>${formatearMesClave(mes)}</option>`).join("");

    container.innerHTML = `
        <div class="card" style="margin-bottom: 12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
                <strong style="color:#E2E8F0;">Filtrar historial</strong>
                <select id="filtroMesEmpresa" onchange="aplicarFiltroHistorialEmpresa(this.value)" style="background:#0F172A; border:1px solid #2563EB; border-radius:10px; color:#fff; padding:8px 10px; min-width: 180px;">
                    <option value="todos" ${filtroValido === "todos" ? "selected" : ""}>Todos los meses</option>
                    ${opcionesMes}
                </select>
            </div>
        </div>
        <div id="historialEmpresaLista"></div>
    `;

    renderHistorialEmpresaLista(filtroValido);
}

function aplicarFiltroHistorialEmpresa(mesClave) {
    window.__filtroMesEmpresa = String(mesClave || "todos");
    renderHistorialEmpresaLista(window.__filtroMesEmpresa);
}

function renderHistorialEmpresaLista(mesClave = "todos") {
    const listaNodo = document.getElementById("historialEmpresaLista");
    if (!listaNodo) return;

    const historial = Array.isArray(window.__historialEmpresaLista) ? window.__historialEmpresaLista : [];
    const filtro = String(mesClave || "todos");
    const filtrado = filtro === "todos"
        ? historial
        : historial.filter(orden => obtenerMesClaveOrden(orden) === filtro);

    if (!filtrado.length) {
        listaNodo.innerHTML = `
            <div class="card">
                <div style="text-align: center; padding: 20px; color: #999;">
                    <p>No hay compras empresariales para el mes seleccionado</p>
                </div>
            </div>
        `;
        return;
    }

    const html = filtrado.map(orden => {
        const fecha = new Date(orden.fecha || Date.now()).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        const productos = Array.isArray(orden.productos) && orden.productos.length
            ? orden.productos.join(" • ")
            : "Productos corporativos";

        const descuentoPct = Number(orden.descuentoEmpresaPct || usuarioActual?.empresa?.descuento || 15);
        const ahorro = calcularAhorroOrdenEmpresarial(orden);

        return `
            <div class="card" style="margin-bottom: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
                    <strong>Orden #${orden.id || "--"}</strong>
                    <span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:8px; font-size:12px; font-weight:700;">Empresarial -${descuentoPct}%</span>
                </div>
                <div style="color:#93C5FD; font-size:13px; margin-bottom:6px;">${fecha}</div>
                <div style="color:#E2E8F0; margin-bottom:8px;">${productos}</div>
                <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                    <span style="color:#FACC15; font-weight:700;">Total: ${formatCOP(Number(orden.total || 0))}</span>
                    <span style="color:#86EFAC; font-weight:600;">Ahorro: ${formatCOP(ahorro)}</span>
                </div>
            </div>
        `;
    }).join("");

    listaNodo.innerHTML = html;
}

function obtenerMesClaveOrden(orden) {
    const fecha = new Date(orden?.fecha || Date.now());
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    return `${anio}-${mes}`;
}

function formatearMesClave(mesClave) {
    const [anio, mes] = String(mesClave || "").split("-");
    const fecha = new Date(Number(anio || 0), Math.max(0, Number(mes || 1) - 1), 1);
    if (Number.isNaN(fecha.getTime())) return "Mes";
    return fecha.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function esOrdenEmpresarial(orden) {
    if (!orden || typeof orden !== "object") return false;
    if (orden.esCompraEmpresarial) return true;
    if (Number(orden.descuentoEmpresaPct || 0) > 0) return true;

    const items = Array.isArray(orden.items) ? orden.items : [];
    return items.some(item => {
        const id = Number(item?.id || 0);
        return Number.isFinite(id) && id >= 101;
    });
}

function obtenerHistorialEmpresaUsuario() {
    if (!usuarioActual || !usuarioActual.email) return [];
    if (typeof getHistorialUsuario !== "function") return [];

    const historial = getHistorialUsuario();
    if (!Array.isArray(historial)) return [];

    return historial.filter(esOrdenEmpresarial);
}

function calcularAhorroOrdenEmpresarial(orden) {
    if (!orden || typeof orden !== "object") return 0;

    const ahorroDirecto = Number(orden.descuentoEmpresaValor || 0);
    if (ahorroDirecto > 0) return ahorroDirecto;

    const descuentoPct = Number(orden.descuentoEmpresaPct || usuarioActual?.empresa?.descuento || 15);
    if (descuentoPct <= 0) return 0;

    const items = Array.isArray(orden.items) ? orden.items : [];
    if (!items.length) return 0;

    const baseEmpresarial = items.reduce((sum, item) => {
        const id = Number(item?.id || 0);
        const esEmpresarial = Number.isFinite(id) && id >= 101;
        if (!esEmpresarial) return sum;

        const precio = Number(item?.precio || 0);
        const cantidad = Number(item?.cantidad || 0);
        if (precio <= 0 || cantidad <= 0) return sum;

        return sum + (precio * cantidad);
    }, 0);

    if (baseEmpresarial <= 0) return 0;
    return Math.round(baseEmpresarial * (descuentoPct / 100));
}

function mostrarModalEmpresa(contenido) {
    const modal = document.createElement("div");
    modal.id = "modalEmpresa";
    modal.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
    modal.innerHTML = contenido;
    document.body.appendChild(modal);
}

function cerrarModalEmpresa() {
    const modal = document.getElementById("modalEmpresa");
    if (modal) modal.remove();
}
