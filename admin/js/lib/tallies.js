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
      .on('admin.status.mixers', this._list);
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
     * Mixer popout button
     * 
     * @type       {jQuery}
     */
    this.$btnPopout = opts.$btnPopout
    if(opts.$btnPopout)
        this.$btnPopout.click(this._popout);
    /**
     * Cached array of mixer objects sent by server
     *
     * @type       {Object[]}
     */
    this._mixers = null;
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Tallies#_list
   *
   * @param      {Object.<string, number[]>}  data   Array of tally information
   * @listens    Socket#event:"admin.status.mixers"
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._mixers))
      return false;
    this._mixers = data;
    let max = this._mixers.reduce((a, c) => Math.max(a, c.tallies.length), 0);
    let states = ['badge-secondary', 'badge-danger', 'badge-success', 'badge-danger'];

    this.$list.empty();
    let combined = [];
    $.each(this._mixers, (i, mixer) =>
    {
      if(!mixer.connected) return;
      let $t = this.$tpl.clone().attr('id', '').attr('data-name', mixer.name).addClass('tally-entry')
        .show().appendTo(this.$list);
      let $a = $t.find('b').text(mixer.name);
      if(mixer.type == 'vmix')
      {
        $t.find('.badge-status').show();
        $t.find('.badge-fullscreen')
          .toggleClass('badge-outline-primary', !mixer.fullscreen)
          .toggleClass('badge-primary', mixer.fullscreen);
        $t.find('.badge-recording')
          .toggleClass('badge-outline-danger', !mixer.recording)
          .toggleClass('badge-danger', mixer.recording);
        $t.find('.badge-streaming')
          .toggleClass('badge-outline-warning', !mixer.streaming)
          .toggleClass('badge-warning', mixer.streaming);
      }

      let isLinked = typeof mixer.linked == 'object';
      $t.find('.fas').toggle(isLinked);

      let $indicators = $t.find('.tally-indicators');
      for (let i = 1; i < max; i++)
      {
        let state = typeof mixer.tallies[i] == 'number' ? states[mixer.tallies[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i)
          .addClass(state)
          .appendTo($indicators)
          .click((event) =>
          {
            if(isLinked) return;
            let newState = mixer.tallies[i] == 0 ? 2 : 1;
            this.socket.emit('admin.mixer.command', mixer.name, 'switchInput', [i, newState]);
            event.preventDefault();
          });
        combined[i] = combined[i] ? (combined[i] == 3 ? 3 : (combined[i] == 1 ? 1 : (combined[i] == 2 ? 2 : 0))) : mixer.tallies[i];
      }
    });

    let mixersOnline = this._mixers.filter((m) => m.connected).length > 0;
    if(mixersOnline)
    {
      let $t = this.$tpl.clone().attr('id', '').addClass('tally-entry')
        .show().appendTo(this.$list);
      let $a = $t.find('b').text('Combined result');

      let $indicators = $t.find('.tally-indicators');
      for (let i = 1; i < max; i++)
      {
        let state = typeof combined[i] == 'number' ? states[combined[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i)
          .addClass(state)
          .appendTo($indicators)
          .click((event) =>
          {
            let newState = combined[i] == 0 ? 2 : 1;
            this.socket.emit('admin.mixer.command', '*', 'switchInput', [i, newState]);
            event.preventDefault();
          });
      }
    }
    this.$list.siblings('.noresults').toggle(!mixersOnline);
    this.$list.find('.tally-entry').toggle(mixersOnline);
  }
  /**
   * Open the combined mixer in a separate window
   *
   * @method     Frontend.UI.Tallies#_popout
   *
   * @param      {Object}  event   The event
   */
  _popout = event =>
  {
    let t = event.currentTarget.href;
    let w = screen.availWidth;
    let h = screen.availHeight;
    window.open(t, 'Mixer', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,top=0,left=0,width=' + w + ',height=' + h);
    event.preventDefault();
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.tally-entry') }
}

export default Tallies;