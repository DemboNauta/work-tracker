package com.worktracker.fichaje.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.worktracker.fichaje.data.AuthStore
import com.worktracker.fichaje.data.Repository
import com.worktracker.fichaje.widget.WidgetRefresh
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(repo: Repository) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var baseUrl by remember { mutableStateOf(AuthStore.DEFAULT_BASE_URL) }
    var name by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showAdvanced by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        Text("Fichaje", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium)
        Text(
            "Inicia sesión para ver tu semana",
            style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
            color = Muted,
        )

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text("Usuario") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Contraseña") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )

        TextButton(onClick = { showAdvanced = !showAdvanced }) {
            Text(if (showAdvanced) "Ocultar servidor" else "Servidor avanzado")
        }
        if (showAdvanced) {
            OutlinedTextField(
                value = baseUrl,
                onValueChange = { baseUrl = it },
                label = { Text("URL del servidor") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (error != null) {
            Text(error!!, color = androidx.compose.material3.MaterialTheme.colorScheme.error)
        }

        Button(
            onClick = {
                error = null
                loading = true
                scope.launch {
                    try {
                        repo.login(baseUrl, name, password)
                        repo.refreshWeek()
                        WidgetRefresh.update(context)
                        WidgetRefresh.enqueuePeriodic(context)
                    } catch (e: Exception) {
                        error = "No se pudo iniciar sesión. Revisa usuario, contraseña y servidor."
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading && name.isNotBlank() && password.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp))
            Text("Entrar")
        }
    }
}
