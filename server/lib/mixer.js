import Server from './server';

/**
 * Base class for mixers.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Mixer extends Server
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
     * Tally information
     * 
     * @type       {number[]}
     */
    this.tallies = [];
    /**
     * Is this linked to another switcher?
     *
     * @type       {boolean|Backend.Mixer}
     */
    this.linked = this.linkTo(opts.linked);

    Mixer._instances.push(this);
  }
  /**
   * Link this mixer to another mixer
   *
   * @method     Backend.Mixer#linkTo
   * 
   * @fires      Backend.Mixer#event:linked
   *
   * @param      {Backend.Mixer|string}  master  The master mixer (or name)
   * @return     {boolean}               Whether the link was successful
   */
  linkTo = (master) =>
  {
    let s = master instanceof Mixer ? master : Mixer.getByName(master);
    if(!s) return false;
    if(master == this.name || s.linked.name == this.name)
      throw new Error('Are you trying to collapse the universe?');
    this.linked = s.on('action', this._copyAction);
    
    /**
     * Mixer is linked
     * 
     * @event      Backend.Mixer#event:linked
     */
    this.emit('linked');
    return this.linked
  }
  /**
   * Unlink this mixer
   *
   * @method     Backend.Mixer#unlink
   * 
   * @fires      Backend.Mixer#event:unlinked
   */
  unlink = () =>
  {
    this.linked.off('action', this._copyAction);
    this.linked = false;
    /**
     * Mixer is unlinked
     * 
     * @event      Backend.Mixer#event:unlinked
     */
    this.emit('unlinked');
  }
  /**
   * Copy a received action from the master to this mixer
   *
   * @method     Backend.Mixer#_copyAction
   *
   * @listens    Backend.Mixer#event:action
   *
   * @param      {string}  method  The method name to call
   * @param      {array}   args    The arguments to call the method with
   * @return     {mixed}   Method return value
   */
  _copyAction = (method, args) =>
  {
    const methods = ['transition', 'switchInput', 'overlay'];
    if(methods.indexOf(method) == -1) return;
    return this[method].apply(this, args);
  }
  /**
   * Mixer properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The mixer type
   * @property   {string}          result.hostname   The mixer hostname
   * @property   {string}          result.name       The mixer display name
   * @property   {boolean}         result.connected  Connection status
   * @property   {number[]}        result.tallies    Tally information
   * @property   {boolean|object}  result.linked     Link status
   */
  get status()
  {
    return Object.assign(super.status, {
      tallies: this.tallies,
      linked: this.linked instanceof Mixer ? this.linked.status : false
    });
  }
  /**
   * Tally information combining all hosts by importance (1=program comes before
   * 2=preview comes before 0)
   *
   * @type       {number[]}
   */
  static get combined()
  {
    return Mixer._instances.reduce((a, s) =>
    {
      for (let i = 0; i < s.tallies.length; i++)
        a[i] = a[i] ? (a[i] == 1 ? 1 : (a[i] == 2 ? 2 : 0)) : s.tallies[i];
      return a
    }, []);
  }
  /**
   * Get all status object for all mixer instances 
   *
   * @return     {Object[]}  Array of status objects
   */
  static get allStatus()
  {
    return Mixer._instances.map(s => s.status);
  }
}
/**
 * Collection of all mixer instances
 *
 * @type       {Array.<Backend.Mixer>}
 */
Mixer._instances = [];
/**
 * Retrieve mixers with certain type from list
 *
 * @param      {string}  type    Which type to retrieve
 * @return     {Backend.Mixer[]}   Array of mixers with given type
 */
Mixer.getByType = (type) =>
{
  if(typeof type == 'undefined') return Mixer._instances;
  return Mixer._instances.filter((a) => a.type == type);
}
/**
 * Retrieve mixer by name
 *
 * @param      {string}                  name    Mixer display name
 * @return     {boolean|Backend.Mixer}  The mixer or false if it was not
 *                                       found.
 */
Mixer.getByName = (name) =>
{
  if(typeof name == 'undefined') return false;
  let result = Mixer._instances.filter((a) => a.name == name);
  return result.length == 1 ? result[0] : false;
}

/**
 * Let listeners know of an action that should be copied on linked mixers.
 *
 * @event      Backend.Mixer#event:action
 * @param      {string}  method  The method name to call
 * @param      {array}   args    The arguments to call the method with
 */

export default Mixer;