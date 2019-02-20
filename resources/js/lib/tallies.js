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
     * Cached array of tally information sent by server
     *
     * @type       {Object.<string, number[]>}
     */
    this._tallies = null;
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('admin.status.tallies', this._list);
  }
/**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Tallies#_list
   *
   * @param      {Object.<string, number[]>}  data   Array of tally information
   * @fires      Frontend.UI.Tallies#event:updated
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
          .appendTo($indicators);
      }
    });

    let hostsOnline = this.$list.find('.tally-entry').length > 1;
    this.$list.siblings('.noresults').toggle(!hostsOnline);
    this.$list.find('.tally-entry').toggle(hostsOnline);
    /**
     * Let listeners know that tally information was updated.
     *
     * @event      Frontend.UI.Tallies#event:updated
     * @param      {Object.<string, number[]>}  tallies  Array of tally information
     */
    this.emit('updated', this._tallies);
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