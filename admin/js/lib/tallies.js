import $ from 'jquery';
import EventEmitter from 'events';

/**
 * Class for tallies UI.
 *
 * @extends    EventEmitter
 * @memberof   Frontend.UI
 */
class Tallies extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
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
     * Switcher popout button
     * 
     * @type       {jQuery}
     */
    this.$btnPopout = opts.$btnPopout
    if(opts.$btnPopout)
        this.$btnPopout.click(this._popout);
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
   * @method     Frontend.UI.Tallies#_list
   *
   * @param      {Object.<string, number[]>}  data   Array of tally information
   * @listens    Socket#event:"admin.status.servers"
   */
  _list = data =>
  {
    let switchable = data.filter((s) => s.connected && s.switchable);
    if(JSON.stringify(switchable) === JSON.stringify(this._servers))
      return false;
    this._servers = switchable;
    let max = this._servers.reduce((a, c) => Math.max(a, c.tallies.length), 0);
    let states = ['badge-secondary', 'badge-danger', 'badge-success'];

    this.$list.empty();
    let combined = [];
    $.each(this._servers, (i, server) =>
    {
      let $t = this.$tpl.clone().attr('id', '').attr('data-name', server.name).addClass('tally-entry')
        .show().appendTo(this.$list);
      let $a = $t.find('b').text(server.name);
      const isLinked = typeof server.linked == 'object';
      $t.find('.fas').toggle(isLinked);

      let $indicators = $t.find('.tally-indicators');
      for (let i = 0; i < max; i++)
      {
        let state = typeof server.tallies[i] == 'number' ? states[server.tallies[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i + 1)
          .addClass(state)
          .appendTo($indicators)
          .click((event) =>
          {
            if(isLinked) return;
            let newState = server.tallies[i] == 0 ? 2 : 1;
            let dest = server.name == '_combined' ? '*' : server.name;
            this.socket.emit('admin.server.command', dest, 'switchInput', [i + 1, newState]);
            event.preventDefault();
          });
        combined[i] = combined[i] ? (combined[i] == 1 ? 1 : (combined[i] == 2 ? 2 : 0)) : server.tallies[i];
      }
    });

    let serversOnline = this._servers.length > 0;
    if(serversOnline)
    {
      let $t = this.$tpl.clone().attr('id', '').addClass('tally-entry')
        .show().appendTo(this.$list);
      let $a = $t.find('b').text('Combined result');

      let $indicators = $t.find('.tally-indicators');
      for (let i = 0; i < max; i++)
      {
        let state = typeof combined[i] == 'number' ? states[combined[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i + 1)
          .addClass(state)
          .appendTo($indicators)
      }
    }
    this.$list.siblings('.noresults').toggle(!serversOnline);
    this.$list.find('.tally-entry').toggle(serversOnline);
  }
  /**
   * Open the switcher in a seperate window
   *
   * @param      {Object}  event   The event
   *
   * @method     Frontend.UI.Tallies#_popout
   */
  _popout = event =>
  {
    let t = event.currentTarget.href;
    let w = screen.availWidth;
    let h = screen.availHeight;
    window.open(t, 'Switcher', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,top=0,left=0,width=' + w + ',height=' + h);
    event.preventDefault();
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.tally-entry') }
}

export default Tallies;