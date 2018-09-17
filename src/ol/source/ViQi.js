/**
 * @module ol/source/ViQi
 */
import {DEFAULT_TILE_SIZE} from '../tilegrid/common.js';

import ImageTile from '../ImageTile.js';
import TileState from '../TileState.js';
import {expandUrl, createFromTileUrlFunctions} from '../tileurlfunction.js';
import {assert} from '../asserts.js';
import {createCanvasContext2D} from '../dom.js';
import {getTopLeft} from '../extent.js';
import {toSize} from '../size.js';
import TileImage from '../source/TileImage.js';
import TileGrid from '../tilegrid/TileGrid.js';


/**
 * @enum {string}
 */
const TierSizeCalculation = {
  DEFAULT: 'default',
  TRUNCATED: 'truncated'
};


export class ViQiTile extends ImageTile {

  /**
   * @param {import("../tilegrid/TileGrid.js").default} tileGrid TileGrid that the tile belongs to.
   * @param {import("../tilecoord.js").TileCoord} tileCoord Tile coordinate.
   * @param {import("../TileState.js").default} state State.
   * @param {string} src Image source URI.
   * @param {?string} crossOrigin Cross origin.
   * @param {import("../Tile.js").LoadFunction} tileLoadFunction Tile load function.
   * @param {import("../Tile.js").Options=} opt_options Tile options.
   */
  constructor(tileGrid, tileCoord, state, src, crossOrigin, tileLoadFunction, opt_options) {

    super(tileCoord, state, src, crossOrigin, tileLoadFunction, opt_options);

    /**
     * @private
     * @type {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement}
     */
    this.viqiImage_ = null;

    /**
     * @private
     * @type {import("../size.js").Size}
     */
    this.tileSize_ = toSize(tileGrid.getTileSize(tileCoord[0]));

  }

  /**
   * @inheritDoc
   */
  getImage() {
    if (this.viqiImage_) {
      return this.viqiImage_;
    }
    const image = super.getImage();
    if (this.state == TileState.LOADED) {
      const tileSize = this.tileSize_;
      if (image.width == tileSize[0] && image.height == tileSize[1]) {
        this.viqiImage_ = image;
        return image;
      } else {
        const context = createCanvasContext2D(tileSize[0], tileSize[1]);
        context.drawImage(image, 0, 0);
        this.viqiImage_ = context.canvas;
        return context.canvas;
      }
    } else {
      return image;
    }
  }

}


/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {number} [cacheSize=2048] Cache size.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you are using the WebGL renderer or if you want to
 * access pixel data with the Canvas renderer.  See
 * https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {import("../proj.js").ProjectionLike} [projection] Projection.
 * @property {number} [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property {string} [url] URL template or base URL of the ViQi service.
 * A base URL is the fixed part
 * of the URL, excluding the tile group, z, x, and y folder structure, e.g.
 * `{x}`, `{y}`, `{z}`, and `{s}` placeholders, e.g.
 * `http://localhost:8080/image_service/UUID?slice=,,14,1&tile={z},{x},{y},{s}&brightnesscontrast=50,0&depth=8,d,u,cs&fuse=0,255,255;255,0,255;:m&format=jpeg`.
 * @property {string} [tierSizeCalculation] Tier size calculation method: `default` or `truncated`.
 * @property {import("../size.js").Size} [size] Size of the image.
 * @property {import("../extent.js").Extent} [extent] Extent for the TileGrid that is created.
 * Default sets the TileGrid in the
 * fourth quadrant, meaning extent is `[0, -height, width, 0]`. To change the
 * extent to the first quadrant (the default for OpenLayers 2) set the extent
 * as `[0, 0, width, height]`.
 * @property {number} [transition] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property {number} [tileSize=256] Tile size. Same tile size is used for all zoom levels.
 */


/**
 * @classdesc
 * Layer source for tile data in ViQi format
 * @api
 */
class ViQi extends TileImage {

  /**
   * @param {Options=} opt_options Options.
   */
  constructor(opt_options) {

    const options = opt_options || {};

    const size = options.size;
    const tierSizeCalculation = options.tierSizeCalculation !== undefined ?
      options.tierSizeCalculation :
      TierSizeCalculation.DEFAULT;

    const imageWidth = size[0];
    const imageHeight = size[1];
    const extent = options.extent || [0, -size[1], size[0], 0];
    const tierSizeInTiles = [];
    const tileSize = options.tileSize || DEFAULT_TILE_SIZE;
    const viqi_tileSize = tileSize;
    let tileSizeForTierSizeCalculation = tileSize;

    switch (tierSizeCalculation) {
      case TierSizeCalculation.DEFAULT:
        while (imageWidth > tileSizeForTierSizeCalculation || imageHeight > tileSizeForTierSizeCalculation) {
          tierSizeInTiles.push([
            Math.ceil(imageWidth / tileSizeForTierSizeCalculation),
            Math.ceil(imageHeight / tileSizeForTierSizeCalculation)
          ]);
          tileSizeForTierSizeCalculation += tileSizeForTierSizeCalculation;
        }
        break;
      case TierSizeCalculation.TRUNCATED:
        let width = imageWidth;
        let height = imageHeight;
        while (width > tileSizeForTierSizeCalculation || height > tileSizeForTierSizeCalculation) {
          tierSizeInTiles.push([
            Math.ceil(width / tileSizeForTierSizeCalculation),
            Math.ceil(height / tileSizeForTierSizeCalculation)
          ]);
          width >>= 1;
          height >>= 1;
        }
        break;
      default:
        assert(false, 53); // Unknown `tierSizeCalculation` configured
        break;
    }

    tierSizeInTiles.push([1, 1]);
    tierSizeInTiles.reverse();

    const resolutions = [1];
    const tileCountUpToTier = [0];
    for (let i = 1, ii = tierSizeInTiles.length; i < ii; i++) {
      resolutions.push(1 << i);
      tileCountUpToTier.push(
        tierSizeInTiles[i - 1][0] * tierSizeInTiles[i - 1][1] +
          tileCountUpToTier[i - 1]
      );
    }
    resolutions.reverse();

    const scales = [];
    let scale = 1.0;
    for (let i = 0; i < resolutions.length; ++i) {
      scales.push(scale);
      scale = scale / 2.0;
    }
    scales.reverse();


    const tileGrid = new TileGrid({
      tileSize: [viqi_tileSize, viqi_tileSize],
      extent: extent,
      origin: getTopLeft(extent),
      resolutions: resolutions
    });

    const num_resolutions = resolutions.length;
    const url = options.url;
    const urls = expandUrl(url);

    /**
     * @param {string} template Template.
     * @return {import("../Tile.js").UrlFunction} Tile URL function.
     */
    function createFromTemplate(template) {
      return (
        /**
         * @param {import("../tilecoord.js").TileCoord} tileCoord Tile Coordinate.
         * @param {number} pixelRatio Pixel ratio.
         * @param {import("../proj/Projection.js").default} projection Projection.
         * @return {string|undefined} Tile URL.
         */
        function(tileCoord, pixelRatio, projection) {
          if (!tileCoord) {
            return undefined;
          } else {
            //console.log('tileCoord: ' + tileCoord);
            const tileCoordZ = num_resolutions - (tileCoord[0] + 1);
            const tileCoordX = tileCoord[1];
            const tileCoordY = -tileCoord[2] - 1;
            const tileSize = viqi_tileSize;
            const localContext = {
              'z': tileCoordZ,
              'x': tileCoordX,
              'y': tileCoordY,
              's': tileSize
            };
            return template.replace(/\{(\w+?)\}/g, function(m, p) {
              return localContext[p];
            });
          }
        }
      );
    }

    const tileUrlFunction = createFromTileUrlFunctions(urls.map(createFromTemplate));

    const ViQiTileClass = ViQiTile.bind(null, tileGrid);

    super({
      attributions: options.attributions,
      cacheSize: options.cacheSize,
      crossOrigin: options.crossOrigin,
      projection: options.projection,
      reprojectionErrorThreshold: options.reprojectionErrorThreshold,
      tileClass: ViQiTileClass,
      tileGrid: tileGrid,
      tileUrlFunction: tileUrlFunction,
      opt_key: options.opt_key,
      transition: options.transition
    });

    this.resolutions = resolutions;
    this.scales = scales;

    this.myCreateFromTemplate = createFromTemplate;
    this.getBQCoordinate = function(tileCoord) {
      //console.log('getBQCoordinate: ' + tileCoord);
      const z = num_resolutions - (tileCoord[0] + 1);
      const x = tileCoord[1];
      const y = -tileCoord[2] - 1;
      return [z, x, y];
    };
  }

  setUrl(url) {
    const urls = expandUrl(url);
    const tileUrlFunction = createFromTileUrlFunctions(urls.map(this.myCreateFromTemplate));
    this.setTileUrlFunction(tileUrlFunction, this.opt_key);
  }

  setOptKey(opt_key) {
    this.opt_key = opt_key;
  }

  argmin(a) {
    let v = a[0];
    let indx = 0;
    for (let i = 1; i < a.length; ++i) {
      if (a[i] < v) {
        v = a[i];
        indx = i;
      }
    }
    return indx;
  }

  getScale(res) {
    const s = 1.0;
    const d = [];
    if (!res) {
      return s;
    }
    let i = 0;
    for (i = 0; i < this.resolutions.length; ++i) {
      d[i] = Math.abs(this.resolutions[i] - res);
    }
    i = this.argmin(d);
    return this.scales[i];
  }

  getScaleReal(res) {
    return 1.0 / res;
  }

}

export default ViQi;
