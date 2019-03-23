import express from 'express';
import cookies from 'cookie-parser';
import EventEmitter from 'events';

const info = {
  apiRoot: 'API root. Available sub commands: plugs',
  plugs: 'Plugs API root. Commands: toggle|on|off [name]'
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
    this._adminPass = opts.adminPass

    this.plugs = new express.Router()
      .all('/', (req, res) => res.end(info.plugs))
      .get('/:cmd/:host', this._plugCmd);
    this.router = new express.Router()
      .use(cookies())
      .use('/auth/logout', this._logout)
      .use('/auth/:password', this._authenticate)
      .use(this._checkCookie)
      .all('/', (req, res) => res.end(info.apiRoot))
      .use('/plugs', this.plugs);
  }
  /**
   * Authenticate API user with password
   *
   * @method     Backend.API#_authenticate
   *
   * @param      {Object}  req                  The request
   * @param      {Object}  req.params           Request parameters
   * @param      {string}  req.params.password  Password to authenticate with
   * @param      {Object}  res                  The resource
   */
  _authenticate = (req, res) =>
  {
    let password = req.params.password;
    if(password == this._adminPass)
    {
      let e = new Date().getTime() + 7*24*60*60*1000;
      res.cookie('adminPass', password, { path: '/', maxAge: e });
      return res.end('ok');
    }
    res.end('wrong');
  }
  /**
   * Logout API user (delete cookie)
   * 
   * @method     Backend.API#_logout
   *
   * @param      {Object}  req     The request
   * @param      {Object}  res     The resource
   */
  _logout = (req, res) =>
  {
    res.cookie('adminPass', null, { path: '/', maxAge: 1 });
    res.end('ok');
  }
  /**
   * Check authentication with cookie
   *
   * @method     Backend.API#_checkCookie
   *
   * @param      {Object}    req                    The request
   * @param      {Object}    req.cookies            Parsed cookies
   * @param      {string}    req.cookies.adminPass  Password to authenticate with
   * @param      {Object}    res                    The resource
   * @param      {Function}  next                   Next middleware
   */
  _checkCookie = (req, res, next) =>
  {
    let password = req.cookies.adminPass;
    if(password == this._adminPass)
      return next();
    res.end('noauth');
  }
  /**
   * Handle 'plug' commands
   *
   * @method     Backend.API#_plugCmd
   *
   * @param      {Object}  req              The request
   * @param      {Object}  req.params       Request parameters
   * @param      {string}  req.params.cmd   Command to execute
   * @param      {string}  req.params.host  The hostname or '*' to target all
   * @param      {Object}  res              The resource
   * @fires      Backend.API#event:plugs
   */
  _plugCmd = (req, res) =>
  {
    let cmd = req.params.cmd;
    let host = req.params.host;
    /**
     * Tell the server we want to execute a 'plug' command
     *
     * @event      Backend.API#event:plugs
     * @param      {string}    host    The hostname or '*' to target all
     * @param      {string}    cmd     The command to execute
     * @param      {function}  cb      The callback function to execute after
     *                                 the command is executed server-side
     */
    this.emit('plugs', host, cmd, (result) =>
    {
      if(result === false) return res.end('error');
      res.end('ok');
    });
  }
}

export default API;