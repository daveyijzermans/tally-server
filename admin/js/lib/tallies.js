import $ from 'jquery';
import poof from './jquery-poof';
$.fn.poof = poof;
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
    /**
     * Combined tally information
     * 
     * @type       {number[]}
     */
    this.combined = [];
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
    let states = ['badge-secondary', 'badge-danger', 'badge-success'];

    this.combined = [];
    $.each(this._mixers, (id, mixer) =>
    {
      let $t = this.$list.find('.tally-entry[data-name="' + mixer.name + '"]');
      if(!mixer.connected) return $t.poof(true);
      if($t.length == 0)
      {
        $t = this.$tpl.clone().attr('id', '').attr('data-name', mixer.name).addClass('tally-entry')
          .show().appendTo(this.$list);

        let $name = $t.find('.name').text(mixer.name)
        if(mixer.type == 'vmix')
        {
          $t.find('.badge-status').show();
        }
      }

      $t.css({ order: id });
      let $a = $t.find('b').text(mixer.name);
      if(mixer.type == 'vmix')
      {
        let out = mixer.fullscreen || mixer.external;
        let rec = mixer.recording || mixer.multiCorder;
        let stream = mixer.streaming;
        $t.find('.badge-out')
          .toggleClass('badge-outline-primary', !out)
          .toggleClass('badge-primary', out);
        $t.find('.badge-rec')
          .toggleClass('badge-outline-danger', !rec)
          .toggleClass('badge-danger', rec);
        $t.find('.badge-stream')
          .toggleClass('badge-outline-warning', !stream)
          .toggleClass('badge-warning', stream);
      }

      let isLinked = () => typeof this._mixers[id].linked == 'object';
      $t.find('.fas').toggle(isLinked());

      let $indicators = $t.find('.tally-indicators');
      for (let i = 1; i < max; i++)
      {
        let $s = $indicators.find('span[data-id="' + i + '"]');
        if($s.length == 0)
        {
          $s = $('<span class=""></span>')
            .addClass('badge badge-pill')
            .attr('data-id', i)
            .text(i)
            .appendTo($indicators)
            .click((event) =>
            {
              if(isLinked()) return;
              let newState = this._mixers[id].tallies[i] == 0 ? 2 : 1;
              this.socket.emit('admin.mixer.command', this._mixers[id].name, 'switchInput', [i, newState]);
              event.preventDefault();
            });
        }
        $s.toggleClass(states[0], typeof mixer.tallies[i] != 'number' || mixer.tallies[i] === 0);
        $s.toggleClass(states[1], mixer.tallies[i] === 1 || mixer.tallies[i] === 3);
        $s.toggleClass(states[2], mixer.tallies[i] === 2);
        this.combined[i] = this.combined[i] ? (this.combined[i] == 3 ? 3 : (this.combined[i] == 1 ? 1 : (this.combined[i] == 2 ? 2 : 0))) : mixer.tallies[i];
      }
      $indicators.find('span:gt(' + (max - 2) + ')').remove();
    });

    let mixersOnline = this._mixers.filter((m) => m.connected).length > 0;
    if(mixersOnline)
    {
      let $t = this.$list.find('#combinedTally');
      if($t.length == 0)
      {
        $t = this.$tpl.clone().attr('id', 'combinedTally').addClass('tally-entry')
          .show().appendTo(this.$list);
        let $a = $t.find('b').text('Combined result');
      }
      $t.css({ order: this._mixers.length });
      let $indicators = $t.find('.tally-indicators')
      for (let i = 1; i < max; i++)
      {
        let $s = $indicators.find('span[data-id="' + i + '"]');
        if($s.length == 0)
        {
          $s = $('<span class=""></span>')
            .addClass('badge badge-pill')
            .attr('data-id', i)
            .text(i)
            .appendTo($indicators)
            .click((event) =>
            {
              let newState = this.combined[i] == 0 ? 2 : 1;
              this.socket.emit('admin.mixer.command', '*', 'switchInput', [i, newState]);
              event.preventDefault();
            });
        }
        $s.toggleClass(states[0], typeof this.combined[i] != 'number' || this.combined[i] === 0);
        $s.toggleClass(states[1], this.combined[i] === 1 || this.combined[i] === 3);
        $s.toggleClass(states[2], this.combined[i] === 2);
      }
      $indicators.find('span:gt(' + (max - 2) + ')').remove();
    }
    this.$list.find('.noresults').toggle(!mixersOnline);
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