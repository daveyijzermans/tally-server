import Server from './server';
import apcUps  from'apc-ups-snmp';

/**
 * Class for connecting to APC UPS.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Apc extends Server
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
     * Current UPS battery percentage
     *
     * @type       {number}
     */
    this.percentage = 0;
    /**
     * Current UPS runtime in minutes
     *
     * @type       {number}
     */
    this.runtime = 0;

    this.client = new apcUps({
      host: this.hostname
    });
    this._timeout = setTimeout(this._check, 1000);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Apc#_connected
   *
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  _connected = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      this.emit('connected');
    }
    this.emit('connection', this.connected);
  }
  /**
   * Get UPS status, emit an event if data is received and update the
   * connection status if needed
   *
   * @method     Backend.Apc#_check
   * 
   * @fires      Backend.Huawei#event:updated
   */
  _check = () =>
  {
    let callback = (err, result) =>
    {
      if(err) return this._closed(err);

      if(result.percentage)
        this.percentage = result.percentage;
      if(result.runtime)
        this.runtime = result.runtime;
      /**
       * APC status was updated
       *
       * @event      Backend.Apc#event:updated
       */
      this.emit('updated')
      /*
       * Also fire the connected method to update connection status
       */
      this._connected();
      clearTimeout(this._timeout);
      this._timeout = setTimeout(this._check, 5000);
    }

    this.client.getBatteryCapacity((err, percentage) =>
    {
      return callback(err, { percentage: percentage });
    });
    this.client.getBatteryRunTime((err, runtime) =>
    {
      return callback(err, { runtime: runtime });
    });
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Apc#_closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed err= (error) =>
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
   * Get UPS properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {string|boolean}  result.wol        WOL address
   * @property   {boolean}         result.connected  Connection status
   * @property   {number}          result.percentage UPS charge percentage
   * @property   {number}          result.runtime    UPS charge runtime
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      wol: this.wol,
      connected: this.connected,
      percentage: this.percentage,
      runtime: this.runtime
    }
  }
}

export default Apc;