import $ from 'jquery';

/**
 * Class for servers UI.
 *
 * @memberof   Frontend.UI
 */
class Servers
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
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
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('admin.status.servers', this._list);
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Servers#_list
   *
   * @param      {Object[]}  data    Array of servers
   * @param      {string}          data[].type       The server type
   * @param      {string}          data[].hostname   The server hostname
   * @param      {string}          data[].name       The server display name
   * @param      {string|boolean}  data[].wol        WOL address
   * @param      {boolean}         data[].connected  Connection status
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._servers))
      return false;
    this._servers = data;
    this.$list.find('.noresults').toggle(this._servers.length == 0);

    $.each(this._servers, (id, server) =>
    {
      let $tr = this.$list.find('[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo(this.$list);

        let wol = typeof server.wol == 'string';
        let $actions = $tr.find('.actions');
        let $dropdown = $actions.find('.dropdown-menu');
        if(wol || server.type == 'netgear')
        {
          $actions.append('<a href="#" class="icon text-black-25" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-cog"></i></a>');
        }
        if(wol)
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="wake">Wake</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
        if(wol || server.type == 'netgear')
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
        if(wol)
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
      }
      let sClass = server.connected ? 'bg-success' : 'bg-danger';
      let $name = $tr.find('.name').text(server.name);
      let $type = $tr.find('.type').text(server.type);
      let $hostname = $tr.find('.hostname').text(server.hostname);
      $tr.find('.status-icon')
        .toggleClass('bg-success', server.connected == true)
        .toggleClass('bg-danger', server.connected == false);
      $tr.find('.status-text')
        .text(server.connected ? 'Connected' : 'Disconnected');
    });
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.server-entry') }
}

export default Servers;