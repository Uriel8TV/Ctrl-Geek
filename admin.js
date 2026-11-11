// ==========================================
// 1. SEGURIDAD DEL PANEL (FRONTEND)
// ==========================================
// Se ejecuta inmediatamente al intentar cargar el panel
(function verificarSeguridad() {
    const estadoAdmin = sessionStorage.getItem('ctrlgeek_admin_token');

    if (estadoAdmin !== 'desbloqueado') {
        const pass = prompt("🔒 ACCESO RESTRINGIDO\nIngresa la contraseña maestra para el panel de Ctrl+Geek:");

        // Aquí defines tu contraseña secreta
        if (pass === "urlwolf081291") {
            sessionStorage.setItem('ctrlgeek_admin_token', 'desbloqueado');
            alert("✅ Bienvenido, Guapo.");
        } else {
            alert("❌ Acceso denegado.");
            window.location.href = "index.html"; // Expulsado a la tienda principal
        }
    }
})();

// ... (Aquí abajo iría el resto de tus funciones de admin.js como switchTab, etc.)

// ==========================================
// LÓGICA DEL PANEL DE ADMINISTRACIÓN
// ==========================================

/**
 * Cambia la vista activa en el panel principal según el botón presionado del menú lateral.
 * @param {string} tabId - El identificador de la sección a mostrar (ej. 'precios', 'catalogo').
 */
function switchTab(tabId) {
    // 1. Limpiamos el estado activo de todos los botones y secciones
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));

    // 2. Asignamos el estado activo al botón clickeado
    event.target.classList.add('active');

    // 3. Mostramos la sección correspondiente
    document.getElementById('tab-' + tabId).classList.add('active');
}

/**
 * Función temporal para simular el guardado de datos antes de integrar la base de datos.
 * @param {string} modulo - El nombre del módulo que se está guardando.
 */
function guardarConfig(modulo) {
    alert(`¡Configuración de ${modulo} guardada exitosamente!\n(Pronto conectaremos esto a tu archivo JSON/Backend)`);
}

/**
 * Simula la carga de diferentes precios cuando cambias de producto en el dropdown.
 */
function cargarPreciosProducto() {
    const producto = document.getElementById('pricingProductSelect').value;

    // Esto es un ejemplo visual. En el futuro, estos datos vendrán de tu base de datos (JSON)
    if (producto === '15oz') {
        // Subimos los precios de ejemplo para la de 15oz
        document.getElementById('stock_1').value = 190;
        document.getElementById('auto_1').value = 190;
        document.getElementById('express_1').value = 240;
    } else {
        // Restauramos los precios de la de 11oz
        document.getElementById('stock_1').value = 150;
        document.getElementById('auto_1').value = 150;
        document.getElementById('express_1').value = 200;
    }

    // Un pequeño destello visual para confirmar que los datos cambiaron
    const tarjetas = document.querySelectorAll('.pricing-tier-card');
    tarjetas.forEach(t => {
        t.style.opacity = '0.5';
        setTimeout(() => t.style.opacity = '1', 200);
    });
}