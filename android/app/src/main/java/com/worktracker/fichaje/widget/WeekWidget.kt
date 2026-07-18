package com.worktracker.fichaje.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.worktracker.fichaje.data.AuthStore
import com.worktracker.fichaje.data.DayDto
import com.worktracker.fichaje.data.WeekResponse
import com.worktracker.fichaje.data.fmtMin
import com.worktracker.fichaje.data.rangeLabel
import com.worktracker.fichaje.data.withLocalToday
import com.worktracker.fichaje.ui.MainActivity

private val Graphite = Color(0xFF17181A)
private val Surface = Color(0xFF202225)
private val Amber = Color(0xFFE8A33D)
private val OnSurface = Color(0xFFECECEC)
private val Muted = Color(0xFF8A8D93)

/**
 * Widget de pantalla de inicio: fila con los 7 días de la semana, horas por
 * día y el día de hoy resaltado en ámbar. Lee la semana cacheada (offline).
 */
class WeekWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        // isToday recalculado en cliente por si cambió el día sin refetch.
        val week = AuthStore(context).cachedWeekNow()?.withLocalToday()
        provideContent { Content(week) }
    }

    @Composable
    private fun Content(week: WeekResponse?) {
        Column(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(ColorProvider(Graphite))
                .padding(10.dp)
                .clickable(actionStartActivity<MainActivity>()),
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = week?.rangeLabel()?.ifEmpty { "Fichaje" } ?: "Abre la app",
                    style = TextStyle(color = ColorProvider(Muted), fontSize = 11.sp),
                    modifier = GlanceModifier.defaultWeight(),
                )
                if (week != null) {
                    Text(
                        text = fmtMin(week.weekTotalMin),
                        style = TextStyle(
                            color = ColorProvider(Amber),
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                        ),
                    )
                }
            }

            Row(modifier = GlanceModifier.fillMaxWidth()) {
                val days = week?.days ?: emptyList()
                if (days.isEmpty()) {
                    Text(
                        text = "Toca para iniciar sesión",
                        style = TextStyle(color = ColorProvider(Muted), fontSize = 12.sp),
                    )
                } else {
                    days.forEach { day ->
                        DayCell(day, GlanceModifier.defaultWeight())
                    }
                }
            }
        }
    }

    @Composable
    private fun DayCell(day: DayDto, modifier: GlanceModifier) {
        val bg = if (day.isToday) Amber else Surface
        val fg = if (day.isToday) Graphite else OnSurface
        Column(
            modifier = modifier
                .padding(horizontal = 2.dp)
                .background(ColorProvider(bg))
                .padding(vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = day.weekdayShort,
                style = TextStyle(
                    color = ColorProvider(fg),
                    fontWeight = if (day.isToday) FontWeight.Bold else FontWeight.Normal,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                ),
            )
            Text(
                text = if (day.totalMin > 0) fmtMin(day.totalMin) else "·",
                style = TextStyle(
                    color = ColorProvider(fg),
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                ),
            )
        }
    }
}
