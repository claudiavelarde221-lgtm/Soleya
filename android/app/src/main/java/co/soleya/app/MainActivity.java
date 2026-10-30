package co.soleya.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SoleyaPrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
