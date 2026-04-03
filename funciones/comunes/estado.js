const productos = [
    { id: 1, nombre: "Laptop Gamer Nitro X", precio: 5200000, imagen: "https://althiqa.com/wp-content/uploads/2022/06/01-16-1024x780.jpg", specs: "Intel i7 • RTX 3050 • 16GB RAM", categoria: "laptops", stock: 10 },
    { id: 2, nombre: "Desktop Pro Gamer", precio: 8900000, imagen: "https://tse2.mm.bing.net/th/id/OIP.0xuT25C7aWMIAGyCkZ1rHAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", specs: "Ryzen 9 • RTX 4080 • 32GB RAM", categoria: "desktops", stock: 3 },
    { id: 3, nombre: "Monitor Curvo 27\"", precio: 1200000, imagen: "https://m.media-amazon.com/images/I/71Fb6HV0QbL._AC_SL1500_.jpg", specs: "240Hz • 1ms • QHD", categoria: "monitores", stock: 8 },
    { id: 4, nombre: "Teclado Mecánico RGB", precio: 350000, imagen: "https://tse4.mm.bing.net/th/id/OIP.bPl3R1qP-Agt5mcttILp1QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3", specs: "Switches Red • RGB", categoria: "accesorios", stock: 4 },
    { id: 5, nombre: "Mouse Gamer Pro", precio: 280000, imagen: "https://i5.walmartimages.com/asr/a6aa8e6d-4658-4523-8ae3-e093c32793c1_1.04c4c6c67a78ad775bff22ee92514a7b.jpeg", specs: "26000 DPI • Inalámbrico", categoria: "accesorios", stock: 12 },
    { id: 6, nombre: "Auriculares 7.1", precio: 450000, imagen: "https://tse3.mm.bing.net/th/id/OIP.X3iSlj7EWVPZC61zeH4C_QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3", specs: "Sonido envolvente • RGB", categoria: "accesorios", stock: 5 },
    { id: 101, nombre: "Workstation Empresarial Z9", precio: 12900000, imagen: "assets/images/products/producto-generico.svg", specs: "Intel Xeon • 64GB RAM • SSD 2TB", categoria: "empresa", stock: 8 },
    { id: 102, nombre: "Servidor Rack Mini 8 Bahías", precio: 15900000, imagen: "assets/images/products/producto-generico.svg", specs: "32 Cores • ECC 128GB • RAID", categoria: "empresa", stock: 5 },
    { id: 103, nombre: "Laptop Ejecutiva Carbon Pro 14", precio: 7400000, imagen: "assets/images/products/producto-generico.svg", specs: "Intel Ultra 7 • 32GB RAM • 1TB SSD", categoria: "empresa", stock: 14 },
    { id: 104, nombre: "Kit Videoconferencia 4K Team", precio: 3100000, imagen: "assets/images/products/producto-generico.svg", specs: "Cámara 4K • Micrófono 360° • AI Noise Cancel", categoria: "empresa", stock: 20 },
    { id: 105, nombre: "Firewall Corporativo SecureGate X", precio: 5600000, imagen: "assets/images/products/producto-generico.svg", specs: "VPN • IDS/IPS • Gestión centralizada", categoria: "empresa", stock: 10 }
];

const productosCorporativosBase = [
    { id: 101, nombre: "Workstation Empresarial Z9", precio: 12900000, imagen: "assets/images/products/producto-generico.svg", specs: "Intel Xeon • 64GB RAM • SSD 2TB", categoria: "empresa", stock: 8 },
    { id: 102, nombre: "Servidor Rack Mini 8 Bahías", precio: 15900000, imagen: "assets/images/products/producto-generico.svg", specs: "32 Cores • ECC 128GB • RAID", categoria: "empresa", stock: 5 },
    { id: 103, nombre: "Laptop Ejecutiva Carbon Pro 14", precio: 7400000, imagen: "assets/images/products/producto-generico.svg", specs: "Intel Ultra 7 • 32GB RAM • 1TB SSD", categoria: "empresa", stock: 14 },
    { id: 104, nombre: "Kit Videoconferencia 4K Team", precio: 3100000, imagen: "assets/images/products/producto-generico.svg", specs: "Cámara 4K • Micrófono 360° • AI Noise Cancel", categoria: "empresa", stock: 20 },
    { id: 105, nombre: "Firewall Corporativo SecureGate X", precio: 5600000, imagen: "assets/images/products/producto-generico.svg", specs: "VPN • IDS/IPS • Gestión centralizada", categoria: "empresa", stock: 10 }
];

let carrito = [];
let usuarioActual = null;
let cuponActivo = null;
let cuponesDisponibles = [
    { codigo: "BIENVENIDA", descuento: 10, tipo: "porcentaje", usado: false },
    { codigo: "TECNEXUS20", descuento: 20, tipo: "porcentaje", usado: false },
    { codigo: "ENVIOGRATIS", descuento: 10000, tipo: "fijo", usado: false },
    { codigo: "OFERTA30", descuento: 30, tipo: "porcentaje", usado: false }
];
let usuariosRegistrados = JSON.parse(localStorage.getItem("usuariosRegistrados") || "[]");

const imagenesProductosPorDefecto = {
    1: "https://althiqa.com/wp-content/uploads/2022/06/01-16-1024x780.jpg",
    2: "https://tse2.mm.bing.net/th/id/OIP.0xuT25C7aWMIAGyCkZ1rHAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
    3: "https://m.media-amazon.com/images/I/71Fb6HV0QbL._AC_SL1500_.jpg",
    4: "https://tse4.mm.bing.net/th/id/OIP.bPl3R1qP-Agt5mcttILp1QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3",
    5: "https://i5.walmartimages.com/asr/a6aa8e6d-4658-4523-8ae3-e093c32793c1_1.04c4c6c67a78ad775bff22ee92514a7b.jpeg",
    6: "https://tse3.mm.bing.net/th/id/OIP.X3iSlj7EWVPZC61zeH4C_QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3"
};

function normalizarImagenProducto(producto) {
    const raw = String(producto?.imagen || "").trim();
    if (raw && !/^[💻🖥️⌨️🖱️🎧🆕📦]$/.test(raw)) return raw;

    const id = Number(producto?.id || 0);
    const nombre = String(producto?.nombre || "").toLowerCase();

    if (imagenesProductosPorDefecto[id]) return imagenesProductosPorDefecto[id];
    if (nombre.includes("laptop")) return "https://althiqa.com/wp-content/uploads/2022/06/01-16-1024x780.jpg";
    if (nombre.includes("desktop")) return "https://tse2.mm.bing.net/th/id/OIP.0xuT25C7aWMIAGyCkZ1rHAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";
    if (nombre.includes("monitor")) return "https://m.media-amazon.com/images/I/71Fb6HV0QbL._AC_SL1500_.jpg";
    if (nombre.includes("teclado")) return "https://tse4.mm.bing.net/th/id/OIP.bPl3R1qP-Agt5mcttILp1QHaEK?rs=1&pid=ImgDetMain&o=7&rm=3";
    if (nombre.includes("mouse")) return "https://i5.walmartimages.com/asr/a6aa8e6d-4658-4523-8ae3-e093c32793c1_1.04c4c6c67a78ad775bff22ee92514a7b.jpeg";
    if (nombre.includes("auricular")) return "https://tse3.mm.bing.net/th/id/OIP.X3iSlj7EWVPZC61zeH4C_QHaHa?rs=1&pid=ImgDetMain&o=7&rm=3";

    return "assets/images/products/producto-generico.svg";
}

if (!window.__usuarioActualBridge) {
    Object.defineProperty(window, "usuarioActual", {
        configurable: true,
        get() {
            return usuarioActual;
        },
        set(value) {
            usuarioActual = value || null;

            if (usuarioActual) {
                localStorage.setItem("usuarioActual", JSON.stringify(usuarioActual));
                localStorage.setItem("usuario", JSON.stringify(usuarioActual));
            } else {
                localStorage.removeItem("usuarioActual");
                localStorage.removeItem("usuario");
            }
        }
    });

    window.__usuarioActualBridge = true;
}

const perfilStorageKey = "usuarioDataTechNexus";
const usuariosDataKey = "usuariosData";
const historialGlobalKey = "historialGlobal";
let usuarioData = {
    nombre: "Alex Tech",
    email: "alex@tech.com",
    fechaRegistro: "2024-01-15",
    historial: [
        { id: 1, fecha: "2024-03-10", productos: ["Laptop Gamer Nitro X"], total: 5200000, estado: "entregado" },
        { id: 2, fecha: "2024-02-20", productos: ["Teclado Mecánico RGB", "Mouse Gamer Pro"], total: 630000, estado: "entregado" },
        { id: 3, fecha: "2024-01-05", productos: ["Auriculares 7.1"], total: 450000, estado: "entregado" }
    ],
    direcciones: [
        { id: 1, nombre: "Casa", direccion: "Calle 123 #45-67", ciudad: "Bogotá", telefono: "3001234567", principal: true },
        { id: 2, nombre: "Oficina", direccion: "Cra 50 #20-30", ciudad: "Bogotá", telefono: "3017654321", principal: false }
    ],
    tarjetas: [
        { id: 1, tipo: "Visa", numero: "**** **** **** 1234", nombre: "Alex Tech", expiracion: "12/25", principal: true },
        { id: 2, tipo: "Mastercard", numero: "**** **** **** 5678", nombre: "Alex Tech", expiracion: "08/26", principal: false }
    ],
    favoritos: [1, 4, 5]
};

function crearEstructuraUsuarioBase(email, nombre = "Usuario") {
    const alias = String(email || "usuario").split("@")[0] || "usuario";
    return {
        email,
        nombre: nombre || alias,
        fechaRegistro: new Date().toISOString().split("T")[0],
        carrito: [],
        historial: [],
        direcciones: [],
        tarjetas: [],
        favoritos: [],
        puntos: 0,
        historialPuntos: []
    };
}

function getDatosUsuario(email) {
    if (!email) return crearEstructuraUsuarioBase("invitado@local", "Invitado");

    const usuariosData = JSON.parse(localStorage.getItem(usuariosDataKey) || "{}");
    if (!usuariosData[email]) {
        usuariosData[email] = crearEstructuraUsuarioBase(email);
        localStorage.setItem(usuariosDataKey, JSON.stringify(usuariosData));
    }

    return usuariosData[email];
}

function guardarDatosUsuario(email, datos) {
    if (!email || !datos) return;
    const usuariosData = JSON.parse(localStorage.getItem(usuariosDataKey) || "{}");
    usuariosData[email] = datos;
    localStorage.setItem(usuariosDataKey, JSON.stringify(usuariosData));
}

function sincronizarUsuarioDataActual() {
    if (!usuarioActual || !usuarioActual.email) return;

    const datos = getDatosUsuario(usuarioActual.email);
    if (usuarioActual.nombre) datos.nombre = usuarioActual.nombre;
    if (!datos.fechaRegistro) datos.fechaRegistro = new Date().toISOString().split("T")[0];

    usuarioData = datos;
    guardarDatosUsuario(usuarioActual.email, usuarioData);
}

function getCarritoUsuario() {
    if (!usuarioActual || !usuarioActual.email) return [];
    const datos = getDatosUsuario(usuarioActual.email);
    return Array.isArray(datos.carrito) ? datos.carrito : [];
}

function guardarCarritoUsuario(carritoUsuario) {
    if (!usuarioActual || !usuarioActual.email) return;
    const datos = getDatosUsuario(usuarioActual.email);
    datos.carrito = Array.isArray(carritoUsuario) ? carritoUsuario : [];
    guardarDatosUsuario(usuarioActual.email, datos);
    usuarioData = datos;
}

function getHistorialUsuario() {
    if (!usuarioActual || !usuarioActual.email) return [];
    const datos = getDatosUsuario(usuarioActual.email);
    return Array.isArray(datos.historial) ? datos.historial : [];
}

function agregarAlHistorial(orden) {
    if (!usuarioActual || !usuarioActual.email || !orden) return;

    const datos = getDatosUsuario(usuarioActual.email);
    datos.historial = [orden, ...(Array.isArray(datos.historial) ? datos.historial : [])];
    guardarDatosUsuario(usuarioActual.email, datos);
    usuarioData = datos;

    const historialGlobal = JSON.parse(localStorage.getItem(historialGlobalKey) || "[]");
    historialGlobal.unshift({
        ...orden,
        usuarioEmail: usuarioActual.email,
        usuarioNombre: usuarioActual.nombre || datos.nombre || usuarioActual.email
    });
    localStorage.setItem(historialGlobalKey, JSON.stringify(historialGlobal));
}

function getAllPedidos() {
    const pedidos = JSON.parse(localStorage.getItem(historialGlobalKey) || "[]");
    return Array.isArray(pedidos) ? pedidos : [];
}

function guardarAllPedidos(pedidos) {
    localStorage.setItem(historialGlobalKey, JSON.stringify(Array.isArray(pedidos) ? pedidos : []));
}

function actualizarEstadoPedidoUsuario(usuarioEmail, ordenId, nuevoEstado) {
    if (!usuarioEmail) return;
    const datos = getDatosUsuario(usuarioEmail);
    if (!Array.isArray(datos.historial)) return;

    const orden = datos.historial.find(o => Number(o.id) === Number(ordenId));
    if (!orden) return;

    orden.estado = nuevoEstado;
    guardarDatosUsuario(usuarioEmail, datos);
    if (usuarioActual && usuarioActual.email === usuarioEmail) usuarioData = datos;
}

function migrarPerfilLegacyAUsuariosData() {
    const usuariosData = JSON.parse(localStorage.getItem(usuariosDataKey) || "{}");
    if (Object.keys(usuariosData).length > 0) return;

    const perfilLegacy = JSON.parse(localStorage.getItem(perfilStorageKey) || "null");
    if (!perfilLegacy || !perfilLegacy.email) return;

    const base = crearEstructuraUsuarioBase(perfilLegacy.email, perfilLegacy.nombre || "Usuario");
    const fusion = { ...base, ...perfilLegacy };
    usuariosData[perfilLegacy.email] = fusion;
    localStorage.setItem(usuariosDataKey, JSON.stringify(usuariosData));
}

migrarPerfilLegacyAUsuariosData();

const usuarioSesion = JSON.parse(localStorage.getItem("usuarioActual") || localStorage.getItem("usuario") || "null");
if (usuarioSesion && usuarioSesion.email) {
    usuarioActual = usuarioSesion;
    sincronizarUsuarioDataActual();
}

window.usuarioActual = usuarioActual;

function guardarUsuarioData() {
    if (usuarioActual && usuarioActual.email) {
        guardarDatosUsuario(usuarioActual.email, usuarioData);
    }
    localStorage.setItem(perfilStorageKey, JSON.stringify(usuarioData));
}

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

const productosGuardados = JSON.parse(localStorage.getItem("productos") || "null");
if (Array.isArray(productosGuardados) && productosGuardados.length) {
    productos.length = 0;
    productosGuardados.forEach(p => productos.push({ ...p, imagen: normalizarImagenProducto(p) }));
    localStorage.setItem("productos", JSON.stringify(productos));
}

function asegurarProductosCorporativos() {
    const idsActuales = new Set(productos.map(p => Number(p.id)));
    let huboCambios = false;

    productosCorporativosBase.forEach(producto => {
        if (idsActuales.has(Number(producto.id))) return;
        productos.push({ ...producto, imagen: normalizarImagenProducto(producto) });
        huboCambios = true;
    });

    if (huboCambios) {
        localStorage.setItem("productos", JSON.stringify(productos));
    }
}

asegurarProductosCorporativos();

const cuponesGuardados = JSON.parse(localStorage.getItem("cupones") || "null");
if (Array.isArray(cuponesGuardados) && cuponesGuardados.length) {
    cuponesDisponibles = cuponesGuardados;
}
