# Plugin Library

Biblioteca personal de plugins VST para Ableton Live. Sirve para ver qué plugins uso y para reinstalarlos en una compu nueva.

## Usarla

- En línea: https://leandrodoliri.github.io/plugin-library/
- Sin internet: descargá el repositorio y abrí `index.html` con doble clic.

La app no necesita servidor ni instalación.

## Actualizar los datos

Toda la lista está en `data/plugins.js`, con un plugin por línea.

| Campo | Qué guarda |
|---|---|
| `nombre`, `fabricante`, `tipo`, `categoria` | Datos del plugin |
| `estado` | `Instalado`, `Falta`, `Sin uso` o `Disponible` (versión actual, opcional) |
| `precio` | `Gratis`, `Voluntario`, `Pago` o `Sin confirmar` |
| `vst2`, `vst3` | Versión instalada, o `null` si no está en ese formato |
| `proyectos` | Cuántos proyectos de Ableton lo usan |
| `conseguir`, `requiere` | Cómo se consigue y qué cuenta o gestor pide |
| `nota`, `enlace`, `enlaceTercero` | Notas, página del plugin y si esa página no es del fabricante |
| `deprecado`, `deprecadoMotivo`, `reemplazo`, `reemplazaA` | Marca de deprecado, motivo y relación entre versión vieja y actual |

Los fabricantes, con su web y su logo, están en `data/makers.js`. Los logos están en `assets/logos` y pertenecen a sus fabricantes. Si un logo es blanco, poné `"oscuro": true` para usar una etiqueta oscura.

Después de editar, hacé commit y push: GitHub Pages publica el cambio solo.
