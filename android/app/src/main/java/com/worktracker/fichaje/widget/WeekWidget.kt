package com.worktracker.fichaje.widget

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.worktracker.fichaje.data.AuthStore
import com.worktracker.fichaje.data.DayDto
import com.worktracker.fichaje.data.Repository
import com.worktracker.fichaje.data.WeekResponse
import com.worktracker.fichaje.data.fmtMin
import com.worktracker.fichaje.data.fmtTime
import com.worktracker.fichaje.data.rangeLabel
import com.worktracker.fichaje.data.withLocalToday
import com.worktracker.fichaje.ui.MainActivity

private val Graphite = Color(0xFF16171A)
private val Surface = Color(0xFF2C3038)
private val SurfaceHi = Color(0xFF3A3F49)
private val Amber = Color(0xFFE8A33D)
private val AmberDim = Color(0x2BE8A33D)
private val OnSurface = Color(0xFFECECEC)
private val Muted = Color(0xFF8A8D93)
private val ErrorRed = Color(0xFFE05B4F)

/**
 * Widget vertical: cabecera con navegación de semanas (‹ ›) y una lista de días
 * (Lun–Dom), cada uno con sus turnos como tramos HH:MM–HH:MM. Hoy resaltado.
 */
class WeekWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val store = AuthStore(context)
        val week = store.cachedWeekNow()?.withLocalToday()
        val error = store.widgetErrorNow()
        val openApp = Intent(context, MainActivity::class.java)
        provideContent { Content(week, error, openApp) }
    }

    @Composable
    private fun Content(week: WeekResponse?, error: String?, openApp: Intent) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Graphite))
                .cornerRadius(18.dp)
                .padding(12.dp),
        ) {
            Header(week, error, openApp)
            if (week == null || week.days.isEmpty()) {
                Box(
                    modifier = GlanceModifier.fillMaxSize().padding(top = 16.dp),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Text(
                        text = "Toca para iniciar sesión",
                        style = TextStyle(color = ColorProvider(Muted), fontSize = 13.sp),
                    )
                }
            } else {
                LazyColumn(modifier = GlanceModifier.fillMaxSize().padding(top = 8.dp)) {
                    week.days.forEach { day -> item { DayRow(day) } }
                }
            }
        }
    }

    @Composable
    private fun Header(week: WeekResponse?, error: String?, openApp: Intent) {
        Column(modifier = GlanceModifier.fillMaxWidth()) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                NavButton("‹", actionRunCallback<PrevWeekAction>())
                Column(
                    modifier = GlanceModifier.defaultWeight()
                        .clickable(actionStartActivity(openApp)),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = week?.rangeLabel()?.ifEmpty { "Fichaje" } ?: "Fichaje",
                        style = TextStyle(
                            color = ColorProvider(Amber),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            textAlign = TextAlign.Center,
                        ),
                    )
                    if (week != null) {
                        Text(
                            text = "Total ${fmtMin(week.weekTotalMin)}",
                            style = TextStyle(color = ColorProvider(Muted), fontSize = 11.sp),
                        )
                    }
                }
                NavButton("›", actionRunCallback<NextWeekAction>())
            }
            if (error != null) {
                Text(
                    text = "⚠ $error",
                    maxLines = 2,
                    style = TextStyle(
                        color = ColorProvider(ErrorRed),
                        fontSize = 10.sp,
                        textAlign = TextAlign.Center,
                    ),
                    modifier = GlanceModifier.fillMaxWidth().padding(top = 4.dp),
                )
            }
        }
    }

    @Composable
    private fun NavButton(glyph: String, action: androidx.glance.action.Action) {
        Box(
            modifier = GlanceModifier
                .width(38.dp)
                .background(ColorProvider(Surface))
                .cornerRadius(10.dp)
                .padding(vertical = 6.dp)
                .clickable(action),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = glyph,
                style = TextStyle(
                    color = ColorProvider(OnSurface),
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    textAlign = TextAlign.Center,
                ),
            )
        }
    }

    @Composable
    private fun DayRow(day: DayDto) {
        val today = day.isToday
        val rowBg = if (today) AmberDim else Surface
        val labelColor = if (today) Amber else OnSurface
        val dayNum = day.date.substringAfterLast('-')
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .background(ColorProvider(rowBg))
                .cornerRadius(12.dp)
                .padding(horizontal = 10.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = GlanceModifier.width(46.dp)) {
                Text(
                    text = day.weekdayShort,
                    style = TextStyle(
                        color = ColorProvider(labelColor),
                        fontWeight = if (today) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 13.sp,
                    ),
                )
                Text(
                    text = dayNum,
                    style = TextStyle(color = ColorProvider(Muted), fontSize = 10.sp),
                    modifier = GlanceModifier.padding(top = 2.dp),
                )
            }
            if (day.segments.isEmpty()) {
                Text(
                    text = "Libre",
                    style = TextStyle(color = ColorProvider(Muted), fontSize = 12.sp),
                    modifier = GlanceModifier.defaultWeight().padding(start = 4.dp),
                )
            } else {
                Row(modifier = GlanceModifier.defaultWeight()) {
                    day.segments.forEach { seg -> ShiftPill(seg.startMin, seg.endMin) }
                }
            }
        }
    }

    @Composable
    private fun ShiftPill(startMin: Int, endMin: Int) {
        Box(
            modifier = GlanceModifier
                .padding(start = 6.dp)
                .background(ColorProvider(SurfaceHi))
                .cornerRadius(8.dp)
                .padding(horizontal = 8.dp, vertical = 4.dp),
        ) {
            Text(
                text = "${fmtTime(startMin)}–${fmtTime(endMin)}",
                style = TextStyle(
                    color = ColorProvider(OnSurface),
                    fontWeight = FontWeight.Medium,
                    fontSize = 12.sp,
                ),
            )
        }
    }
}

/** Ejecuta el desplazamiento de semana y deja constancia de si falló, en vez de
 *  tragarse el error en silencio (así se ve en el propio widget por qué la
 *  semana se queda "congelada" si la red falla). */
private suspend fun shiftAndReport(context: Context, deltaWeeks: Int) {
    val repo = Repository(context)
    runCatching { repo.shiftWidgetWeek(deltaWeeks) }
        .onSuccess { repo.store.setWidgetError(null) }
        .onFailure { e ->
            Log.e("WeekWidget", "shiftWidgetWeek($deltaWeeks) failed", e)
            repo.store.setWidgetError(e.message ?: e::class.java.simpleName)
        }
    WeekWidget().updateAll(context)
}

/** ‹ semana anterior. */
class PrevWeekAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) = shiftAndReport(context, -1)
}

/** › semana siguiente. */
class NextWeekAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) = shiftAndReport(context, 1)
}
