import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from "vite-plugin-top-level-await";
import path from 'path'; // <--- Essential for path.resolve

export default defineConfig({
    plugins: [
        wasm(),
        topLevelAwait()
    ],
    define: {
        'process.env': {},
        'global': 'globalThis'
    },
    optimizeDeps: {
        include: ['@element-hq/web-shared-components'],
        esbuildOptions: {
            target: 'esnext'
        }
    },
    resolve: {
        alias: {
            // This tells Vite: "When you see this name, go here."
            // We use the absolute path to make sure Vite doesn't get lost.
            "generated_compat": path.resolve(__dirname, './src/generated-compat/index.web..js')
        }
    },
    // Ensure Vite is looking at your public dir for index.html
    root: 'resources/public',
    server: {
        port: 8000,
        host: true,
        fs: {
            // Allow Vite to reach outside 'resources/public' into 'src' for the alias
            allow: ['..']
        }
    }
});
