const canvas = new fabric.Canvas('mugCanvas');

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
            canvas.setActiveObject(img);
        }
    }
    reader.readAsDataURL(e.target.files[0]);
});

document.getElementById('btnExportar').addEventListener('click', function() {
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataURL = canvas.toDataURL({
        format: 'png',
        multiplier: 3
    });

    const link = document.createElement('a');
    link.download = 'CtrlGeek-Taza-Print.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});