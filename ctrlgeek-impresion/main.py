import os
import tkinter as tk
from tkinter import filedialog, ttk, messagebox
from pdf_engine import generar_pdf_tazas, generar_pdf_playeras


class AppAcomodoTaller:
    def __init__(self, root):
        self.root = root
        self.root.title("Suite de Acomodo para Sublimación - Core-Tech / Ctrl-Geek")
        self.root.geometry("680x560")
        self.root.resizable(False, False)

        # Variables Tazas
        self.lista_tazas = []
        self.espejo_tazas = tk.BooleanVar(value=True)

        # Variables Playeras
        self.lista_playeras = []
        self.espejo_playeras = tk.BooleanVar(value=True)

        self.crear_tabs()

    def crear_tabs(self):
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill="both", expand=True, padx=10, pady=10)

        # Tab 1: Tazas
        tab_tazas = ttk.Frame(notebook)
        notebook.add(tab_tazas, text=" ☕ Acomodo Tazas (3x1 A4) ")
        self.build_tab_tazas(tab_tazas)

        # Tab 2: Playeras
        tab_playeras = ttk.Frame(notebook)
        notebook.add(tab_playeras, text=" 👕 Acomodo Playeras (A4 / Infantil) ")
        self.build_tab_playeras(tab_playeras)

    # --- LÓGICA TAB TAZAS ---
    def build_tab_tazas(self, parent):
        f_top = tk.Frame(parent)
        f_top.pack(fill="x", padx=10, pady=10)

        tk.Button(f_top, text="➕ Cargar Diseños de Taza", bg="#007acc", fg="white", font=("Segoe UI", 9, "bold"),
                  command=self.agregar_tazas).pack(side="left")
        tk.Checkbutton(f_top, text="Modo Espejo (Sublimación)", variable=self.espejo_tazas,
                       font=("Segoe UI", 9, "bold")).pack(side="left", padx=15)

        # Tabla
        f_tabla = tk.Frame(parent)
        f_tabla.pack(fill="both", expand=True, padx=10)

        self.tabla_tazas = ttk.Treeview(f_tabla, columns=("archivo", "cant"), show="headings", height=8)
        self.tabla_tazas.heading("archivo", text="Diseño")
        self.tabla_tazas.heading("cant", text="Cantidad")
        self.tabla_tazas.column("archivo", width=440)
        self.tabla_tazas.column("cant", width=120, anchor="center")
        self.tabla_tazas.pack(fill="both", expand=True)

        # Controles
        f_ctrl = tk.Frame(parent)
        f_ctrl.pack(fill="x", padx=10, pady=5)
        tk.Button(f_ctrl, text="➕ +1", command=lambda: self.mod_cant_tazas(1), width=8).pack(side="left", padx=2)
        tk.Button(f_ctrl, text="➖ -1", command=lambda: self.mod_cant_tazas(-1), width=8).pack(side="left", padx=2)
        tk.Button(f_ctrl, text="❌ Quitar", command=self.quitar_taza, width=10).pack(side="left", padx=10)

        self.lbl_info_tazas = tk.Label(parent, text="Total: 0 tazas | 0 hojas A4", font=("Segoe UI", 10, "bold"),
                                       fg="#004488")
        self.lbl_info_tazas.pack(pady=5)

        tk.Button(parent, text="🚀 Generar PDF de Tazas", bg="#28a745", fg="white", font=("Segoe UI", 10, "bold"),
                  command=self.exportar_pdf_tazas, ipady=4).pack(fill="x", padx=10, pady=(0, 10))

    def agregar_tazas(self):
        archivos = filedialog.askopenfilenames(title="Seleccionar imágenes de tazas",
                                               filetypes=[("Imágenes", "*.png *.jpg *.jpeg")])
        for r in archivos:
            nombre = os.path.basename(r)
            self.lista_tazas.append({"ruta": r, "nombre": nombre, "cantidad": 1})
        self.render_tazas()

    def mod_cant_tazas(self, delta):
        sel = self.tabla_tazas.selection()
        if sel:
            idx = self.tabla_tazas.index(sel[0])
            self.lista_tazas[idx]["cantidad"] = max(1, self.lista_tazas[idx]["cantidad"] + delta)
            self.render_tazas()

    def quitar_taza(self):
        sel = self.tabla_tazas.selection()
        if sel:
            idx = self.tabla_tazas.index(sel[0])
            self.lista_tazas.pop(idx)
            self.render_tazas()

    def render_tazas(self):
        for item in self.tabla_tazas.get_children():
            self.tabla_tazas.delete(item)
        total = 0
        for d in self.lista_tazas:
            self.tabla_tazas.insert("", "end", values=(d["nombre"], f"{d['cantidad']} pza(s)"))
            total += d["cantidad"]
        hojas = (total + 2) // 3
        sobra = (3 - (total % 3)) % 3
        msg = f"Total: {total} tazas | {hojas} hoja(s) A4"
        if sobra > 0 and total > 0:
            msg += f" (⚠️ Sobran {sobra} espacio(s) en la última hoja)"
        self.lbl_info_tazas.config(text=msg)

    def exportar_pdf_tazas(self):
        if not self.lista_tazas:
            messagebox.showwarning("Atención", "Carga al menos un diseño.")
            return
        salida = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")])
        if salida:
            flat = []
            for item in self.lista_tazas:
                flat.extend([item["ruta"]] * item["cantidad"])
            generar_pdf_tazas(flat, salida, modo_espejo=self.espejo_tazas.get())
            messagebox.showinfo("Éxito", f"PDF generado correctamente:\n{salida}")

    # --- LÓGICA TAB PLAYERAS ---
    def build_tab_playeras(self, parent):
        f_top = tk.Frame(parent)
        f_top.pack(fill="x", padx=10, pady=10)

        tk.Button(f_top, text="➕ Cargar Diseño Playera", bg="#007acc", fg="white", font=("Segoe UI", 9, "bold"),
                  command=self.agregar_playera).pack(side="left")

        tk.Checkbutton(f_top, text="Modo Espejo", variable=self.espejo_playeras,
                       font=("Segoe UI", 9, "bold")).pack(side="left", padx=15)

        # Tabla Playeras
        f_tabla = tk.Frame(parent)
        f_tabla.pack(fill="both", expand=True, padx=10)

        self.tabla_playeras = ttk.Treeview(f_tabla, columns=("archivo", "tamano", "cant"), show="headings", height=8)
        self.tabla_playeras.heading("archivo", text="Diseño")
        self.tabla_playeras.heading("tamano", text="Tamaño Requerido")
        self.tabla_playeras.heading("cant", text="Cantidad")
        self.tabla_playeras.column("archivo", width=340)
        self.tabla_playeras.column("tamano", width=140, anchor="center")
        self.tabla_playeras.column("cant", width=80, anchor="center")
        self.tabla_playeras.pack(fill="both", expand=True)

        # Controles
        f_ctrl = tk.Frame(parent)
        f_ctrl.pack(fill="x", padx=10, pady=5)
        tk.Button(f_ctrl, text="➕ +1", command=lambda: self.mod_cant_playeras(1), width=8).pack(side="left", padx=2)
        tk.Button(f_ctrl, text="➖ -1", command=lambda: self.mod_cant_playeras(-1), width=8).pack(side="left", padx=2)
        tk.Button(f_ctrl, text="❌ Quitar", command=self.quitar_playera, width=10).pack(side="left", padx=10)

        self.lbl_info_playeras = tk.Label(parent, text="Total hojas requeridas: 0 A4", font=("Segoe UI", 10, "bold"),
                                          fg="#004488")
        self.lbl_info_playeras.pack(pady=5)

        tk.Button(parent, text="🚀 Generar PDF para Playeras", bg="#28a745", fg="white", font=("Segoe UI", 10, "bold"),
                  command=self.exportar_pdf_playeras, ipady=4).pack(fill="x", padx=10, pady=(0, 10))

    def agregar_playera(self):
        archivos = filedialog.askopenfilenames(title="Seleccionar imágenes de playeras",
                                               filetypes=[("Imágenes", "*.png *.jpg *.jpeg")])
        if not archivos:
            return

        # Modal rápido para elegir el tamaño
        win_size = tk.Toplevel(self.root)
        win_size.title("Seleccionar Tamaño")
        win_size.geometry("300x160")
        win_size.resizable(False, False)

        tk.Label(win_size, text="Elige el tamaño para estos diseños:", font=("Segoe UI", 10, "bold")).pack(pady=10)

        tipo_var = tk.StringVar(value="nino")
        tk.Radiobutton(win_size, text="👶 Niño / Juvenil (16 x 22 cm)", variable=tipo_var, value="nino").pack(anchor="w",
                                                                                                             padx=30)
        tk.Radiobutton(win_size, text="👤 Adulto / Pecho Completo (A4 Máx)", variable=tipo_var, value="adulto").pack(
            anchor="w", padx=30)

        def confirmar():
            for r in archivos:
                nombre = os.path.basename(r)
                self.lista_playeras.append({"ruta": r, "nombre": nombre, "tipo": tipo_var.get(), "cantidad": 1})
            win_size.destroy()
            self.render_playeras()

        tk.Button(win_size, text="Aceptar", bg="#007acc", fg="white", command=confirmar).pack(pady=12)

    def mod_cant_playeras(self, delta):
        sel = self.tabla_playeras.selection()
        if sel:
            idx = self.tabla_playeras.index(sel[0])
            self.lista_playeras[idx]["cantidad"] = max(1, self.lista_playeras[idx]["cantidad"] + delta)
            self.render_playeras()

    def quitar_playera(self):
        sel = self.tabla_playeras.selection()
        if sel:
            idx = self.tabla_playeras.index(sel[0])
            self.lista_playeras.pop(idx)
            self.render_playeras()

    def render_playeras(self):
        for item in self.tabla_playeras.get_children():
            self.tabla_playeras.delete(item)
        total_hojas = 0
        for d in self.lista_playeras:
            lbl_tipo = "👶 Niño (16x22 cm)" if d["tipo"] == "nino" else "👤 Adulto (A4)"
            self.tabla_playeras.insert("", "end", values=(d["nombre"], lbl_tipo, f"{d['cantidad']} pza(s)"))
            total_hojas += d["cantidad"]
        self.lbl_info_playeras.config(text=f"Total hojas de sublimación requeridas: {total_hojas} A4")

    def exportar_pdf_playeras(self):
        if not self.lista_playeras:
            messagebox.showwarning("Atención", "Carga al menos un diseño.")
            return
        salida = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF", "*.pdf")])
        if salida:
            generar_pdf_playeras(self.lista_playeras, salida, modo_espejo=self.espejo_playeras.get())
            messagebox.showinfo("Éxito", f"PDF generado correctamente:\n{salida}")


if __name__ == "__main__":
    root = tk.Tk()
    app = AppAcomodoTaller(root)
    root.mainloop()