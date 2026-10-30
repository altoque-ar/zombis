package ar.altoque.zombis;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/**
 * La app es el mismo juego (Zombis.html) adentro de una ventana.
 * Agrega lo que el navegador del celular no da bien:
 *  - la voz del sistema (la que el usuario eligió en Android, por ejemplo Eloquence),
 *  - la vibración,
 *  - la pantalla siempre prendida, acostada y completa,
 *  - el botón Atrás pausa en vez de cerrar,
 *  - avisa si TalkBack está prendido y cuánta memoria tiene el celular,
 *  - si el celular se queda sin memoria, vuelve a abrir el juego en modo liviano.
 */
public class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech voz;
    private boolean vozLista = false;
    private int caidas = 0;

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        pantallaCompleta();

        voz = new TextToSpeech(this, estado -> {
            if (estado == TextToSpeech.SUCCESS) {
                Locale es = new Locale("es", "AR");
                int r = voz.setLanguage(es);
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) voz.setLanguage(new Locale("es"));
                vozLista = true;
            }
        });

        crearWeb(0);
    }

    /** liviano: 0 normal, 1 gráficos livianos, 2 sin gráficos (si se cerró dos veces por falta de memoria). */
    private void crearWeb(int liviano) {
        if (web != null) { try { web.destroy(); } catch (Exception e) { } }
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            // Si el celular se quedó sin memoria y el juego se cerró, se vuelve a abrir en modo liviano
            @Override
            @android.annotation.TargetApi(26)
            public boolean onRenderProcessGone(WebView vista, RenderProcessGoneDetail detalle) {
                if (vista != web) return true;
                if (vista.getParent() != null) ((android.view.ViewGroup) vista.getParent()).removeView(vista);
                vista.destroy();
                web = null;
                caidas++;
                crearWeb(Math.min(caidas, 2));
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Puente(), "ZAndroid");
        web.setBackgroundColor(0xFF000000);
        setContentView(web);
        web.loadUrl("file:///android_asset/juego/Zombis.html" + (liviano > 0 ? "?liviano=" + liviano : ""));
    }

    private void pantallaCompleta() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean foco) {
        super.onWindowFocusChanged(foco);
        if (foco) pantallaCompleta();
    }

    /** Lo que el juego puede pedirle al celular. */
    class Puente {
        @JavascriptInterface
        public void hablar(String texto, float velocidad) {
            if (!vozLista) return;
            voz.setSpeechRate(Math.max(0.5f, Math.min(3f, velocidad)));
            voz.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "zombis");
        }

        @JavascriptInterface
        public void callar() { if (vozLista) voz.stop(); }

        @JavascriptInterface
        public void vibrar(String patron) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                String[] partes = patron.split(",");
                long[] tiempos = new long[partes.length + (partes.length == 1 ? 1 : 0)];
                if (partes.length == 1) { tiempos[0] = 0; tiempos[1] = Long.parseLong(partes[0].trim()); }
                else for (int i = 0; i < partes.length; i++) tiempos[i] = Long.parseLong(partes[i].trim());
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(tiempos, -1));
                else v.vibrate(tiempos, -1);
            } catch (Exception e) { /* sin vibración */ }
        }

        @JavascriptInterface
        public boolean esApp() { return true; }

        /** true si TalkBack (u otro lector que explora con el dedo) está prendido. */
        @JavascriptInterface
        public boolean lectorActivo() {
            try {
                AccessibilityManager am = (AccessibilityManager) getSystemService(Context.ACCESSIBILITY_SERVICE);
                return am != null && am.isEnabled() && am.isTouchExplorationEnabled();
            } catch (Exception e) { return false; }
        }

        /** Memoria total del celular en MB (para elegir los gráficos y sonidos según el celular). */
        @JavascriptInterface
        public int memoriaMB() {
            try {
                ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(mi);
                if (am.isLowRamDevice()) return 1024;
                return (int) (mi.totalMem / (1024 * 1024));
            } catch (Exception e) { return 4096; }
        }
    }

    @Override
    public void onBackPressed() {
        // El juego decide: en la partida pausa, en un menú vuelve atrás
        if (web != null) web.evaluateJavascript("history.back()", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web == null) return;
        web.evaluateJavascript("try{var z=window.__zombis;if(z&&z.J&&!z.J.pausa&&z.J.fase!=='fin'&&!document.getElementById('juego').hidden)z.pausar();}catch(e){}", null);
        web.onPause();
        if (vozLista) voz.stop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        pantallaCompleta();
    }

    @Override
    protected void onDestroy() {
        if (voz != null) voz.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
