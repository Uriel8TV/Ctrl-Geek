// renderer.js - Suite A4 Completa con Diseño Adaptativo - Ctrl-Geek / Core-Tech
document.addEventListener("DOMContentLoaded", () => {
    const tabTazasBtn = document.getElementById("tabTazasBtn");
    const tabPlayerasBtn = document.getElementById("tabPlayerasBtn");
    const moduloTazas = document.getElementById("moduloTazas");
    const moduloPlayeras = document.getElementById("moduloPlayeras");
    const chkEspejo = document.getElementById("chkEspejo");

    // --- NAVEGACIÓN ENTRE PESTAÑAS ---
    if (tabTazasBtn && tabPlayerasBtn) {
        tabTazasBtn.addEventListener("click", () => {
            tabTazasBtn.classList.add("active");
            tabPlayerasBtn.classList.remove("active");
            moduloTazas.classList.add("active");
            moduloPlayeras.classList.remove("active");
        });

        tabPlayerasBtn.addEventListener("click", () => {
            tabPlayerasBtn.classList.add("active");
            tabTazasBtn.classList.remove("active");
            moduloPlayeras.classList.add("active");
            moduloTazas.classList.remove("active");
        });
    }

    // --- MÓDULO 1: TAZAS (3x1 A4) ---
    const dropZoneTazas = document.getElementById("dropZoneTazas");
    const gridTazas = document.getElementById("gridTazas");
    const btnPdfTazas = document.getElementById("btnPdfTazas");
    let listaTazas = [];

    configurarDragDrop(dropZoneTazas, (files) => procesarArchivosTazas(files));

    function procesarArchivosTazas(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                listaTazas.push({
                    id: Date.now() + Math.random(),
                    nombre: file.name,
                    src: e.target.result,
                    cantidad: 1
                });
                renderTazas();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderTazas() {
        gridTazas.innerHTML = "";
        let total = 0;

        listaTazas.forEach((item, index) => {
            total += item.cantidad;
            const card = crearCardBase(item.nombre, item.src);
            const controls = card.querySelector(".controls-box");

            const qtyBox = document.createElement("div");
            qtyBox.style.cssText = "display:flex; align-items:center; gap:8px;";

            const btnMinus = document.createElement("button");
            btnMinus.textContent = "➖";
            btnMinus.onclick = () => { item.cantidad = Math.max(1, item.cantidad - 1); renderTazas(); };

            const qtyText = document.createElement("span");
            qtyText.style.cssText = "font-weight:bold; color:#569cd6;";
            qtyText.textContent = `${item.cantidad} pza(s)`;

            const btnPlus = document.createElement("button");
            btnPlus.textContent = "➕";
            btnPlus.onclick = () => { item.cantidad += 1; renderTazas(); };

            const btnRemove = document.createElement("button");
            btnRemove.textContent = "❌ Quitar";
            btnRemove.style.cssText = "background:#c5221f; color:white; border:none; border-radius:3px; padding:3px 8px; cursor:pointer; margin-left:auto;";
            btnRemove.onclick = () => { listaTazas.splice(index, 1); renderTazas(); };

            qtyBox.appendChild(btnMinus);
            qtyBox.appendChild(qtyText);
            qtyBox.appendChild(btnPlus);
            qtyBox.appendChild(btnRemove);
            controls.appendChild(qtyBox);

            gridTazas.appendChild(card);
        });

        const hojas = Math.ceil(total / 3);
        const sobrantes = (3 - (total % 3)) % 3;

        if (total === 0) {
            btnPdfTazas.disabled = true;
            btnPdfTazas.textContent = "🚀 Generar PDF Tazas (0 pzs)";
        } else {
            btnPdfTazas.disabled = false;
            let aviso = sobrantes > 0 ? ` (⚠️ Quedan ${sobrantes} espacio(s) libres)` : " (¡Hoja Llena!)";
            btnPdfTazas.textContent = `🚀 Generar PDF Tazas (${total} tazas - ${hojas} Hoja(s) A4)${aviso}`;
        }
    }

    if (btnPdfTazas) {
        btnPdfTazas.addEventListener("click", async () => {
            if (listaTazas.length === 0) return;
            btnPdfTazas.disabled = true;
            btnPdfTazas.textContent = "⏳ Generando PDF Tazas...";

            let secuencia = [];
            listaTazas.forEach(item => { for (let i = 0; i < item.cantidad; i++) secuencia.push(item.src); });

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const ANCHO_TAZA = 200, ALTO_TAZA = 94, MARGIN_X = 5, MARGIN_Y_BASE = 4;
            const totalHojas = Math.ceil(secuencia.length / 3);
            let idx = 0;

            for (let h = 0; h < totalHojas; h++) {
                if (h > 0) doc.addPage();
                for (let fila = 0; fila < 3; fila++) {
                    if (idx >= secuencia.length) break;
                    const imgData = secuencia[idx];
                    const posY = 5 + fila * (ALTO_TAZA + MARGIN_Y_BASE);

                    if (chkEspejo && chkEspejo.checked) {
                        const imgEspejo = await procesarEspejoCanvas(imgData);
                        doc.addImage(imgEspejo, 'PNG', MARGIN_X, posY, ANCHO_TAZA, ALTO_TAZA);
                    } else {
                        doc.addImage(imgData, 'PNG', MARGIN_X, posY, ANCHO_TAZA, ALTO_TAZA);
                    }

                    // --- GUÍAS TENUES HORIZONTALES ÚNICAMENTE (Sin marcos laterales) ---
                    doc.setDrawColor(210, 210, 210);
                    doc.setLineWidth(0.2);
                    doc.setLineDashPattern([2, 2], 0); // Estilo punteado tenue

                    // Línea horizontal inferior y superior
                    doc.line(MARGIN_X, posY, MARGIN_X + ANCHO_TAZA, posY);
                    doc.line(MARGIN_X, posY + ALTO_TAZA, MARGIN_X + ANCHO_TAZA, posY + ALTO_TAZA);

                    doc.setLineDashPattern([], 0); // Resetear patrón a solido
                    idx++;
                }
            }

                // Genera sello de fecha y hora exacta (ej: 2026-11-10_18-45-12)
                const timeStamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
                doc.save(`Tazas_Produccion_A4_${timeStamp}.pdf`);
                renderTazas();
        });
    }

    // --- MÓDULO 2: PLAYERAS, LOGOS Y DISEÑO ADAPTATIVO ---
    const dropZonePlayeras = document.getElementById("dropZonePlayeras");
    const gridPlayeras = document.getElementById("gridPlayeras");
    const btnPdfPlayeras = document.getElementById("btnPdfPlayeras");
    let listaPlayeras = [];

    configurarDragDrop(dropZonePlayeras, (files) => procesarArchivosPlayeras(files));

    function procesarArchivosPlayeras(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                listaPlayeras.push({
                    id: Date.now() + Math.random(),
                    nombre: file.name,
                    src: e.target.result,
                    cantidad: 1,
                    tipo: "adulto",
                    customW: 8,
                    customH: 12
                });
                renderPlayeras();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderPlayeras() {
        gridPlayeras.innerHTML = "";
        let totalHojasA4 = 0;
        let resumenMensajeSobrantes = [];

        listaPlayeras.forEach((item, index) => {
            const card = crearCardBase(item.nombre, item.src);
            const controls = card.querySelector(".controls-box");

            const typeBox = document.createElement("div");
            typeBox.style.cssText = "display:flex; gap:8px; font-size:11px; margin-bottom:5px; flex-wrap:wrap;";
            typeBox.innerHTML = `
                <label style="cursor:pointer;"><input type="radio" name="tipo_${item.id}" value="adulto" ${item.tipo === 'adulto' ? 'checked' : ''}> 👤 Adulto (A4)</label>
                <label style="cursor:pointer;"><input type="radio" name="tipo_${item.id}" value="nino" ${item.tipo === 'nino' ? 'checked' : ''}> 👶 Niño (16x22)</label>
                <label style="cursor:pointer;"><input type="radio" name="tipo_${item.id}" value="logo" ${item.tipo === 'logo' ? 'checked' : ''}> 🏷️ Logo (9x9)</label>
                <label style="cursor:pointer;"><input type="radio" name="tipo_${item.id}" value="adaptativo" ${item.tipo === 'adaptativo' ? 'checked' : ''}> 📐 Adaptativo</label>
            `;

            typeBox.querySelectorAll("input").forEach(r => {
                r.onchange = (e) => {
                    item.tipo = e.target.value;
                    renderPlayeras();
                };
            });

            controls.appendChild(typeBox);

            if (item.tipo === "adaptativo") {
                const customBox = document.createElement("div");
                customBox.style.cssText = "display:flex; align-items:center; gap:8px; font-size:11px; color:#569cd6; background:#1e1e1e; padding:4px 8px; border-radius:4px; margin-bottom:5px;";
                customBox.innerHTML = `
                    <span>Medida:</span>
                    <input type="number" value="${item.customW}" min="1" max="20" step="0.5" style="width:45px; text-align:center;"> cm (Ancho) ×
                    <input type="number" value="${item.customH}" min="1" max="28.5" step="0.5" style="width:45px; text-align:center;"> cm (Alto)
                `;

                const inputs = customBox.querySelectorAll("input");
                inputs[0].onchange = (e) => { item.customW = Math.max(1, parseFloat(e.target.value) || 1); renderPlayeras(); };
                inputs[1].onchange = (e) => { item.customH = Math.max(1, parseFloat(e.target.value) || 1); renderPlayeras(); };

                controls.appendChild(customBox);
            }

            const qtyBox = document.createElement("div");
            qtyBox.style.cssText = "display:flex; align-items:center; gap:8px;";

            const btnMinus = document.createElement("button");
            btnMinus.textContent = "➖";
            btnMinus.onclick = () => { item.cantidad = Math.max(1, item.cantidad - 1); renderPlayeras(); };

            const qtyText = document.createElement("span");
            qtyText.style.cssText = "font-weight:bold; color:#569cd6;";
            qtyText.textContent = `${item.cantidad} pza(s)`;

            const btnPlus = document.createElement("button");
            btnPlus.textContent = "➕";
            btnPlus.onclick = () => { item.cantidad += 1; renderPlayeras(); };

            const btnRemove = document.createElement("button");
            btnRemove.textContent = "❌ Quitar";
            btnRemove.style.cssText = "background:#c5221f; color:white; border:none; border-radius:3px; padding:3px 8px; cursor:pointer; margin-left:auto;";
            btnRemove.onclick = () => { listaPlayeras.splice(index, 1); renderPlayeras(); };

            qtyBox.appendChild(btnMinus);
            qtyBox.appendChild(qtyText);
            qtyBox.appendChild(btnPlus);
            qtyBox.appendChild(btnRemove);

            controls.appendChild(qtyBox);
            gridPlayeras.appendChild(card);

            if (item.tipo === "adulto" || item.tipo === "nino") {
                totalHojasA4 += item.cantidad;
            } else if (item.tipo === "logo") {
                const capacidad = 6;
                const h = Math.ceil(item.cantidad / capacidad);
                const s = (capacidad - (item.cantidad % capacidad)) % capacidad;
                totalHojasA4 += h;
                if (s > 0) resumenMensajeSobrantes.push(`Logo 9x9: libre ${s} pz(s)`);
            } else if (item.tipo === "adaptativo") {
                const cols = Math.floor(20.0 / item.customW) || 1;
                const filas = Math.floor(28.5 / item.customH) || 1;
                const capacidad = cols * filas;

                const h = Math.ceil(item.cantidad / capacidad);
                const s = (capacidad - (item.cantidad % capacidad)) % capacidad;
                totalHojasA4 += h;
                if (s > 0) resumenMensajeSobrantes.push(`${item.customW}x${item.customH}cm: libre ${s} pz(s)`);
            }
        });

        if (listaPlayeras.length === 0) {
            btnPdfPlayeras.disabled = true;
            btnPdfPlayeras.textContent = "🚀 Generar PDF Textil / Adaptativo (0 pzs)";
        } else {
            btnPdfPlayeras.disabled = false;
            let aviso = resumenMensajeSobrantes.length > 0 ? ` (⚠️ ${resumenMensajeSobrantes.join(" | ")})` : " (¡Hojas Llenas!)";
            btnPdfPlayeras.textContent = `🚀 Generar PDF Producción (${totalHojasA4} Hoja(s) A4)${aviso}`;
        }
    }

    if (btnPdfPlayeras) {
        btnPdfPlayeras.addEventListener("click", async () => {
            if (listaPlayeras.length === 0) return;
            btnPdfPlayeras.disabled = true;
            btnPdfPlayeras.textContent = "⏳ Generando PDF Adaptativo...";

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const PAGE_W = 210, PAGE_H = 297;

            let primeraPagina = true;

            for (let item of listaPlayeras) {
                if (item.tipo === "adulto" || item.tipo === "nino") {
                    for (let i = 0; i < item.cantidad; i++) {
                        if (!primeraPagina) doc.addPage();
                        primeraPagina = false;

                        let w = item.tipo === "nino" ? 160 : 200;
                        let h = item.tipo === "nino" ? 220 : 285;
                        let x = (PAGE_W - w) / 2;
                        let y = (PAGE_H - h) / 2;

                        const imgData = chkEspejo.checked ? await procesarEspejoCanvas(item.src) : item.src;
                        doc.addImage(imgData, 'PNG', x, y, w, h);
                    }
                } else if (item.tipo === "logo") {
                    const totalHojas = Math.ceil(item.cantidad / 6);
                    let idx = 0;
                    for (let h = 0; h < totalHojas; h++) {
                        if (!primeraPagina) doc.addPage();
                        primeraPagina = false;

                        const POSICIONES = [
                            { x: 10, y: 10 },   { x: 110, y: 10 },
                            { x: 10, y: 104 },  { x: 110, y: 104 },
                            { x: 10, y: 198 },  { x: 110, y: 198 }
                        ];

                        for (let pos = 0; pos < 6; pos++) {
                            if (idx >= item.cantidad) break;
                            const { x, y } = POSICIONES[pos];
                            const imgData = chkEspejo.checked ? await procesarEspejoCanvas(item.src) : item.src;
                            doc.addImage(imgData, 'PNG', x, y, 90, 90);

                            // --- MUESCAS / RAYITAS AL INICIO Y AL FINAL (Arriba y abajo) ---
                            const LONGITUD_MARCA = 4; // Largo de la muesca en mm
                            doc.setDrawColor(180, 180, 180); // Gris tenue
                            doc.setLineWidth(0.2);

                            // Esquinas inferiores (inicio y fin)
                            doc.line(x, y, x + LONGITUD_MARCA, y);
                            doc.line(x + 90 - LONGITUD_MARCA, y, x + 90, y);

                            // Esquinas superiores (inicio y fin)
                            doc.line(x, y + 90, x + LONGITUD_MARCA, y + 90);
                            doc.line(x + 90 - LONGITUD_MARCA, y + 90, x + 90, y + 90);

                            idx++;
                        }
                    }
                } else if (item.tipo === "adaptativo") {
                    const wMM = item.customW * 10;
                    const hMM = item.customH * 10;
                    const cols = Math.floor(200 / wMM) || 1;
                    const filas = Math.floor(285 / hMM) || 1;
                    const capacidadHoja = cols * filas;

                    const totalHojas = Math.ceil(item.cantidad / capacidadHoja);
                    const marginXBase = (PAGE_W - (cols * wMM)) / 2;
                    const marginYBase = (PAGE_H - (filas * hMM)) / 2;

                    let idx = 0;
                    for (let h = 0; h < totalHojas; h++) {
                        if (!primeraPagina) doc.addPage();
                        primeraPagina = false;

                        for (let f = 0; f < filas; f++) {
                            for (let c = 0; c < cols; c++) {
                                if (idx >= item.cantidad) break;
                                const x = marginXBase + (c * wMM);
                                const y = marginYBase + (f * hMM);

                                const imgData = chkEspejo.checked ? await procesarEspejoCanvas(item.src) : item.src;
                                doc.addImage(imgData, 'PNG', x, y, wMM, hMM);

                                // --- GUÍAS TENUES HORIZONTALES (Sin marco cerrado) ---
                                doc.setDrawColor(210, 210, 210);
                                doc.setLineWidth(0.2);
                                doc.setLineDashPattern([2, 2], 0);

                                doc.line(x, y, x + wMM, y);
                                doc.line(x, y + hMM, x + wMM, y + hMM);

                                doc.setLineDashPattern([], 0);
                                idx++;
                            }
                        }
                    }
                }
            }

            const timeStamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
            doc.save(`Produccion_A4_${timeStamp}.pdf`);
            renderPlayeras();
        });
    }

    // --- FUNCIONES AUXILIARES ---
    function configurarDragDrop(element, callback) {
        if (!element) return;
        ["dragenter", "dragover", "dragleave", "drop"].forEach(name => {
            element.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
        });
        element.addEventListener("drop", (e) => callback(e.dataTransfer.files));
        element.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file"; input.multiple = true;
            input.accept = "image/png, image/jpeg, image/webp";
            input.onchange = (e) => callback(e.target.files);
            input.click();
        });
    }

    function crearCardBase(nombre, src) {
        const card = document.createElement("div");
        card.style.cssText = "background:#252526; border:1px solid #444; border-radius:6px; padding:10px; display:flex; align-items:center; gap:15px; width:460px;";

        const imgBox = document.createElement("div");
        imgBox.style.cssText = "width:100px; height:80px; overflow:hidden; border-radius:4px; border:1px solid #555;";
        const img = document.createElement("img");
        img.src = src; img.style.cssText = "width:100%; height:100%; object-fit:contain;";
        imgBox.appendChild(img);

        const controlsBox = document.createElement("div");
        controlsBox.className = "controls-box";
        controlsBox.style.cssText = "display:flex; flex-direction:column; gap:5px; flex:1;";

        const title = document.createElement("span");
        title.style.cssText = "font-size:12px; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px; font-weight:bold;";
        title.textContent = nombre;
        controlsBox.appendChild(title);

        card.appendChild(imgBox);
        card.appendChild(controlsBox);
        return card;
    }

    function procesarEspejoCanvas(src) {
        return new Promise(resolve => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width; canvas.height = img.height;
                ctx.translate(img.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = src;
        });
    }
});