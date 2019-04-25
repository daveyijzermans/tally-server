import $ from 'jquery';
import 'jquery-ui/ui/effect';
import 'jquery-ui/ui/widgets/slider';
import 'jquery-ui-touch-punch';

/**
 * Class for Audiomixers UI.
 *
 * @memberof   Frontend.UI
 */
class Audiomixers
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('admin.status.servers', this._list)
      .on('admin.audiomixer.level', this._setLevel);
    /**
     * Main container for this UI element
     * 
     * @type       {jQuery}
     */
    this.$list = opts.$list;
    /**
     * Template for an entry for this UI element. Will be cloned to make a new
     * entry and appended to $list
     *
     * @type       {jQuery}
     */
    this.$tpl = opts.$tpl;
    /**
     * Cached array of servers objects sent by server
     *
     * @type       {Object[]}
     */
    this._servers = null;
    /**
     * Whether to update levels
     * 
     * @type       {boolean}
     */
    this.updateLevels = true;
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Audiomixers#_list
   *
   * @param      {Object[]}  data    Array of servers
   * @param      {string}          data.type       The server type
   * @param      {string}          data.hostname   The server hostname
   * @param      {string}          data.name       The server display name
   * @param      {string|boolean}  data.wol        WOL address
   * @param      {boolean}         data.connected  Connection status
   * @listens    Socket#event:"admin.status.servers"
   * @fires      Socket#event:"admin.server.command"
   */
  _list = data =>
  {
    data = data.filter((s) => ['focusrite', 'vmix'].indexOf(s.type) != -1);
    if(JSON.stringify(data) === JSON.stringify(this._servers))
      return false;
    this._servers = data;
    let connected = data.filter((s) => s.connected);
    this.$list.find('.noresults').toggle(connected.length == 0);

    $.each(this._servers, (id, server) =>
    {
      let $tr = this.$list.find('.audio-entry[data-name="' + server.name + '"]');
      if(!server.connected) return $tr.remove();

      let isLinked = () => typeof this._servers[id].linked == 'object';
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').addClass('audio-entry')
          .attr('data-name', server.name).removeClass('d-none').addClass('d-flex').appendTo(this.$list);

        $tr.find('.name').text(server.name);

        ['input', 'output'].forEach((w) =>
        {
          let p = w + 's';
          let $el = $tr.find('.' + p);
          let $tpl = $tr.find('#' + w + 'Tpl');
          for (let i = 1; i < server[p].length; i++)
          {
            let $in = $tpl.clone().attr('id', '').addClass(w + '-entry')
              .attr('data-' + w, i).removeClass('d-none').addClass('d-flex').appendTo($el);
            let $gain = $in.find('.gain-slider');
            $gain.slider({
              orientation: 'vertical',
              range: 'min',
              min: -128,
              max: 0,
              value: 0
            });
            this._setLevel(server.name, p, i, server[p][i].level);
          }
        });
      }

      ['input', 'output'].forEach((w) =>
      {
        let p = w + 's';
        for (let i = 1; i < server[p].length; i++)
        {
          let $el = $tr.find('[data-' + w + '="' + i + '"] .control-label');
          if(server[p][i].name) $el.text(server[p][i].name)
          else $el.html('&nbsp;');
        }
      });
    });
  }
  /**
   * Sets the audio level meter.
   * 
   * @method     Frontend.UI.Audiomixers#_setLevel
   *
   * @param      {string}  name    The server name
   * @param      {string}  type    The type (inputs or outputs)
   * @param      {string}  n       Input or output number (1-indexed)
   * @param      {number}  level   The new audio level
   * 
   * @listens    Socket#event:"admin.audiomixer.level"
   */
  _setLevel = (name, type, n, level) =>
  {
    if(this.updateLevels != true) return;
    let t = type == 'inputs' ? 'input' : 'output';
    let $el = this.$list.find('.audio-entry[data-name="' + name + '"] [data-' + t + '="' + n + '"]');
    let perc = Math.round(level*100) + '%';
    $el.find('.level-meter .level-value').css({ height: perc });
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.audio-entry') }
}

export default Audiomixers;