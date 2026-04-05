// ========== RESEÑAS (COMPATIBILIDAD) ==========

let estrellaSeleccionada = 0;
let productoResenaActivo = null;

window.mostrarModalResena = function (productoId, productoNombre) {
    if (!usuarioActual) {
        alert("🔐 Inicia sesión para dejar una reseña");
        return;
    }

    productoResenaActivo = productoId;

    const existente = document.getElementById("modalResena");
    if (existente) existente.remove();

    const modalHtml = `
        <div id="modalResena" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 520px;">
                <h3>📝 Reseña para ${productoNombre || "Producto"}</h3>
                <div class="form-group">
                    <label>Calificación</label>
                    <div id="starsSelector" style="display:flex; gap: 10px; margin-top: 8px;">
                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="btn-outline" style="min-width:46px;" onclick="seleccionarEstrella(${n})">☆</button>`).join("")}
                    </div>
                </div>
                <div class="form-group">
                    <label>Comentario</label>
                    <textarea id="comentarioResena" rows="4" placeholder="Cuéntanos tu experiencia"></textarea>
                </div>
                <div style="display:flex; gap:10px; flex-wrap: wrap;">
                    <button class="admin-btn" onclick='guardarResena(${JSON.stringify(productoId)})'>Publicar</button>
                    <button class="admin-btn admin-btn-danger" onclick="cerrarModalResena()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.seleccionarEstrella = function (valor) {
    estrellaSeleccionada = Number(valor) || 0;
    const stars = document.querySelectorAll("#starsSelector button");
    stars.forEach((star, i) => {
        star.textContent = i < estrellaSeleccionada ? "★" : "☆";
    });
};

window.guardarResena = async function (productoId) {
    const idProducto = productoId || productoResenaActivo;

    if (!estrellaSeleccionada) {
        alert("❌ Selecciona una calificación");
        return;
    }

    const comentario = (document.getElementById("comentarioResena")?.value || "").trim();
    if (!comentario) {
        alert("❌ Escribe un comentario");
        return;
    }

    if (typeof agregarResena === "function") {
        const ok = await agregarResena(idProducto, estrellaSeleccionada, comentario, "Reseña de usuario");
        if (ok) {
            alert("✅ Reseña publicada");
            cerrarModalResena();
            return;
        }
        alert("❌ Error al publicar reseña");
        return;
    }

    if (!window.supabaseClient) {
        alert("❌ Error al publicar reseña");
        return;
    }

    const usuarioIdSeguro = typeof obtenerUsuarioIdSupabaseSeguro === "function"
        ? obtenerUsuarioIdSupabaseSeguro()
        : "";

    const payload = {
        producto_id: String(idProducto),
        usuario_nombre: usuarioActual?.nombre || "Usuario",
        usuario_email: usuarioActual?.email || "",
        titulo: "Reseña de usuario",
        calificacion: estrellaSeleccionada,
        comentario
    };

    if (usuarioIdSeguro) {
        payload.usuario_id = usuarioIdSeguro;
    }

    const { error } = await window.supabaseClient
        .from("resenas")
        .insert(payload);

    if (error) {
        alert("❌ Error al publicar reseña");
    } else {
        alert("✅ Reseña publicada");
        cerrarModalResena();
    }
};

window.cerrarModalResena = function () {
    const modal = document.getElementById("modalResena");
    if (modal) modal.remove();
    estrellaSeleccionada = 0;
    productoResenaActivo = null;
};

window["mostrarModalReseña"] = window.mostrarModalResena;
window["guardarReseña"] = window.guardarResena;
window["cerrarModalReseña"] = window.cerrarModalResena;
