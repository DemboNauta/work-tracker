package com.worktracker.fichaje.data

import android.content.Context

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
}
