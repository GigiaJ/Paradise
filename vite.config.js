import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from "vite-plugin-top-level-await";
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());

    return {
        root: 'resources/public',
        plugins: [
            wasm(),
            topLevelAwait()
        ],

        define: {
            'process.env.MATRIX_HOMESERVER': JSON.stringify(env.VITE_MATRIX_HOMESERVER || "https://matrix.org"),
            'global': 'globalThis'
        },

        optimizeDeps: {
            include: ['@element-hq/web-shared-components', '@vector-im/compound-web', 'react', 'react-dom'],
            esbuildOptions: {
                target: 'esnext'
            }
        },

        resolve: {
            alias: {
                "generated-compat": path.resolve(__dirname, './packages/generated-compat/src/index.web.js'),
                'react': path.resolve(__dirname, './node_modules/react'),
                'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
                'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
                'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime')
            }
        },

        server: {
            port: 8000,
            host: true,
            fs: {
                allow: [
                    path.resolve(__dirname, 'resources/public'),
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'packages'), // Added this too
                    path.resolve(__dirname, 'node_modules')
                ]
            }
        }
    };
});
