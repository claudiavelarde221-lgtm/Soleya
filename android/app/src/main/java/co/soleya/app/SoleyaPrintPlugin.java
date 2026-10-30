package co.soleya.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Abre el diálogo de impresión de Android con lo que hay en pantalla (rótulo / nota de gracias). */
@CapacitorPlugin(name = "SoleyaPrint")
public class SoleyaPrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView web = getBridge().getWebView();
                String job = call.getString("name", "Soleya");
                PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(job);
                pm.print(job, adapter, new PrintAttributes.Builder().build());
                call.resolve();
            } catch (Exception e) {
                call.reject("No se pudo abrir la impresión: " + e.getMessage());
            }
        });
    }
}
