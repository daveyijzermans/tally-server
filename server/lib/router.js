import Server from './server';

/**
 * Base class for routers.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Router extends Server
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
     * Server connections
     * 
     * @type       {Object}
     */
    this.connections = opts.connections;
    /**
     * Current inputs
     * 
     * @type       {Object[]}
     */
    this.inputs = [null];
    /**
     * Current outputs and routing
     * 
     * @type       {Object[]}
     */
    this.outputs = [null];

    if(opts.matrix)
    {
      let inputs = opts.matrix[0];
      let outputs = opts.matrix[1];
      if(typeof inputs == 'number')
        this.inputs = Array.from({ length: inputs + 1 }, () => new Object());
      else for (let i = 0; i < inputs.length; i++)
        this.inputs.push({
          name: (inputs[i] && inputs[i].name) || '',
          nc: inputs[i] && inputs[i].nc === true,
          locked: false
        });

      if(typeof outputs == 'number')
        this.outputs = Array.from({ length: outputs + 1 }, () => new Object());
      else for (let i = 0; i < outputs.length; i++)
        this.outputs.push({
          name: (outputs[i] && outputs[i].name) || '',
          nc: outputs[i] && outputs[i].nc === true,
          input: 0
        });
    }

    Router._instances.push(this);
  }
  /**
   * Router properties
   *
   * @type       {Object}
   * @property   {string}     result.type          The router type
   * @property   {string}     result.hostname      The router hostname
   * @property   {string}     result.name          The router display name
   * @property   {boolean}    result.connected     Connection status
   * @property   {string[]}   result.inputs        Input status for this router
   * @property   {string[]}   result.outputs       Output status for this router
   */
  get status()
  {
    return Object.assign(super.status, {
      connections: this.connections,
      inputs: this.inputs,
      outputs: this.outputs
    });
  }
  /**
   * Get all status objects for all router instances 
   *
   * @type     {Object[]}
   */
  static get allStatus()
  {
    return Router._instances.map(s => s.status);
  }
}
/**
 * Collection of all router instances
 *
 * @type       {Backend.Router[]}
 */
Router._instances = [];
/**
 * Retrieve routers with certain type from list
 *
 * @param      {string}  type    Which type to retrieve
 * @return     {Backend.Router[]}   Array of routers with given type
 */
Router.getByType = (type) =>
{
  if(typeof type == 'undefined') return Router._instances;
  return Router._instances.filter((a) => a.type == type);
}
/**
 * Retrieve router by name
 *
 * @param      {string}                  name    Router display name
 * @return     {boolean|Backend.Router}  The router or false if it was not
 *                                       found.
 */
Router.getByName = (name) =>
{
  if(typeof name == 'undefined') return false;
  let result = Router._instances.filter((a) => a.name == name);
  return result.length == 1 ? result[0] : false;
}

/**
 * Let listeners know of an action that should be copied on linked routers.
 *
 * @event      Backend.Router#event:action
 * @param      {string}  method  The method name to call
 * @param      {array}   args    The arguments to call the method with
 */
export default Router;