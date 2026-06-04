# Google Sheets CMS — any

La web lee tres pestañas de esta hoja (ID en `src/lib/googleSheets/defaults.ts`):

https://docs.google.com/spreadsheets/d/1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc/edit

**Importante:** la hoja debe estar compartida como **Cualquier persona con el enlace → Lector**.

## Pestañas

| Pestaña   | Contenido |
|-----------|-----------|
| `works`   | Pieza + `video_url`, `thumbnail_url`, `audio_url` (una escena por fila) |
| `credits` | Créditos por `work_id` |
| `tags`    | `id`, `category`, `active` |

## `works`

| Columna          | Descripción |
|------------------|-------------|
| `id`             | `track-01`, etc. |
| `title`          | Título en el grid |
| `description`    | Panel de créditos |
| `tags`           | `ambient, soft, harp` |
| `order` / `year` | Orden y año |
| `video_url`      | Ruta local o URL R2 del MP4 |
| `thumbnail_url`  | Poster |
| `audio_url`      | MP3 (opcional) |
| `active`         | `yes` / `no` |

## `tags`

Solo `id`, `category` (`mood` | `instrument`), `active`. El label en la UI es el propio `id`.

## CSV de respaldo

`data/sheets-import/works.csv`, `credits.csv`, `tags.csv` — regenerar con `npm run sheets:csv`.

## Refresco

`/api/works?force=1` tras editar la hoja.
