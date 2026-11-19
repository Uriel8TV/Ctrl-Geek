# pdf_engine.py
import io
import os
from collections import defaultdict
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from articulos_config import obtener_info_hoja

TAMANOS_LOGO_AUTO = [9.0, 8.0, 7.0, 6.0, 5.0]
MAPA_MODOS_LOGO = {
    "AUTO": None,
    "9x9": 9.0,
    "8x8": 8.0,
    "7x7": 7.0,
    "6x6": 6.0
}


def preparar_imagen_memoria(ruta_imagen, aplicar_espejo):
    """Carga la imagen en memoria y devuelve (ImageReader, ancho_px, alto_px)."""
    try:
        img = Image.open(ruta_imagen)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        if aplicar_espejo:
            img = ImageOps.mirror(img)

        ancho_px, alto_px = img.size
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return ImageReader(buffer), ancho_px, alto_px
    except Exception as e:
        raise ValueError(f"Error al procesar la imagen {ruta_imagen}: {str(e)}")


def _rellenar_hoja_con_logos(pag, usable_w, usable_h, sep, config_logo, hoja_tipo):
    """
    Rellena el espacio vertical sobrante de una hoja existente con el logo
    sin abrir páginas nuevas. En DTF el espejo del logo se desactiva automáticamente.
    """
    pag["logos_agregados"] = 0
    pag["tamanos_logo"] = set()

    if not config_logo or not config_logo.get("activo"):
        return 0

    ruta_logo = config_logo.get("ruta", "")
    if not ruta_logo or not os.path.exists(ruta_logo):
        return 0

    modo = config_logo.get("modo", "AUTO")
    tamano_fijo = MAPA_MODOS_LOGO.get(modo)
    espejo_logo = False if hoja_tipo == "DTF" else bool(config_logo.get("espejo", True))

    agregados = 0
    while True:
        extra_sep = sep if pag["filas"] else 0.0
        alto_disponible = usable_h - pag["alto_usado"] - extra_sep
        if alto_disponible < 4.99:
            break

        if modo == "AUTO" or tamano_fijo is None:
            tam = next(
                (t for t in TAMANOS_LOGO_AUTO if t <= alto_disponible + 1e-6 and t <= usable_w + 1e-6),
                None
            )
        else:
            tam = tamano_fijo if (tamano_fijo <= alto_disponible + 1e-6 and tamano_fijo <= usable_w + 1e-6) else None

        if tam is None:
            break

        cols = int((usable_w + sep) // (tam + sep))
        if cols < 1:
            break

        items_fila = []
        x_curr = 0.0
        for _ in range(cols):
            items_fila.append({
                "ruta": ruta_logo,
                "nombre": f"Logo {tam:g}x{tam:g} cm",
                "w_eff": tam,
                "h_eff": tam,
                "x_rel": x_curr,
                "espejo": espejo_logo,
                "guias_corte": True,
                "es_logo": True
            })
            x_curr += tam + sep

        ancho_fila = cols * tam + (cols - 1) * sep
        pag["filas"].append({
            "alto": tam,
            "ancho_usado": ancho_fila,
            "items": items_fila
        })
        pag["alto_usado"] += extra_sep + tam
        pag["logos_agregados"] += cols
        pag["tamanos_logo"].add(tam)
        agregados += cols

    return agregados


def empaquetar_piezas_por_hoja(piezas_expandidas, hoja_tipo, config_logo=None):
    """
    Empaque mixto por filas (First-Fit Decreasing Height) + relleno opcional con logo.
    """
    info_hoja = obtener_info_hoja(hoja_tipo)
    page_w_pts, page_h_pts = info_hoja["dimensiones"]
    page_w_cm = page_w_pts / cm
    page_h_cm = page_h_pts / cm

    es_dtf = (hoja_tipo == "DTF")
    margen_borde = 0.8 if es_dtf else 0.25
    sep = 0.8 if es_dtf else 0.15  # Separación compacta en A4 (1.5 mm)

    usable_w = page_w_cm - 2 * margen_borde
    usable_h = page_h_cm - 2 * margen_borde

    ordenadas = sorted(
        piezas_expandidas,
        key=lambda p: (p["alto_cm"], p["ancho_cm"]),
        reverse=True
    )

    paginas = []

    for p in ordenadas:
        w_eff = min(float(p["ancho_cm"]), usable_w)
        h_eff = min(float(p["alto_cm"]), usable_h)
        colocada = False

        for pag in paginas:
            for fila in pag["filas"]:
                nuevo_ancho = fila["ancho_usado"] + sep + w_eff
                if nuevo_ancho <= usable_w + 1e-6 and h_eff <= fila["alto"] + 1e-6:
                    fila["items"].append({
                        **p, "w_eff": w_eff, "h_eff": h_eff,
                        "x_rel": fila["ancho_usado"] + sep, "es_logo": False
                    })
                    fila["ancho_usado"] = nuevo_ancho
                    colocada = True
                    break
            if colocada:
                break

            extra_sep = sep if pag["filas"] else 0.0
            if pag["alto_usado"] + extra_sep + h_eff <= usable_h + 1e-6:
                pag["filas"].append({
                    "alto": h_eff,
                    "ancho_usado": w_eff,
                    "items": [{**p, "w_eff": w_eff, "h_eff": h_eff, "x_rel": 0.0, "es_logo": False}]
                })
                pag["alto_usado"] += extra_sep + h_eff
                colocada = True
                break

        if not colocada:
            paginas.append({
                "alto_usado": h_eff,
                "filas": [{
                    "alto": h_eff,
                    "ancho_usado": w_eff,
                    "items": [{**p, "w_eff": w_eff, "h_eff": h_eff, "x_rel": 0.0, "es_logo": False}]
                }]
            })

    total_logos = 0
    tamanos_usados = set()
    for pag in paginas:
        total_logos += _rellenar_hoja_con_logos(pag, usable_w, usable_h, sep, config_logo, hoja_tipo)
        tamanos_usados.update(pag["tamanos_logo"])
        pag["alto_libre_cm"] = max(0.0, round(usable_h - pag["alto_usado"], 1))
        pag["sep_cm"] = sep
        pag["page_w_pts"] = page_w_pts
        pag["page_h_pts"] = page_h_pts

    return paginas, total_logos, sorted(tamanos_usados, reverse=True)


def calcular_resumen_empaque(lista_disenos, config_logo=None):
    grupos = defaultdict(list)
    for item in lista_disenos:
        hoja_tipo = item.get("hoja_tipo", "A4")
        grupos[hoja_tipo].extend([item] * item["cantidad"])

    resumen = {}
    for hoja_tipo, piezas in grupos.items():
        paginas, total_logos, tamanos_logo = empaquetar_piezas_por_hoja(piezas, hoja_tipo, config_logo)
        resumen[hoja_tipo] = {
            "hojas": len(paginas),
            "piezas": len(piezas),
            "logos_extra": total_logos,
            "tamanos_logo": tamanos_logo,
            "alto_libre_ultima_cm": paginas[-1]["alto_libre_cm"] if paginas else 0.0,
            "paginas": paginas
        }
    return resumen


def generar_pdf_produccion(lista_disenos, ruta_salida_pdf, config_logo=None):
    if not lista_disenos:
        raise ValueError("La lista de impresión está vacía.")

    resumen = calcular_resumen_empaque(lista_disenos, config_logo)
    cache_imagenes = {}

    primer_tipo = next(iter(resumen))
    primera_dim = obtener_info_hoja(primer_tipo)["dimensiones"]
    pdf = canvas.Canvas(ruta_salida_pdf, pagesize=primera_dim)

    for hoja_tipo, data in resumen.items():
        page_w, page_h = obtener_info_hoja(hoja_tipo)["dimensiones"]

        for pag in data["paginas"]:
            pdf.setPageSize((page_w, page_h))
            sep_pts = pag["sep_cm"] * cm
            bloque_h_pts = pag["alto_usado"] * cm

            y_cursor = page_h - (page_h - bloque_h_pts) / 2.0

            for fila in pag["filas"]:
                fila_h_pts = fila["alto"] * cm
                fila_w_pts = fila["ancho_usado"] * cm
                start_x = (page_w - fila_w_pts) / 2.0
                y_cursor -= fila_h_pts

                for pieza in fila["items"]:
                    clave_cache = (pieza["ruta"], pieza["espejo"])
                    if clave_cache not in cache_imagenes:
                        cache_imagenes[clave_cache] = preparar_imagen_memoria(
                            pieza["ruta"], pieza["espejo"]
                        )

                    img_reader, img_w_px, img_h_px = cache_imagenes[clave_cache]

                    w_pts = pieza["w_eff"] * cm
                    h_pts = pieza["h_eff"] * cm
                    x = start_x + pieza["x_rel"] * cm
                    y = y_cursor + (fila_h_pts - h_pts) / 2.0

                    # Si la imagen ya viene en proporción de plantilla (±20%),
                    # la ajusta exacta al borde superior/inferior sin dejar huecos.
                    # Los logos siempre conservan su proporción exacta.
                    if pieza.get("es_logo", False):
                        preservar_ratio = True
                    else:
                        ratio_img = img_w_px / max(1, img_h_px)
                        ratio_box = w_pts / max(1, h_pts)
                        diferencia = abs(ratio_img - ratio_box) / ratio_box
                        preservar_ratio = diferencia > 0.20

                    pdf.drawImage(
                        img_reader,
                        x, y,
                        width=w_pts,
                        height=h_pts,
                        mask="auto",
                        preserveAspectRatio=preservar_ratio,
                        anchor="c"
                    )

                    # Guías de corte: SOLO línea superior e inferior, muy tenues (casi blanco)
                    if pieza.get("guias_corte", False):
                        pdf.setStrokeColorRGB(0.89, 0.89, 0.89)
                        pdf.setLineWidth(0.25)
                        pdf.setDash(2, 3)
                        # Línea superior
                        pdf.line(x, y + h_pts, x + w_pts, y + h_pts)
                        # Línea inferior
                        pdf.line(x, y, x + w_pts, y)
                        pdf.setDash([])

                y_cursor -= sep_pts

            pdf.showPage()

    pdf.save()