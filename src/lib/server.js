import EventEmitter from 'events';

/**
 * Base class for servers.
 *
 * @class      Server
 */
class Server extends EventEmitter
{
  /**
   * Collection of all server instances
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
    Object.assign(this, opts);
    this.connected = false;
    this.client = null;
    if(!this.wol) this.wol = false;
    Server._instances.push(this);
  }
}

export default Server;