package com.worktracker.fichaje.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.worktracker.fichaje.data.Repository
import java.util.concurrent.TimeUnit

/** Coordina el refresco del widget: manual (tras login/abrir app) y periódico. */
object WidgetRefresh {

    private const val PERIODIC_WORK = "fichaje-week-refresh"

    /** Repinta los widgets con lo que haya en caché (sin red). */
    suspend fun update(context: Context) {
        WeekWidget().updateAll(context)
    }

    /** Programa un refresco periódico (~cada 6 h) que descarga y repinta. */
    fun enqueuePeriodic(context: Context) {
        val request = PeriodicWorkRequestBuilder<RefreshWorker>(6, TimeUnit.HOURS).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_WORK,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }
}

class RefreshWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val repo = Repository(applicationContext)
        // Sin sesión: nada que hacer, no reintentar.
        if (repo.store.tokenNow().isNullOrEmpty()) return Result.success()
        return try {
            repo.refreshWeek()
            WeekWidget().updateAll(applicationContext)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
