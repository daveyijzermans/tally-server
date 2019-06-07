import EventEmitter from './events-custom';
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

const availableLevels = ['trace', 'debug', 'info', 'warn', 'error'];

/**
 * Logging class
 *
 * @extends    EventEmitter
 * @memberof   Backend
 */
class Logger extends EventEmitter
{
  /**
   * Activated log levels
   * 
   * @type       {string[]}
   */
  static levels = [];

  static activeLoggers = [];

  static loggers = {};
  static _styleMap = {}
  static _i = 0;
  /**
   * Constructs the object and create logging level functions
   */
  constructor(name = 'root', setExclusive = true) 
  {
    super();

    this.name = name;
    availableLevels.forEach(m => this[m] = this._funcFactory(m));
    if(setExclusive === true)
      Logger.activeLoggers = [name];
    else Logger.activeLoggers.push(name);
  }

  getLogger = (name, setExclusive = false) =>
  {
    if(Logger.loggers[name]) return Logger.loggers[name];
    Logger.loggers[name] = new Logger(name, setExclusive);
    availableLevels.forEach(m => Logger.loggers[name].on(m, (...args) => 
      this.emit.apply(this, [m].concat(args))));
    return Logger.loggers[name];
  }

  setLevels = (levels) =>
  {
    Logger.levels = levels;
  }

  setActive = (active) =>
  {
    if(typeof active == 'string')
      Logger.activeLoggers = [active];
    else Logger.activeLoggers = active;
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
    Logger._i = Logger._i >= styles.length - 1 ? 0 : Logger._i + 1;
    return styles[Logger._i];
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
    return (...args) =>
    {
      if(Logger.levels.indexOf(name) == -1 || Logger.activeLoggers.indexOf(this.name) == -1) return;
      args = args.map((a) => stripAnsi(a));
      let argsConsole = args.map((a, i) =>
      {
        if(typeof a == 'string')
        {
          if(i == 0 && this.name)
            a = '[' + this.name + ']' + a;
          a = a.replace(/\[(.*?)\]/gi, (match) =>
          {
            let style = Logger._styleMap[match] || (Logger._styleMap[match] = this._getNextStyle());
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
