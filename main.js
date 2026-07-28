const canvas = new fabric.Canvas('mugCanvas');
canvas.preserveObjectStacking = true;

// --- LÓGICA DE IMAGEN ---
document.getElementById('imageLoader').addEventListener('change', function(e) {
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
        }
    }
    reader.readAsDataURL(e.target.files[0]);
});

// --- LÓGICA DE ELIMINACIÓN ---
// Eliminar mediante el botón rojo
document.getElementById('btnBorrar').addEventListener('click', function() {
    const objActivo = canvas.getActiveObject();
    if (objActivo) {
        canvas.remove(objActivo);
        canvas.discardActiveObject();
    }
});

// Eliminar mediante el teclado (Suprimir o Retroceso)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const objActivo = canvas.getActiveObject();
        // Validamos que exista un objeto activo y que el usuario NO esté editando texto
        if (objActivo && !objActivo.isEditing) {
            canvas.remove(objActivo);
            canvas.discardActiveObject();
        }
    }
});

// --- LÓGICA DE EXPORTACIÓN ---
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

// --- LÓGICA DE TEXTO ---
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
        // Si el checkbox está marcado al crear el texto, le pone sombra
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

// Cambiar color en tiempo real
document.getElementById('textColor').addEventListener('input', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        objActivo.set('fill', e.target.value);
        canvas.renderAll();
    }
});

// Cambiar tipografía en tiempo real
document.getElementById('textFont').addEventListener('change', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        objActivo.set('fontFamily', e.target.value);
        canvas.renderAll();
    }
});

// Cambiar sombreado en tiempo real
document.getElementById('textShadow').addEventListener('change', function(e) {
    const objActivo = canvas.getActiveObject();
    if (objActivo && objActivo.type === 'i-text') {
        if (e.target.checked) {
            objActivo.set('shadow', new fabric.Shadow({
                color: 'rgba(0,0,0,0.8)',
                blur: 4,
                offsetX: 3,
                offsetY: 3
            }));
        } else {
            objActivo.set('shadow', null);
        }
        canvas.renderAll();
    }
});

// Sincronizar la barra de herramientas al seleccionar un objeto
function sincronizarControles(e) {
    const objActivo = e.selected[0];
    if (objActivo && objActivo.type === 'i-text') {
        document.getElementById('textColor').value = objActivo.fill;
        // Ajustamos el valor del select para que coincida con la fuente de Fabric
        const fuenteLimpia = objActivo.fontFamily;
        const selectFuente = document.getElementById('textFont');

        // Buscar la opción correcta en el select
        for (let i = 0; i < selectFuente.options.length; i++) {
            if (selectFuente.options[i].value === fuenteLimpia) {
                selectFuente.selectedIndex = i;
                break;
            }
        }

        // Actualizar el checkbox de sombreado
        document.getElementById('textShadow').checked = objActivo.shadow !== null;
    }
}

canvas.on('selection:created', sincronizarControles);
canvas.on('selection:updated', sincronizarControles);

// ==========================================
// NUEVAS FUNCIONES: VISTA PREVIA Y PROYECTOS
// ==========================================

/**
 * VISTA PREVIA EN TIEMPO REAL
 * Convierte el lienzo actual a una imagen y la aplica como fondo
 * a nuestra taza dibujada con CSS.
 */
function actualizarVistaPrevia() {
    // Generamos una imagen de baja resolución solo para la vista previa
    const dataURL = canvas.toDataURL({ format: 'png', multiplier: 0.5 });
    // Se la asignamos al div de la taza simulada
    document.getElementById('cssMug').style.backgroundImage = `url(${dataURL})`;
}

// Escuchamos los eventos del lienzo para actualizar la taza en vivo.
// Cada vez que un objeto se mueve, se escala, se añade o se modifica el texto:
canvas.on('object:modified', actualizarVistaPrevia);
canvas.on('object:added', actualizarVistaPrevia);
canvas.on('object:removed', actualizarVistaPrevia);
canvas.on('text:changed', actualizarVistaPrevia);
canvas.on('selection:cleared', actualizarVistaPrevia);

/**
 * GUARDAR PROYECTO (JSON)
 * Serializa todo el estado del lienzo (objetos, colores, fuentes)
 * en un archivo .json editable.
 */
document.getElementById('btnGuardarProyecto').addEventListener('click', function() {
    // 1. Convertimos el canvas a un objeto JSON
    const proyectoJSON = JSON.stringify(canvas.toJSON());

    // 2. Creamos un archivo Blob con esa información
    const blob = new Blob([proyectoJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 3. Forzamos la descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MiDiseno-CtrlGeek.json'; // Extensión .json
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

/**
 * CARGAR PROYECTO (JSON)
 * Lee un archivo .json subido por el usuario y reconstruye el lienzo.
 */
document.getElementById('projectLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const contenidoJSON = event.target.result;

        // Cargamos el JSON al canvas
        canvas.loadFromJSON(contenidoJSON, function() {
            canvas.renderAll();
            actualizarVistaPrevia(); // Actualizamos la taza CSS

            // Limpiamos el input por si quiere volver a cargar el mismo archivo
            document.getElementById('projectLoader').value = '';
        });
    };
    reader.readAsText(file);
});