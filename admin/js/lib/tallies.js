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
      .on('admin.status.tallies', this._list);
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
     * Cached array of tally information sent by server
     *
     * @type       {Object.<string, number[]>}
     */
    this._tallies = null;
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Tallies#_list
   *
   * @param      {Object.<string, number[]>}  data   Array of tally information
   * @listens    Socket#event:"admin.status.tallies"
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._tallies))
      return false;
    this._tallies = data;
    let max = this.combined.length;
    let states = ['badge-secondary', 'badge-danger', 'badge-success'];

    this.$list.empty();
    $.each(this._tallies, (host, result) =>
    {
      let $t = this.$tpl.clone().attr('id', '').attr('data-host', host).show().appendTo(this.$list);
      let name = host == '_combined' ? 'Combined result' : host;
      let $a = $t.find('b').text(name);

      let $indicators = $t.find('.tally-indicators');
      for (let i = 0; i < max; i++)
      {
        let state = typeof result[i] == 'number' ? states[result[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i + 1)
          .addClass(state)
          .appendTo($indicators)
          .click((event) =>
          {
            let newState = result[i] == 0 ? 2 : 1;
            let dest = host == '_combined' ? '*' : host;
            this.socket.emit('admin.server.command', dest, 'switchInput', [i + 1, newState]);
            event.preventDefault();
          });
      }
    });

    let hostsOnline = this.$list.find('.tally-entry').length > 1;
    this.$list.siblings('.noresults').toggle(!hostsOnline);
    this.$list.find('.tally-entry').toggle(hostsOnline);
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
   * Array of combined tally states. Used by the Users class.
   *
   * @return     {number[]}
   */
  get combined() { return this._tallies._combined }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.tally-entry') }
}

export default Tallies;