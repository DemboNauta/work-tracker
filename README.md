# Fichaje · Registro de horas de trabajo

App web para gestionar horas trabajadas: registro manual y por OCR (capturas de
Orquest), horas nocturnas, horas complementarias y archivo de nóminas.

## Funcionalidades

- **Auth básica**: nombre + contraseña (bcrypt + cookie JWT httpOnly). Cada
  usuario ve solo sus datos.
- **Registro manual**: fecha + uno o varios tramos (turnos partidos). Si el fin
  es anterior al inicio, se asume que cruza la medianoche.
- **Importación OCR**: sube capturas de la pantalla *"Mis turnos"* de Orquest.
  El OCR corre en el navegador (tesseract.js, español); el parser (port de
  [DemboNauta/orquest-calendar](https://github.com/DemboNauta/orquest-calendar))
  detecta semana, días, tramos, turnos partidos, días libres y "sin
  asignaciones". Previsualizas y confirmas antes de guardar; reimportar la
  misma semana actualiza en vez de duplicar.
- **Horas nocturnas**: las comprendidas en la ventana nocturna (por defecto
  22:00–06:00, configurable).
- **Horas complementarias**: exceso sobre el límite semanal (16 h) o anual
  (720 h), ambos configurables en Ajustes.
- **Panel**: horas de hoy, semana, mes y año; gráfica de la semana actual con
  desglose nocturno; últimas 8 semanas contra el límite; progreso del cómputo
  anual.
- **Nóminas**: sube la nómina de cada mes (PDF/imagen), una por mes, con
  visualización y borrado.

## Stack

Next.js (App Router) · shadcn/ui · Tailwind v4 · SQLite (better-sqlite3 +
Drizzle) · tesseract.js · jose + bcryptjs · vitest

Los datos viven en `data/` (SQLite + nóminas), fuera de git.

## Uso

```bash
npm install
npm run dev    # desarrollo → http://localhost:3000
npm run build && npm start   # producción
npm test       # tests del motor de horas y del parser OCR
```

En producción define `AUTH_SECRET` (secreto para firmar las sesiones):

```bash
AUTH_SECRET="algo-largo-y-aleatorio" npm start
```

## Estructura

```
src/
├── lib/
│   ├── hours.ts            # Motor: nocturnas, complementarias, agregados
│   ├── orquest-parser.ts   # Parser del texto OCR de Orquest
│   ├── queries.ts          # Agregados para el panel
│   ├── auth.ts             # Sesiones JWT + cookie
│   └── db/                 # SQLite + Drizzle (schema y migración embebida)
├── app/
│   ├── login/              # Entrar / crear cuenta
│   ├── (app)/              # Zona autenticada
│   │   ├── page.tsx        # Panel
│   │   ├── turnos/         # Registro manual + listado mensual
│   │   ├── importar/       # OCR de capturas de Orquest
│   │   ├── nominas/        # Subida y archivo de nóminas
│   │   └── ajustes/        # Límites y ventana nocturna
│   ├── actions/            # Server actions
│   └── api/payrolls/[id]/  # Descarga de nóminas
└── proxy.ts                # Protección de rutas
```
