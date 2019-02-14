import $ from 'jquery';
import EventEmitter from 'events';

let tallies = null;

class Tallies extends EventEmitter
{
  constructor(opts)
  {
    super();
    Object.assign(this, opts);

    this.socket.on('admin.status.tallies', data =>
    {
      if(JSON.stringify(data) === JSON.stringify(tallies))
        return false;
      tallies = data;
      let max = tallies._combined.length;
      let states = ['badge-secondary', 'badge-danger', 'badge-success'];

      this.$list.empty();
      $.each(tallies, (host, result) =>
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
      this.emit('updated', tallies._combined);
    });
  }
  getCombined()
  {
    return tallies._combined;
  }
}

export default Tallies;