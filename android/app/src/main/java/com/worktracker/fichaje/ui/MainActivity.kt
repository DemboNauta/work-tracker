package com.worktracker.fichaje.ui

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import com.worktracker.fichaje.data.AuthStore
import com.worktracker.fichaje.data.Repository
import com.worktracker.fichaje.widget.WidgetRefresh
import kotlinx.coroutines.launch

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

    private val fileChooser: ActivityResultLauncher<String> =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            filePathCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
            filePathCallback = null
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

        setContentView(webView)

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

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
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
                runCatching { repo.refreshWeek() }
                WidgetRefresh.update(this@MainActivity)
                WidgetRefresh.enqueuePeriodic(this@MainActivity)
            } else {
                WidgetRefresh.update(this@MainActivity)
            }
        }
    }
}
