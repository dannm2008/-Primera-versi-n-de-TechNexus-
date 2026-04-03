function formatCOP(valor) {
    const numero = Number(valor || 0);
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        currencyDisplay: "code",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numero).replace(/\u00a0/g, " ");
}

function renderProductVisual(imagen, nombre = "Producto") {
    const raw = String(imagen || "").trim();
    const alt = String(nombre || "Producto");

    const pareceRutaImagen = /^(https?:\/\/|\.\/|\.\.\/|\/|images\/|assets\/|data:image\/)/i.test(raw)
        || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(raw);

    if (pareceRutaImagen) {
        return `
            <div class="product-media">
                <img src="${raw}" alt="${alt}" loading="lazy" decoding="async">
            </div>
        `;
    }

    return `
        <div class="product-media product-media-emoji" aria-label="${alt}">${raw || "📦"}</div>
    `;
}

function mostrarMensaje(texto, tipo = "success") {
    if (typeof mostrarNotificacion === "function") {
        const tipoNotificacion = ["success", "error", "info", "warning", "cart", "gift"].includes(tipo)
            ? tipo
            : "success";
        mostrarNotificacion(texto, tipoNotificacion);
        return;
    }

    const alertDiv = document.createElement("div");
    alertDiv.className = "alert";

    if (tipo === "error") {
        alertDiv.style.background = "#ffebee";
        alertDiv.style.color = "#c62828";
    } else if (tipo === "info") {
        alertDiv.style.background = "#e3f2fd";
        alertDiv.style.color = "#0d47a1";
    } else {
        alertDiv.style.background = "#e8f5e9";
        alertDiv.style.color = "#2e7d32";
    }

    alertDiv.textContent = texto;

    const mainContent = document.getElementById("mainContent");
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
        setTimeout(() => alertDiv.remove(), 2500);
    }
}
