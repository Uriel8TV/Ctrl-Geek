const dropZone = document.getElementById('dropZone');
const previewGrid = document.getElementById('previewGrid');
const btnGenerar = document.getElementById('btnGenerar');

let imagenesCargadas = [];

// 1. Evitar que el navegador abra la imagen en pantalla completa por error
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evento => {
    dropZone.addEventListener(evento, e => { e.preventDefault(); e.stopPropagation(); }, false);
    document.body.addEventListener(evento, e => { e.preventDefault(); e.stopPropagation(); }, false);
});

// 2. Efectos visuales de la zona punteada
['dragenter', 'dragover'].forEach(evento => {
    dropZone.addEventListener(evento, () => dropZone.classList.add('dragover'), false);
});
['dragleave', 'drop'].forEach(evento => {
    dropZone.addEventListener(evento, () => dropZone.classList.remove('dragover'), false);
});

// 3. Capturar los archivos al soltarlos
dropZone.addEventListener('drop', (e) => {
    const archivos = e.dataTransfer.files;

    for (let i = 0; i < archivos.length; i++) {
        if (imagenesCargadas.length >= 3) {
            alert("⚠️ Límite alcanzado: Solo caben 3 diseños en una hoja A4.");
            break;
        }

        const archivo = archivos[i];
        if (archivo.type.startsWith('image/')) {
            const lector = new FileReader();
            lector.onload = (evento) => {
                imagenesCargadas.push(evento.target.result);
                actualizarUI();
            };
            lector.readAsDataURL(archivo);
        }
    }
});

function actualizarUI() {
    previewGrid.innerHTML = '';
    imagenesCargadas.forEach((src) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `<img src="${src}">`;
        previewGrid.appendChild(div);
    });

    btnGenerar.disabled = imagenesCargadas.length === 0;
    btnGenerar.innerText = `Generar PDF Listo para Imprimir (${imagenesCargadas.length}/3)`;
}

// 4. Construcción matemática del PDF A4
btnGenerar.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;

    // Hoja A4 vertical (210mm x 297mm)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Medidas físicas de la taza de 11oz
    const anchoTaza = 200; // 20 cm
    const altoTaza = 94;   // 9.4 cm
    const margenX = 5;     // 5mm de espacio a los bordes laterales de la hoja

    imagenesCargadas.forEach((img, i) => {
        // Cálculo del apilamiento vertical: 5mm arriba + (alto taza + 5mm separación) por cada diseño
        const margenY = 5 + (i * (altoTaza + 5));

        // Incrustar imagen en el documento
        doc.addImage(img, 'PNG', margenX, margenY, anchoTaza, altoTaza);

        // Dibujar línea punteada gris claro para recortar con guillotina o tijeras
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(margenX, margenY, anchoTaza, altoTaza);
    });

    doc.save(`CtrlGeek_Produccion_${Date.now()}.pdf`);

    // Vaciar el lienzo para el siguiente pedido
    imagenesCargadas = [];
    actualizarUI();
});