/**
 * @module ol/control/VQMousePosition
 */
import {listen} from '../events.js';
import EventType from '../events/EventType.js';
import {getChangeEventType} from '../Object.js';
import Control from '../control/Control.js';
//import {getTransformFromProjections, identityTransform, get as getProjection} from '../proj.js';
import {get as getProjection} from '../proj.js';

/**
 * @type {string}
 */
const PROJECTION = 'projection';

/**
 * @type {string}
 */
const COORDINATE_FORMAT = 'coordinateFormat';

/**
 * @classdesc
 * A control to show the 2D coordinates of the mouse cursor. By default, these
 * are in the view projection, but can be in any supported projection.
 * By default the control is shown in the top right corner of the map, but this
 * can be changed by using the css selector `.ol-mouse-position`.
 *
 * On touch devices, which usually do not have a mouse cursor, the coordinates
 * of the currently touched position are shown.
 *
 * @api
 */
class VQMousePosition extends Control {

  /**
   * @param {Options=} opt_options Mouse position options.
   */
  constructor(opt_options) {

    const options = opt_options ? opt_options : {};

    const element = null;

    super({
      element: element,
      render: options.render || render,
      target: options.target
    });

    listen(this,
      getChangeEventType(PROJECTION),
      this.handleProjectionChanged_, this);

    if (options.coordinateFormat) {
      this.setCoordinateFormat(options.coordinateFormat);
    }
    if (options.projection) {
      this.setProjection(options.projection);
    }

    this.doRender = options.doRender;

    /**
     * @private
     * @type {string}
     */
    this.undefinedHTML_ = options.undefinedHTML !== undefined ? options.undefinedHTML : '&#160;';

    /**
     * @private
     * @type {boolean}
     */
    this.renderOnMouseOut_ = !!this.undefinedHTML_;

    /**
     * @private
     * @type {string}
     */
    //this.renderedHTML_ = element.innerHTML;

    /**
     * @private
     * @type {import("../proj/Projection.js").default}
     */
    this.mapProjection_ = null;

    /**
     * @private
     * @type {?import("../proj.js").TransformFunction}
     */
    this.transform_ = null;

    /**
     * @private
     * @type {import("../pixel.js").Pixel}
     */
    this.lastMouseMovePixel_ = null;

  }

  /**
   * @private
   */
  handleProjectionChanged_() {
    this.transform_ = null;
  }

  /**
   * Return the coordinate format type used to render the current position or
   * undefined.
   * @return {import("../coordinate.js").CoordinateFormat|undefined} The format to render the current
   *     position in.
   * @observable
   * @api
   */
  getCoordinateFormat() {
    return (
      /** @type {import("../coordinate.js").CoordinateFormat|undefined} */ (this.get(COORDINATE_FORMAT))
    );
  }

  /**
   * Return the projection that is used to report the mouse position.
   * @return {import("../proj/Projection.js").default|undefined} The projection to report mouse
   *     position in.
   * @observable
   * @api
   */
  getProjection() {
    return (
      /** @type {import("../proj/Projection.js").default|undefined} */ (this.get(PROJECTION))
    );
  }

  /**
   * @param {Event} event Browser event.
   * @protected
   */
  handleMouseMove(event) {
    const map = this.getMap();
    this.lastMouseMovePixel_ = map.getEventPixel(event);
    this.updateHTML_(this.lastMouseMovePixel_);
  }

  /**
   * @param {Event} event Browser event.
   * @protected
   */
  handleMouseOut(event) {
    this.updateHTML_(null);
    this.lastMouseMovePixel_ = null;
  }

  /**
   * @inheritDoc
   * @api
   */
  setMap(map) {
    //super.setMap(map); // dima: we don't have an element, we just listen to events
    this.map_ = map;
    if (map) {
      const viewport = map.getViewport();
      this.listenerKeys.push(
        listen(viewport, EventType.MOUSEMOVE, this.handleMouseMove, this),
        listen(viewport, EventType.TOUCHSTART, this.handleMouseMove, this)
      );
      if (this.renderOnMouseOut_) {
        this.listenerKeys.push(
          listen(viewport, EventType.MOUSEOUT, this.handleMouseOut, this),
          listen(viewport, EventType.TOUCHEND, this.handleMouseOut, this)
        );
      }
    }
  }

  /**
   * Set the coordinate format type used to render the current position.
   * @param {import("../coordinate.js").CoordinateFormat} format The format to render the current
   *     position in.
   * @observable
   * @api
   */
  setCoordinateFormat(format) {
    this.set(COORDINATE_FORMAT, format);
  }

  /**
   * Set the projection that is used to report the mouse position.
   * @param {import("../proj.js").ProjectionLike} projection The projection to report mouse
   *     position in.
   * @observable
   * @api
   */
  setProjection(projection) {
    this.set(PROJECTION, getProjection(projection));
  }

  /**
   * @param {?import("../pixel.js").Pixel} pixel Pixel.
   * @private
   */
  updateHTML_(pixel) {
    if (!pixel || !this.doRender) {
      return;
    }
    this.doRender({
      x: pixel[0],
      y: pixel[1]
    });
  }
}


/**
 * Update the projection. Rendering of the coordinates is done in
 * `handleMouseMove` and `handleMouseUp`.
 * @param {import("../MapEvent.js").default} mapEvent Map event.
 * @this {MousePosition}
 * @api
 */
export function render(mapEvent) {
  const frameState = mapEvent.frameState;
  if (!frameState) {
    this.mapProjection_ = null;
  } else {
    if (this.mapProjection_ != frameState.viewState.projection) {
      this.mapProjection_ = frameState.viewState.projection;
      this.transform_ = null;
    }
  }
}


export default VQMousePosition;
