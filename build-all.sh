npm i
guix shell -FNC -m manifest.scm -- sh -c "sh irust.sh && sh build-wasm-bindings.sh && sh babel.sh"
