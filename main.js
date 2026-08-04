// ==========================================
// DICCIONARIO DE TAMAÑOS (ESCALA: 1cm = 40px)
// ==========================================
const configTazas = {
    '11oz': {
        anchoCM: 20, altoCM: 9.4,
        lienzoW: 800, lienzoH: 376,
        radio3D: 1.2, alto3D: 2.5, altoFisico: 9.6, cirFisica: 25.5
    },
    '15oz': {
        anchoCM: 23, altoCM: 10,
        lienzoW: 920, lienzoH: 400,
        radio3D: 1.35, alto3D: 2.9, altoFisico: 11.5, cirFisica: 27.0
    }
};
let tazaSeleccionada = '11oz';

// ==========================================
// VARIABLES GLOBALES Y CARGA DE DATOS (JSON)
// ==========================================
let datosPlataforma = null;

// Función para leer el cerebro JSON en el Editor
async function cargarDatosEditor() {
    try {
        const respuesta = await fetch('datos.json');
        datosPlataforma = await respuesta.json();
        console.log("¡Cerebro JSON cargado en Editor!", datosPlataforma);

        // Aprovechamos para renderizar el catálogo rápido desde el JSON
        renderizarCatologoDinamico();
    } catch (error) {
        console.error("Error al leer datos.json en editor:", error);
    }
}

cargarDatosEditor();

// ==========================================
// CONFIGURACIÓN INICIAL DEL LIENZO
// ==========================================
const canvas = new fabric.Canvas('mugCanvas',{
    backgroundColor: '#ffffff'
});
canvas.preserveObjectStacking = true;
document.getElementById('rulerLeft').style.height = configTazas['11oz'].lienzoH + 'px';

// ==========================================
// CAMBIO DE TAMAÑO DE TAZA
// ==========================================
document.getElementById('mugSize').addEventListener('change', function(e) {
    tazaSeleccionada = e.target.value;
    const config = configTazas[tazaSeleccionada];

    canvas.setWidth(config.lienzoW);
    canvas.setHeight(config.lienzoH);

    document.getElementById('rulerTop').innerHTML = `<span>0 cm</span><span class="center-mark">${config.anchoCM/2} cm (Centro)</span><span>${config.anchoCM} cm</span>`;
    document.getElementById('rulerLeft').innerHTML = `<span>0 cm</span><span>${config.altoCM/2} cm</span><span>${config.altoCM} cm</span>`;
    document.getElementById('rulerLeft').style.height = `${config.lienzoH}px`;

    construirModelo3D();
    canvas.centerObject(canvas.getActiveObject());
    canvas.renderAll();
});

// ==========================================
// CARGA DE FUENTES LOCALES CUSTOM
// ==========================================
let contadorFuentes = 1;
document.getElementById('fontLoader').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = 'CustomFont_' + contadorFuentes++;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const fontFace = new FontFace(fontName, arrayBuffer);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);

        const select = document.getElementById('textFont');
        const option = document.createElement('option');
        option.value = fontName;
        option.text = file.name.split('.')[0] + ' (Tuya)';
        select.appendChild(option);
        select.value = fontName;

        const objActivo = canvas.getActiveObject();
        if (objActivo && objActivo.type === 'i-text') {
            objActivo.set('fontFamily', fontName);
            canvas.renderAll();
            window.actualizarVistaPrevia();
        }
        alert("¡Fuente cargada exitosamente!");
    } catch (err) {
        console.error(err);
        alert("Error al cargar la fuente.");
    }
    e.target.value = '';
});

// ==========================================
// LÓGICA PARA SUBIR IMÁGENES LOCALES
// ==========================================
document.getElementById('imageLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const imgObj = new Image();
        imgObj.src = event.target.result;
        imgObj.onload = function() {
            const img = new fabric.Image(imgObj);

            img.scaleToWidth(300);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            window.actualizarVistaPrevia();
        }
    }
    reader.readAsDataURL(file);
    e.target.value = '';
});

document.getElementById('btnBorrar').addEventListener('click', function() {
    const objActivo = canvas.getActiveObject();
    if (objActivo) {
        canvas.remove(objActivo);
        canvas.discardActiveObject();
        window.actualizarVistaPrevia();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const objActivo = canvas.getActiveObject();
        if (objActivo && !objActivo.isEditing) {
            canvas.remove(objActivo);
            canvas.discardActiveObject();
            window.actualizarVistaPrevia();
        }
    }
});

// ==========================================
// JSON GUARDAR/CARGAR
// ==========================================
document.getElementById('btnGuardarProyecto').addEventListener('click', function() {
    const proyectoJSON = JSON.stringify({
        taza: tazaSeleccionada,
        canvasData: canvas.toJSON()
    });
    const blob = new Blob([proyectoJSON], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CtrlGeek-Proyecto-${tazaSeleccionada}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('projectLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if(data.taza && configTazas[data.taza]) {
                document.getElementById('mugSize').value = data.taza;
                document.getElementById('mugSize').dispatchEvent(new Event('change'));
                canvas.loadFromJSON(data.canvasData, function() {
                    canvas.renderAll();
                    window.actualizarVistaPrevia();
                });
            } else {
                canvas.loadFromJSON(data, function() { canvas.renderAll(); window.actualizarVistaPrevia(); });
            }
        } catch(err) {
            console.error(err);
        }
        document.getElementById('projectLoader').value = '';
    };
    reader.readAsText(file);
});

// ==========================================
// EVENTOS DE TEXTO (CORREGIDO ERROR DE COORDENADAS)
// ==========================================
document.getElementById('btnAgregarTexto').addEventListener('click', function() {
    // AQUÍ ESTABA EL ERROR: Cambiamos canvas.width por canvas.getWidth()
    const textoInteractvo = new fabric.IText('Ingresa tu texto', {
        left: (canvas.getWidth() / 2) - 100,
        top: canvas.getHeight() / 2,
        fontFamily: document.getElementById('textFont').value,
        fill: document.getElementById('textColor').value,
        fontSize: 30, fontWeight: 'bold',
        shadow: document.getElementById('textShadow').checked ? new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 3, offsetY: 3 }) : null
    });
    canvas.add(textoInteractvo);
    canvas.bringToFront(textoInteractvo);
    canvas.setActiveObject(textoInteractvo);
    window.actualizarVistaPrevia();
});

document.getElementById('textColor').addEventListener('input', function(e) {
    const o = canvas.getActiveObject(); if (o && o.type === 'i-text') { o.set('fill', e.target.value); canvas.renderAll(); }
});
document.getElementById('textFont').addEventListener('change', function(e) {
    const o = canvas.getActiveObject(); if (o && o.type === 'i-text') { o.set('fontFamily', e.target.value); canvas.renderAll(); }
});
document.getElementById('textShadow').addEventListener('change', function(e) {
    const o = canvas.getActiveObject();
    if (o && o.type === 'i-text') {
        o.set('shadow', e.target.checked ? new fabric.Shadow({ color:'rgba(0,0,0,0.8)', blur:4, offsetX:3, offsetY:3 }) : null);
        canvas.renderAll();
    }
});
canvas.on('selection:created', sincronizarControles);
canvas.on('selection:updated', sincronizarControles);
function sincronizarControles(e) {
    const objActivo = e.selected[0];
    if (objActivo && objActivo.type === 'i-text') {
        document.getElementById('textColor').value = objActivo.fill;
        const font = objActivo.fontFamily;
        let selectFuente = document.getElementById('textFont');
        for (let i = 0; i < selectFuente.options.length; i++) {
            if (selectFuente.options[i].value === font) { selectFuente.selectedIndex = i; break; }
        }
        document.getElementById('textShadow').checked = objActivo.shadow !== null;
    }
}

// ==========================================
// MOTOR 3D CON THREE.JS DINÁMICO
// ==========================================
const contenedor3D = document.getElementById('canvas3d-container');
let escena, camara, renderizador, controles, texturaTaza, grupoTaza;

if (contenedor3D) {
    contenedor3D.innerHTML = '';
    escena = new THREE.Scene();
    camara = new THREE.PerspectiveCamera(45, contenedor3D.clientWidth / contenedor3D.clientHeight, 0.1, 1000);
    camara.position.set(0, 1.5, 5.5);

    renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderizador.setSize(contenedor3D.clientWidth, contenedor3D.clientHeight);
    contenedor3D.appendChild(renderizador.domElement);

    controles = new THREE.OrbitControls(camara, renderizador.domElement);
    controles.enableZoom = true;
    controles.enablePan = false;
    controles.minDistance = 2;
    controles.maxDistance = 7;

    escena.add(new THREE.AmbientLight(0xffffff, 0.6));
    const luzFrontal = new THREE.DirectionalLight(0xffffff, 0.5);
    luzFrontal.position.set(5, 5, 5);
    escena.add(luzFrontal);
    const luzTrasera = new THREE.DirectionalLight(0xffffff, 0.4);
    luzTrasera.position.set(-5, 5, -5);
    escena.add(luzTrasera);

    construirModelo3D();

    function animar3D() {
        requestAnimationFrame(animar3D);
        controles.update();
        renderizador.render(escena, camara);
    }
    animar3D();

    window.actualizarVistaPrevia = function() {
        if(texturaTaza) texturaTaza.needsUpdate = true;
    };
} else {
    window.actualizarVistaPrevia = function() {};
}

function construirModelo3D() {
    if(!escena) return;
    if(grupoTaza) escena.remove(grupoTaza);

    const config = configTazas[tazaSeleccionada];
    const lienzoHTML = document.getElementById('mugCanvas');

    texturaTaza = new THREE.CanvasTexture(lienzoHTML);
    texturaTaza.anisotropy = renderizador.capabilities.getMaxAnisotropy();
    texturaTaza.repeat.x = 1;
    texturaTaza.offset.x = 0;

    const materialBlanco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const geometriaBase = new THREE.CylinderGeometry(config.radio3D, config.radio3D, config.alto3D, 64);
    const tazaBase = new THREE.Mesh(geometriaBase, materialBlanco);

    const grosorAsa = tazaSeleccionada === '15oz' ? 0.22 : 0.2;
    const geometriaAsa = new THREE.TorusGeometry(config.radio3D * 0.65, grosorAsa, 16, 32);
    const asa = new THREE.Mesh(geometriaAsa, materialBlanco);
    asa.position.set(config.radio3D, 0, 0);

    const proporcionAncho = config.anchoCM / config.cirFisica;
    const radianesImpresion = proporcionAncho * Math.PI * 2;
    const gapRadianes = (Math.PI * 2) - radianesImpresion;
    const inicioRadianes = (Math.PI / 2) + (gapRadianes / 2);

    const materialImpresion = new THREE.MeshStandardMaterial({
        map: texturaTaza, roughness: 0.2, transparent: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });

    const altoImpresion = config.alto3D * (config.altoCM / config.altoFisico);
    const geometriaImpresion = new THREE.CylinderGeometry(
        config.radio3D + 0.001, config.radio3D + 0.001, altoImpresion, 64, 1, true, inicioRadianes, radianesImpresion
    );
    const envoltorio = new THREE.Mesh(geometriaImpresion, materialImpresion);

    grupoTaza = new THREE.Group();
    grupoTaza.add(tazaBase);
    grupoTaza.add(asa);
    grupoTaza.add(envoltorio);

    grupoTaza.rotation.y = Math.PI / 2.2;
    escena.add(grupoTaza);
}

// ==========================================
// CATÁLOGO DE DISEÑOS (CORREGIDO ERROR DE COORDENADAS Y BLOQUEO)
// ==========================================
window.cargarDisenoCatalogo = function(urlImagen) {
    fabric.Image.fromURL(urlImagen, function(img) {
        if (!img) {
            alert("No se pudo cargar. Asegúrate de abrir el archivo en un servidor local (Live Server).");
            return;
        }
        // AQUÍ ESTABA EL OTRO ERROR: Cambiamos canvas.height por canvas.getHeight()
        img.scaleToHeight(canvas.getHeight() * 0.8);

        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        window.actualizarVistaPrevia();
    });
    // SE ELIMINÓ EL BLOQUEO DE SEGURIDAD CROSSORIGIN
};

// ==========================================
// CALCULADORA DE PRECIOS Y MAYOREO
// ==========================================
function calcularPrecio() {
    const qty = parseInt(document.getElementById('orderQty').value) || 1;
    const mode = document.getElementById('orderMode').value;
    let precioUnitario = 0;

    // Determinamos qué columna de la matriz usar según la cantidad (Menudeo, Medio, Mayoreo)
    let rangoIndex = 0; // 1-5 piezas
    if (qty >= 12) rangoIndex = 2;      // 12+ piezas
    else if (qty >= 6) rangoIndex = 1;  // 6-11 piezas

    if (datosPlataforma && datosPlataforma.precios[tazaSeleccionada]) {
        // Leemos la matriz exacta (ej: datosPlataforma.precios['11oz']['auto'][rangoIndex])
        precioUnitario = datosPlataforma.precios[tazaSeleccionada][mode][rangoIndex];
    } else {
        // Respaldo estático clásico por seguridad
        if (mode === 'auto') {
            precioUnitario = qty >= 12 ? 100 : (qty >= 6 ? 120 : 150);
        } else {
            precioUnitario = qty >= 12 ? 150 : (qty >= 6 ? 170 : 200);
        }
    }

    const total = precioUnitario * qty;
    document.getElementById('priceDisplay').innerText = `Total: $${total} MXN`;
    return { total, precioUnitario, qty, mode };
}

document.getElementById('orderQty').addEventListener('input', calcularPrecio);
document.getElementById('orderMode').addEventListener('change', calcularPrecio);

// ==========================================
// CONTROLADOR DE MODALIDAD (EXPRÉS VS AUTO)
// ==========================================
document.getElementById('orderMode').addEventListener('change', function(e) {
    const modo = e.target.value;
    const workspace = document.getElementById('workspaceArea');
    const autoUI = document.getElementById('autoServiceUI');
    const expressUI = document.getElementById('expressUI');

    if (modo === 'express') {
        workspace.style.display = 'none';
        autoUI.style.display = 'none';
        expressUI.style.display = 'flex';
    } else {
        workspace.style.display = 'flex';
        autoUI.style.display = 'flex';
        expressUI.style.display = 'none';
    }
});

// ==========================================
// GENERADOR DE NOTA DE REMISIÓN EN PDF
// ==========================================
function generarPDF(datosPedido) {
    // Inicializamos la librería jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Generamos un folio único y obtenemos la fecha actual
    const folio = "CG-" + Math.floor(1000 + Math.random() * 9000);
    const fecha = new Date().toLocaleDateString('es-MX');

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(86, 156, 214); // Azul Ctrl+Geek
    doc.text("Ctrl+Geek", 20, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Laboratorio de Impresión Geek", 20, 32);

    // Datos del Folio (Alineados a la derecha)
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Folio: ${folio}`, 150, 25);
    doc.text(`Fecha: ${fecha}`, 150, 31);

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 40, 190, 40);

    // --- DETALLES DEL PEDIDO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Detalles de la Cotización", 20, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const tipoServicio = datosPedido.mode === 'auto' ? 'Autoservicio (Diseño Web)' : 'Diseño Exprés (Asistido)';

    doc.text(`Producto: Taza de ${tazaSeleccionada}`, 20, 70);
    doc.text(`Modalidad: ${tipoServicio}`, 20, 80);
    doc.text(`Cantidad: ${datosPedido.qty} pieza(s)`, 20, 90);
    doc.text(`Precio Unitario: $${datosPedido.precioUnitario} MXN`, 20, 100);

    // Línea separadora sutil
    doc.line(20, 110, 190, 110);

    // --- TOTAL A PAGAR ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(37, 211, 102); // Verde estilo WhatsApp
    doc.text(`Total a Pagar: $${datosPedido.total} MXN`, 20, 125);

    // --- FOOTER E INSTRUCCIONES ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("INSTRUCCIONES:", 20, 150);
    doc.setFont("helvetica", "normal");
    doc.text("1. Envíe este documento PDF (o una captura) por WhatsApp.", 20, 157);
    doc.text("2. Adjunte su comprobante de pago o transferencia.", 20, 164);
    doc.text("3. Si eligió Autoservicio, envíe también el archivo PNG descargado.", 20, 171);

    // Descarga automática del PDF
    doc.save(`Cotizacion_${folio}.pdf`);

    return folio; // Devolvemos el folio para usarlo en el mensaje de WhatsApp
}

// ==========================================
// WHATSAPP AUTÓNOMO (Exporta PNG + PDF internamente)
// ==========================================
document.getElementById('btnWhatsApp').addEventListener('click', function() {
    const datosPedido = calcularPrecio();
    const modo = document.getElementById('orderMode').value;

    // NUEVO: Validación del Protocolo Co-Creador
    if (modo === 'express') {
        const checkbox = document.getElementById('agreeProtocol');
        if (!checkbox.checked) {
            alert("⚠️ Acceso Denegado: Debes aceptar el Protocolo de Co-Creación antes de enviar tu solicitud.");
            return; // Detiene la ejecución aquí si no han aceptado
        }
    }

    // 1. Generamos y descargamos el PDF...
    const numeroFolio = generarPDF(datosPedido);

    let mensaje = '';

    if (modo === 'auto') {
        // Modo Diseño: Exporta el canvas limpio sin selecciones
        canvas.discardActiveObject();
        canvas.renderAll();
        const dataURL = canvas.toDataURL({ format: 'png', multiplier: 3 });
        const enlace = document.createElement('a');
        enlace.download = `CtrlGeek_Diseno_${numeroFolio}.png`;
        enlace.href = dataURL;
        enlace.click();

        mensaje = encodeURIComponent(
            `¡Hola Ctrl+Geek! 👋\n\n` +
            `Aquí tienes mi pedido de Autoservicio.\n` +
            `📄 *Folio de cotización:* ${numeroFolio}\n` +
            `📦 *Cantidad:* ${datosPedido.qty} taza(s) de ${tazaSeleccionada}\n` +
            `💵 *Total:* $${datosPedido.total} MXN\n\n` +
            `Te adjunto el PDF de la cotización y la imagen PNG de mi diseño que se acaba de descargar.`
        );
    } else {
        // Modo Exprés
        const instrucciones = document.getElementById('expressInstructions').value;
        mensaje = encodeURIComponent(
            `¡Hola Ctrl+Geek! 👋\n\n` +
            `Aquí tienes mi pedido de Diseño Exprés.\n` +
            `📄 *Folio de cotización:* ${numeroFolio}\n` +
            `📦 *Cantidad:* ${datosPedido.qty} taza(s) de ${tazaSeleccionada}\n` +
            `💵 *Total:* $${datosPedido.total} MXN\n\n` +
            `📝 *Mis instrucciones:* "${instrucciones}"\n\n` +
            `Te adjunto el PDF de la cotización y enseguida te paso mi imagen base.`
        );
    }

    // 2. Abrimos WhatsApp
    const miNumero = "2223066747";
    window.open(`https://wa.me/${miNumero}?text=${mensaje}`, '_blank');
});

// ==========================================
// RENDERIZADO DEL CATÁLOGO DINÁMICO
// ==========================================
function renderizarCatologoDinamico() {
    if (!datosPlataforma || !datosPlataforma.catalogoEditor) return;

    const grid = document.querySelector('.catalog-grid');
    grid.innerHTML = ''; // Limpiamos el HTML viejo estático

    datosPlataforma.catalogoEditor.forEach(ruta => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.onclick = () => cargarDisenoCatalogo(ruta);

        const img = document.createElement('img');
        img.src = ruta;
        img.alt = "Diseño Catálogo";

        item.appendChild(img);
        grid.appendChild(item);
    });
}

// Eventos que disparan la actualización del modelo 3D
canvas.on('object:modified', window.actualizarVistaPrevia);
canvas.on('object:added', window.actualizarVistaPrevia);
canvas.on('object:removed', window.actualizarVistaPrevia);
canvas.on('text:changed', window.actualizarVistaPrevia);
canvas.on('selection:cleared', window.actualizarVistaPrevia);