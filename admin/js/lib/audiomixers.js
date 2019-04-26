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
      .on('admin.audiomixer.controlChange', this._setControl)
      .emit('subscribe', 'controlChange');
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
     * Whether to update control data
     * 
     * @type       {boolean}
     */
    this.updateControlData = true;
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
      }

      $tr.css({ order: id });
      ['input', 'output'].forEach((w) =>
      {
        let p = w + 's';
        let $container = $tr.find('.' + p);
        let $tpl = $tr.find('#' + w + 'Tpl');
        let length = server[p].length;

        for (let i = 1; i < length; i++)
        {
          let $ctrl = $container.find('[data-id="' + i + '"]');

          if($ctrl.length == 0)
          {
            $ctrl = $tpl.clone().attr('id', '').addClass(w + '-entry')
              .attr('data-id', i).removeClass('d-none').addClass('d-flex').appendTo($container);
            let $volume = $ctrl.find('.volume-slider');
            $volume.slider({
              orientation: 'vertical',
              range: 'min',
              min: 0,
              max: 100,
              value: server[p][i].volume
            });
          }

          $ctrl.css({ order: i });
          let $label = $ctrl.find('.control-label');
          this._setControl(server.name, p, i, { level: server[p][i].level });
          let text =  server[p][i].name || w + ' ' + i;
          $label.text(text);
        }
        $container.find('.' + w + '-entry:gt(' + (length - 2) + ')').remove();
      });
    });
  }
  /**
   * Sets the audio level meter.
   * 
   * @method     Frontend.UI.Audiomixers#_setControl
   *
   * @param      {string}  name    The server name
   * @param      {string}  type    The type (inputs or outputs)
   * @param      {string}  n       Input or output number (1-indexed)
   * @param      {number}  data    The new control data
   * 
   * @listens    Socket#event:"admin.audiomixer.controlChange"
   */
  _setControl = (name, type, n, data) =>
  {
    if(this.updateControlData != true) return;
    let $el = this.$list.find('.audio-entry[data-name="' + name + '"] .' + type + ' [data-id="' + n + '"]');
    if(typeof data.level == 'number')
    {
      let perc = Math.round(data.level * 100) + '%';
      $el.find('.level-meterL .level-value').css({ height: perc });
      $el.find('.level-meterR').hide();
      return;
    }
    if(Array.isArray(data.level) && typeof data.level[0] == 'number' && typeof data.level[1] == 'number')
    {
      let perc1 = Math.round(data.level[0] * 100) + '%';
      let perc2 = Math.round(data.level[1] * 100) + '%';
      $el.find('.level-meterL .level-value').css({ height: perc1 });
      $el.find('.level-meterR').show();
      $el.find('.level-meterR .level-value').css({ height: perc2 });
      return;
    }
    if(typeof data.volume == 'number')
    {
      let perc = Math.round(data.volume * 100);
      console.log(perc);
      let $volume = $el.find('.volume-slider').slider('value', perc);
      return;
    }
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.audio-entry') }
}

export default Audiomixers;