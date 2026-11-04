package io.github.artulitroxcpu.forja;

import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // La web (js/pip.js) lo activa mientras hay un temporizador, un descanso o una grabación en vivo.
    private boolean pipAuto = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PipPlugin.class);
        super.onCreate(savedInstanceState);
    }

    boolean pipSupported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
    }

    void setPipAuto(boolean on) {
        pipAuto = on;
        // Android 12+: entra sola al ir a inicio (también con gestos). Antes, onUserLeaveHint.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && pipSupported()) {
            setPictureInPictureParams(new PictureInPictureParams.Builder().setAspectRatio(new Rational(4, 3)).setAutoEnterEnabled(on).build());
        }
    }

    boolean enterPip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !pipSupported()) return false;
        try {
            return enterPictureInPictureMode(new PictureInPictureParams.Builder().setAspectRatio(new Rational(4, 3)).build());
        } catch (IllegalStateException e) {
            return false;
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (pipAuto && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) enterPip();
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        if (getBridge() != null) getBridge().triggerWindowJSEvent("forjapip", "{\"pip\":" + inPip + "}");
    }
}
