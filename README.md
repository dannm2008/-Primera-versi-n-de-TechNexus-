# TechNexus

Primera versión de TechNexus, e-commerce web con catálogo, carrito, perfil de usuario, panel admin y sincronización con Supabase.

## Demo en línea

- https://dannm2008.github.io/-Primera-versi-n-de-TechNexus-/

## Funcionalidades principales

- Autenticación (registro/login) con Supabase Auth
- Catálogo de productos cargado desde Supabase
- Carrito persistente en nube (tabla `carritos`)
- Compra y guardado de órdenes (tabla `ordenes`)
- Historial de compras en perfil
- Panel de administración para gestión de tienda
- Soporte multi-idioma con traductor integrado

## Estructura del proyecto

- `index.html`: entrada principal
- `style.css`: estilos globales
- `funciones/`: módulos de la app
  - `autenticacion/`
  - `productos/`
  - `carrito/`
  - `perfil/`
  - `admin/`
  - `avanzadas/`

## Requisitos

- Navegador moderno
- Proyecto Supabase con tablas:
  - `productos`
  - `usuarios`
  - `carritos`
  - `ordenes`

## Desarrollo local

Abre `index.html` con servidor local (por ejemplo Five Server en VS Code).

## Publicación

Este repositorio usa GitHub Pages con GitHub Actions para desplegar automáticamente desde `main`.

## Versión

- `v1.0.0`: primera versión pública desplegada en GitHub Pages.
