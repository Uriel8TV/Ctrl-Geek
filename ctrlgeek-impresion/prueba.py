from articulos_config import CATALOGO_ARTICULOS
from pdf_generator import generar_pdf_produccion
import os

# Asegúrate de tener una imagen llamada "test_image.png" en la misma carpeta
test_image_path = "test_image.png"

if os.path.exists(test_image_path):
    print("Iniciando prueba de generación PDF...")
    # Prueba 1: Taza de 11 oz (A4)
    print("Generando Taza 11 oz...")
    config_taza = CATALOGO_ARTICULOS["taza_11oz"]
    disenos_taza = [{"ruta": test_image_path, "cantidad": 3}]
    generar_pdf_produccion(disenos_taza, config_taza, "prueba_taza_11oz.pdf", aplicar_espejo=True)

    # Prueba 2: Lienzo DTF (1 metro)
    print("Generando Lienzo DTF...")
    config_dtf = CATALOGO_ARTICULOS["dtf_metro"]
    disenos_dtf = [{"ruta": test_image_path, "cantidad": 6}]
    generar_pdf_produccion(disenos_dtf, config_dtf, "prueba_dtf_metro.pdf", aplicar_espejo=False, ancho_custom_cm=27.0,
                           alto_custom_cm=32.0)

    print("¡Pruebas exitosas! Revisa los PDFs generados.")
else:
    print(f"Por favor, coloca una imagen llamada '{test_image_path}' en esta carpeta para hacer la prueba.")