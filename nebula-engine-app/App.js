import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { WebView } from 'react-native-webview';
import GAME_HTML from './game/gameHtml';

// The game runs from a fixed https origin so its save (localStorage) persists between launches.
const ORIGIN = 'https://nebula-engine.app/';

export default function App() {
  useKeepAwake(); // idle game: keep the screen on while it is open
  const web = useRef(null);

  useEffect(() => {
    // Save and pause when the app leaves the screen; credit the time away when it returns.
    const sub = AppState.addEventListener('change', (state) => {
      const call = state === 'active' ? 'resume' : state === 'background' ? 'pause' : null;
      if (call && web.current) {
        web.current.injectJavaScript(`window.nebulaApp && window.nebulaApp.${call}(); true;`);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
      <NavigationBar hidden style="light" />
      <WebView
        ref={web}
        source={{ html: GAME_HTML, baseUrl: ORIGIN }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        style={styles.root}
        containerStyle={styles.root}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        textZoom={100}
        bounces={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
