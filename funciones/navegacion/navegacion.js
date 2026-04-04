function showScreen(screenId) {
    const requiereSesion = ["cart", "profile", "empresa"].includes(screenId);
    if (requiereSesion && !usuarioActual) {
        notificarError("Inicia sesión para acceder a esta sección");
        screenId = "auth";
    }

    if (usuarioActual && typeof sincronizarUsuarioDataActual === "function") {
        sincronizarUsuarioDataActual();
    }

    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));

    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add("active");

    const index = { auth: 0, products: 1, cart: 2, empresa: 3, profile: 4 };
    const navItems = document.querySelectorAll(".nav-item");
    if (navItems[index[screenId]]) navItems[index[screenId]].classList.add("active");

    if (screenId === "products") mostrarProductos();
    if (screenId === "cart") mostrarCarrito();
    if (screenId === "profile") actualizarPerfil();
    if (screenId === "empresa") mostrarZonaEmpresarial();
}
