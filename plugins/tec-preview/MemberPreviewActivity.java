package com.teccarclub.preview;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Locale;

public final class MemberPreviewActivity extends ComponentActivity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private WebView web;
    private ValueCallback<Uri[]> pendingPhotos;
    private final ActivityResultLauncher<String> photoPicker = registerForActivityResult(
        new ActivityResultContracts.GetMultipleContents(), photos -> {
            if (pendingPhotos == null) return;
            pendingPhotos.onReceiveValue(photos.isEmpty() ? null : photos.toArray(new Uri[0]));
            pendingPhotos = null;
        });

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.BLACK);
        ViewCompat.setOnApplyWindowInsetsListener(frame, (v, insets) -> {
            Insets area = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            v.setPadding(area.left, area.top, area.right, area.bottom);
            return insets;
        });
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        frame.addView(web);
        setContentView(frame);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return resource(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (local(uri) && "/index.html".equals(uri.getPath())) return false;
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme())
                        && "teccarclub.com".equalsIgnoreCase(uri.getHost())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException error) {
                        Toast.makeText(MemberPreviewActivity.this, "Install a browser to open your TEC account.", Toast.LENGTH_LONG).show();
                    }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                                      FileChooserParams params) {
                if (pendingPhotos != null) pendingPhotos.onReceiveValue(null);
                pendingPhotos = callback;
                photoPicker.launch("image/*");
                return true;
            }
        });
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                web.evaluateJavascript("(function(){const dialog=document.querySelector('dialog[open]');"
                        + "if(dialog){dialog.close();return true;}"
                        + "if(location.hash==='#app' && typeof view!=='undefined' && view!=='home'){go('home');return true;}"
                        + "return false;})()", handled -> {
                    if ("true".equals(handled)) return;
                    if (web.canGoBack()) web.goBack(); else finish();
                });
            }
        });
        if (saved == null || web.restoreState(saved) == null) web.loadUrl(HOME);
    }

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getAuthority());
    }

    private WebResourceResponse resource(Uri uri) {
        String path = uri.getPath();
        if (local(uri) && path != null && path.matches("/(?:assets/)?[A-Za-z0-9_-]+\\.[A-Za-z0-9]+")) {
            try {
                String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                String type;
                switch (ext) {
                    case "html": type = "text/html"; break;
                    case "css": type = "text/css"; break;
                    case "js": type = "application/javascript"; break;
                    case "woff": case "otf": type = "font/" + ext; break;
                    case "jpg": type = "image/jpeg"; break;
                    case "png": case "webp": type = "image/" + ext; break;
                    default: type = "text/plain";
                }
                return new WebResourceResponse(type, type.startsWith("text/") || ext.equals("js") ? "UTF-8" : null,
                        getAssets().open("member-preview" + path));
            } catch (IOException ignored) { /* Return a local 404. */ }
        }
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        web.saveState(state);
    }

    @Override protected void onDestroy() {
        if (pendingPhotos != null) pendingPhotos.onReceiveValue(null);
        web.destroy();
        super.onDestroy();
    }
}
