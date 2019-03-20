import $ from 'jquery';

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
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo(this.$list);
        $tr.find('a').attr('href', server.url)
      }
      let $icon = $tr.find('.strength-icon')
        .toggleClass('fa-signal-slash', server.signal == 0)
        .toggleClass('fa-signal-1', server.signal == 1)
        .toggleClass('fa-signal-2', server.signal == 2)
        .toggleClass('fa-signal-3', server.signal == 3)
        .toggleClass('fa-signal-4', server.signal == 4)
        .toggleClass('fa-signal-5', server.signal == 5)
      let $service = $tr.find('.service')
        .text(server.service)
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