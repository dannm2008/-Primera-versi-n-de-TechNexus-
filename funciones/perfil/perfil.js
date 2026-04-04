async function actualizarPerfil() {
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileMemberSince = document.getElementById("profileMemberSince");
    const editNombre = document.getElementById("editNombre");
    const editEmail = document.getElementById("editEmail");

    if (!profileName || !profileEmail) return;

    if (usuarioActual) {
        sincronizarUsuarioDataActual();
        profileName.textContent = usuarioActual.nombre;
        profileEmail.textContent = usuarioActual.email;
        if (profileMemberSince) profileMemberSince.textContent = `Miembro desde: ${usuarioData.fechaRegistro || "--"}`;
        if (editNombre) editNombre.value = usuarioActual.nombre;
        if (editEmail) editEmail.value = usuarioActual.email;

        actualizarAvatarPerfilUI(usuarioData?.fotoPerfil || "");
        actualizarEstadoModoProUI();

        await mostrarHistorialCompras();
        await mostrarFavoritos();
        if (typeof actualizarPantallaPuntos === "function") actualizarPantallaPuntos();
    } else {
        profileName.textContent = "Inicia sesión";
        profileEmail.textContent = "usuario@email.com";
        if (profileMemberSince) profileMemberSince.textContent = "Miembro desde: --";
        actualizarAvatarPerfilUI("");

        const historialCompras = document.getElementById("historialCompras");
        if (historialCompras) {
            historialCompras.innerHTML = `<div class="empty-cart" style="background: #1E293B; border-radius: 16px; padding: 40px; text-align: center;"><p style="color: #94A3B8;">Inicia sesión para ver tu historial de compras</p></div>`;
        }

        const favoritosContainer = document.getElementById("favoritosContainer");
        if (favoritosContainer) {
            favoritosContainer.innerHTML = `<div class="empty-cart" style="background: #1E293B; border-radius: 16px; padding: 40px; text-align: center;"><p style="color: #94A3B8;">Inicia sesión para ver tus favoritos</p></div>`;
        }

        actualizarEstadoModoProUI();

        const puntosContainer = document.getElementById("puntos-container");
        if (puntosContainer) puntosContainer.innerHTML = "";
    }
}

function actualizarEstadoModoProUI() {
    const estadoNodo = document.getElementById("modoProEstado");
    const proBtn = document.getElementById("modoProBtn");
    const proBadge = document.getElementById("profileProBadge");

    if (!estadoNodo) return;

    const activo = Boolean(usuarioData?.modoProActivo && usuarioData?.modoProHasta && new Date(usuarioData.modoProHasta).getTime() > Date.now());
    if (activo) {
        const fecha = new Date(usuarioData.modoProHasta).toLocaleDateString("es-CO");
        estadoNodo.textContent = `Estado: Pro activo hasta ${fecha}`;
        estadoNodo.style.color = "#facc15";

        if (proBtn) {
            proBtn.textContent = "Modo Pro activo";
            proBtn.classList.add("pro-gold-btn");
            proBtn.disabled = true;
        }

        if (proBadge) {
            proBadge.style.display = "inline-flex";
        }

        document.body.classList.add("pro-mode-active");
        return;
    }

    estadoNodo.textContent = "Estado: Plan estándar";
    estadoNodo.style.color = "#93C5FD";

    if (proBtn) {
        proBtn.textContent = "Activar Pro (pago)";
        proBtn.classList.remove("pro-gold-btn");
        proBtn.disabled = false;
    }

    if (proBadge) {
        proBadge.style.display = "none";
    }

    document.body.classList.remove("pro-mode-active");
}

function activarModoPro() {
    if (!usuarioActual) {
        mostrarMensaje("Inicia sesión para activar Modo Pro", "error");
        return;
    }

    const activo = Boolean(usuarioData?.modoProActivo && usuarioData?.modoProHasta && new Date(usuarioData.modoProHasta).getTime() > Date.now());
    if (activo) {
        mostrarMensaje("Tu Modo Pro ya está activo", "info");
        return;
    }

    const confirmado = confirm("Activar Modo Pro con pago mensual para envíos prioritarios y beneficios exclusivos?");
    if (!confirmado) return;

    const hoy = new Date();
    const vence = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    usuarioData.modoProActivo = true;
    usuarioData.modoProHasta = vence.toISOString();
    guardarUsuarioData();
    actualizarEstadoModoProUI();
    mostrarMensaje("Modo Pro activado correctamente", "success");
}

function actualizarAvatarPerfilUI(src) {
    const img = document.getElementById("profileAvatarImage");
    const fallback = document.getElementById("profileAvatarFallback");
    if (!img || !fallback) return;

    const source = String(src || "").trim();
    if (!source) {
        img.style.display = "none";
        img.removeAttribute("src");
        fallback.style.display = "inline";
        return;
    }

    img.src = source;
    img.style.display = "block";
    fallback.style.display = "none";
}

function actualizarFotoPerfil(event) {
    if (!usuarioActual) {
        mostrarMensaje("Inicia sesión para cambiar tu foto", "error");
        return;
    }

    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        mostrarMensaje("Selecciona un archivo de imagen", "error");
        event.target.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        mostrarMensaje("La foto debe pesar menos de 2MB", "error");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl) return;

        usuarioData.fotoPerfil = dataUrl;
        guardarUsuarioData();
        actualizarAvatarPerfilUI(dataUrl);
        mostrarMensaje("Foto de perfil actualizada", "success");
        event.target.value = "";
    };
    reader.readAsDataURL(file);
}

function textoEstadoPedido(estado) {
    const key = String(estado || "").toLowerCase();
    if (key === "preparacion") return "En preparación";
    if (key === "en_camino") return "En camino";
    if (key === "entregado") return "Entregado";
    if (key === "pagado") return "Pagado";
    return "Pendiente";
}

function colorEstadoPedido(estado) {
    const key = String(estado || "").toLowerCase();
    if (key === "entregado") return "#2e7d32";
    if (key === "en_camino") return "#2563EB";
    if (key === "preparacion") return "#ed6c02";
    if (key === "pagado") return "#2e7d32";
    return "#64748b";
}

function renderHistorialLocal(container) {
    if (!container) return;

    if (!usuarioData.historial.length) {
        container.innerHTML = `<div class="empty-cart" style="background: #1E293B; border-radius: 16px; padding: 40px; text-align: center;"><p style="color: #94A3B8;">No tienes compras realizadas aún</p></div>`;
        return;
    }

    let html = "";
    usuarioData.historial.forEach(orden => {
        const ordenIdTexto = String(orden.id || "");
        const idArg = JSON.stringify(orden.id);
        html += `
            <div style="background: #1E293B; border-radius: 16px; padding: 20px; margin-bottom: 15px; border: 1px solid #2563EB;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; gap: 10px;">
                    <div>
                        <strong style="color: #FFFFFF;">Orden #${ordenIdTexto}</strong>
                        <p style="color: #93C5FD; font-size: 12px;">${orden.fecha}</p>
                    </div>
                    <span style="background: ${colorEstadoPedido(orden.estado)}; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: white;">${textoEstadoPedido(orden.estado)}</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">${(orden.productos || []).map(p => `<span style="background: #0F172A; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: white;">${p}</span>`).join("")}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span style="color: #8B5CF6; font-weight: 700;">${formatCOP(Number(orden.total || 0))}</span>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn-outline" onclick='recomprar(${idArg})' style="padding: 6px 16px; font-size: 13px;">Comprar de nuevo</button>
                        <button class="btn-outline" onclick='generarFactura(${idArg})' style="padding: 6px 16px; font-size: 13px;">Factura</button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function mostrarHistorialCompras() {
    const container = document.getElementById("historialCompras");
    if (!container) return;

    if (!usuarioActual) {
        container.innerHTML = `<div class="empty-cart" style="background: #1E293B; border-radius: 16px; padding: 40px; text-align: center;"><p style="color: #94A3B8;">No tienes compras realizadas aún</p></div>`;
        return;
    }

    if (window.supabaseClient && (usuarioActual.id || usuarioActual.uid)) {
        const usuarioId = String(usuarioActual.uid || usuarioActual.id);
        const { data: ordenes, error } = await window.supabaseClient
            .from("ordenes")
            .select("*")
            .eq("usuario_id", usuarioId)
            .order("fecha", { ascending: false });

        if (!error && Array.isArray(ordenes)) {
            if (ordenes.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: #1E293B; border-radius: 16px;">
                        <div style="font-size: 48px;">📦</div>
                        <p style="color: #94A3B8;">No tienes compras realizadas aún</p>
                        <button class="btn-outline" onclick="showScreen('products')">Explorar productos →</button>
                    </div>
                `;
                return;
            }

            let html = "";
            ordenes.forEach(orden => {
                const fecha = new Date(orden.fecha).toLocaleDateString("es-ES");
                const items = Array.isArray(orden.items) ? orden.items : [];
                const idArg = JSON.stringify(orden.id);
                const itemsHtml = items.map(item =>
                    `<span style="background: #0F172A; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${item.nombre} x${item.cantidad}</span>`
                ).join("");

                const estadoTexto = textoEstadoPedido(orden.estado);
                const estadoColor = colorEstadoPedido(orden.estado);

                html += `
                    <div style="background: #1E293B; border-radius: 16px; padding: 20px; margin-bottom: 15px; border: 1px solid #2563EB;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                            <div>
                                <strong style="color: white;">Orden #${String(orden.id || "").slice(0, 8)}</strong>
                                <p style="color: #93C5FD; font-size: 12px;">${fecha}</p>
                            </div>
                            <div>
                                <span style="background: ${estadoColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: white;">
                                    ${estadoTexto}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                            ${itemsHtml}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #8B5CF6; font-weight: 700;">${formatCOP(Number(orden.total || 0))}</span>
                            <button class="btn-outline" onclick='recomprar(${idArg})' style="padding: 6px 16px; font-size: 13px;">Comprar de nuevo</button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
            return;
        }
    }

    // Fallback local para compatibilidad
    renderHistorialLocal(container);
}

if (!window.__trackingPedidosIntervalo) {
    window.__trackingPedidosIntervalo = setInterval(async () => {
        if (typeof actualizarEstadosPedidosAutomatico !== "function") return;
        const huboCambios = actualizarEstadosPedidosAutomatico();
        if (!huboCambios) return;

        const profileScreen = document.getElementById("screen-profile");
        if (profileScreen && profileScreen.classList.contains("active")) {
            await mostrarHistorialCompras();
        }
    }, 30000);
}

function mostrarHistorial() {
    void mostrarHistorialCompras();
}

function mostrarDirecciones() {
    const container = document.getElementById("direccionesContainer");
    if (!container) return;

    let html = "";
    usuarioData.direcciones.forEach(dir => {
        html += `
            <div style="background: #1E293B; border-radius: 16px; padding: 20px; margin-bottom: 15px; border: 1px solid #2563EB;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                    <div>
                        <strong style="color: #FFFFFF;">${dir.nombre} ${dir.principal ? "*" : ""}</strong>
                        <p style="color: #93C5FD; margin-top: 5px;">${dir.direccion}</p>
                        <p style="color: #94A3B8; font-size: 13px;">${dir.ciudad} - ${dir.telefono}</p>
                    </div>
                    <span onclick="eliminarDireccion(${dir.id})" style="cursor: pointer; color: #f87171;">X</span>
                </div>
                ${!dir.principal ? `<button class="btn-outline" onclick="establecerPrincipal('direccion', ${dir.id})" style="margin-top: 10px; padding: 4px 12px; font-size: 12px;">Establecer como principal</button>` : ""}
            </div>
        `;
    });
    container.innerHTML = html;
}

function mostrarTarjetas() {
    const container = document.getElementById("tarjetasContainer");
    if (!container) return;

    let html = "";
    usuarioData.tarjetas.forEach(t => {
        html += `
            <div style="background: #1E293B; border-radius: 16px; padding: 20px; margin-bottom: 15px; border: 1px solid #2563EB;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div>
                        <strong style="color: #FFFFFF;">${t.tipo} ${t.principal ? "*" : ""}</strong>
                        <p style="color: #93C5FD; margin-top: 5px;">${t.numero}</p>
                        <p style="color: #94A3B8; font-size: 13px;">${t.nombre} - Expira ${t.expiracion}</p>
                    </div>
                    <span onclick="eliminarTarjeta(${t.id})" style="cursor: pointer; color: #f87171;">X</span>
                </div>
                ${!t.principal ? `<button class="btn-outline" onclick="establecerPrincipal('tarjeta', ${t.id})" style="margin-top: 10px; padding: 4px 12px; font-size: 12px;">Establecer como principal</button>` : ""}
            </div>
        `;
    });
    container.innerHTML = html;
}

async function mostrarFavoritos() {
    const container = document.getElementById("favoritosContainer");
    if (!container) return;

    if (usuarioActual && typeof cargarFavoritosSupabase === "function") {
        const favoritosSupabase = await cargarFavoritosSupabase();
        if (Array.isArray(favoritosSupabase)) {
            usuarioData.favoritos = favoritosSupabase;
            guardarUsuarioData();
        }
    }

    const favoritosIds = Array.isArray(usuarioData.favoritos)
        ? usuarioData.favoritos.map(id => String(id))
        : [];

    const favoritosProductos = productos.filter(p => favoritosIds.includes(String(p.id)));
    if (!favoritosProductos.length) {
        container.innerHTML = `<div class="empty-cart" style="background: #1E293B; border-radius: 16px; padding: 40px; text-align: center;"><p style="color: #94A3B8;">No tienes productos favoritos</p></div>`;
        return;
    }

    let html = '<div class="product-grid">';
    favoritosProductos.forEach(p => {
        const idArg = JSON.stringify(p.id);
        html += `
            <div class="product-card">
                ${renderProductVisual(p.imagen, p.nombre)}
                <div class="product-title">${p.nombre}</div>
                <div class="product-price">${formatCOP(p.precio)}</div>
                <button class="btn-add" onclick='agregarAlCarrito(${idArg})'>Agregar +</button>
                <button class="btn-outline" onclick='quitarFavorito(${idArg})' style="margin-top: 8px; width: 100%;">❤️ Quitar</button>
            </div>
        `;
    });
    html += "</div>";
    container.innerHTML = html;
}

function agregarDireccion() {
    usuarioData.direcciones.push({
        id: Date.now(),
        nombre: "Nueva dirección",
        direccion: "Completa tu dirección",
        ciudad: "Ciudad",
        telefono: "3000000000",
        principal: false
    });
    guardarUsuarioData();
    mostrarDirecciones();
    mostrarMensaje("Dirección agregada");
}

function agregarTarjeta() {
    usuarioData.tarjetas.push({
        id: Date.now(),
        tipo: "Nueva",
        numero: "**** **** **** ****",
        nombre: usuarioActual ? usuarioActual.nombre : "Usuario",
        expiracion: "MM/AA",
        principal: false
    });
    guardarUsuarioData();
    mostrarTarjetas();
    mostrarMensaje("Tarjeta agregada");
}

function eliminarDireccion(id) {
    usuarioData.direcciones = usuarioData.direcciones.filter(d => d.id !== id);
    guardarUsuarioData();
    mostrarDirecciones();
    mostrarMensaje("Dirección eliminada");
}

function eliminarTarjeta(id) {
    usuarioData.tarjetas = usuarioData.tarjetas.filter(t => t.id !== id);
    guardarUsuarioData();
    mostrarTarjetas();
    mostrarMensaje("Tarjeta eliminada");
}

function establecerPrincipal(tipo, id) {
    if (tipo === "direccion") usuarioData.direcciones.forEach(d => { d.principal = d.id === id; });
    if (tipo === "tarjeta") usuarioData.tarjetas.forEach(t => { t.principal = t.id === id; });
    guardarUsuarioData();
    if (tipo === "direccion") mostrarDirecciones();
    if (tipo === "tarjeta") mostrarTarjetas();
    mostrarMensaje("Principal actualizado");
}

async function quitarFavorito(productId) {
    usuarioData.favoritos = (usuarioData.favoritos || []).filter(id => String(id) !== String(productId));
    guardarUsuarioData();

    if (typeof guardarFavoritosSupabase === "function") {
        await guardarFavoritosSupabase(usuarioData.favoritos || []);
    }

    if (typeof wishlist !== "undefined" && Array.isArray(wishlist)) {
        wishlist = wishlist.filter(item => String(item.id) !== String(productId));
        if (typeof guardarWishlistUsuario === "function") guardarWishlistUsuario();
    }

    await mostrarFavoritos();
    mostrarMensaje("Producto eliminado de favoritos");
}

async function recomprar(ordenId) {
    let items = [];

    if (window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient
                .from("ordenes")
                .select("items")
                .eq("id", String(ordenId))
                .maybeSingle();

            if (Array.isArray(data?.items)) {
                items = data.items;
            }
        } catch (err) {
            console.error("Error consultando orden para recompra:", err);
        }
    }

    if (!items.length) {
        const ordenLocal = usuarioData.historial.find(o => String(o.id) === String(ordenId));
        if (!ordenLocal) return;
        items = Array.isArray(ordenLocal.items) && ordenLocal.items.length
            ? ordenLocal.items
            : (ordenLocal.productos || []).map(nombre => ({ nombre, cantidad: 1 }));
    }

    for (const item of items) {
        if (item.id) {
            for (let i = 0; i < Number(item.cantidad || 1); i += 1) {
                await agregarAlCarrito(item.id);
            }
            continue;
        }

        const producto = productos.find(p => p.nombre === item.nombre);
        if (!producto) continue;
        for (let i = 0; i < Number(item.cantidad || 1); i += 1) {
            await agregarAlCarrito(producto.id);
        }
    }

    showScreen("cart");
    mostrarMensaje("Productos agregados al carrito", "success");
}

function guardarAjustes() {
    if (!usuarioActual) {
        mostrarMensaje("Inicia sesión para editar ajustes", "error");
        return;
    }

    const nuevoNombre = (document.getElementById("editNombre")?.value || "").trim();
    const nuevoEmail = (document.getElementById("editEmail")?.value || "").trim();
    const nuevaPassword = (document.getElementById("editPassword")?.value || "").trim();

    if (nuevoNombre) usuarioActual.nombre = nuevoNombre;
    if (nuevoEmail) usuarioActual.email = nuevoEmail;

    usuarioData.nombre = usuarioActual.nombre;
    usuarioData.email = usuarioActual.email;
    guardarUsuarioData();

    const usuarioRegistrado = usuariosRegistrados.find(u => u.email === usuarioActual.email || u.nombre === usuarioActual.nombre);
    if (usuarioRegistrado) {
        usuarioRegistrado.nombre = usuarioActual.nombre;
        usuarioRegistrado.email = usuarioActual.email;
        if (nuevaPassword) usuarioRegistrado.password = nuevaPassword;
        localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    }

    const editPassword = document.getElementById("editPassword");
    if (editPassword) editPassword.value = "";

    actualizarPerfil();
    mostrarMensaje("Datos actualizados correctamente");
}

function cerrarSesion() {
    if (window.supabaseClient?.auth) {
        window.supabaseClient.auth.signOut().catch(err => {
            console.error("Error cerrando sesión en Supabase:", err);
        });
    }

    usuarioActual = null;
    localStorage.removeItem("usuarioActual");
    localStorage.removeItem("usuario");

    if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
    if (typeof mostrarCarrito === "function") mostrarCarrito();
    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    mostrarMensaje("Sesión cerrada");
    showScreen("auth");
}

function mostrarSeccionPerfil(seccion) {
    document.querySelectorAll(".perfil-seccion").forEach(s => { s.style.display = "none"; });
    document.querySelectorAll(".profile-tab").forEach(t => {
        t.style.color = "#94A3B8";
        t.classList.remove("active");
    });

    const sectionNode = document.getElementById(`seccion-${seccion}`);
    if (sectionNode) sectionNode.style.display = "block";

    const tabActivo = document.querySelector(`.profile-tab[onclick="mostrarSeccionPerfil('${seccion}')"]`);
    if (tabActivo) {
        tabActivo.style.color = "#FFFFFF";
        tabActivo.classList.add("active");
    }

    if (seccion === "favoritos") {
        void mostrarFavoritos();
    }
}

window.activarModoPro = activarModoPro;
