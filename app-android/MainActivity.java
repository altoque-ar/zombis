package ar.altoque.zombis;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.WindowManager;
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
 *  - el botón Atrás pausa en vez de cerrar.
 */
public class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech voz;
    private boolean vozLista = false;

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
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.addJavascriptInterface(new Puente(), "ZAndroid");
        web.setBackgroundColor(0xFF000000);
        setContentView(web);
        web.loadUrl("file:///android_asset/juego/Zombis.html");
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
    }

    @Override
    public void onBackPressed() {
        // El juego decide: en la partida pausa, en un menú vuelve atrás
        web.evaluateJavascript("history.back()", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("try{var z=window.__zombis;if(z&&z.J&&!z.J.pausa&&z.J.fase!=='fin'&&!document.getElementById('juego').hidden)z.pausar();}catch(e){}", null);
        web.onPause();
        if (vozLista) voz.stop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        pantallaCompleta();
    }

    @Override
    protected void onDestroy() {
        if (voz != null) voz.shutdown();
        web.destroy();
        super.onDestroy();
    }
}
