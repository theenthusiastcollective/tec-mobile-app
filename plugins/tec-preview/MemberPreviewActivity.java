package com.teccarclub.preview;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
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
import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.FilterInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;

public final class MemberPreviewActivity extends ComponentActivity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/index.html";
    private static final String CLUB_HOST = "teccarclub.com";
    private static final String MEMBER_ROOT = "/_tec-android/";
    private static final String MEMBER = "https://" + CLUB_HOST + MEMBER_ROOT + "member.html";
    private WebView web;
    private String pendingEmailToken;
    private ValueCallback<Uri[]> pendingPhotos;
    private final ActivityResultLauncher<String> photoPicker = registerForActivityResult(
        new ActivityResultContracts.GetMultipleContents(), photos -> {
            if (pendingPhotos == null) return;
            pendingPhotos.onReceiveValue(photos.isEmpty() ? null : photos.toArray(new Uri[0]));
            pendingPhotos = null;
        });

    private String installedVersion() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            long build = PackageInfoCompat.getLongVersionCode(info);
            return info.versionName == null ? "Build " + build : "Version " + info.versionName + " (" + build + ")";
        } catch (PackageManager.NameNotFoundException ignored) {
            return "";
        }
    }

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
            @Override public void onPageFinished(WebView view, String url) {
                if (MEMBER.equals(url) && MEMBER.equals(view.getUrl()) && pendingEmailToken != null) {
                    String token = pendingEmailToken;
                    pendingEmailToken = null;
                    view.evaluateJavascript("window.tecReceiveEmailLink(" + org.json.JSONObject.quote(token) + ")", null);
                }
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if ("https".equals(uri.getScheme()) && CLUB_HOST.equals(uri.getAuthority()) && path != null) {
                    if ("GET".equals(request.getMethod()) && path.startsWith(MEMBER_ROOT)) {
                        return packaged(path.substring(MEMBER_ROOT.length() - 1));
                    }
                    // Let WebView handle HTTPS, request bodies and the club's HttpOnly session cookies.
                    if (!request.isForMainFrame() && (path.startsWith("/api/") || path.startsWith("/assets/"))) return null;
                }
                if (local(uri) && "GET".equals(request.getMethod()) && path != null
                        && (path.equals("/api/perks") || path.matches("/api/media/[A-Za-z0-9_-]+"))) {
                    return publishedResource(path);
                }
                return resource(uri);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (MEMBER.equals(uri.toString()) || (MEMBER + "?register").equals(uri.toString())
                        || HOME.equals(uri.toString())
                        || (local(uri) && "/index.html".equals(uri.getPath()))) return false;
                if (request.isForMainFrame() && request.hasGesture() && "https".equals(uri.getScheme())
                        && !local(uri) && uri.getHost() != null && uri.getUserInfo() == null) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException error) {
                        Toast.makeText(MemberPreviewActivity.this, "Install a browser to open this link.", Toast.LENGTH_LONG).show();
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
                        + "if((location.hash==='#app' || location.pathname==='/_tec-android/member.html') && typeof view!=='undefined' && view!=='home'){go('home');return true;}"
                        + "return false;})()", handled -> {
                    if ("true".equals(handled)) return;
                    if (web.canGoBack()) web.goBack(); else finish();
                });
            }
        });
        if (!openEmailLink(getIntent()) && (saved == null || web.restoreState(saved) == null)) web.loadUrl(HOME);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        openEmailLink(intent);
    }

    private boolean openEmailLink(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return false;
        Uri uri = intent.getData();
        if (uri == null || !"https".equals(uri.getScheme()) || !CLUB_HOST.equals(uri.getEncodedAuthority())
                || !("/".equals(uri.getEncodedPath()) || "/android/reset".equals(uri.getEncodedPath()))) return false;
        String fragment = uri.getEncodedFragment();
        if (fragment == null || !fragment.matches("email-confirm/[A-Za-z0-9_-]{32,256}")) return false;
        pendingEmailToken = fragment.substring("email-confirm/".length());
        intent.setData(null);
        setIntent(new Intent(this, MemberPreviewActivity.class));
        web.loadUrl(MEMBER);
        return true;
    }

    private static boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getAuthority());
    }

    // Serve only the public offer feed and its images at the packaged app's origin.
    private WebResourceResponse publishedResource(String path) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL("https://teccarclub.com" + path).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setUseCaches(false);
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(12000);
            boolean feed = path.equals("/api/perks");
            connection.setRequestProperty("Accept", feed ? "application/json" : "image/*");
            String type = connection.getContentType();
            if (type != null) type = type.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
            boolean valid = feed ? "application/json".equals(type)
                    : ("image/jpeg".equals(type) || "image/png".equals(type) || "image/webp".equals(type));
            if (connection.getResponseCode() == 200 && valid) {
                final HttpURLConnection opened = connection;
                InputStream body = new FilterInputStream(opened.getInputStream()) {
                    @Override public void close() throws IOException {
                        try { super.close(); } finally { opened.disconnect(); }
                    }
                };
                return new WebResourceResponse(type, feed ? "UTF-8" : null, 200, "OK",
                        Collections.singletonMap("Cache-Control", "no-store"), body);
            }
        } catch (IOException ignored) { /* Let the Perks page offer a retry. */ }
        if (connection != null) connection.disconnect();
        return new WebResourceResponse("text/plain", "UTF-8", 503, "Unavailable",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private WebResourceResponse resource(Uri uri) {
        String path = uri.getPath();
        return packaged(local(uri) ? path : null);
    }

    private WebResourceResponse packaged(String path) {
        if (path != null && path.matches("/(?:assets/)?[A-Za-z0-9_-]+\\.[A-Za-z0-9]+")) {
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
                        packagedBody(path));
            } catch (IOException ignored) { /* Return a local 404. */ }
        }
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    private InputStream packagedBody(String path) throws IOException {
        InputStream asset = getAssets().open("member-preview" + path);
        if (!"/index.html".equals(path) && !"/member.html".equals(path)) return asset;

        String version = installedVersion();
        if (version.isEmpty()) return asset;

        try (InputStream input = asset; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            String html = new String(bytes.toByteArray(), StandardCharsets.UTF_8);
            String label = "id=\"tec-app-version\"";
            html = html.replace(label + " hidden></p>", label + ">" + TextUtils.htmlEncode(version) + "</p>");
            return new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8));
        }
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
