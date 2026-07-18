# Fichaje — app Android + widget

App nativa (Kotlin + Jetpack Compose + Glance) que se conecta al backend
work-tracker y muestra un **widget de pantalla de inicio con la semana actual**,
resaltando el día de hoy. Inspirada en `DemboNauta/orquest-calendar`.

## Qué hace
- **Login** contra el backend (`POST /api/mobile/login` → token Bearer JWT).
- **Pantalla de semana**: 7 días con horas trabajadas, nocturnas y total; hoy resaltado.
- **Widget Glance**: fila Lun–Dom con horas/día + total de la semana; toca → abre la app.
  Lee la última semana cacheada (offline) y `WorkManager` la refresca cada ~6 h.

Servidor por defecto: `https://fichaje.cryptoaiarena.com` (editable en "Servidor avanzado").

## Requisitos
- Android Studio (Ladybug o superior) con Android SDK 35.
- JDK 17.

## Compilar / ejecutar
El wrapper de Gradle (`gradlew`, `gradle-wrapper.jar`) **no está commiteado** (binario).
Genéralo una vez:

```bash
cd android
gradle wrapper --gradle-version 8.11.1   # o abre la carpeta en Android Studio (lo genera solo)
./gradlew assembleDebug                   # compila el APK de debug
```

Luego abre `android/` en Android Studio y ejecuta en un emulador/dispositivo:
1. Inicia sesión con tu usuario del backend.
2. Verás la semana. Añade el widget "Fichaje" a la pantalla de inicio.

## Endpoints backend que consume
- `POST /api/mobile/login` — body `{name,password}` → `{token, user}`.
- `GET  /api/mobile/week?date=YYYY-MM-DD` — cabecera `Authorization: Bearer <token>`.
  Devuelve `{weekStart, days[7]{date,weekdayShort,totalMin,nightMin,isToday}, weekTotalMin, ...}`.

Ambos definidos en `src/app/api/mobile/` del backend Next.js.
