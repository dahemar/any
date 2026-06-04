# Google Sheets — any CMS

**Hoja:** https://docs.google.com/spreadsheets/d/1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc/edit

**Pestañas:** `works`, `credits`, `tags` (sin `scenes` — vídeo/poster/mp3 van en `works`).

## Importar / actualizar

```bash
node scripts/generate-sheet-csvs.mjs
```

Copia el contenido de cada CSV a la pestaña correspondiente, o:

```bash
# Requiere compartir la hoja con sheets-writer@web-cora.iam.gserviceaccount.com (Editor)
node scripts/push-sheets-to-google.mjs
```

## Lectura en la web

La hoja debe estar en **Compartir → Cualquier persona con el enlace → Lector** (la API key solo lee hojas públicas).

## Columnas

### `works`
`id`, `title`, `description`, `tags`, `order`, `year`, `video_url`, `thumbnail_url`, `audio_url`, `active`

### `credits`
`work_id`, `role`, `name`, `order`, `active`

### `tags`
`id`, `category` (`mood` | `instrument`), `active` — el texto visible es el `id`
