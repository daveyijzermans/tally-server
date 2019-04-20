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
   * @method     Frontend.UI.Servers#_list
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
    this.$list.find('.noresults').toggle(this._servers.length == 0);
    $.each(this._servers, (id, server) =>
    {
      let isLinked = () => typeof this._servers[id].linked == 'object';
      let $tr = this.$list.find('.server-entry[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).addClass('server-entry')
          .show().appendTo(this.$list);

        let $actions = $tr.find('.actions');
        let $dropdown = $actions.find('.dropdown-menu');

        if(server.wol || ['netgear', 'vmix', 'atem'].indexOf(server.type) > -1)
          $actions.find('[data-toggle="dropdown"]').removeClass('d-none');
        if(server.wol)
          $dropdown.find('[data-command="wake"]').removeClass('d-none');
        if(server.wol || server.type == 'netgear')
          $dropdown.find('[data-command="reboot"]').removeClass('d-none');
        if(server.wol)
          $dropdown.find('[data-command="shutdown"]').removeClass('d-none');
        $actions.find('a').attr('data-param', server.name);
      }
      
      let sClass = server.connected ? 'bg-success' : 'bg-danger';
      let $name = $tr.find('.name').text(server.name);
      if(server.url) $name.wrapInner($('<a></a>', { href: server.url }));
      let $type = $tr.find('.type').text(server.type);
      let $hostname = $tr.find('.hostname').text(server.hostname);
      $tr.find('.status-icon')
        .toggleClass('bg-success', server.connected == true)
        .toggleClass('bg-danger', server.connected == false);
      $tr.find('.status-text')
        .text(server.connected ? 'Connected' : 'Disconnected');

      if(['vmix', 'atem'].indexOf(server.type) == -1) return;

      let $dropdown = $tr.find('.actions .dropdown-menu');
      let $itemUnlink = $dropdown.find('.dropdown-item-unlink');
      let $itemNoLinkAvailble = $dropdown.find('.dropdown-item-nolinkavail');

      $dropdown.find('.dropdown-item.other').remove();
      if(isLinked())
      {
        $itemNoLinkAvailble.addClass('d-none');
      } else {
        $.each(this._servers, (i, other) =>
        {
          if(['vmix', 'atem'].indexOf(other.type) == -1) return; /* Mixers only! */
          if(other.name == server.name) return; /* Don't link to self */
          if(!other.connected) return; /* Exclude if the other mixer isn't connected */

          /* Don't allow link if other is linked is to self */
          if(typeof other.linked == 'object' && other.linked.name == server.name) return;

          $('<a></a>', {
            class: 'dropdown-item other',
            href: '#',
            text: 'Link with ' + other.name,
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'mixer.link',
            'data-name': other.name
          }).data('param', {
            master: other.name,
            slave: server.name
          }).appendTo($dropdown);
        });
        $itemNoLinkAvailble.toggleClass('d-none', $dropdown.find('.dropdown-item.other').length > 0);
      }
      $itemUnlink.toggleClass('d-none', !isLinked());
    });
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.server-entry') }
}

export default Servers;
