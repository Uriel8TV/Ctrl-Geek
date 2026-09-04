// ==========================================
// VARIABLES GLOBALES Y CARGA DE DATOS (JSON)
// ==========================================
let datosPlataforma = null;
let currentModalImage = ''; // Declarada UNA SOLA VEZ

// Función para leer el cerebro JSON
async function cargarDatosMaestros() {
    try {
        const respuesta = await fetch('datos.json');
        datosPlataforma = await respuesta.json();
        console.log("¡Cerebro JSON cargado en Index con éxito!", datosPlataforma);
    } catch (error) {
        console.error("Error al leer el archivo datos.json:", error);
    }
}

// Ejecutamos la carga al abrir la página
cargarDatosMaestros();

// ==========================================
// MOTOR 3D
// ==========================================
let escena, camara, renderizador, grupoTaza, animacionID;

// 1. FUNCIÓN PARA CREAR EL ESCENARIO
function inicializar3D(contenedor) {
    contenedor.innerHTML = '';

    escena = new THREE.Scene();

    camara = new THREE.PerspectiveCamera(45, contenedor.clientWidth / contenedor.clientHeight, 0.1, 100);
    camara.position.set(0, 0, 0.35);

    renderizador = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderizador.setSize(contenedor.clientWidth, contenedor.clientHeight);
    renderizador.setPixelRatio(window.devicePixelRatio);
    contenedor.appendChild(renderizador.domElement);

    const controles = new THREE.OrbitControls(camara, renderizador.domElement);
    controles.enableZoom = false;
    controles.enablePan = false;

    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
    escena.add(luzAmbiente);
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
    luzDireccional.position.set(5, 5, 5);
    escena.add(luzDireccional);
    const luzAtras = new THREE.DirectionalLight(0xffffff, 0.3);
    luzAtras.position.set(-5, 0, -5);
    escena.add(luzAtras);
}

// 2. FUNCIÓN PARA MOLDEAR LA TAZA Y APLICAR LA IMAGEN
function construirTaza(imagenSrc, size = '11oz') {
    if (grupoTaza) escena.remove(grupoTaza);
    grupoTaza = new THREE.Group();

    // Proporciones dinámicas según el tamaño elegido
    const r = size === '15oz' ? 0.045 : 0.04;
    const h = size === '15oz' ? 0.11 : 0.094;
    const rAsa = size === '15oz' ? 0.029 : 0.026;

    const materialBlanco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

    const geometriaBase = new THREE.CylinderGeometry(r, r, h, 64);
    const tazaBase = new THREE.Mesh(geometriaBase, materialBlanco);

    const geometriaAsa = new THREE.TorusGeometry(rAsa, 0.008, 16, 32);
    const asa = new THREE.Mesh(geometriaAsa, materialBlanco);
    asa.position.set(r, 0, 0);

    const canvasVirtual = document.createElement('canvas');
    canvasVirtual.width = size === '15oz' ? 920 : 800;
    canvasVirtual.height = size === '15oz' ? 400 : 376;
    const ctx = canvasVirtual.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasVirtual.width, canvasVirtual.height);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imagenSrc;

    img.onload = function() {
        const altoDeseado = canvasVirtual.height * 0.8;
        const proporcion = altoDeseado / img.height;
        const anchoDeseado = img.width * proporcion;

        const x = (canvasVirtual.width - anchoDeseado) / 2;
        const y = (canvasVirtual.height - altoDeseado) / 2;
        ctx.drawImage(img, x, y, anchoDeseado, altoDeseado);

        const textura = new THREE.CanvasTexture(canvasVirtual);
        textura.anisotropy = renderizador.capabilities.getMaxAnisotropy();

        const proporcionAncho = 20 / 25.12;
        const radianesImpresion = proporcionAncho * Math.PI * 2;
        const gapRadianes = (Math.PI * 2) - radianesImpresion;
        const inicioRadianes = (Math.PI / 2) + (gapRadianes / 2);

        const materialImpresion = new THREE.MeshStandardMaterial({
            map: textura, transparent: true, roughness: 0.2, polygonOffset: true, polygonOffsetFactor: -1
        });

        const envoltorioGeo = new THREE.CylinderGeometry(
            r + 0.0001, r + 0.0001, h, 64, 1, true, inicioRadianes, radianesImpresion
        );
        const envoltorio = new THREE.Mesh(envoltorioGeo, materialImpresion);

        grupoTaza.add(tazaBase);
        grupoTaza.add(asa);
        grupoTaza.add(envoltorio);

        grupoTaza.rotation.y = Math.PI / 2.2;
        escena.add(grupoTaza);
    };
}

// 3. MOTOR DE ANIMACIÓN
function animar() {
    animacionID = requestAnimationFrame(animar);
    if (grupoTaza) {
        grupoTaza.rotation.y -= 0.003;
    }
    renderizador.render(escena, camara);
}

// ==========================================
// CONTROLADORES DEL MODAL (Conectados a Window)
// ==========================================

window.abrirModal = function(titulo, imagenSrc) {
    document.getElementById('modalTitle').innerText = titulo;
    document.getElementById('productModal').style.display = 'flex';

    currentModalImage = imagenSrc;

    // Resetear siempre a 11oz al abrir un producto nuevo
    document.getElementById('modalMugSize').value = '11oz';
    document.getElementById('modalPrice').innerText = '$150 MXN';

    const contenedor3D = document.getElementById('visor3d');
    inicializar3D(contenedor3D);
    construirTaza(imagenSrc, '11oz');
    animar();
};

window.cerrarModal = function() {
    document.getElementById('productModal').style.display = 'none';
    if (animacionID) cancelAnimationFrame(animacionID);
    document.getElementById('visor3d').innerHTML = '';
    grupoTaza = null;
};

window.actualizarPrecioModal = function() {
    const size = document.getElementById('modalMugSize').value;
    const priceEl = document.getElementById('modalPrice');

    if (datosPlataforma && datosPlataforma.precios && datosPlataforma.precios[size]) {
        const precioStock = datosPlataforma.precios[size].stock[0];
        priceEl.innerText = `$${precioStock} MXN`;
    } else {
        priceEl.innerText = size === '15oz' ? '$190 MXN' : '$150 MXN';
    }

    if (currentModalImage && escena) {
        construirTaza(currentModalImage, size);
    }
};

window.comprarDirecto = function() {
    const titulo = document.getElementById('modalTitle').innerText;
    const selectSize = document.getElementById('modalMugSize');
    const sizeText = selectSize.options[selectSize.selectedIndex].text;
    const price = document.getElementById('modalPrice').innerText;

    // 1. GENERAR EL PDF PARA STOCK
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const folio = "CG-STK-" + Math.floor(1000 + Math.random() * 9000);
    const fecha = new Date().toLocaleDateString('es-MX');

    // Diseño del PDF
    doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(86, 156, 214);
    doc.text("Ctrl+Geek", 20, 25);
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(100, 100, 100);
    doc.text("Laboratorio de Impresión Geek", 20, 32);

    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text(`Folio: ${folio}`, 150, 25); doc.text(`Fecha: ${fecha}`, 150, 31);

    doc.setLineWidth(0.5); doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);

    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text("Cotización de Catálogo Oficial", 20, 55);
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);

    doc.text(`Producto: ${titulo}`, 20, 70);
    doc.text(`Modalidad: Diseño de Stock (Fijo)`, 20, 80);
    doc.text(`Tamaño Seleccionado: ${sizeText}`, 20, 90);

    doc.line(20, 110, 190, 110);

    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(37, 211, 102);
    doc.text(`Total a Pagar: ${price}`, 20, 125);

    doc.save(`Cotizacion_${folio}.pdf`);

    // 2. ENVIAR WHATSAPP
    const miNumero = "2223066747";
    const mensaje = encodeURIComponent(
        `¡Hola Ctrl+Geek!\n\n` +
        `Me interesa pedir un diseño del catálogo fijo:\n` +
        `📄 *Folio:* ${folio}\n` +
        `☕ *${titulo}*\n` +
        `📐 *Selección:* ${sizeText}\n` +
        `💵 *Total:* ${price}\n\n` +
        `Te adjunto el PDF de cotización. ¿A dónde te puedo enviar el comprobante de pago?`
    );
    window.open(`https://wa.me/${miNumero}?text=${mensaje}`, '_blank');
};

// Detecta cuando la pantalla cambia de tamaño y ajusta el 3D
window.addEventListener('resize', () => {
    if (camara && renderizador) {
        const contenedor3D = document.getElementById('visor3d');
        // Actualiza la cámara y el renderizador a la nueva dimensión de la caja
        camara.aspect = contenedor3D.clientWidth / contenedor3D.clientHeight;
        camara.updateProjectionMatrix();
        renderizador.setSize(contenedor3D.clientWidth, contenedor3D.clientHeight);
    }
});