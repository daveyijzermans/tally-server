import Server from './server';
import Router from 'p4d-huawei-router';
import log from './logger';

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
   */
  constructor(opts)
  {
    super(opts);
    /**
     * Current service identifier
     * 
     * @type       {number}
     */
    this.CurrentNetworkTypeEx = '';
    /**
     * Current signal strength
     * 
     * @type       {number}
     */
    this.SignalIcon = 0;
    /**
     * Roaming status
     * 
     * @type       {number}
     */
    this.cellroam = 0;
    /**
     * Carrier full name
     * 
     * @type       {string}
     */
    this.FullName = '';

    this.client = new Router({
      host: this.hostname,
      username: 'admin',
      password: 'admin'
    });

    this._timeout = setTimeout(this._check, 5000);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Huawei#_connected
   *
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
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
      log.info('Rebooting ' + this.name);
      // this.client.write(this.username + '\r\n' + this.password + '\r\nenable\r\n\r\nreload\r\nyy');
      this.rebootPending = false;
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
    let promise = Promise.all([
      this.client.getStatus(),
      this.client.getNetwork()
    ]).then((data) =>
    {
      log.trace('[' + this.name + '][_check] Got data:', data);
      this.CurrentNetworkTypeEx = parseInt(data[0].CurrentNetworkTypeEx);
      this.SignalIcon = parseInt(data[0].SignalIcon);
      this.cellroam = parseInt(data[0].cellroam);
      this.FullName = data[1].FullName;
      this.emit('updated');
      /*
       * Also fire the connected method to update connection status
       */
      this._connected();
    }).catch(error => {
      this._closed();
    });
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Huawei#_closed
   *
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
   * @property   {string}          result.type                  The server type
   * @property   {string}          result.hostname              The server
   *                                                            hostname
   * @property   {string}          result.name                  The server
   *                                                            display name
   * @property   {boolean}         result.connected             Connection
   *                                                            status
   * @property   {number}          result.CurrentNetworkTypeEx  Connection
   *                                                            service state
   * @property   {number}          result.SignalIcon            Signal strength
   *                                                            1-5
   * @property   {number}          result.cellroam              Roaming status
   * @property   {string}          result.FullName              Carrier full
   *                                                            name
   * @property   {string}          result.url                   Huawei hilink
   *                                                            admin url
   */
  get status()
  {
    return Object.assign(super.status, {
      CurrentNetworkTypeEx: this.CurrentNetworkTypeEx,
      SignalIcon: this.SignalIcon,
      cellroam: this.cellroam,
      FullName: this.FullName,
    });
  }
}

export default Huawei;
