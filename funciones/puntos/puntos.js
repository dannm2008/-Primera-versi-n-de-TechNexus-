// ========== SISTEMA DE PUNTOS Y RECOMPENSAS ==========

let puntosUsuario = 0;
let historialPuntos = [];
let nivelActual = null;

const LEGACY_PUNTOS_KEY = "puntosUsuario";
const LEGACY_HISTORIAL_KEY = "historialPuntos";
const LEGACY_DESCUENTO_KEY = "descuentoPuntos";
const LEGACY_MIGRATION_DONE_KEY = "puntosLegacyMigrados";

const PUNTOS_POR_GASTO = 10000;

const opcionesCanje = [
    { puntos: 100, descuento: 5000, nombre: "💰 $5.000 de descuento" },
    { puntos: 200, descuento: 12000, nombre: "💰 $12.000 de descuento" },
    { puntos: 500, descuento: 35000, nombre: "💰 $35.000 de descuento" },
    { puntos: 1000, descuento: 80000, nombre: "💰 $80.000 de descuento" },
    { puntos: 2000, descuento: 180000, nombre: "💰 $180.000 de descuento" }
];

const niveles = {
    bronce: { min: 0, max: 99, nombre: "Bronce", descuentoExtra: 0, icono: "🥉" },
    plata: { min: 100, max: 499, nombre: "Plata", descuentoExtra: 5, icono: "🥈" },
    oro: { min: 500, max: 999, nombre: "Oro", descuentoExtra: 10, icono: "🥇" },
    platino: { min: 1000, max: Infinity, nombre: "Platino", descuentoExtra: 15, icono: "💎" }
};

let canjeSeleccionado = null;
let backupReinicioPuntos = null;
let backupReinicioExpiraEn = 0;

function getUsuarioPuntosId() {
    if (usuarioActual && usuarioActual.email) {
        return String(usuarioActual.email).trim().toLowerCase();
    }
    return "invitado";
}

function getPuntosStorageKey() {
    return `puntosUsuario:${getUsuarioPuntosId()}`;
}

function getHistorialStorageKey() {
    return `historialPuntos:${getUsuarioPuntosId()}`;
}

function getDescuentoPuntosStorageKey() {
    return `descuentoPuntos:${getUsuarioPuntosId()}`;
}

function migrarDatosLegacySiAplica() {
    const usuarioId = getUsuarioPuntosId();
    if (usuarioId === "invitado") return;
    if (localStorage.getItem(LEGACY_MIGRATION_DONE_KEY) === "1") return;

    const legacyPuntos = localStorage.getItem(LEGACY_PUNTOS_KEY);
    const legacyHistorial = localStorage.getItem(LEGACY_HISTORIAL_KEY);
    const legacyDescuento = localStorage.getItem(LEGACY_DESCUENTO_KEY);

    const hayDatosLegacy = Boolean(legacyPuntos || legacyHistorial || legacyDescuento);
    if (!hayDatosLegacy) {
        localStorage.setItem(LEGACY_MIGRATION_DONE_KEY, "1");
        return;
    }

    const puntosKey = getPuntosStorageKey();
    const historialKey = getHistorialStorageKey();
    const descuentoKey = getDescuentoPuntosStorageKey();

    const yaTienePuntosUsuario = localStorage.getItem(puntosKey) !== null;
    const yaTieneHistorialUsuario = localStorage.getItem(historialKey) !== null;
    const yaTieneDescuentoUsuario = localStorage.getItem(descuentoKey) !== null;

    if (!yaTienePuntosUsuario && legacyPuntos !== null) {
        localStorage.setItem(puntosKey, legacyPuntos);
    }
    if (!yaTieneHistorialUsuario && legacyHistorial !== null) {
        localStorage.setItem(historialKey, legacyHistorial);
    }
    if (!yaTieneDescuentoUsuario && legacyDescuento !== null) {
        localStorage.setItem(descuentoKey, legacyDescuento);
    }

    localStorage.removeItem(LEGACY_PUNTOS_KEY);
    localStorage.removeItem(LEGACY_HISTORIAL_KEY);
    localStorage.removeItem(LEGACY_DESCUENTO_KEY);
    localStorage.setItem(LEGACY_MIGRATION_DONE_KEY, "1");
}

function cargarPuntosUsuario() {
    migrarDatosLegacySiAplica();
    puntosUsuario = parseInt(localStorage.getItem(getPuntosStorageKey()) || "0", 10) || 0;
    historialPuntos = JSON.parse(localStorage.getItem(getHistorialStorageKey()) || "[]");
    actualizarNivel();
    actualizarPantallaPuntos();
}

function guardarPuntos() {
    localStorage.setItem(getPuntosStorageKey(), String(puntosUsuario));
    localStorage.setItem(getHistorialStorageKey(), JSON.stringify(historialPuntos));
}

function getNivelUsuario(puntos) {
    if (puntos < 100) return niveles.bronce;
    if (puntos < 500) return niveles.plata;
    if (puntos < 1000) return niveles.oro;
    return niveles.platino;
}

function actualizarNivel() {
    const nivelAnterior = nivelActual;
    nivelActual = getNivelUsuario(puntosUsuario);

    if (nivelAnterior && nivelAnterior.nombre !== nivelActual.nombre) {
        mostrarNotificacion(`Subiste a nivel ${nivelActual.nombre}. +${nivelActual.descuentoExtra}% extra`, "gift", "🏆 ¡Felicidades!");
    }
}

function agregarPuntosPorCompra(monto) {
    const puntosGanados = Math.floor(monto / PUNTOS_POR_GASTO);
    if (puntosGanados <= 0) return;

    puntosUsuario += puntosGanados;
    historialPuntos.unshift({
        id: Date.now(),
        tipo: "ganado",
        cantidad: puntosGanados,
        motivo: `Compra de $${Math.round(monto).toLocaleString()}`,
        fecha: new Date().toISOString()
    });

    guardarPuntos();
    actualizarNivel();
    notificarPuntosGanados(puntosGanados);
}

function canjearPuntos(opcionIndex) {
    const opcion = opcionesCanje[opcionIndex];
    if (!opcion) return false;

    if (puntosUsuario < opcion.puntos) {
        notificarError(`Necesitas ${opcion.puntos - puntosUsuario} puntos más`);
        return false;
    }

    puntosUsuario -= opcion.puntos;
    historialPuntos.unshift({
        id: Date.now(),
        tipo: "canjeado",
        cantidad: -opcion.puntos,
        motivo: `Canje por ${opcion.nombre}`,
        fecha: new Date().toISOString()
    });

    const descuentoDisponible = {
        valor: opcion.descuento,
        codigo: `PUNTOS${Date.now()}`,
        expira: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };

    localStorage.setItem(getDescuentoPuntosStorageKey(), JSON.stringify(descuentoDisponible));
    guardarPuntos();
    actualizarNivel();

    notificarExito(`Canje exitoso: ${opcion.nombre}`);
    actualizarPantallaPuntos();
    return true;
}

function aplicarDescuentoPuntos(subtotal) {
    const descuentoGuardado = localStorage.getItem(getDescuentoPuntosStorageKey());
    if (!descuentoGuardado) return 0;

    const descuento = JSON.parse(descuentoGuardado);
    if (descuento.expira < Date.now()) {
        localStorage.removeItem(getDescuentoPuntosStorageKey());
        return 0;
    }

    return Math.min(descuento.valor, subtotal);
}

function usarDescuentoPuntos() {
    localStorage.removeItem(getDescuentoPuntosStorageKey());
}

function calcularDescuentoNivel(subtotal) {
    const nivel = getNivelUsuario(puntosUsuario);
    return subtotal * (nivel.descuentoExtra / 100);
}

function mostrarPanelPuntos() {
    const nivel = getNivelUsuario(puntosUsuario);
    const nextLevel = puntosUsuario < 100
        ? niveles.plata
        : puntosUsuario < 500
            ? niveles.oro
            : puntosUsuario < 1000
                ? niveles.platino
                : null;

    const puntosParaSiguiente = nextLevel ? (nextLevel.min - puntosUsuario) : 0;
    const progreso = nextLevel ? Math.min(100, (puntosUsuario / nextLevel.min) * 100) : 100;

    let historialHtml = "";
    historialPuntos.slice(0, 10).forEach(item => {
        historialHtml += `
            <div class="points-item">
                <div class="points-item-info">
                    <div class="points-item-title">${item.motivo}</div>
                    <div class="points-item-date">${new Date(item.fecha).toLocaleDateString()}</div>
                </div>
                <div class="points-item-amount ${item.tipo === "ganado" ? "positive" : "negative"}">
                    ${item.tipo === "ganado" ? "+" : "-"} ${Math.abs(item.cantidad)} pts
                </div>
            </div>
        `;
    });

    if (historialHtml === "") {
        historialHtml = '<div style="text-align: center; padding: 20px; color: #94A3B8;">Realiza tu primera compra para ganar puntos ✨</div>';
    }

    const puedeDeshacerReinicio = backupReinicioPuntos && Date.now() < backupReinicioExpiraEn;

    return `
        <div class="points-card">
            <div class="points-header">
                <div>
                    <div class="points-label">Mis puntos</div>
                    <div class="points-total">${puntosUsuario}</div>
                </div>
                <div>
                    <span class="points-level level-${nivel.nombre.toLowerCase()}">
                        ${nivel.icono} ${nivel.nombre}
                    </span>
                    <div class="points-label" style="margin-top: 5px;">+${nivel.descuentoExtra}% extra</div>
                </div>
            </div>

            <div class="points-progress">
                <div class="points-progress-bar" style="width: ${progreso}%;"></div>
            </div>

            ${nextLevel ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94A3B8;">
                    <span>${nivel.nombre}</span>
                    <span>${puntosUsuario} pts</span>
                    <span>${nextLevel.nombre}</span>
                </div>
                <div style="font-size: 12px; color: #FFD700; margin-top: 5px;">
                    ✨ Faltan ${puntosParaSiguiente} puntos para llegar a ${nextLevel.nombre}
                </div>
            ` : `
                <div style="font-size: 12px; color: #FFD700; margin-top: 5px;">
                    🏆 Alcanzaste el nivel máximo
                </div>
            `}

            <button class="points-redeem" onclick="abrirModalCanje()">🎁 Canjear puntos por descuentos</button>
            <button class="btn-outline" onclick="resetearPuntosCuentaActual()" style="width: 100%; margin-top: 10px; border-color: #f87171; color: #fecaca;">🗑️ Reiniciar puntos de esta cuenta</button>
            ${puedeDeshacerReinicio ? `<button class="btn-outline" onclick="deshacerReinicioPuntos()" style="width: 100%; margin-top: 10px; border-color: #34d399; color: #86efac;">↩️ Deshacer reinicio (5s)</button>` : ""}
        </div>

        <h3 style="color: white; margin: 20px 0 15px;">📜 Historial de puntos</h3>
        <div class="points-history">${historialHtml}</div>
    `;
}

function abrirModalCanje() {
    const nivel = getNivelUsuario(puntosUsuario);

    let opcionesHtml = "";
    opcionesCanje.forEach((opcion, index) => {
        const disponible = puntosUsuario >= opcion.puntos;
        opcionesHtml += `
            <div class="redeem-option ${disponible ? "" : "disabled"}"
                 onclick="${disponible ? `seleccionarCanje(${index})` : ""}"
                 style="${!disponible ? "opacity: 0.5; cursor: not-allowed;" : ""}">
                <div>
                    <strong>${opcion.nombre}</strong>
                    <div style="font-size: 12px; color: #94A3B8;">${opcion.puntos} puntos</div>
                </div>
                <div class="redeem-value">${opcion.descuento.toLocaleString()}</div>
            </div>
        `;
    });

    const modalHtml = `
        <div id="redeemModal" class="redeem-modal">
            <div class="redeem-card">
                <h3 style="color: white; margin-bottom: 10px;">🎁 Canjear puntos</h3>
                <p style="color: #94A3B8; margin-bottom: 20px;">
                    Tienes <strong style="color: #FFD700;">${puntosUsuario}</strong> puntos
                    ${nivel.descuentoExtra > 0 ? `<br>✨ Tu nivel ${nivel.nombre} te da +${nivel.descuentoExtra}% extra` : ""}
                </p>
                <div class="redeem-options">${opcionesHtml}</div>
                <button class="btn-outline" onclick="cerrarModalCanje()" style="width: 100%; margin-top: 15px;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function seleccionarCanje(index) {
    canjeSeleccionado = index;

    document.querySelectorAll(".redeem-option").forEach((opt, i) => {
        if (i === index) opt.classList.add("selected");
        else opt.classList.remove("selected");
    });

    setTimeout(() => {
        if (canjeSeleccionado === index) {
            if (canjearPuntos(index)) {
                cerrarModalCanje();
                actualizarPantallaPuntos();
            }
        }
    }, 500);
}

function cerrarModalCanje() {
    const modal = document.getElementById("redeemModal");
    if (modal) modal.remove();
    canjeSeleccionado = null;
}

function actualizarPantallaPuntos() {
    const puntosContainer = document.getElementById("puntos-container");
    if (puntosContainer) {
        puntosContainer.innerHTML = mostrarPanelPuntos();
    }
}

function resetearPuntosCuentaActual() {
    if (!usuarioActual) {
        notificarError("Debes iniciar sesión para reiniciar tus puntos");
        return;
    }

    const confirmar = window.confirm("¿Seguro que deseas reiniciar tus puntos e historial de esta cuenta?");
    if (!confirmar) return;

    backupReinicioPuntos = {
        usuarioId: getUsuarioPuntosId(),
        puntos: localStorage.getItem(getPuntosStorageKey()),
        historial: localStorage.getItem(getHistorialStorageKey()),
        descuento: localStorage.getItem(getDescuentoPuntosStorageKey())
    };
    backupReinicioExpiraEn = Date.now() + 5000;

    localStorage.removeItem(getPuntosStorageKey());
    localStorage.removeItem(getHistorialStorageKey());
    localStorage.removeItem(getDescuentoPuntosStorageKey());

    puntosUsuario = 0;
    historialPuntos = [];
    actualizarNivel();
    actualizarPantallaPuntos();
    notificarExito("Tus puntos de esta cuenta fueron reiniciados. Puedes deshacer por 5 segundos.");

    if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion(
            `Se reiniciaron tus puntos. <button onclick="deshacerReinicioPuntos()" style="margin-left:8px; padding:4px 10px; border-radius:12px; border:1px solid #34d399; background:#052e16; color:#86efac; cursor:pointer;">Deshacer</button>`,
            "warning",
            "↩️ Deshacer disponible"
        );
    }

    setTimeout(() => {
        if (backupReinicioPuntos && Date.now() >= backupReinicioExpiraEn) {
            backupReinicioPuntos = null;
            backupReinicioExpiraEn = 0;
            actualizarPantallaPuntos();
        }
    }, 5100);
}

function deshacerReinicioPuntos() {
    if (!backupReinicioPuntos || Date.now() > backupReinicioExpiraEn) {
        notificarError("El tiempo para deshacer ya expiró");
        backupReinicioPuntos = null;
        backupReinicioExpiraEn = 0;
        actualizarPantallaPuntos();
        return;
    }

    const usuarioIdActual = getUsuarioPuntosId();
    if (backupReinicioPuntos.usuarioId !== usuarioIdActual) {
        notificarError("Solo puedes deshacer en la misma cuenta");
        return;
    }

    if (backupReinicioPuntos.puntos !== null) {
        localStorage.setItem(getPuntosStorageKey(), backupReinicioPuntos.puntos);
    } else {
        localStorage.removeItem(getPuntosStorageKey());
    }

    if (backupReinicioPuntos.historial !== null) {
        localStorage.setItem(getHistorialStorageKey(), backupReinicioPuntos.historial);
    } else {
        localStorage.removeItem(getHistorialStorageKey());
    }

    if (backupReinicioPuntos.descuento !== null) {
        localStorage.setItem(getDescuentoPuntosStorageKey(), backupReinicioPuntos.descuento);
    } else {
        localStorage.removeItem(getDescuentoPuntosStorageKey());
    }

    backupReinicioPuntos = null;
    backupReinicioExpiraEn = 0;
    cargarPuntosUsuario();
    notificarExito("Reinicio deshecho correctamente");
}
