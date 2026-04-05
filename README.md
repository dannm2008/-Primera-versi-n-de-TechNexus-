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

## Despliegue en Render (Frontend + Backend)

Este repo ya incluye base para desplegar en Render:

- Frontend estático: raíz del proyecto
- Backend API: carpeta `backend/`
- Blueprint Render: `render.yaml`

### 1) Backend en Render

1. En Render, crea un nuevo servicio Web usando este repo.
2. Usa `backend` como Root Directory.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Health Check Path: `/api/health`
6. Variables de entorno recomendadas:
  - `FRONTEND_ORIGIN` con la URL de tu frontend en Render.

### 2) Frontend en Render

1. Crea un Static Site con el mismo repo.
2. Root Directory: `.`
3. Publish Directory: `.`
4. Si usas Blueprint, Render toma esto desde `render.yaml`.

### 3) Verificación rápida

- Backend: abre `https://TU_API.onrender.com/api/health`
- Frontend: abre `https://TU_WEB.onrender.com`

### Notas

- El backend inicial tiene endpoints base en `backend/server.js` para arrancar arquitectura.
- Si quieres, el siguiente paso es mover operaciones críticas (órdenes, admin, validaciones) desde frontend al backend.

## Versión

- `v1.0.0`: primera versión pública desplegada en GitHub Pages.
