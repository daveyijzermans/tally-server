import Server from './server';
import Logger from './logger';
const log = Logger.getLogger('Mixers');

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
     * Is this linked to another switcher?
     *
     * @type       {boolean|Backend.Mixer}
     */
    this.linked = false;
    /**
     * Cached value of which input is currently preview.
     *
     * @type       {number}
     */
    this._currentPreviewInput = 0;
    /**
     * Cached value of which input is currently program
     *
     * @type       {number}
     */
    this._currentProgramInput = 0;
    /**
     * Current default transition
     * 
     * @type       {string}
     */
    this._currentTransition = 'FADE';
    /**
     * Current auto transition duration
     * 
     * @type       {number}
     */
    this._autoDuration = 1000;
    /**
     * Inputs
     * 
     * @type       {object[]}
     */
    this.inputs = [null];
    /**
     * Outputs
     * 
     * @type       {object[]}
     */
    this.outputs = [null];

    Mixer._instances.push(this);
    this.linkTo(opts.linked);
  }
  /**
   * Link this mixer to another mixer
   *
   * @method     Backend.Mixer#linkTo
   * 
   * @fires      Backend.Mixer#event:linked
   *
   * @param      {Backend.Mixer|string}  name  The master mixer (or name)
   */
  linkTo = (name) =>
  {
    Mixer.waitFor(name, (master) =>
    {
      if(master.name == this.name || (master.linked && master.linked.name == this.name))
        throw new Error('Are you trying to collapse the universe?');
      this.linked = master;
      this.linked.on('action', this._copyAction)
                 .on('disconnected', this.unlink);
      /**
       * Mixer is linked
       * 
       * @event      Backend.Mixer#event:linked
       */
      this.emit('linked');
      log.info('Mixer ' + this.name + ' linked to ' + this.linked.name);
    });
  }
  /**
   * Unlink this mixer
   *
   * @method     Backend.Mixer#unlink
   * 
   * @listens    Backend.Mixer#event:disconnected
   * @fires      Backend.Mixer#event:unlinked
   */
  unlink = () =>
  {
    if(!(this.linked instanceof Mixer)) return false;
    this.linked.off('action', this._copyAction)
               .off('disconnected', this.unlink);
    this.linked = false;
    /**
     * Mixer is unlinked
     * 
     * @event      Backend.Mixer#event:unlinked
     */
    this.emit('unlinked');
    log.info('Mixer ' + this.name + ' unlinked');
  }
  /**
   * Copy a received action from the master to this mixer
   *
   * @method     Backend.Mixer#_copyAction
   *
   * @listens    Backend.Mixer#event:action
   *
   * @param      {string}  method  The method name to call
   * @param      {Array}   args    The arguments to call the method with
   * @return     {mixed}   Method return value
   */
  _copyAction = (method, args) =>
  {
    if(this.actions.indexOf(method) == -1) return;
    return this[method].apply(this, args);
  }
  /**
   * Retrieve tallies
   *
   * @type     {number[]}
   */
  get tallies() {
    return this.inputs.map((i) => i ? i.status : null);
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
   * @property   {boolean|Object}  result.linked     Link status
   * @property   {number}          result.preview    Currently preview input number
   * @property   {number}          result.program    Currently program input number
   */
  get status()
  {
    return Object.assign(super.status, {
      inputs: this.inputs,
      outputs: this.outputs,
      tallies: this.tallies,
      linked: this.linked instanceof Mixer ? this.linked.status : false,
      preview: this._currentPreviewInput,
      program: this._currentProgramInput,
      transition: this._currentTransition,
      autoDuration: this._autoDuration,
      effects: this.effects,
      slaves: Mixer._instances.filter((s) => s.linked && s.linked.name === this.name).map((s) => s.name)
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
      for (let i = 1; i < s.tallies.length; i++)
        a[i] = a[i] ? (a[i] == 3 ? 3 : (a[i] == 1 ? 1 : (a[i] == 2 ? 2 : 0))) : s.tallies[i];
      return a
    }, []);
  }
  /**
   * Get all status objects for all mixer instances 
   *
   * @type     {Object[]}
   */
  static get allStatus()
  {
    return Mixer._instances.map(s => s.status);
  }
  /**
   * Return which actions that are executed by a master can be mirrored on this
   * mixer
   *
   * @type       {string[]}
   */
  get actions()
  {
    return [];
  }
}
/**
 * Collection of all mixer instances
 *
 * @type       {Backend.Mixer[]}
 */
Mixer._instances = [];
/**
 * Retrieve mixers with certain type from list
 *
 * @param      {string}           type    Which type to retrieve
 * @return     {Backend.Mixer[]}  Array of mixers with given type
 */
Mixer.getByType = (type) =>
{
  if(typeof type == 'undefined') return Mixer._instances;
  return Mixer._instances.filter((a) => a.type == type);
}
/**
 * Retrieve mixer by name
 *
 * @param      {string}                 name    Mixer display name
 * @return     {boolean|Backend.Mixer}  The mixer or false if it was not found.
 */
Mixer.getByName = (name) =>
{
  if(typeof name == 'undefined') return false;
  let result = Mixer._instances.filter((a) => a.name == name);
  return result.length == 1 ? result[0] : false;
}
/**
 * Update mixer input names based on user names
 *
 * @param      {Backend.User[]}  users   The users
 * @return     {boolean|void}    Whether it was successful
 */
Mixer.updateMixerNames = (users) =>
{
  if(typeof users != 'object') return false;
  let connected = Mixer._instances.filter((a) => a.connected && ['vmix', 'atem'].indexOf(a.type) != -1);
  let inputs = users.reduce((a, user) => 
  {
    if(typeof user.camNumber == 'number')
    {
      if(a[user.camNumber]) a[user.camNumber].push(user.name)
      else a[user.camNumber] = [user.name]
    }
    return a;
  }, {});
  log.debug('[updateMixerNames] Setting:', inputs)
  connected.forEach((mixer) =>
  {
    Object.keys(inputs).forEach((input) =>
    {
      let names = inputs[input];
      mixer.setInputLabel(input, names.join(', '));
    });
  });
}

/**
 * Let listeners know that tally information was updated.
 *
 * @event      Backend.Mixer#event:tallies
 * @param      {number[]}  tallies  Tally information
 */
/**
 * Let listeners know of an action that should be copied on linked mixers.
 *
 * @event      Backend.Mixer#event:action
 * @param      {string}  method  The method name to call
 * @param      {array}   args    The arguments to call the method with
 */
/**
 * Audio control information is updated
 *
 * @event      Backend.Mixer#event:controlChange
 * @param      {number}  newData   New data
 */

export default Mixer;