package com.worktracker.fichaje.data

import android.content.Context
import java.time.LocalDate

/**
 * Punto único de acceso a datos. Reconstruye el ApiService según el baseUrl
 * guardado y cachea la última semana para el widget.
 */
class Repository(context: Context) {

    val store = AuthStore(context.applicationContext)

    /** Inicia sesión contra [baseUrl], guarda baseUrl + token. */
    suspend fun login(baseUrl: String, name: String, password: String) {
        store.setBaseUrl(baseUrl)
        val api = ApiFactory.create(AuthStore.normalizeBaseUrl(baseUrl))
        val res = api.login(LoginRequest(name.trim(), password))
        store.setToken(res.token)
    }

    suspend fun logout() = store.clear()

    /** Descarga la semana (opcionalmente de [date]), la cachea y la devuelve. */
    suspend fun refreshWeek(date: String? = null): WeekResponse {
        val token = store.tokenNow() ?: error("Sin sesión")
        val api = ApiFactory.create(store.baseUrlNow())
        val week = api.week("Bearer $token", date)
        store.setCachedWeek(week)
        return week
    }

    suspend fun cachedWeek(): WeekResponse? = store.cachedWeekNow()

  /** Refresca la semana anclada actualmente (o la actual si no hay ancla). */
  suspend fun refreshAnchoredWeek(): WeekResponse = refreshWeek(store.widgetAnchorNow())

  /** Mueve el widget deltaWeeks semanas (±1) y refresca. */
  suspend fun shiftWidgetWeek(deltaWeeks: Int): WeekResponse {
    val base = store.widgetAnchorNow()
      ?: cachedWeek()?.weekStart
      ?: LocalDate.now().toString()
    val newAnchor = LocalDate.parse(base).plusWeeks(deltaWeeks.toLong()).toString()
    store.setWidgetAnchor(newAnchor)
    return refreshWeek(newAnchor)
  }

  /** Vuelve a la semana actual (quita el ancla) y refresca. */
  suspend fun resetWidgetToCurrent(): WeekResponse {
    store.setWidgetAnchor(null)
    return refreshWeek(null)
  }
}
