/**
 * CTRL+GEEK - WORKSPACE EDITOR ENGINE
 * Arquitectura modular preparada para empaquetado en Electron.
 */

// ==========================================
// 1. CONFIGURACIÓN Y ESTADO GLOBAL (STATE)
// ==========================================
const AppState = {
    tazaActiva: '11oz',
    datosPlataforma: null,
    fuentesCargadas: 1
};

const ConfigTazas = {
    '11oz': { anchoCM: 20, altoCM: 9.4, lienzoW: 800, lienzoH: 376, radio3D: 1.2, alto3D: 2.5, altoFisico: 9.6, cirFisica: 25.5 },
    '15oz': { anchoCM: 23, altoCM: 10, lienzoW: 920, lienzoH: 400, radio3D: 1.35, alto3D: 2.9, altoFisico: 11.5, cirFisica: 27.0 }
};

// ==========================================
// 2. INICIALIZACIÓN DEL NÚCLEO (CORE INIT)
// ==========================================
const canvas = new fabric.Canvas('mugCanvas', { backgroundColor: '#ffffff' });
canvas.preserveObjectStacking = true;
fabric.Object.prototype.objectCaching = false;
document.getElementById('rulerLeft').style.height = ConfigTazas['11oz'].lienzoH + 'px';

const contenedor3D = document.getElementById('canvas3d-container');
let escena, camara, renderizador, controles, texturaTaza, grupoTaza;

async function inicializarSistema() {
    try {
        const respuesta = await fetch('datos.json');
        AppState.datosPlataforma = await respuesta.json();
        console.log("¡Cerebro JSON cargado con éxito!", AppState.datosPlataforma);
        UICore.renderizarCatalogoDinamico();
    } catch (error) {
        console.error("Error crítico al cargar datos.json:", error);
    }
}

// ==========================================
// 3. MOTOR DE RENDERIZADO 3D (THREE.JS)
// ==========================================
const Motor3D = {
    iniciar: function() {
        if (!contenedor3D) {
            window.actualizarVistaPrevia = function() {};
            return;
        }
        contenedor3D.innerHTML = '';
        escena = new THREE.Scene();
        camara = new THREE.PerspectiveCamera(45, contenedor3D.clientWidth / contenedor3D.clientHeight, 0.1, 1000);
        camara.position.set(0, 1.5, 5.5);

        renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderizador.setSize(contenedor3D.clientWidth, contenedor3D.clientHeight);
        contenedor3D.appendChild(renderizador.domElement);

        controles = new THREE.OrbitControls(camara, renderizador.domElement);
        Object.assign(controles, { enableZoom: true, enablePan: false, minDistance: 2, maxDistance: 7 });

        this.configurarIluminacion();
        this.construirModelo();
        this.animar();

       window.actualizarVistaPrevia = () => {
            canvas.renderAll();
            if (texturaTaza) texturaTaza.needsUpdate = true;
        };
    },
    configurarIluminacion: function() {
        escena.add(new THREE.AmbientLight(0xffffff, 0.6));
        const luzFrontal = new THREE.DirectionalLight(0xffffff, 0.5);
        luzFrontal.position.set(5, 5, 5);
        escena.add(luzFrontal);
        const luzTrasera = new THREE.DirectionalLight(0xffffff, 0.4);
        luzTrasera.position.set(-5, 5, -5);
        escena.add(luzTrasera);
    },
    construirModelo: function() {
        if (!escena) return;
        if (grupoTaza) escena.remove(grupoTaza);
        const config = ConfigTazas[AppState.tazaActiva];
        texturaTaza = new THREE.CanvasTexture(canvas.getElement());
        texturaTaza.anisotropy = renderizador.capabilities.getMaxAnisotropy();

        const materialBlanco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const tazaBase = new THREE.Mesh(new THREE.CylinderGeometry(config.radio3D, config.radio3D, config.alto3D, 64), materialBlanco);
        const grosorAsa = AppState.tazaActiva === '15oz' ? 0.22 : 0.2;
        const asa = new THREE.Mesh(new THREE.TorusGeometry(config.radio3D * 0.65, grosorAsa, 16, 32), materialBlanco);
        asa.position.set(config.radio3D, 0, 0);

        const proporcionAncho = config.anchoCM / config.cirFisica;
        const radianesImpresion = proporcionAncho * Math.PI * 2;
        const gapRadianes = (Math.PI * 2) - radianesImpresion;
        const inicioRadianes = (Math.PI / 2) + (gapRadianes / 2);

        const materialImpresion = new THREE.MeshStandardMaterial({
            map: texturaTaza, roughness: 0.2, transparent: true, polygonOffset: true, polygonOffsetFactor: -1
        });
        const altoImpresion = config.alto3D * (config.altoCM / config.altoFisico);
        const envoltorio = new THREE.Mesh(
            new THREE.CylinderGeometry(config.radio3D + 0.001, config.radio3D + 0.001, altoImpresion, 64, 1, true, inicioRadianes, radianesImpresion),
            materialImpresion
        );

        grupoTaza = new THREE.Group();
        grupoTaza.add(tazaBase, asa, envoltorio);
        grupoTaza.rotation.y = Math.PI / 2.2;
        escena.add(grupoTaza);
    },
    animar: function() {
        requestAnimationFrame(() => Motor3D.animar());
        controles.update();
        renderizador.render(escena, camara);
    }
};

// ==========================================
// 4. EDITOR 2D Y EVENTOS DE LIENZO (FABRIC.JS)
// ==========================================
const EditorCore = {
    cambiarTamanoTaza: function(nuevoTamano) {
        AppState.tazaActiva = nuevoTamano;
        const config = ConfigTazas[nuevoTamano];
        canvas.setWidth(config.lienzoW);
        canvas.setHeight(config.lienzoH);
        document.getElementById('rulerTop').innerHTML = `<span>0 cm</span><span class="center-mark">${config.anchoCM/2} cm (Centro)</span><span>${config.anchoCM} cm</span>`;
        document.getElementById('rulerLeft').innerHTML = `<span>0 cm</span><span>${config.altoCM/2} cm</span><span>${config.altoCM} cm</span>`;
        document.getElementById('rulerLeft').style.height = `${config.lienzoH}px`;
        Motor3D.construirModelo();
        canvas.centerObject(canvas.getActiveObject());
        canvas.renderAll();
    },
    agregarTexto: function() {
        const textoInteractvo = new fabric.IText('Ingresa tu texto', {
            left: (canvas.getWidth() / 2) - 100,
            top: canvas.getHeight() / 2,
            fontFamily: document.getElementById('textFont').value,
            fill: document.getElementById('textColor').value,
            fontSize: 30, fontWeight: 'bold',
            shadow: document.getElementById('textShadow').checked ? new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 3, offsetY: 3 }) : null
        });
        canvas.add(textoInteractvo);
        canvas.setActiveObject(textoInteractvo);
        window.actualizarVistaPrevia();
    },
    eliminarObjetoActivo: function() {
        const objActivo = canvas.getActiveObject();
        if (objActivo && !objActivo.isEditing) {
            canvas.remove(objActivo);
            canvas.discardActiveObject();
            window.actualizarVistaPrevia();
        }
    },
    cargarImagenBase64: function(dataUrl) {
        fabric.Image.fromURL(dataUrl, function(img) {
            img.scaleToWidth(300);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            window.actualizarVistaPrevia();
        });
    },
    cargarDisenoDesdeURL: function(urlImagen) {
        fabric.Image.fromURL(urlImagen, function(img) {
            if (!img) return alert("Error de carga. Verifica la ruta o el servidor local.");
            img.scaleToHeight(canvas.getHeight() * 0.8);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            window.actualizarVistaPrevia();
        });
    }
};
window.cargarDisenoCatalogo = EditorCore.cargarDisenoDesdeURL;

// ==========================================
// 5. LÓGICA DE NEGOCIO Y COMERCIO (BUSINESS)
// ==========================================
const CommerceEngine = {
    calcularPrecio: function() {
        const qty = parseInt(document.getElementById('orderQty').value) || 1;
        const mode = document.getElementById('orderMode').value;
        let rangoIndex = qty >= 12 ? 2 : (qty >= 6 ? 1 : 0);
        let precioUnitario = 0;

        if (AppState.datosPlataforma && AppState.datosPlataforma.precios && AppState.datosPlataforma.precios[AppState.tazaActiva]) {
            precioUnitario = AppState.datosPlataforma.precios[AppState.tazaActiva][mode][rangoIndex];
        } else {
            precioUnitario = mode === 'auto'
                ? (qty >= 12 ? 99 : (qty >= 6 ? 120 : 139))
                : (qty >= 12 ? 150 : (qty >= 6 ? 170 : 199));
        }

        const total = precioUnitario * qty;
        document.getElementById('priceDisplay').innerText = `Total: $${total} MXN`;
        return { total, precioUnitario, qty, mode };
    },
    generarPDF: function(datosPedido) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const folio = "CG-" + Math.floor(1000 + Math.random() * 9000);
        const fecha = new Date().toLocaleDateString('es-MX');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(24); doc.setTextColor(86, 156, 214);
        doc.text("Ctrl+Geek", 20, 25);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(100, 100, 100);
        doc.text("Laboratorio de Impresión Geek", 20, 32);
        doc.setFontSize(11); doc.setTextColor(0, 0, 0);
        doc.text(`Folio: ${folio}`, 150, 25);
        doc.text(`Fecha: ${fecha}`, 150, 31);
        doc.setLineWidth(0.5); doc.setDrawColor(200, 200, 200); doc.line(20, 40, 190, 40);

        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("Detalles de la Cotización", 20, 55);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12);
        doc.text(`Producto: Taza de ${AppState.tazaActiva}`, 20, 70);
        doc.text(`Modalidad: ${datosPedido.mode === 'auto' ? 'Autoservicio' : 'Diseño Exprés'}`, 20, 80);
        doc.text(`Cantidad: ${datosPedido.qty} pieza(s)`, 20, 90);
        doc.text(`Precio Unitario: $${datosPedido.precioUnitario} MXN`, 20, 100);

        doc.line(20, 110, 190, 110);
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(37, 211, 102);
        doc.text(`Total a Pagar: $${datosPedido.total} MXN`, 20, 125);
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
        doc.text("INSTRUCCIONES:\n1. Envíe este documento por WhatsApp.\n2. Adjunte su archivo .json descargado.", 20, 150);

        doc.save(`Cotizacion_${folio}.pdf`);
        return folio;
    },
    procesarCompra: function() {
        const datosPedido = this.calcularPrecio();
        const modo = document.getElementById('orderMode').value;

        if (modo === 'express' && !document.getElementById('agreeProtocol').checked) {
            return alert("⚠️ Debes aceptar el Protocolo de Co-Creación.");
        }

        const folio = this.generarPDF(datosPedido);
        let mensaje = '';

        if (modo === 'auto') {
            canvas.discardActiveObject(); canvas.renderAll();

            // Generación y descarga del JSON del lienzo (Reemplaza el PNG)
            const estadoLienzo = canvas.toJSON();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(estadoLienzo));
            const botonDescargaJson = document.createElement('a');
            botonDescargaJson.setAttribute("href", dataStr);
            botonDescargaJson.setAttribute("download", `pedido_ctrlgeek_${folio}.json`);
            document.body.appendChild(botonDescargaJson);
            botonDescargaJson.click();
            botonDescargaJson.remove();

            mensaje = encodeURIComponent(`¡Hola Ctrl+Geek! 👋\nPedido Autoservicio.\n📄 *Folio:* ${folio}\n📦 *Cantidad:* ${datosPedido.qty} de ${AppState.tazaActiva}\n💵 *Total:* $${datosPedido.total} MXN\nAdjunto mi cotización en PDF y el archivo .json con mi diseño.`);

            alert("¡Archivos descargados!\n\nPor favor, envíanos el archivo .json de tu diseño y el PDF de cotización por WhatsApp.");
        } else {
            const instrucciones = document.getElementById('expressInstructions').value;
            mensaje = encodeURIComponent(`¡Hola Ctrl+Geek! 👋\nPedido Diseño Exprés.\n📄 *Folio:* ${folio}\n📦 *Cantidad:* ${datosPedido.qty} de ${AppState.tazaActiva}\n💵 *Total:* $${datosPedido.total} MXN\n📝 *Instrucciones:* "${instrucciones}"\nAdjunto mi cotización en PDF.`);
        }

        window.open(`https://wa.me/2223066747?text=${mensaje}`, '_blank');
    }
};

// ==========================================
// 6. ENLACE DE EVENTOS UI Y CONTROLADORES
// ==========================================
const UICore = {
    iniciarListeners: function() {
        document.getElementById('mugSize').addEventListener('change', (e) => EditorCore.cambiarTamanoTaza(e.target.value));
        document.getElementById('btnAgregarTexto').addEventListener('click', EditorCore.agregarTexto);
        document.getElementById('btnBorrar').addEventListener('click', EditorCore.eliminarObjetoActivo);
        document.addEventListener('keydown', (e) => { if (e.key === 'Delete' || e.key === 'Backspace') EditorCore.eliminarObjetoActivo(); });

        document.getElementById('orderQty').addEventListener('input', CommerceEngine.calcularPrecio);
        document.getElementById('orderMode').addEventListener('change', (e) => {
            CommerceEngine.calcularPrecio();
            const isExpress = e.target.value === 'express';
            document.getElementById('workspaceArea').style.display = isExpress ? 'none' : 'flex';
            document.getElementById('autoServiceUI').style.display = isExpress ? 'none' : 'flex';
            document.getElementById('expressUI').style.display = isExpress ? 'flex' : 'none';
        });

        // Vinculamos el botón verde (soporta ID btnWhatsApp o btnGenerarPedido)
        const btnComprar = document.getElementById('btnGenerarPedido') || document.getElementById('btnWhatsApp');
        if(btnComprar) btnComprar.addEventListener('click', () => CommerceEngine.procesarCompra());

        document.getElementById('imageLoader').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => EditorCore.cargarImagenBase64(event.target.result);
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        document.getElementById('fontLoader').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fontName = 'CustomFont_' + AppState.fuentesCargadas++;
            try {
                const loadedFace = await new FontFace(fontName, await file.arrayBuffer()).load();
                document.fonts.add(loadedFace);
                const select = document.getElementById('textFont');
                select.appendChild(new Option(file.name.split('.')[0] + ' (Tuya)', fontName));
                select.value = fontName;
                const obj = canvas.getActiveObject();
                if (obj && obj.type === 'i-text') { obj.set('fontFamily', fontName); canvas.renderAll(); window.actualizarVistaPrevia(); }
            } catch (err) { alert("Error al cargar la fuente."); }
            e.target.value = '';
        });

        document.getElementById('textColor').addEventListener('input', (e) => this.actualizarPropiedadTexto('fill', e.target.value));
        document.getElementById('textFont').addEventListener('change', (e) => this.actualizarPropiedadTexto('fontFamily', e.target.value));
        document.getElementById('textShadow').addEventListener('change', (e) => {
            const shadow = e.target.checked ? new fabric.Shadow({ color:'rgba(0,0,0,0.8)', blur:4, offsetX:3, offsetY:3 }) : null;
            this.actualizarPropiedadTexto('shadow', shadow);
        });

        const eventosCanvas = ['object:modified', 'object:added', 'object:removed', 'text:changed', 'selection:cleared'];
        eventosCanvas.forEach(ev => canvas.on(ev, window.actualizarVistaPrevia));
        canvas.on('selection:created', this.sincronizarPanelTexto);
        canvas.on('selection:updated', this.sincronizarPanelTexto);

        // -----------------------------------------------------
        // ⚡ MODO DIOS: LECTURA DE JSON Y EXPORTACIÓN ALTA CALIDAD
        // -----------------------------------------------------
        const inputCargarPedido = document.getElementById('inputCargarPedido');
        if (inputCargarPedido) {
            inputCargarPedido.addEventListener('change', function(evento) {
                const archivo = evento.target.files[0];
                if (!archivo) return;
                const lector = new FileReader();
                lector.onload = function(e) {
                    const contenidoJson = e.target.result;
                    canvas.loadFromJSON(contenidoJson, function() {
                        canvas.renderAll();
                        window.actualizarVistaPrevia();
                        alert("¡Diseño del cliente cargado con éxito en el lienzo!");
                    });
                };
                lector.readAsText(archivo);
            });
        }

        const btnAdmin = document.getElementById('btnDescargarAdmin');
        if (btnAdmin) {
            btnAdmin.addEventListener('click', () => {
                canvas.discardActiveObject();
                canvas.renderAll();

                // 1. Extraemos el diseño en alta resolución (x5)
                const dataUrlNormal = canvas.toDataURL({ format: 'png', multiplier: 5 });

                // 2. Creamos un lienzo invisible en memoria
                const imgTemp = new Image();
                imgTemp.onload = function() {
                    const canvasEspejo = document.createElement('canvas');
                    canvasEspejo.width = imgTemp.width;
                    canvasEspejo.height = imgTemp.height;
                    const ctx = canvasEspejo.getContext('2d');

                    // 3. Aplicamos la transformación de espejo (Flip horizontal)
                    ctx.translate(canvasEspejo.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(imgTemp, 0, 0);

                    // 4. Descargamos el archivo final ya volteado
                    const link = document.createElement('a');
                    link.download = `CtrlGeek_ModoEspejo_${Date.now()}.png`;
                    link.href = canvasEspejo.toDataURL('image/png');
                    link.click();
                };
                imgTemp.src = dataUrlNormal;
            });
        }
    },
    actualizarPropiedadTexto: function(prop, valor) {
        const o = canvas.getActiveObject();
        if (o && o.type === 'i-text') { o.set(prop, valor); canvas.renderAll(); }
    },
    sincronizarPanelTexto: function(e) {
        const objActivo = e.selected[0];
        if (objActivo && objActivo.type === 'i-text') {
            document.getElementById('textColor').value = objActivo.fill;
            document.getElementById('textFont').value = objActivo.fontFamily;
            document.getElementById('textShadow').checked = objActivo.shadow !== null;
        }
    },
    renderizarCatalogoDinamico: function() {
        if (!AppState.datosPlataforma || !AppState.datosPlataforma.catalogoEditor) return;
        const grid = document.querySelector('.catalog-grid');
        grid.innerHTML = '';
        AppState.datosPlataforma.catalogoEditor.forEach(ruta => {
            const item = document.createElement('div');
            item.className = 'catalog-item';
            item.onclick = () => window.cargarDisenoCatalogo(ruta);
            const img = document.createElement('img');
            img.src = ruta; img.alt = "Diseño Catálogo";
            item.appendChild(img); grid.appendChild(item);
        });
    }
};

// ==========================================
// 7. ARRANQUE DEL SISTEMA (BOOTSTRAP)
// ==========================================
inicializarSistema();
Motor3D.iniciar();
UICore.iniciarListeners();