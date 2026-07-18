package com.worktracker.fichaje.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("fichaje")

/**
 * Persiste baseUrl + token de sesión y cachea la última semana recibida
 * (JSON) para que el widget pinte al instante y sin conexión.
 */
class AuthStore(private val context: Context) {

    private object Keys {
        val BASE_URL = stringPreferencesKey("base_url")
        val TOKEN = stringPreferencesKey("token")
        val WEEK_JSON = stringPreferencesKey("week_json")
    }

    val baseUrl: Flow<String> =
        context.dataStore.data.map { it[Keys.BASE_URL] ?: DEFAULT_BASE_URL }

    val token: Flow<String?> =
        context.dataStore.data.map { it[Keys.TOKEN] }

    suspend fun baseUrlNow(): String =
        context.dataStore.data.first()[Keys.BASE_URL] ?: DEFAULT_BASE_URL

    suspend fun tokenNow(): String? =
        context.dataStore.data.first()[Keys.TOKEN]

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[Keys.BASE_URL] = normalizeBaseUrl(url) }
    }

    suspend fun setToken(value: String?) {
        context.dataStore.edit {
            if (value == null) it.remove(Keys.TOKEN) else it[Keys.TOKEN] = value
        }
    }

    suspend fun setCachedWeek(week: WeekResponse) {
        context.dataStore.edit { it[Keys.WEEK_JSON] = json.encodeToString(week) }
    }

    suspend fun cachedWeekNow(): WeekResponse? {
        val raw = context.dataStore.data.first()[Keys.WEEK_JSON] ?: return null
        return runCatching { json.decodeFromString<WeekResponse>(raw) }.getOrNull()
    }

    suspend fun clear() {
        context.dataStore.edit {
            it.remove(Keys.TOKEN)
            it.remove(Keys.WEEK_JSON)
        }
    }

    companion object {
        const val DEFAULT_BASE_URL = "https://fichaje.cryptoaiarena.com"
        val json = Json { ignoreUnknownKeys = true }

        fun normalizeBaseUrl(url: String): String {
            val trimmed = url.trim().ifEmpty { DEFAULT_BASE_URL }
            return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
        }
    }
}
