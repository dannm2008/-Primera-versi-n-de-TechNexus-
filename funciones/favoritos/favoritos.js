// ========== FAVORITOS (COMPATIBILIDAD) ==========

function normalizarFavoritosIds(favoritos) {
    return Array.isArray(favoritos) ? favoritos.map(id => String(id)) : [];
}

async function cargarFavoritos() {
    if (!usuarioActual) return [];

    if (typeof window.cargarFavoritosSupabase === "function") {
        const favoritos = await window.cargarFavoritosSupabase();
        if (Array.isArray(favoritos)) {
            return normalizarFavoritosIds(favoritos);
        }
    }

    return normalizarFavoritosIds(usuarioData?.favoritos);
}

async function guardarFavoritos(favoritos) {
    if (!usuarioActual) return;

    const favoritosNormalizados = normalizarFavoritosIds(favoritos);

    if (usuarioData) {
        usuarioData.favoritos = favoritosNormalizados;
        if (typeof guardarUsuarioData === "function") guardarUsuarioData();
    }

    if (typeof window.guardarFavoritosSupabase === "function") {
        await window.guardarFavoritosSupabase(favoritosNormalizados);
    }
}

window.toggleFavorito = async function (productoId) {
    if (!usuarioActual) {
        alert("🔐 Inicia sesión para guardar favoritos");
        return;
    }

    const idTexto = String(productoId);
    let favoritos = await cargarFavoritos();
    const index = favoritos.findIndex(id => String(id) === idTexto);
    const esNuevo = index === -1;

    if (esNuevo) {
        favoritos.push(idTexto);
        alert("⭐ Agregado a favoritos");
    } else {
        favoritos.splice(index, 1);
        alert("💔 Eliminado de favoritos");
    }

    await guardarFavoritos(favoritos);

    if (Array.isArray(productos)) {
        wishlist = productos.filter(p => favoritos.includes(String(p.id)));
        if (typeof guardarWishlistUsuario === "function") guardarWishlistUsuario();
    }

    const btnById = document.getElementById(`fav-${productoId}`);
    if (btnById) {
        btnById.textContent = esNuevo ? "❤️" : "🤍";
    }

    if (typeof actualizarIconosFavoritosEnProductos === "function") {
        actualizarIconosFavoritosEnProductos();
    }
};

window.cargarFavoritos = cargarFavoritos;
window.guardarFavoritos = guardarFavoritos;
