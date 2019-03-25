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
    if(JSON.stringify(data) === JSON.stringify(this._servers))
      return false;
    this._servers = data;
    this.$list.find('.noresults').toggle(this._servers.length == 0);
    let states = ['btn-secondary', 'btn-danger', 'btn-success'];

    $.each(this._servers, (id, server) =>
    {
      if(!server.switchable) return;
      let $tr = this.$list.find('[data-name="' + server.name + '"]');
      if(server.tallies.length == 0) return $tr.remove();
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo(this.$list);
        $tr.find('.btnCut').click((event) =>
        {
          this.socket.emit('admin.server.command', server.name, 'cut', [duration]);
          event.preventDefault();
        });
        $tr.find('.btnAuto').click((event) =>
        {
          let duration = 2000;
          this.socket.emit('admin.server.command', server.name, 'transition', [duration]);
          event.preventDefault();
        });
      }
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
            this.socket.emit('admin.server.command', server.name, 'switchInput', [i + 1, 1]);
            event.preventDefault();
          });
      }
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