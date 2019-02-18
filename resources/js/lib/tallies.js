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

    this.$list = opts.$list;

    this.$tpl = opts.$tpl;
    
    this._tallies = null;

    this.socket = opts.socket
      .on('admin.status.tallies', this._list);
  }
/**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @param      {Array.Object}  data   Array of tally information
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
     * @param      {Array.Object}  tallies  Array of tally information
     */
    this.emit('updated', this._tallies);
  }
  /**
   * Array of combined tally states. Used by the Users class.
   *
   * @return     {Array}
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