package com.worktracker.fichaje.calendar

import android.Manifest
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CalendarContract
import androidx.core.content.ContextCompat
import com.worktracker.fichaje.data.RangeDay
import java.time.LocalDate
import java.time.ZoneId

/** Un calendario donde se puede escribir (normalmente una cuenta de Google del dispositivo). */
data class CalendarInfo(val id: Long, val displayName: String, val accountName: String)

data class SyncResult(val inserted: Int, val updated: Int)

/**
 * Escribe los turnos en el proveedor de calendario del dispositivo. Como el calendario de Google
 * ya está sincronizado en Android, los eventos aparecen en Google Calendar sin OAuth ni claves.
 * Portado de github.com/DemboNauta/orquest-calendar (CalendarSync.kt).
 *
 * Cada tramo lleva una clave estable en la descripción → re-sincronizar no duplica: actualiza.
 */
class CalendarSync(private val context: Context) {

    private val zone: ZoneId = ZoneId.systemDefault()
    private val marker = "[Fichaje]"

    companion object {
        fun hasPermissions(context: Context): Boolean {
            val read = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR)
            val write = ContextCompat.checkSelfPermission(context, Manifest.permission.WRITE_CALENDAR)
            return read == PackageManager.PERMISSION_GRANTED &&
                write == PackageManager.PERMISSION_GRANTED
        }
    }

    fun availableCalendars(): List<CalendarInfo> {
        val projection = arrayOf(
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
            CalendarContract.Calendars.ACCOUNT_NAME,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
        )
        val result = mutableListOf<CalendarInfo>()
        context.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI, projection, null, null, null,
        )?.use { c ->
            val idCol = c.getColumnIndexOrThrow(CalendarContract.Calendars._ID)
            val nameCol = c.getColumnIndexOrThrow(CalendarContract.Calendars.CALENDAR_DISPLAY_NAME)
            val accCol = c.getColumnIndexOrThrow(CalendarContract.Calendars.ACCOUNT_NAME)
            val accessCol = c.getColumnIndexOrThrow(CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL)
            while (c.moveToNext()) {
                if (c.getInt(accessCol) >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR) {
                    result += CalendarInfo(
                        id = c.getLong(idCol),
                        displayName = c.getString(nameCol) ?: "(sin nombre)",
                        accountName = c.getString(accCol) ?: "",
                    )
                }
            }
        }
        return result
    }

    /** Sincroniza los turnos de todos los días en el calendario indicado. */
    fun sync(calendarId: Long, days: List<RangeDay>): SyncResult {
        var inserted = 0
        var updated = 0
        for (day in days) {
            val date = runCatching { LocalDate.parse(day.date) }.getOrNull() ?: continue
            day.segments.forEachIndexed { index, seg ->
                if (upsert(calendarId, date, seg.startMin, seg.endMin, index)) inserted++ else updated++
            }
        }
        return SyncResult(inserted, updated)
    }

    /** @return true si insertó, false si actualizó. */
    private fun upsert(
        calendarId: Long,
        date: LocalDate,
        startMin: Int,
        endMin: Int,
        index: Int,
    ): Boolean {
        // endMin puede superar 1440 (cruza medianoche): sumar minutos sobre el inicio del día.
        val base = date.atStartOfDay(zone).toInstant().toEpochMilli()
        val startMillis = base + startMin * 60_000L
        val endMillis = base + endMin * 60_000L

        val syncKey = "$marker $date#$index"
        val values = ContentValues().apply {
            put(CalendarContract.Events.CALENDAR_ID, calendarId)
            put(CalendarContract.Events.TITLE, "Turno")
            put(CalendarContract.Events.DESCRIPTION, syncKey)
            put(CalendarContract.Events.DTSTART, startMillis)
            put(CalendarContract.Events.DTEND, endMillis)
            put(CalendarContract.Events.EVENT_TIMEZONE, zone.id)
        }

        val existingId = findExisting(calendarId, syncKey)
        return if (existingId != null) {
            val uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, existingId)
            context.contentResolver.update(uri, values, null, null)
            false
        } else {
            context.contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            true
        }
    }

    private fun findExisting(calendarId: Long, syncKey: String): Long? {
        val projection = arrayOf(CalendarContract.Events._ID)
        val selection =
            "${CalendarContract.Events.CALENDAR_ID} = ? AND ${CalendarContract.Events.DESCRIPTION} = ?"
        context.contentResolver.query(
            CalendarContract.Events.CONTENT_URI, projection, selection,
            arrayOf(calendarId.toString(), syncKey), null,
        )?.use { c -> if (c.moveToFirst()) return c.getLong(0) }
        return null
    }
}
