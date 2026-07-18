package com.worktracker.fichaje.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Paleta "reloj de fichar": grafito + ámbar (coherente con la web).
val Graphite = Color(0xFF17181A)
val Surface = Color(0xFF202225)
val Amber = Color(0xFFE8A33D)
val OnSurface = Color(0xFFECECEC)
val Muted = Color(0xFF8A8D93)
val Night = Color(0xFF7C8FD4)

private val FichajeColors = darkColorScheme(
    primary = Amber,
    onPrimary = Graphite,
    background = Graphite,
    onBackground = OnSurface,
    surface = Surface,
    onSurface = OnSurface,
    surfaceVariant = Surface,
    onSurfaceVariant = Muted,
)

@Composable
fun FichajeTheme(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // Tema oscuro fijo por diseño.
    MaterialTheme(colorScheme = FichajeColors, content = content)
}
