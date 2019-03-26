import $ from 'jquery';

/**
 * Class for Switchers UI.
 *
 * @memberof   Frontend.UI
 */
class Switchers
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
   * @fires      Socket#event:"admin.server.command"
   */
  _list = data =>
  {
    let switchable = data.filter((s) => s.switchable === true);
    if(JSON.stringify(switchable) === JSON.stringify(this._servers))
      return false;
    this._servers = switchable;

    let connected = switchable.filter((s) => s.connected);
    this.$list.find('.content-header .noresults').toggle(connected.length == 0);

    const states = ['btn-secondary', 'btn-danger', 'btn-success'];
    $.each(this._servers, (id, server) =>
    {
      let $tr = this.$list.find('[data-name="' + server.name + '"]');
      if(!server.connected)
        return $tr.remove();

      const isLinked = typeof server.linked == 'object';
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').addClass('switcher-entry')
          .attr('data-name', server.name).show().appendTo(this.$list);

        let $dropdown = $tr.find('.dropdown-menu');
        $dropdown.find('.dropdown-item.unlink').attr('data-param', server.name);
        let $btnCut = $tr.find('.btnCut');
        let $btnAuto = $tr.find('.btnAuto');
        let $spanPrg = $btnAuto.find('span.progress');
        /*
         * Bind cut button
         */
        $btnCut.click((event) =>
        {
          if(isLinked) return;
          this.socket.emit('admin.server.command', server.name, 'cut');
          $spanPrg.stop(true, true);
          event.preventDefault();
        });
        /*
         * Bind auto button
         */
        $btnAuto.click((event) =>
        {
          if(isLinked) return;
          let duration = 2000;
          this.socket.emit('admin.server.command', server.name, 'transition', [duration]);
          $spanPrg.stop(true, true)
            .animate({width: '100%'}, duration, 'linear', () =>
              {
                $spanPrg.css({width: '0%'});
              });
          event.preventDefault();
        });
      }

      let $dropdown = $tr.find('.dropdown-menu');
      let $linkedItem = $dropdown.find('.dropdown-item.linked');
      if(isLinked)
      {
        $dropdown.find('.dropdown-item.other').remove();
        $dropdown.find('.dropdown-item.noresults').hide();
        $linkedItem.find('span').text(server.linked.name);
      }
      $linkedItem.toggle(isLinked);
      $tr.find('.linkToggle .fas')
        .toggleClass('fa-link', isLinked)
        .toggleClass('fa-unlink', !isLinked);
      $tr.toggleClass('switcher-linked', isLinked);
      
      let $name = $tr.find('.name').text(server.name);
      $tr.find('.previewBus, .programBus').find('.btn').remove();
      let $prv = $tr.find('.previewBus');
      let $pgm = $tr.find('.programBus');

      /*
       * If there are not inputs on preview, then the input that's on program is
       * also on preview. Find that input and make it's preview bus button
       * green.
       */
      let forcePrv = false;
      if(server.tallies.indexOf(2) == -1)
        forcePrv = server.tallies.indexOf(1);

      for (let i = 0; i < server.tallies.length; i++)
      {
        /*
         * Populate the preview bus row
         */
        let prvClass = server.tallies[i] == 2 || forcePrv === i ? states[2] : states[0];
        let $prvBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i + 1)
          .addClass(prvClass)
          .appendTo($prv)
          .one('click', (event) =>
          {
            if(isLinked) return;
            this.socket.emit('admin.server.command', server.name, 'switchInput', [i + 1, 2]);
            event.preventDefault();
          });

        /*
         * Populate the program bus row
         */
        let pgmClass = server.tallies[i] == 1 ? states[1] : states[0];
        let $pgmBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i + 1)
          .addClass(pgmClass)
          .appendTo($pgm)
          .one('click', (event) =>
          {
            if(isLinked) return;
            this.socket.emit('admin.server.command', server.name, 'switchInput', [i + 1, 1]);
            event.preventDefault();
          });
      }
    });
    /*
     * Add self to other switchers' link dropdown
     */
    $.each(connected, (id, server) =>
    {
      this.$list.find('.switcher-entry[data-name!="' + server.name + '"]').each((i, other) =>
      {
        let $other = $(other);
        if($(other).hasClass('switcher-linked')) return;
        let $dropdown = $other.find('.dropdown-menu');
        let $item = $dropdown.find('.dropdown-item[data-name="' + server.name +'"]');
        if($item.length == 0)
        {
          $item = $('<a class="dropdown-item other" href="#" data-toggle="modal" data-target="#actionModal" data-command="server.link"></a>')
            .text('Link with ' + server.name)
            .attr('data-name', server.name)
            .data('param', {
              master: server.name,
              slave: $other.data('name')
            })
            .appendTo($dropdown);
        }
      });
    });
    this.$list.find('.switcher-entry').each((i, entry) =>
    {
      let $tr = $(entry);
      if($tr.hasClass('switcher-linked')) return;
      let $dropdown = $tr.find('.dropdown-menu');
      $dropdown.find('.noresults').toggle($dropdown.find('.dropdown-item.other').length == 0);
    });
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.switcher-entry') }
}

export default Switchers;