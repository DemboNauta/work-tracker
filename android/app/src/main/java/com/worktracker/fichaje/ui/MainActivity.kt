package com.worktracker.fichaje.ui

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.worktracker.fichaje.calendar.CalendarSync
import com.worktracker.fichaje.data.AuthStore
import com.worktracker.fichaje.data.Repository
import com.worktracker.fichaje.widget.WidgetRefresh
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

private const val BASE_URL = "https://fichaje.cryptoaiarena.com/"

/**
 * La app es un WebView de la web real (login, panel, turnos, nóminas...).
 * Solo el widget es nativo; su token se toma de la cookie de sesión wt_session.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var repo: Repository
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var lastSyncedToken: String? = null

    // El login es un Server Action (navegación RSC sin recargar documento), así que
    // onPageFinished no basta: sondeamos la cookie mientras la app está en primer plano.
    private val handler = Handler(Looper.getMainLooper())
    private val cookiePoll = object : Runnable {
        override fun run() {
            syncWidgetToken()
            handler.postDelayed(this, 2500)
        }
    }

    private val fileChooser: ActivityResultLauncher<String> =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            filePathCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
            filePathCallback = null
        }

    private val calendarPerms: ActivityResultLauncher<Array<String>> =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
            if (result.values.all { it }) chooseCalendarAndSync()
            else toast("Permiso de calendario denegado")
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repo = Repository(this)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setSupportMultipleWindows(false)
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url.toString()
                // Nóminas (PDF/imagen inline): descargar con la cookie de sesión.
                if (Regex("/api/payrolls/\\d+").containsMatchIn(url)) {
                    downloadWithCookie(url)
                    return true
                }
                return false // el resto navega dentro del WebView
            }

            override fun onPageFinished(view: WebView, url: String) {
                syncWidgetToken()
            }

            override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
                // Cambios de historial en la SPA (p.ej. tras el login por Server Action).
                syncWidgetToken()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                return try {
                    fileChooser.launch("*/*")
                    true
                } catch (e: Exception) {
                    filePathCallback = null
                    false
                }
            }
        }

        // Descargas directas (Content-Disposition attachment) como red de seguridad.
        webView.setDownloadListener { url, _, _, _, _ -> downloadWithCookie(url) }

        // WebView a pantalla completa + botón flotante para sincronizar el calendario.
        val root = FrameLayout(this)
        root.addView(webView)
        val syncButton = Button(this).apply {
            text = "📅 Calendar"
            setOnClickListener { startCalendarSync() }
            val m = (16 * resources.displayMetrics.density).toInt()
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM or Gravity.END,
            ).apply { setMargins(0, 0, m, m) }
        }
        root.addView(syncButton)
        setContentView(root)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        if (savedInstanceState == null) webView.loadUrl(BASE_URL)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        handler.post(cookiePoll)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(cookiePoll)
        CookieManager.getInstance().flush()
    }

    // ---- Sincronización con Google Calendar (vía proveedor de calendario del dispositivo) ----

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    private fun startCalendarSync() {
        if (CalendarSync.hasPermissions(this)) {
            chooseCalendarAndSync()
        } else {
            calendarPerms.launch(
                arrayOf(Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR)
            )
        }
    }

    private fun chooseCalendarAndSync() {
        val cals = CalendarSync(this).availableCalendars()
        when {
            cals.isEmpty() -> toast("No hay calendarios donde escribir. Añade una cuenta de Google.")
            cals.size == 1 -> runCalendarSync(cals[0].id)
            else -> {
                val labels = cals.map { "${it.displayName}\n${it.accountName}" }.toTypedArray()
                AlertDialog.Builder(this)
                    .setTitle("Elige calendario")
                    .setItems(labels) { _, i -> runCalendarSync(cals[i].id) }
                    .show()
            }
        }
    }

    private fun runCalendarSync(calendarId: Long) {
        toast("Sincronizando turnos…")
        lifecycleScope.launch {
            try {
                val today = LocalDate.now()
                val resp = repo.getShifts(today.toString(), today.plusWeeks(4).toString())
                val res = withContext(Dispatchers.IO) {
                    CalendarSync(this@MainActivity).sync(calendarId, resp.days)
                }
                toast("Calendario: ${res.inserted} nuevos, ${res.updated} actualizados")
            } catch (e: Exception) {
                toast("No se pudo sincronizar. Inicia sesión en la app primero.")
            }
        }
    }

    /** Encola una descarga en Descargas incluyendo la cookie wt_session. */
    private fun downloadWithCookie(url: String) {
        val cookie = CookieManager.getInstance().getCookie(url)
        val name = url.substringAfterLast('/').ifEmpty { "nomina" }
        val req = DownloadManager.Request(Uri.parse(url)).apply {
            if (!cookie.isNullOrEmpty()) addRequestHeader("Cookie", cookie)
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "fichaje-$name")
        }
        (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
        Toast.makeText(this, "Descargando nómina…", Toast.LENGTH_SHORT).show()
    }

    /**
     * Extrae wt_session de la cookie del dominio y la guarda como token del widget
     * (mismo JWT que acepta authenticateBearer). Refresca el widget si cambia.
     */
    private fun syncWidgetToken() {
        val cookies = CookieManager.getInstance().getCookie(BASE_URL)
        val token = cookies
            ?.split(";")
            ?.map { it.trim() }
            ?.firstOrNull { it.startsWith("wt_session=") }
            ?.substringAfter("wt_session=")
            ?.takeIf { it.isNotEmpty() }

        if (token == lastSyncedToken) return
        lastSyncedToken = token
        lifecycleScope.launch {
            repo.store.setToken(token)
            if (token != null) {
                // Abrir la app siempre muestra la semana actual.
                runCatching { repo.resetWidgetToCurrent() }
                WidgetRefresh.update(this@MainActivity)
                WidgetRefresh.enqueuePeriodic(this@MainActivity)
            } else {
                WidgetRefresh.update(this@MainActivity)
            }
        }
    }
}
