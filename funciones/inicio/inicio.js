document.addEventListener("DOMContentLoaded", async () => {
    if (window.supabaseClient?.auth) {
        try {
            const { data: sessionData } = await window.supabaseClient.auth.getSession();
            const session = sessionData?.session;

            if (session?.user) {
                let perfil = null;
                const { data: perfilData } = await window.supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("uid", session.user.id)
                    .maybeSingle();

                perfil = perfilData;

                usuarioActual = {
                    id: perfil?.id || session.user.id,
                    uid: session.user.id,
                    nombre: perfil?.nombre || session.user.user_metadata?.nombre || String(session.user.email || "usuario").split("@")[0],
                    email: perfil?.email || session.user.email,
                    esAdmin: Boolean(perfil?.es_admin || perfil?.esAdmin || session.user.email === ADMIN_EMAIL),
                    es_admin: Boolean(perfil?.es_admin || perfil?.esAdmin || session.user.email === ADMIN_EMAIL)
                };

                localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
                localStorage.setItem("usuario", JSON.stringify(usuarioActual));
            }
        } catch (err) {
            console.error("Error restaurando sesión Supabase:", err);
        }
    }

    if (usuarioActual && typeof sincronizarUsuarioDataActual === "function") {
        sincronizarUsuarioDataActual();
    }

    mostrarProductos();
    actualizarContadorCarrito();
    if (typeof cargarCarritoNube === "function") await cargarCarritoNube();
    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
    if (usuarioActual) actualizarPerfil();

    setTimeout(() => {
        mostrarNotificacion("Explora nuestros productos con descuentos exclusivos", "info", "🎯 Bienvenido");
    }, 1000);

    setTimeout(() => {
        mostrarOfertaAleatoria();
    }, 3000);
});
