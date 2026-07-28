// ==========================================
// CONFIGURACIÓN INICIAL DEL LIENZO (2D)
// ==========================================
const canvas = new fabric.Canvas('mugCanvas');
canvas.preserveObjectStacking = true;

// ==========================================
// LÓGICA DE IMAGEN (CON BUGFIX)
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
            canvas.centerObject(img);
            canvas.add(img);
            canvas.sendToBack(img);
            canvas.setActiveObject(img);

            // FIX: Forzamos el redibujado inmediato
            canvas.renderAll();
            actualizarVistaPrevia();
        }
    }
    reader.readAsDataURL(file);
    e.target.value = ''; // Limpiamos el input
});

// ==========================================
// LÓGICA DE ELIMINACIÓN
// ==========================================
document.getElementById('btnBorrar').addEventListener('click', function() {
    const objActivo = canvas.getActiveObject();
    if (objActivo) {
        canvas.remove(objActivo);
        canvas.discardActiveObject();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const objActivo = canvas.getActiveObject();
        if (objActivo && !objActivo.isEditing) {
            canvas.remove(objActivo);
            canvas.discardActiveObject();
        }
    }
});

// ==========================================
// LÓGICA DE EXPORTACIÓN Y PROYECTOS (JSON)
// ==========================================
document.getElementById('btnExportar').addEventListener('click', function() {
    canvas.discardActiveObject();
    canvas.renderAll();
    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 3 });
    const link = document.createElement('a');
    link.download = 'CtrlGeek-Taza-Print.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('btnGuardarProyecto').addEventListener('click', function() {
    const proyectoJSON = JSON.stringify(canvas.toJSON());
    const blob = new Blob([proyectoJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MiDiseno-CtrlGeek.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('projectLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const contenidoJSON = event.target.result;
        canvas.loadFromJSON(contenidoJSON, function() {
            canvas.renderAll();
            actualizarVistaPrevia();
            document.getElementById('projectLoader').value = '';
        });
    };
    reader.readAsText(file);
});

// ==========================================
// LÓGICA DE TEXTO
// ==========================================
document.getElementById('btnAgregarTexto').addEventListener('click', function() {
    const colorActual = document.getElementById('textColor').value;
    const fuenteActual = document.getElementById('textFont').value;
    const tieneSombreado = document.getElementById('textShadow').checked;

    const textoInteractvo = new fabric.IText('Ingresa tu texto', {
        left: 350,
        top: 150,
        fontFamily: fuenteActual,
        fill: colorActual,
        fontSize: 30,
        fontWeight: 'bold',
        shadow: tieneSombreado ? new fabric.Shadow({
            color: 'rgba(0,0,0,0.8)',
            blur: 4,
            offsetX: 3,
            offsetY: 3
        }) : null
    });

    canvas.add(textoInteractvo);
    canvas.bringToFront(textoInteractvo);
    canvas.setActiveObject(textoInteractvo);
});

document.getElementById('textColor').addEventListener('input', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        objActivo.set('fill', e.target.value);
        canvas.renderAll();
    }
});

document.getElementById('textFont').addEventListener('change', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        objActivo.set('fontFamily', e.target.value);
        canvas.renderAll();
    }
});

document.getElementById('textShadow').addEventListener('change', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        if (e.target.checked) {
            objActivo.set('shadow', new fabric.Shadow({
                color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 3, offsetY: 3
            }));
        } else {
            objActivo.set('shadow', null);
        }
        canvas.renderAll();
    }
});

function sincronizarControles(e) {
    const objActivo = e.selected[0];
    if (objActivo && objActivo.type === 'i-text') {
        document.getElementById('textColor').value = objActivo.fill;
        const fuenteLimpia = objActivo.fontFamily;
        const selectFuente = document.getElementById('textFont');

        for (let i = 0; i < selectFuente.options.length; i++) {
            if (selectFuente.options[i].value === fuenteLimpia) {
                selectFuente.selectedIndex = i;
                break;
            }
        }
        document.getElementById('textShadow').checked = objActivo.shadow !== null;
    }
}

canvas.on('selection:created', sincronizarControles);
canvas.on('selection:updated', sincronizarControles);

// ==========================================
// MOTOR 3D CON THREE.JS Y VINCULACIÓN
// ==========================================
const contenedor3D = document.getElementById('canvas3d-container');

if (contenedor3D) {
    contenedor3D.innerHTML = ''; // Limpiamos contenedor

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(45, contenedor3D.clientWidth / contenedor3D.clientHeight, 0.1, 1000);
    camara.position.set(0, 1.5, 4.5);

    const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderizador.setSize(contenedor3D.clientWidth, contenedor3D.clientHeight);
    contenedor3D.appendChild(renderizador.domElement);

    const controles = new THREE.OrbitControls(camara, renderizador.domElement);
    controles.enableZoom = true;
    controles.enablePan = false;
    controles.minDistance = 2;
    controles.maxDistance = 6;

    escena.add(new THREE.AmbientLight(0xffffff, 0.7));
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
    luzDireccional.position.set(5, 5, 5);
    escena.add(luzDireccional);

    // Vinculamos el canvas de Fabric.js como textura
    const lienzoHTML = document.getElementById('mugCanvas');
    const texturaTaza = new THREE.CanvasTexture(lienzoHTML);
    texturaTaza.anisotropy = renderizador.capabilities.getMaxAnisotropy();

   // Cilindro (Cuerpo de la taza)
    const materialCilindro = new THREE.MeshStandardMaterial({
        map: texturaTaza,
        roughness: 0.2,
        metalness: 0.0
    });

    // Creamos un material extra de color blanco para el interior/tapas
    const materialTapas = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

    const geometriaCilindro = new THREE.CylinderGeometry(1.2, 1.2, 2.5, 64);

    // Al cilindro le pasamos un arreglo: [Lado, Tapa Superior, Tapa Inferior]
    const cilindro = new THREE.Mesh(geometriaCilindro, [
        materialCilindro,
        materialTapas,
        materialTapas
    ]);

    // Asa
    const materialBlanco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const geometriaAsa = new THREE.TorusGeometry(0.75, 0.2, 16, 32);
    const asa = new THREE.Mesh(geometriaAsa, materialBlanco);
    asa.position.set(1.2, 0, 0);

    const grupoTaza = new THREE.Group();
    grupoTaza.add(cilindro);
    grupoTaza.add(asa);
    grupoTaza.rotation.y = -Math.PI / 4;
    escena.add(grupoTaza);

    function animar3D() {
        requestAnimationFrame(animar3D);
        controles.update();
        renderizador.render(escena, camara);
    }
    animar3D();

    // Exponemos la función de actualización a todo el archivo
    window.actualizarVistaPrevia = function() {
        texturaTaza.needsUpdate = true;
    };
} else {
    // Fallback por si el HTML aún no tiene el contenedor 3D
    window.actualizarVistaPrevia = function() {};
}

// Eventos que disparan la actualización del modelo 3D
canvas.on('object:modified', window.actualizarVistaPrevia);
canvas.on('object:added', window.actualizarVistaPrevia);
canvas.on('object:removed', window.actualizarVistaPrevia);
canvas.on('text:changed', window.actualizarVistaPrevia);
canvas.on('selection:cleared', window.actualizarVistaPrevia);