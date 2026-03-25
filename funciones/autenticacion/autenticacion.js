async function login() {
    const email = (document.getElementById("loginEmail")?.value || "").trim();
    const password = (document.getElementById("loginPassword")?.value || "").trim();

    if (!email || !password) {
        notificarError("Completa todos los campos");
        return;
    }

    const loginLocal = () => {
        const usuario = usuariosRegistrados.find(u => u.email === email && u.password === password);
        if (!usuario) return false;

        usuarioActual = { nombre: usuario.nombre, email: usuario.email, esAdmin: Boolean(usuario.esAdmin) };
        localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));

        sincronizarUsuarioDataActual();
        usuarioData.nombre = usuario.nombre;
        usuarioData.email = usuario.email;
        usuarioData.fechaRegistro = (usuario.fechaRegistro || new Date().toISOString()).split("T")[0];
        guardarDatosUsuario(usuario.email, usuarioData);

        if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
        if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();

        notificarBienvenida(usuario.nombre);
        actualizarPerfil();
        showScreen("products");
        return true;
    };

    // Prioriza Supabase Auth cuando está disponible.
    if (window.supabaseClient) {
        try {
            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                const errMsg = String(error.message || "").toLowerCase();
                if (loginLocal()) {
                    notificarExito("Ingresaste con datos locales");
                    return;
                }

                if (errMsg.includes("email not confirmed") || errMsg.includes("confirm")) {
                    notificarError("Debes confirmar tu correo para iniciar sesión en Supabase");
                    return;
                }

                notificarError(error.message || "No se pudo iniciar sesión");
                return;
            }

            const authUser = data?.user;
            if (!authUser) {
                if (loginLocal()) {
                    notificarExito("Ingresaste con datos locales");
                    return;
                }
                notificarError("No se recibió usuario de Supabase");
                return;
            }

            let perfil = null;
            try {
                const { data: perfilData, error: perfilError } = await window.supabaseClient
                    .from("usuarios")
                    .select("*")
                    .eq("uid", authUser.id)
                    .maybeSingle();

                if (!perfilError) perfil = perfilData;
            } catch (_) {
                // Si la tabla usuarios aún no existe, usamos datos del auth user.
            }

            const nombrePerfil = perfil?.nombre || authUser.user_metadata?.nombre || String(email).split("@")[0] || "Usuario";
            const adminEmail = typeof ADMIN_EMAIL !== "undefined" ? ADMIN_EMAIL : "admin@technexus.com";
            const esAdminPerfil = Boolean(perfil?.es_admin || perfil?.esAdmin || email === adminEmail);

            usuarioActual = {
                id: authUser.id,
                uid: authUser.id,
                nombre: nombrePerfil,
                email: perfil?.email || email,
                esAdmin: esAdminPerfil,
                es_admin: esAdminPerfil
            };

            localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
            localStorage.setItem("usuario", JSON.stringify(usuarioActual));

            sincronizarUsuarioDataActual();
            usuarioData.nombre = usuarioActual.nombre;
            usuarioData.email = usuarioActual.email;
            usuarioData.fechaRegistro = (perfil?.fecha_creacion || perfil?.fechaRegistro || new Date().toISOString()).split("T")[0];
            guardarDatosUsuario(usuarioActual.email, usuarioData);

            if (typeof cargarCarritoNube === "function") await cargarCarritoNube();
            if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
            if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();

            notificarBienvenida(usuarioActual.nombre);
            actualizarPerfil();
            showScreen("products");
            return;
        } catch (e) {
            if (loginLocal()) {
                notificarExito("Ingresaste con datos locales");
                return;
            }
            notificarError("No se pudo conectar con el servidor de autenticación");
            return;
        }
    }

    if (!loginLocal()) {
        notificarError("Correo o contraseña incorrectos");
    }
}

async function register() {
    const nombre = (document.getElementById("regName")?.value || "").trim();
    const email = (document.getElementById("regEmail")?.value || "").trim();
    const password = (document.getElementById("regPassword")?.value || "").trim();
    const terms = !!document.getElementById("terms")?.checked;

    if (!nombre || !email || !password || !terms) {
        notificarError("Completa todo y acepta términos");
        return;
    }

    if (window.supabaseClient) {
        try {
            const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nombre }
                }
            });

            if (authError) {
                notificarError(authError.message || "No se pudo crear la cuenta");
                return;
            }

            const uid = authData?.user?.id;
            if (uid) {
                await window.supabaseClient.from("usuarios").upsert({
                    uid,
                    nombre,
                    email,
                    es_admin: false
                });
            }

            if (!usuariosRegistrados.some(u => u.email === email)) {
                usuariosRegistrados.push({ nombre, email, password, esAdmin: false, fechaRegistro: new Date().toISOString() });
                localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
            }

            // Reutiliza flujo de login para poblar sesión y carrito nube.
            const loginEmail = document.getElementById("loginEmail");
            const loginPassword = document.getElementById("loginPassword");
            if (loginEmail) loginEmail.value = email;
            if (loginPassword) loginPassword.value = password;

            if (!uid) {
                notificarExito("Cuenta creada. Revisa tu correo para confirmar e iniciar sesión.");
                return;
            }

            await login();
            return;
        } catch (_) {
            // Si Supabase no responde, continuar con registro local.
        }
    }

    if (usuariosRegistrados.some(u => u.email === email)) {
        notificarError("Este correo ya está registrado");
        return;
    }

    const nuevo = { nombre, email, password, esAdmin: false, fechaRegistro: new Date().toISOString() };
    usuariosRegistrados.push(nuevo);
    localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));

    usuarioActual = { nombre, email, esAdmin: false };
    localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));

    usuarioData = crearEstructuraUsuarioBase(email, nombre);
    usuarioData.fechaRegistro = new Date().toISOString().split("T")[0];
    guardarDatosUsuario(email, usuarioData);

    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();

    notificarBienvenida(nombre);
    notificarExito("Cuenta creada exitosamente");
    actualizarPerfil();
    showScreen("products");
}

function socialLogin(provider) {
    const email = `${String(provider).toLowerCase()}@user.com`;
    const nombre = `Usuario ${provider}`;

    if (!usuariosRegistrados.some(u => u.email === email)) {
        usuariosRegistrados.push({ nombre, email, password: "social-login", esAdmin: false, fechaRegistro: new Date().toISOString() });
        localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    }

    usuarioActual = { nombre, email, esAdmin: false };
    localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));

    sincronizarUsuarioDataActual();
    usuarioData.nombre = nombre;
    usuarioData.email = email;
    if (!usuarioData.fechaRegistro) usuarioData.fechaRegistro = new Date().toISOString().split("T")[0];
    guardarDatosUsuario(email, usuarioData);

    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();

    notificarBienvenida(nombre);
    actualizarPerfil();
    showScreen("products");
}

function mostrarRecuperarPassword() {
    const modalHtml = `
        <div id="modalRecuperar" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: #1E293B; border-radius: 24px; padding: 30px; max-width: 400px; width: 90%; border: 1px solid #2563EB;">
                <h3 style="color: white; margin-bottom: 20px;">Recuperar contraseña</h3>
                <p style="color: #94A3B8; margin-bottom: 20px;">Ingresa tu correo y te ayudaremos a recuperar acceso</p>

                <div class="form-group">
                    <label style="color: white;">Correo electrónico</label>
                    <input type="email" id="emailRecuperar" placeholder="tu@email.com" style="width: 100%; padding: 12px; background: #0F172A; border: 1px solid #2563EB; border-radius: 12px; color: white;">
                </div>

                <button class="btn-primary" onclick="enviarRecuperacion()" style="margin-top: 10px;">Enviar enlace</button>
                <button class="btn-outline" onclick="cerrarModalRecuperar()" style="width: 100%; margin-top: 10px;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function cerrarModalRecuperar() {
    const modal = document.getElementById("modalRecuperar");
    if (modal) modal.remove();
}

function enviarRecuperacion() {
    const email = (document.getElementById("emailRecuperar")?.value || "").trim();
    if (!email) {
        notificarError("Ingresa tu correo electrónico");
        return;
    }

    const usuario = usuariosRegistrados.find(u => u.email === email);
    if (usuario) {
        const nuevaPass = Math.random().toString(36).slice(-8);
        usuario.password = nuevaPass;
        localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));

        const loginEmail = document.getElementById("loginEmail");
        const loginPassword = document.getElementById("loginPassword");
        if (loginEmail) loginEmail.value = email;
        if (loginPassword) loginPassword.value = nuevaPass;

        notificarExito(`Contraseña temporal: ${nuevaPass}`);
    } else {
        mostrarNotificacion("Si el correo está registrado, recibirás instrucciones", "info", "Recuperación");
    }

    cerrarModalRecuperar();
}
