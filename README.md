Intended to be both a lightweight CLJS-based Matrix client that uses the matrix-rust-sdk with WASM bindings.
Further on that, we opt to use the web-element-components which define the LOGIC for the behavior of components.
This is necessary to avoid rewriting logic that has complex implementations. Instead we should use the views described
and expand on them via the lovely polymorphic options provided via Clojurescript.


Goals for the client include creating a reusable base that can be built on top of and extended easily.
Expanding on that we can then try to build out a full feature client. For the most part these will be React-based
Reagent components in hiccup.

Setup is currently extremely messy. I've included the prebuilt generated-compat JS files.

You need not do this as the generated files are included, but if for some reason you wanted to they were generated
like so:
'''
npm i
guix shell -FNC -m manifest.scm
sh irust.sh
sh build-wasm-bindings.sh
sh babel.sh
```

Running involves two terminal windows or running both commands together at the moment. No release build for shadow-cljs quite yet.

So for developing:
```
npx shadow-cljs watch app
```
and
```
npx vite
```

