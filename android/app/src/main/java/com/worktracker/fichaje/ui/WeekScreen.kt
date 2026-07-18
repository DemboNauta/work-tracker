package com.worktracker.fichaje.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.worktracker.fichaje.data.DayDto
import com.worktracker.fichaje.data.Repository
import com.worktracker.fichaje.data.WeekResponse
import com.worktracker.fichaje.data.fmtMin
import com.worktracker.fichaje.data.rangeLabel
import com.worktracker.fichaje.data.withLocalToday
import com.worktracker.fichaje.widget.WidgetRefresh
import kotlinx.coroutines.launch

private const val WEB_APP_URL = "https://fichaje.cryptoaiarena.com/"

@Composable
fun WeekScreen(repo: Repository) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var week by remember { mutableStateOf<WeekResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        loading = true
        error = null
        try {
            week = repo.refreshWeek().withLocalToday()
            WidgetRefresh.update(context)
        } catch (e: Exception) {
            // Fallback a la caché si falla la red.
            week = repo.cachedWeek()?.withLocalToday()
            if (week == null) error = "No se pudo cargar la semana."
        } finally {
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        week = repo.cachedWeek()?.withLocalToday()
        load()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Semana actual", style = MaterialTheme.typography.titleLarge)
                week?.let {
                    Text(
                        it.rangeLabel(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Muted,
                    )
                }
            }
            week?.let {
                Text(
                    fmtMin(it.weekTotalMin),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Amber,
                )
            }
        }

        when {
            loading && week == null ->
                CircularProgressIndicator(modifier = Modifier.padding(24.dp))

            error != null ->
                Text(error!!, color = MaterialTheme.colorScheme.error)

            week != null ->
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    week!!.days.forEach { DayRow(it) }
                }
        }

        TextButton(onClick = { scope.launch { load() } }, enabled = !loading) {
            Text("Actualizar")
        }
        TextButton(onClick = {
            runCatching {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse(WEB_APP_URL))
                )
            }
        }) {
            Text("Abrir en el navegador")
        }
        Button(onClick = { scope.launch { repo.logout() } }) {
            Text("Cerrar sesión")
        }
    }
}

@Composable
private fun DayRow(day: DayDto) {
    val bg = if (day.isToday) Amber.copy(alpha = 0.18f) else Surface
    val borderColor = if (day.isToday) Amber else Color.Transparent
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            day.weekdayShort,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (day.isToday) FontWeight.Bold else FontWeight.Normal,
            color = if (day.isToday) Amber else OnSurface,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            if (day.nightMin > 0) {
                Text("🌙 ${fmtMin(day.nightMin)}", color = Night, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                if (day.totalMin > 0) fmtMin(day.totalMin) else "·",
                style = MaterialTheme.typography.titleMedium,
                color = if (day.totalMin > 0) OnSurface else Muted,
            )
        }
    }
}
