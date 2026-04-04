async function login() {
    const email = (document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
    const password = (document.getElementById("loginPassword")?.value || "").trim();
    const emailValido = email.includes("@") && email.includes(".") && !email.startsWith("@") && !email.endsWith(".");

    if (!email || !password) {
        notificarError("Completa todos los campos");
        return;
    }

    if (!emailValido) {
        notificarError("Correo inválido. Usa formato tipo usuario@gmail.com");
        return;
    }

    const loginLocal = () => {
        const usuario = usuariosRegistrados.find(u => String(u.email || "").trim().toLowerCase() === email && String(u.password || "") === password);
        if (!usuario) return false;

        usuarioActual = { nombre: usuario.nombre, email: usuario.email, esAdmin: Boolean(usuario.esAdmin) };
        localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));

        sincronizarUsuarioDataActual();
        usuarioData.nombre = usuario.nombre;
        usuarioData.email = usuario.email;
        usuarioData.fechaRegistro = (usuario.fechaRegistro || new Date().toISOString()).split("T")[0];
        guardarDatosUsuario(usuario.email, usuarioData);

        if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
        if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
        if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
        if (typeof limpiarCamposAuth === "function") limpiarCamposAuth();

        notificarBienvenida(usuario.nombre);
        actualizarPerfil();
        showScreen("products");
        return true;
    };

    const usuarioLocalPorEmail = usuariosRegistrados.find(
        u => String(u.email || "").trim().toLowerCase() === email
    );

    // Si el correo existe localmente, no consultamos Supabase para evitar 400 innecesarios.
    if (usuarioLocalPorEmail) {
        if (loginLocal()) {
            notificarExito("Ingresaste correctamente");
            return;
        }

        notificarError("Contraseña incorrecta para esta cuenta");
        return;
    }

    // Primero intenta login local para evitar 400 innecesarios en cuentas creadas localmente.
    if (loginLocal()) {
        notificarExito("Ingresaste correctamente");
        return;
    }

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

                if (errMsg.includes("too many") || errMsg.includes("rate limit") || errMsg.includes("429")) {
                    notificarError("Demasiados intentos. Espera unos segundos e inténtalo de nuevo");
                    return;
                }

                if (errMsg.includes("email not confirmed") || errMsg.includes("confirm")) {
                    notificarError("Debes confirmar tu correo para iniciar sesión en Supabase");
                    return;
                }

                if (errMsg.includes("invalid login credentials")) {
                    notificarError("Credenciales inválidas. Si no tienes cuenta, pulsa Crear cuenta primero");
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
            if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
            if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
            if (typeof limpiarCamposAuth === "function") limpiarCamposAuth();

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
    const nombreInput = (document.getElementById("regName")?.value || "").trim();
    const emailInput = (document.getElementById("regEmail")?.value || document.getElementById("loginEmail")?.value || "").trim().toLowerCase();
    const passwordInput = (document.getElementById("regPassword")?.value || document.getElementById("loginPassword")?.value || "").trim();
    const nombre = nombreInput || String(emailInput).split("@")[0] || "Usuario";
    const email = emailInput;
    const password = passwordInput;
    const terms = !!document.getElementById("terms")?.checked;
    const emailValido = email.includes("@") && email.includes(".") && !email.startsWith("@") && !email.endsWith(".");

    if (!nombre || !email || !password || !terms) {
        notificarError("Ingresa Gmail y contraseña, y acepta términos para crear la cuenta");
        return;
    }

    if (!emailValido) {
        notificarError("El correo electrónico no es válido");
        return;
    }

    if (password.length < 6) {
        notificarError("La contraseña debe tener al menos 6 caracteres");
        return;
    }

    if (usuariosRegistrados.some(u => String(u.email || "").trim().toLowerCase() === email)) {
        notificarError("Este correo ya está registrado");
        return;
    }

    // PASO 1: Siempre guardar localmente PRIMERO
    const nuevoUsuario = { nombre, email, password, esAdmin: false, fechaRegistro: new Date().toISOString() };
    usuariosRegistrados.push(nuevoUsuario);
    localStorage.setItem("usuariosRegistrados", JSON.stringify(usuariosRegistrados));
    console.log("✅ Cuenta guardada localmente:", email, usuariosRegistrados);

    // PASO 2: Intentar Supabase (pero sin bloquear si falla)
    let supabaseUid = null;
    let sesionSupabaseActiva = false;

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
                const errMsg = String(authError.message || "").toLowerCase();
                if (errMsg.includes("too many") || errMsg.includes("rate limit") || errMsg.includes("429")) {
                    notificarError("Demasiados intentos de registro. Espera unos segundos");
                    return;
                }
                console.warn("⚠️ Supabase signUp falló (continuamos local):", authError.message);
            } else {
                supabaseUid = authData?.user?.id;
                sesionSupabaseActiva = Boolean(authData?.session?.access_token);
                console.log("✅ Supabase signUp exitoso. UID:", supabaseUid, "Sesión activa:", sesionSupabaseActiva);

                if (supabaseUid) {
                    await window.supabaseClient.from("usuarios").upsert({
                        uid: supabaseUid,
                        nombre,
                        email,
                        es_admin: false
                    });
                }
            }
        } catch (e) {
            console.error("❌ Error conectando con Supabase:", e.message);
        }
    }

    // PASO 3: Iniciar sesión local
    usuarioActual = {
        id: supabaseUid || email,
        uid: supabaseUid || "",
        nombre,
        email,
        esAdmin: false,
        es_admin: false
    };
    localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
    localStorage.setItem("usuario", JSON.stringify(usuarioActual));

    sincronizarUsuarioDataActual();
    usuarioData.nombre = nombre;
    usuarioData.email = email;
    if (!usuarioData.fechaRegistro) usuarioData.fechaRegistro = new Date().toISOString().split("T")[0];
    guardarDatosUsuario(email, usuarioData);

    if (typeof cargarPuntosUsuario === "function") cargarPuntosUsuario();
    if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
    if (typeof limpiarCamposAuth === "function") limpiarCamposAuth();

    notificarBienvenida(nombre);
    notificarExito("✅ Cuenta creada exitosamente. Ya puedes usar la app.");
    actualizarPerfil();
    showScreen("products");
}

function socialLogin(provider) {
    const email = `${String(provider).toLowerCase()}@gmail.com`;
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
    if (typeof actualizarContadorCarrito === "function") actualizarContadorCarrito();
    if (typeof inicializarFuncionalidadesAvanzadas === "function") inicializarFuncionalidadesAvanzadas();
    if (typeof limpiarCamposAuth === "function") limpiarCamposAuth();

    notificarBienvenida(nombre);
    actualizarPerfil();
    showScreen("products");
}

function limpiarCamposAuth() {
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const regName = document.getElementById("regName");
    const regEmail = document.getElementById("regEmail");
    const regPassword = document.getElementById("regPassword");
    const terms = document.getElementById("terms");

    if (loginEmail) loginEmail.value = "";
    if (loginPassword) loginPassword.value = "";
    if (regName) regName.value = "";
    if (regEmail) regEmail.value = "";
    if (regPassword) regPassword.value = "";
    if (terms) terms.checked = false;
}

window.limpiarCamposAuth = limpiarCamposAuth;

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
    const email = (document.getElementById("emailRecuperar")?.value || "").trim().toLowerCase();
    if (!email) {
        notificarError("Ingresa tu correo electrónico");
        return;
    }

    const usuario = usuariosRegistrados.find(u => String(u.email || "").trim().toLowerCase() === email);
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

if (!window.__authClickGuardInstalled) {
    const loginOriginal = login;
    const registerOriginal = register;

    window.login = async function loginConProteccion() {
        const ahora = Date.now();
        const ultimoIntento = window.__ultimoIntentoLogin || 0;
        if ((ahora - ultimoIntento) < 2500) {
            notificarError("Espera un momento antes de intentar iniciar sesión otra vez");
            return;
        }
        window.__ultimoIntentoLogin = ahora;
        return await loginOriginal();
    };

    window.register = async function registerConProteccion() {
        const ahora = Date.now();
        const ultimoIntento = window.__ultimoIntentoRegistro || 0;
        if ((ahora - ultimoIntento) < 4000) {
            if (window.usuarioActual?.email) {
                mostrarNotificacion("Ya tienes sesión iniciada", "info", "Sesión");
                return;
            }
            mostrarNotificacion("Espera unos segundos antes de volver a registrar", "info", "Registro");
            return;
        }
        window.__ultimoIntentoRegistro = ahora;
        return await registerOriginal();
    };

    window.__authClickGuardInstalled = true;
}
