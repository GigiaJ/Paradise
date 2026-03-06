import { defineConfig, loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from "vite-plugin-top-level-await";
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());

    return {
        root: './build',
        plugins: [
            wasm(),
            topLevelAwait(),
            viteStaticCopy({
                targets: [
                    {
                        src: path.resolve(__dirname, 'packages/generated-compat/src/generated-compat/wasm-bindgen'),
                        dest: 'generated-compat'
                    },
                    {
                        src: 'themes/*',
                        dest: 'themes'
                    }

                ]
            })
        ],

        define: {
            'process.env.MATRIX_HOMESERVER':
        JSON.stringify(
            env.VITE_MATRIX_HOMESERVER ||
                "https://matrix.org"),
            'global': 'globalThis'
        },

        optimizeDeps: {
            include: ['react', 'react-dom'],
            esbuildOptions: {
                target: 'esnext'
            }
        },
        build: {
            outDir: '../dist',
            terserOptions: {
                keep_classnames: true,
                keep_fnames: true,
            },
            //            minify: false,
            minifyHtml: false,
            rollupOptions: {
                output: {
                    assetFileNames: 'assets/[name].[ext]'
                }
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
                    path.resolve(__dirname, 'build'),
                    path.resolve(__dirname, 'node_modules')
                ]
            }
        }
    };
});
