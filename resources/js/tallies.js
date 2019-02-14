import $ from 'jquery';
import EventEmitter from 'events';

class Tallies extends EventEmitter
{
  constructor(opts)
  {
    super();
    Object.assign(this, opts);
    this._tallies = null;

    this.socket.on('admin.status.tallies', this._list);
  }
  getCombined = () =>
  {
    return this._tallies._combined;
  }
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._tallies))
      return false;
    this._tallies = data;
    let max = this._tallies._combined.length;
    let states = ['badge-secondary', 'badge-danger', 'badge-success'];

    this.$list.empty();
    $.each(this._tallies, (host, result) =>
    {
      let $t = this.$tpl.clone().attr('id', '').attr('data-host', host).show().appendTo(this.$list);
      let name = host == '_combined' ? 'Combined result' : host;
      let $a = $t.find('b').text(name);

      let $indicators = $t.find('.tally-indicators');
      for (let i = 0; i < max; i++)
      {
        let state = typeof result == 'string' ? states[result[i]] : states[0];
        let $s = $('<span class="badge badge-pill"></span>')
          .text(i + 1)
          .addClass(state)
          .appendTo($indicators);
      }
    });

    let hostsOnline = this.$list.find('.tally-entry').length > 1;
    this.$list.siblings('.noresults').toggle(!hostsOnline);
    this.$list.find('.tally-entry').toggle(hostsOnline);
    this.emit('updated', this._tallies._combined);
  }
}

export default Tallies;