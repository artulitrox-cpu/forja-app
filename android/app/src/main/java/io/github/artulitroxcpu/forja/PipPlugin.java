package io.github.artulitroxcpu.forja;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ventana flotante (picture-in-picture) desde la web: js/pip.js activa la entrada automática mientras hay
 * un temporizador, un descanso o una grabación en vivo, y puede pedir entrar a mano.
 */
@CapacitorPlugin(name = "ForjaPip")
public class PipPlugin extends Plugin {

    private MainActivity main() {
        return (MainActivity) getActivity();
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject r = new JSObject();
        r.put("supported", main().pipSupported());
        call.resolve(r);
    }

    @PluginMethod
    public void setAuto(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            main().setPipAuto(on);
            call.resolve();
        });
    }

    @PluginMethod
    public void enter(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject r = new JSObject();
            r.put("ok", main().enterPip());
            call.resolve(r);
        });
    }
}
