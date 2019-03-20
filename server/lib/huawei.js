import Server from './server';
import hilink from 'hilinkhuawei';

/**
 * Class for connecting to Huawei dongle.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Huawei extends Server
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  constructor(opts)
  {
    super(opts);
    /**
     * Dongle model name (e3372s or h)
     * 
     * @type       {string}
     */
    this._model = opts.model;
    /**
     * Current service identifier
     * 
     * @type       {string}
     */
    this.service = '';
    /**
     * Current signal strength
     * 
     * @type       {number}
     */
    this.signal = 0;
    /**
     * Nice URL that others in the LAN can access the modem page
     * 
     * @type       {string}
     */
    this.url = opts.url;

    this.client = new hilink();
    this.client.setModel(this._model);
    this.client.setIp(this.hostname);
    this._timeout = setTimeout(this._check, 10000);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Huawei#_connected
   */
  _connected = () =>
  {
    clearTimeout(this._timeout);
    if(!this.connected)
    {
      this.connected = true;
      this.emit('connected');
    }
    if(this.rebootPending)
    {
      logger('Rebooting Huawei...');
      // this.client.write(this.username + '\r\n' + this.password + '\r\nenable\r\n\r\nreload\r\nyy');
    }
    this.emit('connection', this.connected);
    this._timeout = setTimeout(this._check, 10000);
  }
  /**
   * Get the status from the dongle, emit an event if data is received and
   * update the connection status if needed
   *
   * @method     Backend.Huawei#_check
   */
  _check = () =>
  {
    /*
     * Set a 5 second timeout to the _closed method, since the http request will
     * never timeout
     */
    this._timeout = setTimeout(this._closed, 5000);
    this.client.status(this._updated);
  }
  /**
   * Exectuted when server status is updated
   *
   * @param      {obkect}  response  The response from the UPS
   * @fires      Backend.Huawei#event:updated
   */
  _updated = (response) =>
  {
    let data = response.response;
    this.service = data.CurrentNetworkTypeEx;
    this.signal = parseInt(data.SignalIcon);
    /**
     * Huawei dongle status was updated
     *
     * @event      Backend.Huawei#event:updated
     */
    this.emit('updated')
    /*
     * Also fire the connected method to update connection status
     */
    this._connected();
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Huawei#_closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed = (error) =>
  {
    if(error && this.connected)
    {
      this.connected = false;
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this._timeout = setTimeout(this._check, 5000);
  }
  /**
   * Get Huawei modem properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {string|boolean}  result.wol        WOL address
   * @property   {boolean}         result.connected  Connection status
   * @property   {string}          result.service    Connection service state
   * @property   {numer}           result.signal     Signal strength 1-5
   * @property   {string}          result.url        Huawei hilink dmin url
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      wol: this.wol,
      connected: this.connected,
      service: this.service,
      signal: this.signal || 0,
      url: this.url
    }
  }
}

export default Huawei;