import EventEmitter from 'events';

/**
 * Base class for servers.
 *
 * @memberof   Backend
 */
class Server extends EventEmitter
{
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
    this.hostname = opts.hostname.replace('"', '\\"');
    /**
     * Server display name
     * 
     * @type       {string}
     */
    this.name = opts.name.replace('"', '\\"');
    /**
     * Server connection status
     * 
     * @type       {boolean}
     */
    this.connected = false;
    /**
     * Server admin URL
     * 
     * @type       {boolean|string}
     */
    this.url = typeof opts.url == 'string' ? opts.url : false;
    /**
     * Server client interaction object
     * 
     * @type       {mixed}
     */
    this.client = null;

    Server._instances.push(this);
    if(typeof Server._callbacks[this.name] == 'object')
    {
      Server._callbacks[this.name].forEach((cb) => cb(this));
      Server._callbacks[this.name] = [];
    }
  }
  /**
   * Server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {boolean}         result.connected  Connection status
   * @property   {string}          result.url        The server admin URL
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      connected: this.connected,
      url: this.url
    }
  }
  /**
   * Get all status objects for all server instances 
   *
   * @type     {Object[]}
   */
  static get allStatus()
  {
    return Server._instances.map(s => { return s.status });
  }
  /**
   * The available channels for all Mumble servers
   * 
   * @type       {string[]}
   */
  static get cycleableChannels()
  {
    return Server.getByType('mumble').reduce((a, m) =>
    {
      return m.cycleChannels ? a.concat(m.cycleChannels) : a;
    }, []);
  }
}
/**
 * Collection of all server instances
 *
 * @type       {Backend.Server[]}
 */
Server._instances = [];
/**
 * Holds callbacks that need to be called when Server objects with a certain
 * name are created
 *
 * @type       {Object.<string, function[]>}
 */
Server._callbacks = {};
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
 * Register a callback for when a server is created with a specific name
 *
 * @param      {string}      name    The name
 * @param      {Function}    cb      Callback
 * @return     {mixed|void}  Callback result if the server was found immediately
 */
Server.waitFor = (name, cb) =>
{
  if(typeof name != 'string') return;
  let s = Server.getByName(name);
  if(s) return cb(s);

  if(typeof Server._callbacks[name] == 'object')
    Server._callbacks[name].push(cb);
  else
    Server._callbacks[name] = [cb];
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

export default Server;
