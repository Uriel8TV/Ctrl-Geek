import math
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm


def generar_pdf_tarjetas(ruta_frente, ruta_vuelta, ruta_salida_pdf, offset_x_mm=0.0, offset_y_mm=0.0):
    CARD_WIDTH = 90 * mm
    CARD_HEIGHT = 50 * mm
    COLS = 2
    ROWS = 5

    PAGE_WIDTH, PAGE_HEIGHT = letter  # 215.9 x 279.4 mm

    grid_total_width = COLS * CARD_WIDTH  # 180 mm
    grid_total_height = ROWS * CARD_HEIGHT  # 250 mm
    margin_x = (PAGE_WIDTH - grid_total_width) / 2.0
    margin_y = (PAGE_HEIGHT - grid_total_height) / 2.0

    pdf = canvas.Canvas(ruta_salida_pdf, pagesize=letter)

    offset_x = offset_x_mm * mm
    offset_y = offset_y_mm * mm

    def dibujar_rejilla(img_path, es_frente=True):
        dx = 0.0 if es_frente else offset_x
        dy = 0.0 if es_frente else offset_y

        for row in range(ROWS - 1, -1, -1):
            for col in range(COLS):
                x = margin_x + col * CARD_WIDTH + dx
                y = margin_y + row * CARD_HEIGHT + dy

                # 1. Dibujar la imagen de la tarjeta
                pdf.drawImage(
                    img_path,
                    x, y,
                    width=CARD_WIDTH,
                    height=CARD_HEIGHT,
                    preserveAspectRatio=False,
                    anchor='c'
                )

                # 2. Dibujar ÚNICAMENTE muescas al principio y al final (arriba y abajo)
                if es_frente:
                    pdf.setStrokeColorRGB(0.7, 0.7, 0.7)  # Gris tenue visible
                    pdf.setLineWidth(0.5)
                    pdf.setDash([])  # Trazo continuo (sin punteado)

                    LONGITUD_MARCA = 4 * mm  # Largo del guion de corte (4 milímetros)

                    # --- ESQUINA INFERIOR IZQUIERDA Y DERECHA ---
                    # Rayita inferior inicio (izquierda)
                    pdf.line(x, y, x + LONGITUD_MARCA, y)
                    # Rayita inferior fin (derecha)
                    pdf.line(x + CARD_WIDTH - LONGITUD_MARCA, y, x + CARD_WIDTH, y)

                    # --- ESQUINA SUPERIOR IZQUIERDA Y DERECHA ---
                    # Rayita superior inicio (izquierda)
                    pdf.line(x, y + CARD_HEIGHT, x + LONGITUD_MARCA, y + CARD_HEIGHT)
                    # Rayita superior fin (derecha)
                    pdf.line(x + CARD_WIDTH - LONGITUD_MARCA, y + CARD_HEIGHT, x + CARD_WIDTH, y + CARD_HEIGHT)

        # 3. Marcas perimetrales externas (Crop Marks en los bordes blancos de la hoja)
        if es_frente:
            pdf.setStrokeColorRGB(0.2, 0.2, 0.2)
            pdf.setLineWidth(0.6)
            mark_length = 8 * mm

            # Guías verticales externas
            x_cortes = [margin_x, margin_x + CARD_WIDTH, margin_x + grid_total_width]
            for xc in x_cortes:
                pdf.line(xc, margin_y + grid_total_height + 2 * mm, xc,
                         margin_y + grid_total_height + 2 * mm + mark_length)
                pdf.line(xc, margin_y - 2 * mm, xc, margin_y - 2 * mm - mark_length)

            # Guías horizontales externas
            y_cortes = [margin_y + r * CARD_HEIGHT for r in range(ROWS + 1)]
            for yc in y_cortes:
                pdf.line(margin_x - 2 * mm, yc, margin_x - 2 * mm - mark_length, yc)
                pdf.line(margin_x + grid_total_width + 2 * mm, yc, margin_x + grid_total_width + 2 * mm + mark_length,
                         yc)

    # Página 1: Frente (con guías en esquinas)
    dibujar_rejilla(ruta_frente, es_frente=True)
    pdf.showPage()

    # Página 2: Reverso (limpia, con calibración Offset)
    if ruta_vuelta:
        dibujar_rejilla(ruta_vuelta, es_frente=False)
        pdf.showPage()

    pdf.save()