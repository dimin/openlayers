# Developing

## Setting up development environment

You will obviously start by
[forking](https://github.com/openlayers/openlayers/fork) the OpenLayers repository.

### Travis CI

The Travis CI hook is enabled on the Github repository. This means every pull request
is run through a full test suite to ensure it compiles and passes the tests. Failing
pull requests will not be merged.

### Development dependencies

The minimum requirements are:

* Git
* [Node.js](http://nodejs.org/) (version 8 and above)

The executables `git` and `node` should be in your `PATH`.

To install the Node.js dependencies run

    $ npm install

## Running examples

To run the examples you first need to start the dev server:

    $ npm run serve-examples

Then, load <http://localhost:8080/> in your browser.

## Running tests

To run the tests once:

    $ npm test

To run the tests continuously during development:

    $ npm run karma

## Adding examples

Adding functionality often implies adding one or several examples. This
section provides explanations related to adding examples.

The examples are located in the `examples` directory. Adding a new example
implies creating two or three files in this directory, an `.html` file, a `.js`
file, and, optionally, a `.css` file.

You can use `simple.js` and `simple.html` as templates for new examples.


## Using ViQi sources

1. Clone your fork:
git clone git@github.com/dimin/openlayers.git

2. Add remote from original repository in your forked repository:

cd into/cloned/fork-repo
git remote add upstream https://github.com/openlayers/openlayers.git
git fetch upstream

3. Updating your fork from original repo to keep up with their changes:
git pull upstream master

git push





4. Use ViQi branch
    $ git checkout viqi

5. Update it from master
    $ git merge origin/master

6. Modify branch code and test
    $ npm test
    $ git commit -a -m "my message"

7. push branch updates
    $ git commit
    $ git push origin viqi

## Building under windows

rmdir build /s /q
mkdir build
buble --input src/ol --output build/ol --no modules --sourcemap
copy src\ol\ol.css build\ol\ol.css
node tasks/prepare-package
copy README.md build\ol
node tasks/generate-index
cleancss --source-map src/ol/ol.css -o build/ol.css

for production build:
rollup --config config/rollup.js

for debug build:
rollup --config config/rollup.debug.js

final production minified build, due to strange fail in production rollup:
uglifyjs build/ol-debug.js --compress --mangle -o build/ol-production.js

