<center>
  <img src="./public/hero-logo.png">
  <h1 align="center"> Café IPV App </h1>
</center>

[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![shadcn-vue](https://img.shields.io/badge/shadcn/vue-2-000000?style=for-the-badge&logo=shadcnui)](https://www.shadcn-vue.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[![Version](https://img.shields.io/badge/version-1.6.9-blue?style=for-the-badge)](https://github.com/rodnye/cafe-ipv/releases)

Aplicación de gestión para cafetería desarrollada con **Vue 3**, **Vite**, **shadcn-vue** y empaquetada como app Android nativa con **Capacitor**.

## 🌐 Demo

Puedes probar la aplicación directamente en tu navegador:

[**https://rodnye.github.io/cafe-ipv/**](https://rodnye.github.io/cafe-ipv/)

## Características

- **Multiplataforma** - Web (GitHub Pages) y Android (APK)
- **UI moderna** - Componentes shadcn-vue con Tailwind CSS
- **Gestión de inventario** - Control de productos y existencias
- **Pedidos diarios** - Registro y seguimiento
- **Tabla diaria** - Control de entradas, salidas y ventas
- **Autenticación simple** - Modo invitado

## Tecnologías

- **Frontend:** Vue 3, TypeScript, Pinia, Vue Router
- **Estilos:** Tailwind CSS, shadcn-vue, Lucide icons
- **Build:** Vite
- **Mobile:** Capacitor 8 (Android)
- **Package Manager:** pnpm

## Probarlo en Android

La forma más rápida de probar la app es descargar el APK desde las **releases**:

1. Ve a la [sección de Releases](https://github.com/rodnye/cafe-ipv/releases)
2. Descarga el archivo `app-debug.apk` de la última versión
3. Instálalo en tu dispositivo Android (permite orígenes desconocidos)

## 🛠️ Desarrollo

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Compilar para producción
pnpm build

# Sincronizar y compilar para Android
pnpm android:sync
pnpm android:compile
```

---

> _Another random app but useful for my personal use <3_
