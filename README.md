# Insytech Landing Page

Este proyecto es una landing page desarrollada con [Astro](https://astro.build) para Insytech, una empresa especializada en soluciones de automatización, trazabilidad y visión computacional.

## 🚀 Estructura del Proyecto

Dentro de este proyecto, encontrarás las siguientes carpetas y archivos principales:

```text
/
├── public/
│   ├── favicon.svg
│   ├── images/
│   │   └── (imágenes utilizadas en el sitio)
├── src/
│   ├── assets/
│   │   └── (archivos estáticos como fuentes o íconos)
│   ├── components/
│   │   ├── elements/
│   │   ├── sections/
│   │   └── shared/
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── contact.astro
│   └── utils/
│       └── data.ts
└── package.json
```

Para más información sobre la estructura de un proyecto Astro, consulta la [documentación oficial](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto, en una terminal:

| Comando                   | Acción                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`            | Instala las dependencias                         |
| `pnpm dev`                | Inicia el servidor de desarrollo en `localhost:4321` |
| `pnpm build`              | Construye el sitio para producción en `./dist/`  |
| `pnpm preview`            | Previsualiza el sitio construido localmente      |
| `pnpm astro ...`          | Ejecuta comandos CLI como `astro add`, `astro check` |
| `pnpm astro -- --help`    | Obtén ayuda sobre el CLI de Astro                |

## 🌟 Características

- **Automatización y Control Industrial**: Soluciones para optimizar procesos.
- **Trazabilidad en Tiempo Real**: Monitoreo y auditoría sin puntos ciegos.
- **Visión Computacional**: Implementaciones avanzadas para sectores clave.

## 📞 Contacto

Para más información, visita nuestra página de contacto o escríbenos directamente.

## 👀 Más Información

Consulta nuestra [documentación interna](#) o explora el código fuente para aprender más sobre cómo está construido este proyecto.

## 🔐 Banner de cookies

Esta landing integra un aviso de cookies con persistencia de consentimiento:

- Persistencia: localStorage `cookieConsent` y cookie `cookie_consent` (1 año).
- Estados: `accepted` | `rejected`.
- Reapertura: cualquier elemento con `data-open-cookie-preferences` vuelve a mostrar el banner.

Para escuchar cambios de consentimiento en scripts propios:
```js
window.addEventListener("cookie-consent", (e) => {
  // e.detail === 'accepted' | 'rejected'
});
```
