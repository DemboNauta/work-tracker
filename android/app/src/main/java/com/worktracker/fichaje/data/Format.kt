package com.worktracker.fichaje.data

import java.time.LocalDate

/** Minutos desde medianoche → "HH:MM" (normaliza >24h). Portado de src/lib/hours.ts. */
fun fmtTime(min: Int): String {
    val norm = ((min % 1440) + 1440) % 1440
    return "${(norm / 60).toString().padStart(2, '0')}:${(norm % 60).toString().padStart(2, '0')}"
}

/** Minutos → "8h 30m" (o "8h", o "0h"). Portado de src/lib/hours.ts. */
fun fmtMin(min: Int): String {
    val abs = kotlin.math.abs(min)
    val h = abs / 60
    val m = abs % 60
    val sign = if (min < 0) "-" else ""
    return if (m == 0) "${sign}${h}h" else "${sign}${h}h ${m.toString().padStart(2, '0')}m"
}

/**
 * Recalcula isToday en el cliente contra la fecha real del dispositivo,
 * para que el día resaltado sea correcto aunque no se haya refrescado la red.
 */
fun WeekResponse.withLocalToday(today: LocalDate = LocalDate.now()): WeekResponse {
    val todayStr = today.toString() // ISO YYYY-MM-DD
    return copy(days = days.map { it.copy(isToday = it.date == todayStr) })
}

/** "13 jul – 19 jul" a partir de la lista de días. */
fun WeekResponse.rangeLabel(): String {
    val first = days.firstOrNull()?.date ?: return ""
    val last = days.lastOrNull()?.date ?: return ""
    return "${dayMonth(first)} – ${dayMonth(last)}"
}

private val MONTHS_ES = arrayOf(
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
)

private fun dayMonth(iso: String): String {
    val parts = iso.split("-")
    if (parts.size != 3) return iso
    val day = parts[2].toIntOrNull() ?: return iso
    val month = parts[1].toIntOrNull() ?: return iso
    return "$day ${MONTHS_ES.getOrElse(month - 1) { "" }}"
}
