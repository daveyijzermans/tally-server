import express from 'express';
import EventEmitter from 'events';

const info = {
  noauth: 'Not authorized. Use auth/password first.',
  apiRoot: 'API root. Available sub commands: plugs',
  plugs: 'Plugs API root. Commands: toggle|on|off [hosts|*]'
}

/**
 * Class for providing web API
 *
 * @extends    EventEmitter
 * @memberof   Backend
 */
class API extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts            The options
   * @param      {string}  opts.adminPass  Administrator password used for
   *                                       authentication
   */
  constructor(opts)
  {
    super(opts);
    this._adminPass = opts.adminPass;

    let plugs = new express.Router()
      .get('/', (req, res) => res.end(info.plugs))
      .get('/:cmd/:hosts?', this._plugCmd);
    let secured = new express.Router({ mergeParams: true })
      .use('/', this._authenticate)
      .get('/', (req, res) => res.end(info.apiRoot))
      .use('/plugs', plugs);
    this.router = new express.Router()
      .use('/auth/:password?', secured)
      .get('/', (req, res) => res.end(info.noauth))
  }
  /**
   * Authenticate API user with password
   *
   * @method     Backend.API#_authenticate
   *
   * @param      {Object}    req                  The request
   * @param      {Object}    req.params           Request parameters
   * @param      {string}    req.params.password  Password to authenticate with
   * @param      {Object}    res                  The resource
   * @param      {funciton}  next                 Next middleware
   */
  _authenticate = (req, res, next) =>
  {
    let password = req.params.password;
    if(typeof password == 'undefined')
      return res.end('password?');
    if(password == this._adminPass)
      return next();
    res.end('wrong');
  }
  /**
   * Handle 'plug' commands
   *
   * @method     Backend.API#_plugCmd
   *
   * @param      {Object}  req               The request
   * @param      {Object}  req.params        Request parameters
   * @param      {string}  req.params.cmd    Command to execute
   * @param      {string}  req.params.hosts  Hostnames comma seperated or '*' to
   *                                         target all. Start with ! to exclude
   * @param      {Object}  res               The resource
   * @fires      Backend.API#event:plugs
   */
  _plugCmd = (req, res) =>
  {
    let cmd = req.params.cmd;
    let hosts = req.params.hosts;
    /**
     * Tell the server we want to execute a 'plug' command
     *
     * @event      Backend.API#event:plugs
     * @param      {string}    hosts   The hostname or '*' to target all
     * @param      {string}    cmd     The command to execute
     * @param      {function}  cb      The callback function to execute after
     *                                 the command is executed server-side
     */
    this.emit('plugs', hosts, cmd, (result) =>
    {
      result
        .then(() => res.end('ok'))
        .catch((err) => res.end(err.message));
    });
  }
}

export default API;