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
    const raw = String(imagen || "").trim().replace(/^['\"]+|['\"]+$/g, "");
    const alt = String(nombre || "Producto").replace(/[&<>\"]/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;"
    }[ch] || ch));
    const srcLimpio = raw.replace(/\s+/g, " ").trim();
    const srcFinal = srcLimpio.startsWith("assets/images/sin-fondo/")
        ? `${srcLimpio}${srcLimpio.includes("?") ? "&" : "?"}v=20260403b`
        : srcLimpio;

    const pareceRutaImagen = /^(https?:\/\/|\.\/|\.\.\/|\/|images\/|assets\/|data:image\/)/i.test(srcFinal)
        || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(srcFinal);

    if (pareceRutaImagen) {
        return `
            <div class="product-media">
                <img class="product-image" src="${srcFinal}" alt="${alt}" loading="lazy" decoding="async" onload="procesarFondoBlancoProducto(this)">
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

function procesarFondoBlancoProducto(img) {
    if (!img || img.dataset.bgProcessed === "1") return;

    const src = String(img.getAttribute("src") || img.src || "");
    if (!src.includes("assets/images/sin-fondo/")) return;

    img.dataset.bgProcessed = "1";

    try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) return;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const totalPixels = width * height;
        const visitado = new Uint8Array(totalPixels);
        const cola = [];

        const esFondoConectado = (r, g, b, a) => {
            if (a <= 8) return true;

            const maxRgb = Math.max(r, g, b);
            const minRgb = Math.min(r, g, b);
            const rango = maxRgb - minRgb;

            const esBlancoGrisClaro = minRgb >= 150 && rango <= 36;
            const esMuyClaro = minRgb >= 205;
            const esRojoBanner = r >= 150 && g <= 130 && b <= 130;

            return esBlancoGrisClaro || esMuyClaro || esRojoBanner;
        };

        const encolarSiFondo = (idx) => {
            if (idx < 0 || idx >= totalPixels || visitado[idx] === 1) return;
            const i = idx * 4;
            if (!esFondoConectado(data[i], data[i + 1], data[i + 2], data[i + 3])) return;
            cola.push(idx);
        };

        // Semillas: píxeles del borde para limpiar solo fondo conectado.
        for (let x = 0; x < width; x++) {
            encolarSiFondo(x);
            encolarSiFondo((height - 1) * width + x);
        }
        for (let y = 1; y < height - 1; y++) {
            encolarSiFondo(y * width);
            encolarSiFondo(y * width + (width - 1));
        }

        while (cola.length) {
            const idx = cola.pop();
            if (visitado[idx] === 1) continue;

            const i = idx * 4;
            if (!esFondoConectado(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;

            visitado[idx] = 1;
            data[i + 3] = 0;

            const x = idx % width;
            const y = Math.floor(idx / width);

            if (x > 0) encolarSiFondo(idx - 1);
            if (x < width - 1) encolarSiFondo(idx + 1);
            if (y > 0) encolarSiFondo(idx - width);
            if (y < height - 1) encolarSiFondo(idx + width);
        }

        // Suaviza halo claro cuando toca transparencia (antialias posterior al recorte).
        const offsets = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];
        for (let idx = 0; idx < totalPixels; idx++) {
            const i = idx * 4;
            const a = data[i + 3];
            if (a === 0) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const minRgb = Math.min(r, g, b);
            const maxRgb = Math.max(r, g, b);
            const rango = maxRgb - minRgb;

            const esClaro = minRgb >= 185 && rango <= 30;
            if (!esClaro) continue;

            const x = idx % width;
            const y = Math.floor(idx / width);
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                data[i + 3] = Math.round(a * 0.5);
                continue;
            }

            let vecinosTransparentes = 0;
            for (const off of offsets) {
                const ni = (idx + off) * 4;
                if (data[ni + 3] <= 8) vecinosTransparentes++;
            }

            if (vecinosTransparentes >= 4) {
                data[i + 3] = Math.round(a * 0.45);
            } else if (vecinosTransparentes >= 2) {
                data[i + 3] = Math.round(a * 0.7);
            }
        }

        ctx.putImageData(imageData, 0, 0);
        img.src = canvas.toDataURL("image/png");
    } catch (_) {
        // Si algo falla, mantenemos la imagen original sin bloquear el render.
    }
}
