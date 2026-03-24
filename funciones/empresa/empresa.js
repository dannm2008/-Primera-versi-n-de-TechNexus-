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
        setText("empresaCompras", String(empresa.comprasEsteMes || 0));
        setText("empresaAhorro", `$${Number(empresa.ahorroAnual || 0).toLocaleString()}`);
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
        const precioConDescuento = Math.round(producto.precio * (1 - descuentoEmpresa / 100));
        html += `
            <div class="product-card">
                <div style="font-size: 20px; text-align: center;">${producto.imagen}</div>
                <div class="product-title">${producto.nombre}</div>
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${producto.specs}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #999; text-decoration: line-through;">$${producto.precio.toLocaleString()}</div>
                        <div class="product-price">$${precioConDescuento.toLocaleString()}</div>
                    </div>
                    <div style="background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 600;">-${descuentoEmpresa}%</div>
                </div>
                <button class="btn-add" onclick="agregarAlCarrito(${producto.id})">Agregar +</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function mostrarHistorialEmpresa() {
    const container = document.getElementById("historialEmpresa");
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div style="text-align: center; padding: 20px; color: #999;">
                <p>No hay compras registradas aún</p>
            </div>
        </div>
    `;
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
