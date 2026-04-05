let ultimaCargaProductos = Array.isArray(productos) && productos.length ? Date.now() : 0;
let cargaProductosEnCurso = null;
const CACHE_PRODUCTOS_MS = 30000;

const idsCanonicosPorNombre = {
    "laptop gamer nitro x": 1,
    "desktop pro gamer": 2,
    "monitor curvo 27\"": 3,
    "teclado mecánico rgb": 4,
    "teclado mecanico rgb": 4,
    "mouse gamer pro": 5,
    "auriculares 7.1": 6,
    "workstation empresarial z9": 101,
    "servidor rack mini 8 bahías": 102,
    "servidor rack mini 8 bahias": 102,
    "laptop ejecutiva carbon pro 14": 103,
    "kit videoconferencia 4k team": 104,
    "firewall corporativo securegate x": 105
};

function resolverIdCanonicoSupabase(producto) {
    const nombre = String(producto?.nombre || "").trim().toLowerCase();
    const idDirecto = Number(producto?.id);

    if (Number.isInteger(idDirecto) && idDirecto > 0) return idDirecto;
    if (idsCanonicosPorNombre[nombre]) return idsCanonicosPorNombre[nombre];

    return String(producto?.id || "").trim() || Date.now();
}

function normalizarProductoSupabase(producto) {
    const id = resolverIdCanonicoSupabase(producto);
    const base = {
        id,
        nombre: producto.nombre || "Producto sin nombre",
        precio: Number(producto.precio || 0),
        imagen: producto.imagen || "📦",
        specs: producto.specs || "",
        categoria: producto.categoria || "accesorios",
        stock: Number(producto.stock || 0)
    };

    if (typeof normalizarImagenProducto === "function") {
        base.imagen = normalizarImagenProducto(base);
    }

    return base;
}

async function cargarProductosDesdeSupabase(force = false) {
    if (!window.supabaseClient) return false;

    const ahora = Date.now();
    if (!force && productos.length && (ahora - ultimaCargaProductos) < CACHE_PRODUCTOS_MS) {
        return true;
    }

    if (cargaProductosEnCurso) {
        return await cargaProductosEnCurso;
    }

    cargaProductosEnCurso = (async () => {
        try {
            const { data, error } = await window.supabaseClient
                .from("productos")
                .select("*");

            if (error) {
                console.error("Error al cargar productos desde Supabase:", error.message);
                return false;
            }

            productos.length = 0;
            (data || []).map(normalizarProductoSupabase).forEach(p => productos.push(p));
            localStorage.setItem("productos", JSON.stringify(productos));
            ultimaCargaProductos = Date.now();
            return true;
        } catch (err) {
            console.error("Error de conexión con Supabase:", err);
            return false;
        } finally {
            cargaProductosEnCurso = null;
        }
    })();

    return await cargaProductosEnCurso;
}

async function mostrarProductos() {
    const container = document.getElementById("productosContainer");
    if (container) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; background: #1E293B; border-radius: 16px;">Cargando productos... 🔄</div>';
    }

    await cargarProductosDesdeSupabase();

    if (!productos.length) {
        if (container) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; background: #1E293B; border-radius: 16px;">No hay productos disponibles</div>';
        }
        return;
    }

    console.log("📦 Productos cargados:", productos.length);
    buscarProductos();
}

function buscarProductos() {
    const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase();
    const category = document.getElementById("filterCategory")?.value || "todos";
    const priceRange = document.getElementById("filterPrice")?.value || "todos";

    const productosFiltrados = productos.filter(producto => {
        if (producto.categoria === "empresa") return false;

        const matchNombre = producto.nombre.toLowerCase().includes(searchTerm);
        const matchCategoria = category === "todos" || producto.categoria === category;

        let matchPrecio = true;
        if (priceRange === "0-500000") matchPrecio = producto.precio < 500000;
        if (priceRange === "500000-2000000") matchPrecio = producto.precio >= 500000 && producto.precio <= 2000000;
        if (priceRange === "2000000+") matchPrecio = producto.precio > 2000000;

        return matchNombre && matchCategoria && matchPrecio;
    });

    mostrarProductosFiltrados(productosFiltrados);
}

function mostrarProductosFiltrados(productosFiltrados) {
    const container = document.getElementById("productosContainer");
    if (!container) return;

    const ofertasHtml = typeof mostrarOfertasRelampago === "function" ? mostrarOfertasRelampago() : "";

    if (productosFiltrados.length === 0) {
        container.innerHTML = `
            ${ofertasHtml}
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: #1E293B; border-radius: 20px;">
                <div style="font-size: 48px;">No hay resultados</div>
                <p style="color: #94A3B8; margin-top: 10px;">Prueba con otros filtros</p>
                <button class="btn-outline" onclick="limpiarFiltros()" style="margin-top: 15px;">Limpiar filtros</button>
            </div>
        `;
        return;
    }

    let html = "";
    productosFiltrados.forEach(producto => {
        const idArg = JSON.stringify(producto.id);
        let precioFinal = producto.precio;
        if (cuponActivo && cuponActivo.tipo === "porcentaje") {
            precioFinal = producto.precio * (1 - cuponActivo.descuento / 100);
        }

        html += `
            <div class="product-card" data-cat="${String(producto.categoria || "accesorios")}">
                ${renderProductVisual(producto.imagen, producto.nombre)}
                <div class="product-title">${producto.nombre}</div>
                <div class="product-spec">${producto.specs}</div>
                <div class="product-price">
                    ${cuponActivo && cuponActivo.tipo === "porcentaje" ? `<span style="text-decoration: line-through; font-size: 14px; color: #999;">${formatCOP(producto.precio)}</span><br>` : ""}
                    ${formatCOP(Math.round(precioFinal))}
                </div>
                <button class="btn-add" onclick='agregarAlCarrito(${idArg})'>Agregar +</button>
                <div class="product-actions">
                    <button class="btn-outline btn-fav" data-product-id="${String(producto.id)}" onclick='agregarAWishlist(${idArg})'>🤍 Favoritos</button>
                    <button class="btn-outline" onclick='abrirModalResenas(${idArg})'>⭐ Reseñas</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = ofertasHtml + html;
    if (typeof actualizarIconosFavoritosEnProductos === "function") {
        actualizarIconosFavoritosEnProductos();
    }
}

function limpiarFiltros() {
    const searchInput = document.getElementById("searchInput");
    const filterCategory = document.getElementById("filterCategory");
    const filterPrice = document.getElementById("filterPrice");

    if (searchInput) searchInput.value = "";
    if (filterCategory) filterCategory.value = "todos";
    if (filterPrice) filterPrice.value = "todos";
    buscarProductos();
}

function aplicarCuponGlobal() {
    const codigoInput = document.getElementById("codigoCupon") || document.getElementById("codigoCuponCarrito");
    const codigo = (codigoInput?.value || "").toUpperCase().trim();
    const cupon = cuponesDisponibles.find(c => c.codigo === codigo && !c.usado);

    if (!cupon) {
        notificarError("Cupón inválido o ya utilizado");
        return;
    }

    cuponActivo = cupon;
    cupon.usado = true;

    const cuponBox = document.getElementById("cuponActivo");
    const descripcion = cupon.tipo === "porcentaje"
        ? `${cupon.descuento}% de descuento`
        : `${formatCOP(cupon.descuento)} de descuento`;

    if (cuponBox) {
        cuponBox.style.display = "block";
        cuponBox.textContent = `🎫 Cupón aplicado: ${cupon.codigo} - ${descripcion}`;
    }

    if (codigoInput) codigoInput.value = "";
    notificarCuponAplicado(cupon.codigo, descripcion);
    buscarProductos();
    mostrarCarrito();
}

function aplicarCuponCarrito() {
    if (cuponActivo) {
        mostrarNotificacion(`Cupón ${cuponActivo.codigo} ya aplicado`, "info", "Cupón");
        return;
    }
    aplicarCuponGlobal();
}

window.mostrarProductos = mostrarProductos;
window.buscarProductos = buscarProductos;
window.mostrarProductosFiltrados = mostrarProductosFiltrados;
window.limpiarFiltros = limpiarFiltros;
window.aplicarCuponGlobal = aplicarCuponGlobal;
window.aplicarCuponCarrito = aplicarCuponCarrito;
