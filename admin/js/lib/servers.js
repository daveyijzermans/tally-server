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
      let $tr = this.$list.find('.server-entry[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).addClass('server-entry')
          .show().appendTo(this.$list);

        let $actions = $tr.find('.actions');
        let $dropdown = $actions.find('.dropdown-menu');
        if(server.wol || ['netgear', 'vmix', 'atem'].indexOf(server.type) > -1)
        {
          $('<a></a>', {
            href: '#',
            class: 'icon text-black-25',
            role: 'button',
            html: '<i class="fas fa-cog"></i>',
            'data-toggle': 'dropdown',
            'aria-haspopup': 'true',
            'aria-expanded': 'false'
          }).appendTo($actions);
        }
        if(server.wol)
        {
          $('<a></a>', {
            class: 'dropdown-item',
            href: '#',
            text: 'Wake',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'wake',
            'data-param': server.name
          }).appendTo($dropdown);
        }
        if(server.wol || server.type == 'netgear')
        {
          $('<a></a>', {
            class: 'dropdown-item',
            href: '#',
            text: 'Reboot',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'reboot',
            'data-param': server.name
          }).appendTo($dropdown);
        }
        if(server.wol)
        {
          $('<a></a>', {
            class: 'dropdown-item',
            href: '#',
            text: 'Shutdown',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'shutdown',
            'data-param': server.name
          }).appendTo($dropdown);
        }
        if(['vmix', 'atem'].indexOf(server.type) > -1)
        {
          $('<a></a>', {
            class: 'dropdown-item dropdown-item-unlink d-none',
            href: '#',
            text: 'Unlink',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'mixer.unlink',
            'data-param': server.name,
          }).appendTo($dropdown);
          $('<a></a>', {
            class: 'dropdown-item dropdown-item-nolinkavail disabled d-none',
            href: '#',
            text: 'No other mixers to link with'
          }).appendTo($dropdown);
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

      let $dropdown = $tr.find('.actions .dropdown-menu');
      let $itemUnlink = $dropdown.find('.dropdown-item-unlink');
      let $itemNoLinkAvailble = $dropdown.find('.dropdown-item-nolinkavail');
      if(['vmix', 'atem'].indexOf(server.type) > -1)
      {
        //FIXME
        let isLinked = typeof server.linked == 'object';
        $.each(this._servers, (i, other) =>
        {
          if(['vmix', 'atem'].indexOf(other.type) == -1 ||
             other.name == server.name) return;

          let $other = $dropdown.find('.dropdown-item-other[data-name="' + other.name +'"]');
          if($other.length == 0)
          {
            $other = $('<a></a>', {
              class: 'dropdown-item dropdown-item-other',
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
          }
          $other.toggle(!(typeof other.linked == 'object' || isLinked));
        });

        $itemUnlink.toggleClass('d-none', isLinked);
        $itemNoLinkAvailble.toggleClass('d-none', !isLinked && $dropdown.find('.dropdown-item-other:visible').length == 0);
      }
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