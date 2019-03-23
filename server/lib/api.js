import express from 'express';
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
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super(opts);

    this.plugs = new express.Router()
      .all('/', (req, res) => res.send(info.plugs))
      .get('/:cmd/:host', this._plugCmd);
    this.router = new express.Router()
      .all('/', (req, res) => res.send(info.apiRoot))
      .use('/plugs', this.plugs);
  }

  _plugCmd = (req, res) =>
  {
    let cmd = req.params.cmd;
    let host = req.params.host;
    this.emit('plugs', host, cmd, (result) =>
    {
      if(!result) return res.send('error');
      res.send('OK');
    });
  }
}

export default API;