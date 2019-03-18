import EventEmitter from 'events';

const regexMac = /^((([0-9A-F]{2}:){5})|(([0-9A-F]{2}-){5})|([0-9A-F]{10}))([0-9A-F]{2})$/i

/**
 * Base class for servers.
 *
 * @memberof   Backend
 */
class Server extends EventEmitter
{
  /**
   * Tally information for all hosts by key
   * @type       {Object.<string, string>}
   */
  static get tallies()
  {
    return Server._instances.reduce((a, s) =>
    {
      if(s.tallies && s.tallies.length > 0) a[s.name] = s.tallies;
      return a;
    }, {});
  }
  /**
   * The available channels for all Mumble servers
   * @type       {string[]}
   */
  static get cycleableChannels()
  {
    return Server.getByType('mumble').reduce((a, m) =>
    {
      return m.cycleChannels ? a.concat(m.cycleChannels) : a;
    }, []);
  }
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
    /**
     * Server type
     * 
     * @type       {string}
     */
    this.type = opts.type;
    /**
     * Server hostname or IP address
     * 
     * @type       {string}
     */
    this.hostname = opts.hostname;
    /**
     * Server display name
     * 
     * @type       {string}
     */
    this.name = opts.name;
    /**
     * Server connection status
     * 
     * @type       {boolean}
     */
    this.connected = false;
    /**
     * Server client interaction object
     * 
     * @type       {mixed}
     */
    this.client = null;
    /**
     * MAC address to send WOL packets to. If WOL is not supported it is set
     * to false
     *
     * @type       {string|boolean}
     */
    this.wol = regexMac.test(opts.wol) ? opts.wol : false;

    Server._instances.push(this);
  }
  /**
   * Server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {string|boolean}  result.wol        WOL address
   * @property   {boolean}         result.connected  Connection status
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      wol: this.wol,
      connected: this.connected
    }
  }
  /**
   * Get all status object for all server instances 
   *
   * @return     {Object[]}  Array of status objects
   */
  static get allStatus()
  {
    return Server._instances.map(s => { return s.status });
  }
}
/**
 * Collection of all server instances
 *
 * @type       {Array.<Backend.Server>}
 */
Server._instances = [];
/**
 * Retrieve servers with certain type from list
 *
 * @param      {string}  type    Which type to retrieve
 * @return     {Backend.Server[]}   Array of servers with given type
 */
Server.getByType = (type) =>
{
  if(typeof type == 'undefined') return Server._instances;
  return Server._instances.filter((a) => a.type == type);
}
/**
 * Retrieve server by name
 *
 * @param      {string}                  name    Server display name
 * @return     {boolean|Backend.Server}  The server or false if it was not
 *                                       found.
 */
Server.getByName = (name) =>
{
  if(typeof name == 'undefined') return false;
  let result = Server._instances.filter((a) => a.name == name);
  return result.length == 1 ? result[0] : false;
}

/**
 * Let listeners know the connection state of this server.
 *
 * @event      Backend.Server#event:connection
 * @param      {boolean}  connected  Whether the server is connected
 */
/**
 * Let listeners know the server is connected. Only fired when server was
 * previously disconnected.
 *
 * @event      Backend.Server#event:connected
 */
/**
 * Let listeners know the server is disconnected. Only fired when server was
 * previously connected.
 *
 * @event      Backend.Server#event:disconnected
 */
/**
 * Let listeners know that tally information was updated.
 *
 * @event      Backend.Server#event:tallies
 * @param      {number[]}  tallies  Tally information
 */
/**
 * Let listeners know of a log message.
 *
 * @event      Backend.Server#event:log
 * @param      {string}  msg     Log message
 */

export default Server;