import $ from 'jquery';
import poof from './jquery-poof';
$.fn.poof = poof;

/**
 * Class for the smart-plugs UI.
 *
 * @memberof   Frontend.UI
 */
class Plugs
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
      .on('admin.plugs.list', this._list)
      .on('admin.plugs.disconnect', this._disconnect)
      .on('disconnect', this._socketDisconnect);
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
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Plugs#_list
   *
   * @param      {Object[]}  plugs              Array of smartplug information
   * @param      {string}    plugs.hostname     The hostname
   * @param      {string}    plugs.name         The name
   * @param      {string}    plugs.description  The description
   * @param      {boolean}   plugs.on           Whether the plug is powered on
   */
  _list = plugs =>
  {
    this.$list.find('.noresults').toggle(plugs.length == 0);

    $.each(plugs, (id, plug) =>
    {
      let $p = this.$list.find('[data-hostname="' + plug.hostname + '"]');
      if($p.length == 0)
      {
        $p = this.$tpl.clone().attr('id', '').attr('data-hostname', plug.hostname).show().appendTo(this.$list);
        $p.find('a.toggle').click(this._btnPlugToggle);
      }

      $p.find('.name').text(plug.name);
      $p.find('.description').text(plug.description);
      $p.find('.actions .fas')
        .removeClass('fa-circle-notch fa-spin')
        .addClass('fa-power-off')
        .toggleClass('text-success', plug.on == true)
        .toggleClass('text-danger', plug.on == false);
    });
  }
  /**
   * Executed when a plug disconnects. Remove the entry from the UI.
   *
   * @method     Frontend.UI.Plugs#_disconnect
   *
   * @param      {string}  hostname  The hostname
   */
  _disconnect = hostname =>
  {
    let $plug = this.$list.find('[data-hostname="' + hostname + '"]');
    $plug.poof(true);
    this.$list.find('.noresults').toggle(this.$list.find('.plug-entry').length == 0);
  }
  /**
   * Executed when the socket is disconnected. Cleanup the entries from the UI.
   *
   * @method     Frontend.UI.Plugs#_socketDisconnect
   */
  _socketDisconnect = () =>
  {
    this.$list.find('.plug-entry').poof(true);
    this.$list.find('.noresults').toggle(true);
  }
  /**
   * Handle toggle buttons
   *
   * @method     Frontend.UI.Plugs#_btnPlugToggle
   *
   * @param      {Object}  event   The event
   */
  _btnPlugToggle = event =>
  {
    let $this = $(event.currentTarget);
    let hostname = $this.closest('.plug-entry').attr('data-hostname');
    $this.find('.fas')
      .removeClass('text-success text-danger fa-power-off')
      .addClass('fa-circle-notch fa-spin');
    this.socket.emit('admin.plug.toggle', hostname);
    event.preventDefault();
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.plug-entry') }
}

export default Plugs;