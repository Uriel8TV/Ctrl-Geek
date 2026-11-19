# main.py
import os
import datetime
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from articulos_config import (
    HOJAS_DISPONIBLES,
    cargar_catalogo,
    agregar_producto_catalogo,
    obtener_info_hoja,
    cargar_config_logo,
    guardar_config_logo
)
from pdf_engine import generar_pdf_produccion, calcular_resumen_empaque

OPCIONES_TAMANO_LOGO = {
    "Auto (9×9 → 8×8 → adaptable)": "AUTO",
    "Fijo 9×9 cm": "9x9",
    "Fijo 8×8 cm": "8x8",
    "Fijo 7×7 cm": "7x7",
    "Fijo 6×6 cm": "6x6"
}

TEMAS = {
    "oscuro": {
        "bg": "#121417",
        "panel": "#1B1F26",
        "input_bg": "#252B35",
        "fg": "#F1F5F9",
        "muted": "#94A3B8",
        "accent": "#38BDF8",
        "accent_green": "#4ADE80",
        "danger": "#F87171",
        "btn_sec_bg": "#2D3440",
        "btn_sec_fg": "#F1F5F9",
        "border": "#334155",
        "tree_bg": "#161A20",
        "tree_head_bg": "#252B35",
        "tree_sel": "#1D4ED8",
        "toggle_text": "☀️ Modo Claro"
    },
    "claro": {
        "bg": "#F3F4F6",
        "panel": "#FFFFFF",
        "input_bg": "#FFFFFF",
        "fg": "#111827",
        "muted": "#4B5563",
        "accent": "#1F4E78",
        "accent_green": "#1E6B38",
        "danger": "#B30000",
        "btn_sec_bg": "#E5E7EB",
        "btn_sec_fg": "#111827",
        "border": "#CBD5E1",
        "tree_bg": "#FFFFFF",
        "tree_head_bg": "#E2E8F0",
        "tree_sel": "#2563EB",
        "toggle_text": "🌙 Modo Oscuro"
    }
}


class AppSublimacionDTF:
    def __init__(self, root):
        self.root = root
        self.root.title("Acomodo Inteligente Mixto + Relleno Logo - Ctrl-Geek")
        self.root.geometry("820x740")
        self.root.resizable(False, False)

        self.style = ttk.Style()
        try:
            self.style.theme_use("clam")
        except Exception:
            pass

        self.disenos = []
        self.catalogo = cargar_catalogo()
        self.config_logo = cargar_config_logo()
        self.tema_actual = self.config_logo.get("tema", "oscuro")
        if self.tema_actual not in TEMAS:
            self.tema_actual = "oscuro"

        self.sincronizar_listas_catalogo()

        # Variables de producto actual
        self.articulo_var = tk.StringVar(value=self.nombres_catalogo[0])
        self.modo_espejo = tk.BooleanVar(value=True)
        self.ancho_cm_var = tk.DoubleVar(value=20.0)
        self.alto_cm_var = tk.DoubleVar(value=9.4)

        # Variables de relleno con logo
        self.logo_activo_var = tk.BooleanVar(value=self.config_logo.get("activo", False))
        self.logo_ruta_var = tk.StringVar(value=self.config_logo.get("ruta", ""))
        self.logo_espejo_var = tk.BooleanVar(value=self.config_logo.get("espejo", True))
        modo_guardado = self.config_logo.get("modo", "AUTO")
        etiqueta_modo = next(
            (k for k, v in OPCIONES_TAMANO_LOGO.items() if v == modo_guardado),
            "Auto (9×9 → 8×8 → adaptable)"
        )
        self.logo_modo_var = tk.StringVar(value=etiqueta_modo)

        self.crear_interfaz()
        self.aplicar_tema()
        self.al_cambiar_articulo()
        self.actualizar_estado_controles_logo()

    def sincronizar_listas_catalogo(self):
        self.claves_catalogo = list(self.catalogo.keys())
        self.nombres_catalogo = [self.catalogo[k]["nombre"] for k in self.claves_catalogo]

    def crear_interfaz(self):
        # Barra superior con título y selector de tema
        self.f_header = tk.Frame(self.root)
        self.f_header.pack(fill="x", padx=15, pady=(10, 2))

        self.lbl_titulo = tk.Label(
            self.f_header, text="Ctrl-Geek | Acomodo Inteligente de Impresión",
            font=("Segoe UI", 11, "bold")
        )
        self.lbl_titulo.pack(side="left")

        self.btn_tema = tk.Button(
            self.f_header, text="☀️ Modo Claro", font=("Segoe UI", 8, "bold"),
            cursor="hand2", relief="flat", padx=10, pady=3,
            command=self.alternar_tema
        )
        self.btn_tema.pack(side="right")

        # 1. Selector de Artículo + Nuevo Producto
        self.f_art = tk.LabelFrame(
            self.root,
            text=" 1. Elige el Artículo a agregar (puedes mezclar varios en la misma hoja) ",
            font=("Segoe UI", 9, "bold")
        )
        self.f_art.pack(fill="x", padx=15, pady=(6, 5))

        self.combo = ttk.Combobox(
            self.f_art, textvariable=self.articulo_var,
            values=self.nombres_catalogo, state="readonly", width=44, font=("Segoe UI", 9)
        )
        self.combo.grid(row=0, column=0, padx=10, pady=8, sticky="w")
        self.combo.bind("<<ComboboxSelected>>", lambda e: self.al_cambiar_articulo())

        self.btn_nuevo_prod = tk.Button(
            self.f_art, text="➕ Nuevo Producto", bg="#1D4ED8", fg="white",
            font=("Segoe UI", 8, "bold"), cursor="hand2", relief="flat", padx=8, pady=3,
            command=self.abrir_modal_nuevo_producto
        )
        self.btn_nuevo_prod.grid(row=0, column=1, padx=5, pady=8, sticky="w")

        self.chk_espejo = tk.Checkbutton(
            self.f_art, text="Modo Espejo", variable=self.modo_espejo,
            font=("Segoe UI", 9, "bold")
        )
        self.chk_espejo.grid(row=0, column=2, padx=10, pady=8, sticky="w")

        self.f_medidas = tk.Frame(self.f_art)
        self.f_medidas.grid(row=1, column=0, columnspan=3, padx=10, pady=(0, 8), sticky="w")

        self.lbl_ancho = tk.Label(self.f_medidas, text="Ancho (cm):", font=("Segoe UI", 9))
        self.lbl_ancho.pack(side="left")
        self.spin_w = ttk.Spinbox(
            self.f_medidas, from_=2.0, to=56.0, increment=0.1,
            textvariable=self.ancho_cm_var, width=6
        )
        self.spin_w.pack(side="left", padx=(4, 15))

        self.lbl_alto = tk.Label(self.f_medidas, text="Alto (cm):", font=("Segoe UI", 9))
        self.lbl_alto.pack(side="left")
        self.spin_h = ttk.Spinbox(
            self.f_medidas, from_=2.0, to=98.0, increment=0.1,
            textvariable=self.alto_cm_var, width=6
        )
        self.spin_h.pack(side="left", padx=(4, 15))

        self.lbl_hoja_info = tk.Label(self.f_medidas, text="Salida: A4", font=("Segoe UI", 9, "italic"))
        self.lbl_hoja_info.pack(side="left")

        # 2. Botón agregar diseños
        self.f_top = tk.Frame(self.root)
        self.f_top.pack(fill="x", padx=15, pady=5)
        self.btn_agregar = tk.Button(
            self.f_top, text="➕ Agregar Diseño(s) con el Artículo Seleccionado",
            bg="#0284C7", fg="white", font=("Segoe UI", 9, "bold"),
            cursor="hand2", relief="flat", padx=10, pady=4,
            command=self.agregar_archivos
        )
        self.btn_agregar.pack(side="left")

        # 3. Tabla de pedido mixto
        self.f_tabla = tk.Frame(self.root)
        self.f_tabla.pack(fill="both", expand=True, padx=15, pady=5)

        columnas = ("archivo", "producto", "medidas", "cantidad")
        self.tabla = ttk.Treeview(self.f_tabla, columns=columnas, show="headings", height=9)
        self.tabla.heading("archivo", text="Archivo / Diseño")
        self.tabla.heading("producto", text="Producto")
        self.tabla.heading("medidas", text="Medida / Hoja")
        self.tabla.heading("cantidad", text="Piezas")

        self.tabla.column("archivo", width=275)
        self.tabla.column("producto", width=240)
        self.tabla.column("medidas", width=160, anchor="center")
        self.tabla.column("cantidad", width=85, anchor="center")
        self.tabla.pack(side="left", fill="both", expand=True)

        # 4. Controles de cantidad
        self.f_controles = tk.Frame(self.root)
        self.f_controles.pack(fill="x", padx=15, pady=5)

        self.btn_mas = tk.Button(self.f_controles, text="🔼 +1 Pieza", command=lambda: self.modificar_cantidad(1), width=11, relief="flat", cursor="hand2")
        self.btn_mas.pack(side="left", padx=3, ipady=2)

        self.btn_menos = tk.Button(self.f_controles, text="🔽 -1 Pieza", command=lambda: self.modificar_cantidad(-1), width=11, relief="flat", cursor="hand2")
        self.btn_menos.pack(side="left", padx=3, ipady=2)

        self.btn_quitar = tk.Button(self.f_controles, text="❌ Quitar", command=self.eliminar_seleccionado, width=10, relief="flat", cursor="hand2")
        self.btn_quitar.pack(side="left", padx=10, ipady=2)

        self.btn_vaciar = tk.Button(self.f_controles, text="🗑️ Vaciar", command=self.limpiar_todo, relief="flat", padx=8, cursor="hand2")
        self.btn_vaciar.pack(side="right", padx=3, ipady=2)

        # 5. Panel de Relleno Inteligente con Logo
        self.f_logo = tk.LabelFrame(
            self.root,
            text=" 2. Aprovechar Espacio Sobrante con Logo / Imagen Pequeña (Cero Merma) ",
            font=("Segoe UI", 9, "bold")
        )
        self.f_logo.pack(fill="x", padx=15, pady=6)

        self.f_logo_r1 = tk.Frame(self.f_logo)
        self.f_logo_r1.pack(fill="x", padx=10, pady=(6, 4))

        self.chk_logo_activo = tk.Checkbutton(
            self.f_logo_r1, text="Rellenar hueco sobrante con logo",
            variable=self.logo_activo_var, font=("Segoe UI", 9, "bold"),
            command=self.al_cambiar_config_logo
        )
        self.chk_logo_activo.pack(side="left")

        self.lbl_tam_logo = tk.Label(self.f_logo_r1, text="Tamaño:", font=("Segoe UI", 9))
        self.lbl_tam_logo.pack(side="left", padx=(18, 4))

        self.cb_logo_modo = ttk.Combobox(
            self.f_logo_r1, textvariable=self.logo_modo_var,
            values=list(OPCIONES_TAMANO_LOGO.keys()), state="readonly", width=28, font=("Segoe UI", 9)
        )
        self.cb_logo_modo.pack(side="left")
        self.cb_logo_modo.bind("<<ComboboxSelected>>", lambda e: self.al_cambiar_config_logo())

        self.chk_logo_espejo = tk.Checkbutton(
            self.f_logo_r1, text="Espejo en Logo", variable=self.logo_espejo_var,
            font=("Segoe UI", 9), command=self.al_cambiar_config_logo
        )
        self.chk_logo_espejo.pack(side="left", padx=(12, 0))

        self.f_logo_r2 = tk.Frame(self.f_logo)
        self.f_logo_r2.pack(fill="x", padx=10, pady=(0, 8))

        self.btn_elegir_logo = tk.Button(
            self.f_logo_r2, text="🖼️ Elegir Logo / Imagen...",
            font=("Segoe UI", 8, "bold"), cursor="hand2", relief="flat", padx=8, pady=3,
            command=self.seleccionar_logo
        )
        self.btn_elegir_logo.pack(side="left")

        self.lbl_logo_archivo = tk.Label(
            self.f_logo_r2, text=self._texto_archivo_logo(), font=("Segoe UI", 9, "italic")
        )
        self.lbl_logo_archivo.pack(side="left", padx=10)

        # 6. Monitor de resumen en tiempo real
        self.lbl_resumen = tk.Label(
            self.root, text="Agrega diseños para calcular el acomodo automático.",
            font=("Segoe UI", 9, "bold"), wraplength=780, justify="center"
        )
        self.lbl_resumen.pack(pady=8)

        # 7. Generar PDF
        self.btn_generar = tk.Button(
            self.root, text="🚀 Generar PDF Mixto Listo para Imprimir",
            font=("Segoe UI", 11, "bold"), bg="#16A34A", fg="white",
            cursor="hand2", relief="flat", command=self.iniciar_generacion
        )
        self.btn_generar.pack(fill="x", padx=15, pady=(0, 15), ipady=6)

    def alternar_tema(self):
        self.tema_actual = "claro" if self.tema_actual == "oscuro" else "oscuro"
        self.aplicar_tema()
        self.config_logo = self.obtener_config_logo_actual()
        guardar_config_logo(self.config_logo)

    def aplicar_tema(self):
        t = TEMAS[self.tema_actual]

        self.root.configure(bg=t["bg"])
        self.btn_tema.configure(text=t["toggle_text"], bg=t["btn_sec_bg"], fg=t["btn_sec_fg"])

        for frame in (self.f_header, self.f_top, self.f_tabla, self.f_controles):
            frame.configure(bg=t["bg"])

        for panel in (self.f_art, self.f_logo):
            panel.configure(bg=t["panel"])

        self.f_art.configure(fg=t["accent"])
        self.f_logo.configure(fg=t["accent_green"])

        for sub in (self.f_medidas, self.f_logo_r1, self.f_logo_r2):
            sub.configure(bg=t["panel"])

        self.lbl_titulo.configure(bg=t["bg"], fg=t["fg"])
        self.lbl_resumen.configure(bg=t["bg"], fg=t["accent"])

        for lbl in (self.lbl_ancho, self.lbl_alto, self.lbl_tam_logo):
            lbl.configure(bg=t["panel"], fg=t["fg"])

        for lbl in (self.lbl_hoja_info, self.lbl_logo_archivo):
            lbl.configure(bg=t["panel"], fg=t["muted"])

        self.chk_espejo.configure(
            bg=t["panel"], fg=t["danger"],
            activebackground=t["panel"], activeforeground=t["danger"],
            selectcolor=t["input_bg"]
        )
        for chk in (self.chk_logo_activo, self.chk_logo_espejo):
            chk.configure(
                bg=t["panel"], fg=t["fg"],
                activebackground=t["panel"], activeforeground=t["fg"],
                selectcolor=t["input_bg"]
            )

        for btn in (self.btn_mas, self.btn_menos, self.btn_quitar, self.btn_vaciar, self.btn_elegir_logo):
            btn.configure(bg=t["btn_sec_bg"], fg=t["btn_sec_fg"])

        # Estilos ttk (Tabla, Combobox, Spinbox)
        self.style.configure(
            "Treeview",
            background=t["tree_bg"],
            foreground=t["fg"],
            fieldbackground=t["tree_bg"],
            bordercolor=t["border"],
            rowheight=24
        )
        self.style.map("Treeview", background=[("selected", t["tree_sel"])], foreground=[("selected", "#FFFFFF")])
        self.style.configure(
            "Treeview.Heading",
            background=t["tree_head_bg"],
            foreground=t["fg"],
            relief="flat",
            font=("Segoe UI", 9, "bold")
        )
        self.style.map("Treeview.Heading", background=[("active", t["btn_sec_bg"])])

        self.style.configure(
            "TCombobox",
            fieldbackground=t["input_bg"],
            background=t["btn_sec_bg"],
            foreground=t["fg"],
            arrowcolor=t["fg"]
        )
        self.style.map(
            "TCombobox",
            fieldbackground=[("readonly", t["input_bg"]), ("disabled", t["panel"])],
            foreground=[("readonly", t["fg"]), ("disabled", t["muted"])]
        )

        self.style.configure(
            "TSpinbox",
            fieldbackground=t["input_bg"],
            background=t["btn_sec_bg"],
            foreground=t["fg"],
            arrowcolor=t["fg"]
        )

    def _texto_archivo_logo(self):
        ruta = self.logo_ruta_var.get()
        if ruta and os.path.exists(ruta):
            return f"Logo cargado: {os.path.basename(ruta)}"
        return "Ningún logo seleccionado todavía"

    def obtener_config_logo_actual(self):
        return {
            "activo": bool(self.logo_activo_var.get()),
            "ruta": self.logo_ruta_var.get(),
            "modo": OPCIONES_TAMANO_LOGO.get(self.logo_modo_var.get(), "AUTO"),
            "espejo": bool(self.logo_espejo_var.get()),
            "tema": self.tema_actual
        }

    def actualizar_estado_controles_logo(self):
        activo = self.logo_activo_var.get()
        estado = "readonly" if activo else "disabled"
        estado_btn = "normal" if activo else "disabled"
        self.cb_logo_modo.config(state=estado)
        self.chk_logo_espejo.config(state=estado_btn)
        self.btn_elegir_logo.config(state=estado_btn)
        self.lbl_logo_archivo.config(text=self._texto_archivo_logo())

    def al_cambiar_config_logo(self):
        self.actualizar_estado_controles_logo()
        self.config_logo = self.obtener_config_logo_actual()
        guardar_config_logo(self.config_logo)
        self.actualizar_vista_tabla()

    def seleccionar_logo(self):
        archivo = filedialog.askopenfilename(
            title="Seleccionar Logo o Imagen de Relleno",
            filetypes=[("Imágenes", "*.png *.jpg *.jpeg *.webp")]
        )
        if archivo:
            self.logo_ruta_var.set(archivo)
            self.logo_activo_var.set(True)
            self.al_cambiar_config_logo()

    def abrir_modal_nuevo_producto(self):
        t = TEMAS[self.tema_actual]
        modal = tk.Toplevel(self.root)
        modal.title("Agregar Nuevo Producto al Catálogo")
        modal.geometry("390x305")
        modal.resizable(False, False)
        modal.configure(bg=t["bg"])
        modal.transient(self.root)
        modal.grab_set()

        tk.Label(modal, text="Nombre del producto:", font=("Segoe UI", 9, "bold"), bg=t["bg"], fg=t["fg"]).grid(row=0, column=0, padx=15, pady=(15, 4), sticky="w")
        ent_nombre = tk.Entry(modal, width=34, font=("Segoe UI", 9), bg=t["input_bg"], fg=t["fg"], insertbackground=t["fg"], relief="flat")
        ent_nombre.grid(row=1, column=0, columnspan=2, padx=15, ipady=4, sticky="we")

        tk.Label(modal, text="Tipo de hoja / lienzo:", font=("Segoe UI", 9, "bold"), bg=t["bg"], fg=t["fg"]).grid(row=2, column=0, padx=15, pady=(10, 4), sticky="w")
        hoja_var = tk.StringVar(value="A4")
        ttk.Combobox(
            modal, textvariable=hoja_var, values=list(HOJAS_DISPONIBLES.keys()),
            state="readonly", width=15
        ).grid(row=3, column=0, padx=15, sticky="w")

        tk.Label(modal, text="Ancho (cm):", font=("Segoe UI", 9, "bold"), bg=t["bg"], fg=t["fg"]).grid(row=4, column=0, padx=15, pady=(10, 4), sticky="w")
        ent_w = tk.Entry(modal, width=12, bg=t["input_bg"], fg=t["fg"], insertbackground=t["fg"], relief="flat")
        ent_w.insert(0, "20.0")
        ent_w.grid(row=5, column=0, padx=15, ipady=3, sticky="w")

        tk.Label(modal, text="Alto (cm):", font=("Segoe UI", 9, "bold"), bg=t["bg"], fg=t["fg"]).grid(row=4, column=1, padx=15, pady=(10, 4), sticky="w")
        ent_h = tk.Entry(modal, width=12, bg=t["input_bg"], fg=t["fg"], insertbackground=t["fg"], relief="flat")
        ent_h.insert(0, "9.4")
        ent_h.grid(row=5, column=1, padx=15, ipady=3, sticky="w")

        espejo_var = tk.BooleanVar(value=True)
        guias_var = tk.BooleanVar(value=True)
        tk.Checkbutton(
            modal, text="Modo espejo por defecto", variable=espejo_var,
            bg=t["bg"], fg=t["fg"], activebackground=t["bg"], activeforeground=t["fg"], selectcolor=t["input_bg"]
        ).grid(row=6, column=0, padx=12, pady=(10, 0), sticky="w")
        tk.Checkbutton(
            modal, text="Mostrar guías de corte", variable=guias_var,
            bg=t["bg"], fg=t["fg"], activebackground=t["bg"], activeforeground=t["fg"], selectcolor=t["input_bg"]
        ).grid(row=6, column=1, padx=12, pady=(10, 0), sticky="w")

        def guardar():
            nombre = ent_nombre.get().strip()
            if not nombre:
                messagebox.showwarning("Falta nombre", "Escribe el nombre del producto.", parent=modal)
                return
            try:
                w = float(ent_w.get())
                h = float(ent_h.get())
                if w <= 0 or h <= 0:
                    raise ValueError
            except ValueError:
                messagebox.showwarning("Medidas inválidas", "Ingresa números positivos en ancho y alto.", parent=modal)
                return

            clave = agregar_producto_catalogo(
                self.catalogo, nombre, hoja_var.get(), w, h,
                espejo_default=espejo_var.get(), guias_corte=guias_var.get()
            )
            self.sincronizar_listas_catalogo()
            self.combo["values"] = self.nombres_catalogo
            self.articulo_var.set(self.catalogo[clave]["nombre"])
            self.al_cambiar_articulo()
            modal.destroy()
            messagebox.showinfo("Guardado", f"'{nombre}' se agregó y guardó en catalogo_articulos.json.")

        tk.Button(
            modal, text="💾 Guardar Producto", bg="#16A34A", fg="white",
            font=("Segoe UI", 9, "bold"), relief="flat", cursor="hand2", command=guardar
        ).grid(row=7, column=0, columnspan=2, padx=15, pady=18, ipady=4, sticky="we")

    def obtener_config_actual(self):
        idx = self.nombres_catalogo.index(self.articulo_var.get())
        clave = self.claves_catalogo[idx]
        return self.catalogo[clave]

    def al_cambiar_articulo(self):
        cfg = self.obtener_config_actual()
        info_hoja = obtener_info_hoja(cfg.get("hoja_tipo", "A4"))
        self.modo_espejo.set(cfg.get("espejo_default", True))
        self.ancho_cm_var.set(cfg["ancho_cm"])
        self.alto_cm_var.set(cfg["alto_cm"])
        self.lbl_hoja_info.config(text=f"Salida: {info_hoja['texto']}")

    def agregar_archivos(self):
        try:
            ancho = float(self.ancho_cm_var.get())
            alto = float(self.alto_cm_var.get())
            if ancho <= 0 or alto <= 0:
                raise ValueError
        except (ValueError, tk.TclError):
            messagebox.showwarning("Medidas inválidas", "Verifica que el ancho y alto sean números válidos.")
            return

        cfg = self.obtener_config_actual()
        hoja_tipo = cfg.get("hoja_tipo", "A4")
        espejo = self.modo_espejo.get()
        guias = cfg.get("guias_corte", True)

        archivos = filedialog.askopenfilenames(
            title=f"Seleccionar diseños para {cfg['nombre']}",
            filetypes=[("Imágenes", "*.png *.jpg *.jpeg *.webp")]
        )
        for ruta in archivos:
            nombre = os.path.basename(ruta)
            encontrado = False
            for d in self.disenos:
                if (d["ruta"] == ruta and d["producto"] == cfg["nombre"]
                        and d["ancho_cm"] == ancho and d["alto_cm"] == alto
                        and d["espejo"] == espejo):
                    d["cantidad"] += 1
                    encontrado = True
                    break
            if not encontrado:
                self.disenos.append({
                    "ruta": ruta,
                    "nombre": nombre,
                    "producto": cfg["nombre"],
                    "hoja_tipo": hoja_tipo,
                    "ancho_cm": ancho,
                    "alto_cm": alto,
                    "espejo": espejo,
                    "guias_corte": guias,
                    "cantidad": 1
                })
        self.actualizar_vista_tabla()

    def modificar_cantidad(self, delta):
        seleccion = self.tabla.selection()
        if not seleccion:
            messagebox.showinfo("Atención", "Selecciona un diseño de la lista primero.")
            return
        indice = self.tabla.index(seleccion[0])
        self.disenos[indice]["cantidad"] = max(1, self.disenos[indice]["cantidad"] + delta)
        self.actualizar_vista_tabla()
        items = self.tabla.get_children()
        if indice < len(items):
            self.tabla.selection_set(items[indice])

    def eliminar_seleccionado(self):
        seleccion = self.tabla.selection()
        if seleccion:
            indice = self.tabla.index(seleccion[0])
            self.disenos.pop(indice)
            self.actualizar_vista_tabla()

    def limpiar_todo(self):
        self.disenos.clear()
        self.actualizar_vista_tabla()

    def actualizar_vista_tabla(self):
        for item in self.tabla.get_children():
            self.tabla.delete(item)

        for d in self.disenos:
            medida_txt = f"{d['ancho_cm']}×{d['alto_cm']} cm ({d['hoja_tipo']})"
            self.tabla.insert("", "end", values=(
                d["nombre"], d["producto"], medida_txt, f"{d['cantidad']} pza(s)"
            ))

        if not self.disenos:
            self.lbl_resumen.config(text="Agrega diseños para calcular el acomodo automático.")
            return

        cfg_logo = self.obtener_config_logo_actual()
        resumen = calcular_resumen_empaque(self.disenos, cfg_logo)
        partes = []

        for hoja_tipo, info in resumen.items():
            unidad = "metro(s) DTF" if hoja_tipo == "DTF" else f"hoja(s) {hoja_tipo}"
            logos = info["logos_extra"]
            libre = info["alto_libre_ultima_cm"]

            if logos > 0:
                tams = "/".join(f"{t:g}×{t:g}" for t in info["tamanos_logo"])
                detalle = f"✅ +{logos} logo(s) extra de {tams} cm"
            elif cfg_logo["activo"] and not cfg_logo["ruta"] and libre >= 5.0:
                detalle = f"⚠️ Quedan {libre} cm libres (elige tu imagen de logo)"
            elif libre >= 5.0:
                detalle = f"⚠️ Quedan {libre} cm libres (activa relleno con logo)"
            else:
                detalle = "✅ Hoja aprovechada al máximo"

            partes.append(f"[{hoja_tipo}] {info['piezas']} pzas → {info['hojas']} {unidad} ({detalle})")

        self.lbl_resumen.config(text="  |  ".join(partes))

    def iniciar_generacion(self):
        if not self.disenos:
            messagebox.showwarning("Atención", "Agrega diseños primero.")
            return

        cfg_logo = self.obtener_config_logo_actual()
        if cfg_logo["activo"] and (not cfg_logo["ruta"] or not os.path.exists(cfg_logo["ruta"])):
            messagebox.showwarning(
                "Logo no encontrado",
                "Activaste el relleno con logo pero no has elegido una imagen válida.\n"
                "Selecciona tu logo o desmarca la casilla."
            )
            return

        fecha_str = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        salida = filedialog.asksaveasfilename(
            title="Guardar PDF como...",
            initialfile=f"Pedido_Mixto_{fecha_str}.pdf",
            defaultextension=".pdf",
            filetypes=[("Archivos PDF", "*.pdf")]
        )
        if not salida:
            return

        self.btn_generar.config(state="disabled")

        def tarea():
            try:
                generar_pdf_produccion(self.disenos, salida, config_logo=cfg_logo)
                self.root.after(0, lambda: messagebox.showinfo("Listo", f"PDF generado correctamente:\n{salida}"))
            except Exception as e:
                err_msg = str(e)
                self.root.after(0, lambda: messagebox.showerror("Error", f"Ocurrió un error:\n{err_msg}"))
            finally:
                self.root.after(0, lambda: self.btn_generar.config(state="normal"))

        threading.Thread(target=tarea, daemon=True).start()


if __name__ == "__main__":
    root = tk.Tk()
    app = AppSublimacionDTF(root)
    root.mainloop()