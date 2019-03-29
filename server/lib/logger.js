import EventEmitter from 'events';
import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

const styles = [
  ['bgBlack'],
  ['bgRed'],
  ['bgGreen'],
  ['bgYellow'],
  ['bgBlue'],
  ['bgMagenta'],
  ['bgCyan'],
  ['bgWhite', 'black'],
  ['bgBlackBright'],
  ['bgRedBright'],
  ['bgGreenBright', 'black'],
  ['bgYellowBright', 'black'],
  ['bgBlueBright'],
  ['bgMagentaBright'],
  ['bgCyanBright', 'black'],
  ['bgWhiteBright', 'black']
];

/**
 * Logging class
 *
 * @extends    EventEmitter
 * @memberof   Backend
 */
class Logger extends EventEmitter
{
  _availableLevels = ['trace', 'debug', 'info', 'warn', 'error']
  levels = ['debug', 'info', 'warn', 'error']
  _styleMap = {}
  _i = 0;
  /**
   * Constructs the object and create logging level functions
   */
  constructor() 
  {
    super();
    this._availableLevels.forEach(m => this[m] = this._funcFactory(m));
  }
  /**
   * Gets the next style.
   * 
   * @method     Backend.Logger#_getNextStyle
   *
   * @return     {array}  The next style.
   */
  _getNextStyle = () =>
  {
    this._i = this._i >= styles.length - 1 ? 0 : this._i + 1;
    return styles[this._i];
  }
  /**
   * Create a logging function
   *
   * @method     Backend.Logger#_funcFactory
   *
   * @param      {string}  name    The method name
   * @return     {function}  Generated function
   */
  _funcFactory = (name) =>
  {
    return function()
    {
      if(this.levels.indexOf(name) == -1) return;
      let args = Array.from(arguments).map((a) => stripAnsi(a));
      let argsConsole = args.map((a) =>
      {
        if(typeof a == 'string')
        {
          a = a.replace(/\[(.*?)\]/gi, (match) =>
          {
            let style = this._styleMap[match] || (this._styleMap[match] = this._getNextStyle());
            return style.reduce((a, c) => a[c], chalk)(match);
          });
        }
        return a;
      });
      console[name].apply(console, argsConsole);
      this.emit.apply(this, [name].concat(args));
    }
  }
}

/**
 * Log with 'trace' level
 *
 * @method     Backend.Logger#trace
 *
 * @param      {...*}  [arguments]  Zero or more items to log.
 * 
 * @fires      Backend.Logger#event:trace
 */
/**
 * Log with 'debug' level
 *
 * @method     Backend.Logger#debug
 *
 * @param      {...*}  [arguments]  Zero or more items to log.
 * 
 * @fires      Backend.Logger#event:debug
 */
/**
 * Log with 'info' level
 *
 * @method     Backend.Logger#info
 *
 * @param      {...*}  [arguments]  Zero or more items to log.
 * 
 * @fires      Backend.Logger#event:info
 */
/**
 * Log with 'warn' level
 *
 * @method     Backend.Logger#warn
 *
 * @param      {...*}  [arguments]  Zero or more items to log.
 * 
 * @fires      Backend.Logger#event:warn
 */
/**
 * Log with 'error' level
 *
 * @method     Backend.Logger#error
 *
 * @param      {...*}  [arguments]  Zero or more items to log.
 * 
 * @fires      Backend.Logger#event:error
 */

/**
 * Send a trace message
 *
 * @event      Backend.Logger#event:trace
 * @param      {...*}  [arguments]  Zero or more items to log.
 */
/**
 * Send a debug message
 *
 * @event      Backend.Logger#event:debug
 * @param      {...*}  [arguments]  Zero or more items to log.
 */
/**
 * Send a info message
 *
 * @event      Backend.Logger#event:info
 * @param      {...*}  [arguments]  Zero or more items to log.
 */
/**
 * Send a warn message
 *
 * @event      Backend.Logger#event:warn
 * @param      {...*}  [arguments]  Zero or more items to log.
 */
/**
 * Send a error message
 *
 * @event      Backend.Logger#event:error
 * @param      {...*}  [arguments]  Zero or more items to log.
 */

export default new Logger();
