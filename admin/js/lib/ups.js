import $ from 'jquery';

/**
 * Class for UPS UI.
 *
 * @memberof   Frontend.UI
 */
class Ups
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
   * @method     Frontend.UI.Ups#_list
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
      if(server.type != 'apc') return;
      let $tr = this.$list.find('[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo(this.$list);
        $tr.find('a').attr('href', 'http://' + server.hostname);
      }
      let $icon = $tr.find('.battery-icon')
        .toggleClass('fa-battery-slash faa-beat', server.percentage < 10)
        .toggleClass('fa-battery-quarter', server.percentage >= 10 && server.percentage < 25)
        .toggleClass('fa-battery-half', server.percentage >= 25 && server.percentage < 50)
        .toggleClass('fa-battery-three-quarters', server.percentage >= 50 && server.percentage < 75)
        .toggleClass('fa-battery-full', server.percentage >= 75);
      let $runtime = $tr.find('.runtime')
        .text(Math.floor(server.runtime));
    });
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.ups-entry') }
}

export default Ups;