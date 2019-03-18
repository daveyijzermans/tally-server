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
     * Username used to connect to this server
     * 
     * @type       {string}
     */
    this._model = opts.model;
    /**
     * Current service name
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
    this._check();
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Huawei#_connected
   */
  _connected = (response) =>
  {
    clearTimeout(this._timeout);
    let data = response.response;
    this.service = data.CurrentNetworkTypeEx;
    this.signal = parseInt(data.SignalIcon);
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
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Huawei#_check
   */
  _check = () =>
  {
    this._timeout = setTimeout(this._closed, 5000);
    this.client.status(this._connected);
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
   * Huawei modem properties
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