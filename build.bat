rmdir build /s /q
mkdir build
call buble --input src/ol --output build/ol --no modules --sourcemap
copy src\ol\ol.css build\ol\ol.css
call node tasks/prepare-package
copy README.md build\ol
call node tasks/generate-index
call rollup --config config/rollup.js
call rollup --config config/rollup.debug.js
call uglifyjs build/ol-debug.js --mangle -o build/ol.js