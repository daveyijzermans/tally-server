import 'spoken';
import { EventEmitter } from 'events';

class Voice extends EventEmitter
{
  _command = '';
  _input = 0;
  continuous = true;
  _cooldownTimer = 0;
  static _numbers = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];

  constructor(opts)
  {
    super(opts);
    spoken.listen.on.end(this._onEnd);
    spoken.listen.on.error(this._onEnd);
    spoken.listen.on.partial(this._parseLine);
    this.start();
  }

  _parseLine = line =>
  {
    /*
     * To lower case, and replace written numbers to digits
     */
    line = line.toLowerCase();
    let re = new RegExp(Voice._numbers.join("|"),"gi");
    line = line.replace(re, (m) => Voice._numbers.indexOf(m));

    /*
     * Parse each word, looking for numbers and commands
     */
    line.split(' ').forEach((word) =>
    {
      word = parseInt(word) || word;

      if(typeof word == 'number')
      {
        if(this._input == word) return;
        console.log(this._command, word);
        this.stop();
        this.start(true);
        
        this._command = 'cut';
        this._input = 0;
      }
      switch(word)
      {
        case 'attentie':
          this._command = 'preview';
          break;
        case 'cross':
        case 'fade':
          this._command = 'fade'
          break;
      }
    });

    clearTimeout(this._cooldownTimer);
    this._cooldownTimer = setTimeout(() => { this._command = 'cut'; this._input = 0 }, 2000);
  }
 
  start = (cont = true) =>
  { 
    this.continuous = cont !== false;
    spoken.listen().then(this._parseLine).catch(err => true);
  }
   
  _onEnd = (event) =>
  {
    if(this.continuous)
      spoken.delay(300).then(this.start);
  }
   
  stop = () =>
  {
    this.continuous = false;
    spoken.listen.stop();
  }
}

const v = new Voice();
let command = 'cut';
v.on('line', (line) =>
{
  if(typeof line == 'number')
  {
    console.log(command, line);
    command = 'cut';
  }
  switch(line)
  {
    case 'attentie':
      command = 'preview';
      break;
    case 'cross':
    case 'fade':
      command = 'fade'
      break;
  }
});