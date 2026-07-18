package com.worktracker.fichaje.data

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @POST("api/mobile/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("api/mobile/week")
    suspend fun week(
        @Header("Authorization") bearer: String,
        @Query("date") date: String? = null,
    ): WeekResponse
}

object ApiFactory {
    private val json = Json { ignoreUnknownKeys = true }

    /** Construye un ApiService para el baseUrl indicado (configurable en runtime). */
    fun create(baseUrl: String): ApiService {
        val client = OkHttpClient.Builder().build()
        return Retrofit.Builder()
            .baseUrl(AuthStore.normalizeBaseUrl(baseUrl))
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(ApiService::class.java)
    }
}
