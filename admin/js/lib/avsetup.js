import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'jquery-ui-touch-punch';
import EventEmitter from 'events';

/**
 * Class for modeling the AV setup box
 *
 * @memberof   Frontend.UI
 */
class AVSetup extends EventEmitter
{
  /**
   * Map of server connections
   *
   * @type       {Object}
   */
  connections = {};
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
    /**
     * jQuery container of the containing box.
     * 
     * @type       {jQuery}
     */
    this.$box = opts.$box;
    this.$box.find('.btnMinimize').click((event) =>
    {
      this._togglePane(true);
    });
    /**
     * Whether the box is currently expanded.
     * 
     * @type       {boolean}
     */
    this.isExpanded = typeof opts.isExpanded == 'boolean' ? opts.isExpanded : true;
    if(this.isExpanded)
    {
      this._togglePane(false, true);
    }
    /**
     * jQuery container of all draggable objects
     * 
     * @type       {jQuery}
     */
    this.$sources = opts.$sources.draggable({
      revert: true
    });
    /**
     * jQuery container of all droppable objects (targets)
     * 
     * @type       {jQuery}
     */
    this.$targets = opts.$targets.droppable({
      drop: (event, ui) =>
      {
        let $target = $(event.target);
        let $source = ui.draggable;
        let sourceName = $source.data('name');
        let targetName = $target.data('name');
        let possibilities = []
        let pSource = Object.keys(this.connections).filter((i) => this.connections[i][sourceName]);
        let tSource = Object.keys(this.connections).filter((i) => this.connections[i][targetName]);
        
        console.log(pSource, tSource);
      }
    });
    this.on('servers', (servers) =>
    {
      servers.forEach((s) =>
      {
        if(s.connections) this.connections[s.name] = s.connections;
      });
    });
  }
  /**
   * Show or hide the AV panel
   * 
   * @method     Frontend.UI.AVSetup#_togglePane
   *
   * @param      {boolean}  animate  Animation?
   * @param      {boolean|void}  state    Toggle (undefined), on (true) or off (false)
   */
  _togglePane = (animate, state) =>
  {
    let $w = this.$box.find('.box-wrapper');
    let c = $w.hasClass('visible');
    let v = typeof state == 'boolean' ? state : !c;

    if(c == v) return;
    this.isExpanded = v;
    $w.stop(true)
      .toggleClass('animated', animate)
      .toggleClass('visible', v);
    this.$box.find('.nav').toggle(this.isExpanded);

    this.$box.find('.btnMinimize .fas')
      .toggleClass('fa-minus', this.isExpanded)
      .toggleClass('fa-plus', !this.isExpanded);
    this.emit('toggle', this.isExpanded);
  }
}

export default AVSetup;