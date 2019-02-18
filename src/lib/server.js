import EventEmitter from 'events';

/**
 * Base class for servers.
 *
 * @memberof   Backend
 */
class Server extends EventEmitter
{
  /**
   * Collection of all server instances
   *
   * @type       {Array.<Backend.Server>}
   */
  static _instances = [];
  /**
   * Retrieve servers with certain type from list
   *
   * @param      {string}  type    Which type to retrieve
   * @return     {Array}   Array of servers with given type
   */
  static getByType = (type) =>
  {
    if(typeof type == 'undefined') return Server._instances;
    return Server._instances.filter((a) => a.type == type);
  }
  /**
   * Retrieve server by name
   *
   * @param      {string}  name    The name
   * @return     {Object}  The server.
   */
  static getByName = (name) =>
  {
    if(typeof name == 'undefined') return false;
    let result = Server._instances.filter((a) => a.name == name);
    return result.length == 1 ? result[0] : false;
  }
  /**
   * Tally information for all hosts by key
   * @type       {Object}
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
   * @type       {Array}
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
     * @type       {String}
     */
    this.type = opts.type;
    /**
     * Server hostname or IP address
     * 
     * @type       {String}
     */
    this.hostname = opts.hostname;
    /**
     * Server display name
     * 
     * @type       {String}
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
    if(!this.wol)
    {
      /**
       * MAC address to send WOL packets to. If WOL is not supported it is set
       * to false
       *
       * @type       {string|boolean}
       */
      this.wol = false;
    }
    Server._instances.push(this);
  }
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
 * @param      {Array.number}  tallies  Tally information
 */
/**
 * Let listeners know of a log message.
 *
 * @event      Backend.Server#event:log
 * @param      {string}  msg     Log message
 */

export default Server;