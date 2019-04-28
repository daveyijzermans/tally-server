import events from 'events';

/**
 * Array of eveny throttle states
 * 
 * @type       {boolean[]}
 */
events.EventEmitter.prototype._throttledEventCallbacks = [];
/**
 * Emit event only every x milliseconds
 *
 * @method     EventEmitter#throttledEmit
 *
 * @param      {number}            wait    The cooldown period in ms
 * @param      {string}            event   The event name
 * @param      {string}            id      Identifier
 * @param      {Array}             args    The rest of the arguments
 */
events.EventEmitter.prototype.throttledEmit = function(wait, event, id, ...args)
{
  let key = event+id;
  if(this._throttledEventCallbacks[key] != true)
  {
    this._throttledEventCallbacks[key] = true;
    setTimeout(() => this._throttledEventCallbacks[key] = false, wait)
    this.emit.apply(this, [event].concat(args));
  } 
}

export default events;