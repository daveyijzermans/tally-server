import $ from 'jquery';

const properties = [
  'model',
  'temperature',
  'inputVoltage',
  'inputFrequency',
  'outputVoltage',
  'outputFrequency',
  'outputLoadPercentage',
  'outputLoad',
  'batteryCapacity',
  'batteryStatus',
  'batteryRunTime',
  'lastFailCause',
  'batteryReplaceIndicator',
  'lastDiagnosticsTestDate',
  'lastDiagnosticsTestResult'
];

/**
 * Class for UPS UI.
 *
 * @memberof   Frontend.UI
 */
class Ups
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
    /**
     * Cached array of popover content
     *
     * @type       {string[]}
     */
    this._upsInfo = [];
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Ups#_list
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

    $.each(this._servers, (id, server) =>
    {
      if(['apc'].indexOf(server.type) == -1) return;
      let $tr = this.$list.find('.ups-entry[data-name="' + server.name + '"]');
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).addClass('ups-entry')
          .show().appendTo(this.$list);
        $tr.find('a')
          .popover({
            html: true,
            title: server.name,
            content: () => { return this._upsInfo[server.name] }
          });
      }
      let $icon = $tr.find('.battery-icon')
        .toggleClass('fa-battery-slash faa-beat', server.batteryCapacity < 10)
        .toggleClass('fa-battery-quarter', server.batteryCapacity >= 10 && server.batteryCapacity < 25)
        .toggleClass('fa-battery-half', server.batteryCapacity >= 25 && server.batteryCapacity < 50)
        .toggleClass('fa-battery-three-quarters', server.batteryCapacity >= 50 && server.batteryCapacity < 75)
        .toggleClass('fa-battery-full', server.batteryCapacity >= 75);
      let $runtime = $tr.find('.runtime')
        .text(Math.floor(server.batteryRunTime));

      let info = '';
      properties.forEach((prop) =>
      {
        info += '<p><strong>' + prop + ':</strong> ' + server[prop] + '</p>';
      });
      info += '<a class="btn btn-primary btn-block" href="' + server.url + '" role="button">UPS admin</a>';
      this._upsInfo[server.name] = info;
      let popId = $tr.find('a').attr('aria-describedby');
      $('#' + popId).find('.popover-body').html(info);
    });
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.ups-entry') }
}

export default Ups;
