package com.worktracker.fichaje.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.worktracker.fichaje.data.Repository

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = Repository(this)
        setContent {
            FichajeTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot(repo)
                }
            }
        }
    }
}

@Composable
private fun AppRoot(repo: Repository) {
    val token by repo.store.token.collectAsStateWithLifecycle(initialValue = null)
    if (token.isNullOrEmpty()) {
        LoginScreen(repo)
    } else {
        WeekScreen(repo)
    }
}
