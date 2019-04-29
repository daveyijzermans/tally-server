import Server from './server';
import apcUps from 'apc-ups-snmp';

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
     * The UPS model
     *
     * @type {string}
     */
    this.model = null;
    /**
     * The current temperature
     *
     * @type {string}
     */
    this.temperature = null;
    /**
     * The current input voltage
     *
     * @type {string}
     */
    this.inputVoltage = null;
    /**
     * The current input frequency
     *
     * @type {string}
     */
    this.inputFrequency = null;
    /**
     * The current output voltage
     *
     * @type {string}
     */
    this.outputVoltage = null;
    /**
     * The current output frequency
     *
     * @type {string}
     */
    this.outputFrequency = null;
    /**
     * The current load in %
     *
     * @type {string}
     */
    this.outputLoadPercentage = null;
    /**
     * The current load
     *
     * @type {string}
     */
    this.outputLoad = null;
    /**
     * The current battery capacity
     *
     * @type {string}
     */
    this.batteryCapacity = null;
    /**
     * The current battery status
     *
     * @type {string}
     */
    this.batteryStatus = null;
    /**
     * Expected battery run time
     *
     * @type {string}
     */
    this.batteryRunTime = null;
    /**
     * The last reason for transfer to battery power
     *
     * @type {string}
     */
    this.lastFailCause = null;
    /**
     * Battery replace indicator
     *
     * @type {string}
     */
    this.batteryReplaceIndicator = null;
    /**
     * The last diagnostics test was performed on this date
     *
     * @type {string}
     */
    this.lastDiagnosticsTestDate = null;
    /**
     * The last diagnostics test result
     *
     * @type {string}
     */
    this.lastDiagnosticsTestResult = null;

    this.client = new apcUps({
      host: this.hostname
    });
    this._timeout = setTimeout(this._check, 1000);
  }
  /**
   * Get UPS status, emit an event if data is received and update the
   * connection status if needed
   *
   * @method     Backend.Apc#_check
   * 
   * @fires      Backend.Server#event:updated
   */
  _check = () =>
  {
    this.client.getAll((err, results) =>
    {
      if(err) return this._closed(err);
      properties.forEach((prop) => this[prop] = results[prop]);

      this.emit('updated');
      /*
       * Also fire the connected method to update connection status
       */
      this._connected();
      clearTimeout(this._timeout);
      this._timeout = setTimeout(this._check, 5000);
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
  _closed = (error) =>
  {
    if(error && this.connected)
    {
      this.connected = false;
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    clearTimeout(this._timeout);
    this._timeout = setTimeout(this._check, 5000);
  }
  /**
   * Get UPS properties
   *
   * @type       {Object}
   * @property   {string}          result.type                       The server
   *                                                                 type
   * @property   {string}          result.hostname                   The server
   *                                                                 hostname
   * @property   {string}          result.name                       The server
   *                                                                 display
   *                                                                 name
   * @property   {boolean}         result.connected                  Connection
   *                                                                 status
   * @property   {string}          result.model                      The UPS
   *                                                                 model
   * @property   {string}          result.temperature                The current
   *                                                                 temperature
   * @property   {string}          result.inputVoltage               The current
   *                                                                 input
   *                                                                 voltage
   * @property   {string}          result.inputFrequency             The current
   *                                                                 input
   *                                                                 frequency
   * @property   {string}          result.outputVoltage              The current
   *                                                                 output
   *                                                                 voltage
   * @property   {string}          result.outputFrequency            The current
   *                                                                 output
   *                                                                 frequency
   * @property   {string}          result.outputLoadPercentage       The current
   *                                                                 load in %
   * @property   {string}          result.outputLoad                 The current
   *                                                                 load
   * @property   {string}          result.batteryCapacity            The current
   *                                                                 battery
   *                                                                 capacity
   * @property   {string}          result.batteryStatus              The current
   *                                                                 battery
   *                                                                 status
   * @property   {string}          result.batteryRunTime             Expected
   *                                                                 battery run
   *                                                                 time
   * @property   {string}          result.lastFailCause              The last
   *                                                                 reason for
   *                                                                 transfer to
   *                                                                 battery
   *                                                                 power
   * @property   {string}          result.batteryReplaceIndicator    Battery
   *                                                                 replace
   *                                                                 indicator
   * @property   {string}          result.lastDiagnosticsTestDate    The last
   *                                                                 diagnostics
   *                                                                 test was
   *                                                                 performed
   *                                                                 on this
   *                                                                 date
   * @property   {string}          result.lastDiagnosticsTestResult  The last
   *                                                                 diagnostics
   *                                                                 test result
   */
  get status()
  {
    return Object.assign(super.status, properties.reduce((a, prop) =>
    {
      a[prop] = this[prop];
      if(prop == 'batteryRunTime')
        a[prop] = this[prop] / 6000;
      return a;
    }, {}));
  }
}

export default Apc;
