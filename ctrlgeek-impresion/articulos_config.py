# articulos_config.py
import json
import os
import re
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

# Límites físicos reales de tus equipos
HOJAS_DISPONIBLES = {
    "A4": {
        "dimensiones": A4,                          # 21.0 x 29.7 cm (Epson L1250)
        "texto": "A4 (21 × 29.7 cm)"
    },
    "PLANCHA": {
        "dimensiones": (29.0 * cm, 38.0 * cm),      # Tope de planchado Stanew
        "texto": "Plancha (29 × 38 cm)"
    },
    "DTF": {
        "dimensiones": (58.0 * cm, 100.0 * cm),     # 1 Metro de DTF
        "texto": "Rollo DTF (58 × 100 cm)"
    }
}

CATALOGO_DEFAULT = {
    "taza_11oz": {
        "nombre": "Taza 11 oz (Clásica / Mágica)",
        "hoja_tipo": "A4",
        "ancho_cm": 20.0,
        "alto_cm": 9.4,
        "espejo_default": True,
        "guias_corte": True
    },
    "taza_9oz": {
        "nombre": "Taza 9 oz (Resistencia n.1)",
        "hoja_tipo": "A4",
        "ancho_cm": 18.5,
        "alto_cm": 8.2,
        "espejo_default": True,
        "guias_corte": True
    },
    "taza_15oz_blanca": {
        "nombre": "Taza 15 oz Blanca",
        "hoja_tipo": "A4",
        "ancho_cm": 20.5,
        "alto_cm": 11.5,
        "espejo_default": True,
        "guias_corte": True
    },
    "taza_15oz_ventana_negra": {
        "nombre": "Taza 15 oz Ventana Negra",
        "hoja_tipo": "A4",
        "ancho_cm": 19.5,
        "alto_cm": 10.5,
        "espejo_default": True,
        "guias_corte": True
    },
    "taza_viajera_16oz": {
        "nombre": "Taza Viajera 16 oz",
        "hoja_tipo": "A4",
        "ancho_cm": 20.0,
        "alto_cm": 14.0,
        "espejo_default": True,
        "guias_corte": True
    },
    "cilindro_llavero_600ml": {
        "nombre": "Cilindro Llavero Aluminio 600 ml",
        "hoja_tipo": "A4",
        "ancho_cm": 20.0,
        "alto_cm": 14.0,
        "espejo_default": True,
        "guias_corte": True
    },
    "vaso_vinero_300ml": {
        "nombre": "Vaso Vinero 300 ml (Vinera)",
        "hoja_tipo": "A4",
        "ancho_cm": 20.0,
        "alto_cm": 7.5,
        "espejo_default": True,
        "guias_corte": True
    },
    "gorra": {
        "nombre": "Gorra Trucker (Frente)",
        "hoja_tipo": "A4",
        "ancho_cm": 12.0,
        "alto_cm": 6.5,
        "espejo_default": True,
        "guias_corte": True
    },
    "playera_nino": {
        "nombre": "Playera Niño",
        "hoja_tipo": "A4",
        "ancho_cm": 18.0,
        "alto_cm": 24.0,
        "espejo_default": True,
        "guias_corte": False
    },
    "playera_adulto": {
        "nombre": "Playera Adulto (Sublimación A4)",
        "hoja_tipo": "A4",
        "ancho_cm": 20.5,
        "alto_cm": 29.0,
        "espejo_default": True,
        "guias_corte": False
    },
    "cojin": {
        "nombre": "Cojín (Tope Plancha 29×38 cm)",
        "hoja_tipo": "PLANCHA",
        "ancho_cm": 28.0,
        "alto_cm": 37.0,
        "espejo_default": True,
        "guias_corte": False
    },
    "plato_8": {
        "nombre": "Plato Cerámica 8\" (20 cm)",
        "hoja_tipo": "A4",
        "ancho_cm": 13.0,
        "alto_cm": 13.0,
        "espejo_default": True,
        "guias_corte": True
    },
    "dtf_metro": {
        "nombre": "🧵 Lienzo DTF Textil (1 Metro: 58 × 100 cm)",
        "hoja_tipo": "DTF",
        "ancho_cm": 27.0,
        "alto_cm": 32.0,
        "espejo_default": False,
        "guias_corte": True
    }
}

CONFIG_APP_DEFAULT = {
    "activo": False,
    "ruta": "",
    "modo": "AUTO",      # AUTO | 9x9 | 8x8 | 7x7 | 6x6
    "espejo": True,
    "tema": "oscuro"     # oscuro | claro
}


def obtener_directorio_base():
    """Usa la carpeta del .exe si está compilado con PyInstaller, o la del script."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def obtener_info_hoja(hoja_tipo):
    return HOJAS_DISPONIBLES.get(hoja_tipo, HOJAS_DISPONIBLES["A4"])


def cargar_catalogo():
    ruta = os.path.join(obtener_directorio_base(), "catalogo_articulos.json")
    if not os.path.exists(ruta):
        guardar_catalogo(CATALOGO_DEFAULT)
        return dict(CATALOGO_DEFAULT)

    try:
        with open(ruta, "r", encoding="utf-8") as f:
            data = json.load(f)

        actualizado = False
        for k, v in CATALOGO_DEFAULT.items():
            if k not in data:
                data[k] = v
                actualizado = True

        # Actualiza automáticamente la medida anterior de 11 oz (9.5 -> 9.4)
        if "taza_11oz" in data and data["taza_11oz"].get("alto_cm") == 9.5:
            data["taza_11oz"]["alto_cm"] = 9.4
            actualizado = True

        if actualizado:
            guardar_catalogo(data)
        return data
    except Exception:
        return dict(CATALOGO_DEFAULT)


def guardar_catalogo(catalogo):
    ruta = os.path.join(obtener_directorio_base(), "catalogo_articulos.json")
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(catalogo, f, indent=2, ensure_ascii=False)


def agregar_producto_catalogo(catalogo, nombre, hoja_tipo, ancho_cm, alto_cm,
                              espejo_default=True, guias_corte=True):
    slug = re.sub(r"[^a-z0-9]+", "_", nombre.lower().strip()).strip("_") or "producto"
    clave = slug
    contador = 2
    while clave in catalogo:
        clave = f"{slug}_{contador}"
        contador += 1

    catalogo[clave] = {
        "nombre": nombre.strip(),
        "hoja_tipo": hoja_tipo,
        "ancho_cm": round(float(ancho_cm), 2),
        "alto_cm": round(float(alto_cm), 2),
        "espejo_default": bool(espejo_default),
        "guias_corte": bool(guias_corte)
    }
    guardar_catalogo(catalogo)
    return clave


def cargar_config_logo():
    ruta = os.path.join(obtener_directorio_base(), "config_logo.json")
    if not os.path.exists(ruta):
        return dict(CONFIG_APP_DEFAULT)
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {**CONFIG_APP_DEFAULT, **data}
    except Exception:
        return dict(CONFIG_APP_DEFAULT)


def guardar_config_logo(config_logo):
    ruta = os.path.join(obtener_directorio_base(), "config_logo.json")
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(config_logo, f, indent=2, ensure_ascii=False)