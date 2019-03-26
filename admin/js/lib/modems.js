import $ from 'jquery';
import 'popper.js';
import 'bootstrap';

const jsonNet = {
  1: 'GSM',
  2: 'GPRS',
  3: 'EDGE',
  21: 'IS95A',
  22: 'IS95B',
  23: 'CDMA',
  24: 'EVDO',
  25: 'EVDO',
  26: 'EVDO',
  27: 'HCDMA',
  28: 'HEVDO',
  29: 'HEVDO',
  30: 'HEVDO',
  31: 'EHRPD',
  32: 'EHRPD',
  33: 'EHRPD',
  34: 'HEHRPD',
  35: 'HEHRPD',
  36: 'HEHRPD',
  41: 'WCDMA',
  42: 'HSDPA',
  43: 'HSUPA',
  44: 'HSPA',
  45: 'HSPA+',
  46: 'HSPA+',
  61: 'SCDMA',
  62: 'HSDPA',
  63: 'HSUPA',
  64: 'HSPA',
  65: 'HSPA+',
  81: '802.16E',
  101: 'LTE'
}

/**
 * Class for modems UI.
 *
 * @memberof   Frontend.UI
 */
class Modems
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
      .on('admin.status.servers', this._list);
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
     * Cached array of server objects sent by server
     *
     * @type       {Object[]}
     */
    this._servers = null;
    /**
     * Cached array of popover content
     *
     * @type       {string[]}
     */
    this._modemInfo = [];
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Modems#_list
   *
   * @param      {Object[]}  data    Array of servers
   * @param      {string}          data.type       The server type
   * @param      {string}          data.hostname   The server hostname
   * @param      {string}          data.name       The server display name
   * @param      {string|boolean}  data.wol        WOL address
   * @param      {boolean}         data.connected  Connection status
   * @listens    Socket#event:"admin.status.servers"
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._servers))
      return false;
    this._servers = data;

    $.each(this._servers, (id, server) =>
    {
      if(server.type != 'huawei') return;
      let $tr = this.$list.find('[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).addClass('modem-entry')
          .show().appendTo(this.$list);
        $tr.find('a')
          .popover({
            html: true,
            title: server.name,
            content: () => { return this._modemInfo[server.name] }
          });
      }
      let $icon = $tr.find('.strength-icon')
        .toggleClass('fa-signal-slash', server.SignalIcon == 0)
        .toggleClass('fa-signal-1', server.SignalIcon == 1)
        .toggleClass('fa-signal-2', server.SignalIcon == 2)
        .toggleClass('fa-signal-3', server.SignalIcon == 3)
        .toggleClass('fa-signal-4', server.SignalIcon == 4)
        .toggleClass('fa-signal-5', server.SignalIcon == 5)
      let $service = $tr.find('.service')
        .text(server.CurrentNetworkTypeEx == 0 ? '' : jsonNet[server.CurrentNetworkTypeEx]);
      let info = '';
      info += '<p><strong>Carrier:</strong> ' + server.FullName + '</p>';
      info += '<p><strong>Roaming:</strong> ' + (server.cellroam == 1 ? 'yes' : 'no') + '</p>';
      info += '<a class="btn btn-primary btn-block" href="' + server.url + '" role="button">Modem admin</a>';
      this._modemInfo[server.name] = info;
      let popId = $tr.find('a').attr('aria-describedby');
      $('#' + popId).find('.popover-body').html(info);
    });
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.modem-entry') }
}

export default Modems;