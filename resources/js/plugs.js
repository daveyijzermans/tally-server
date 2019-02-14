import $ from 'jquery';
import poof from './jquery-poof';
$.fn.poof = poof;

class Plugs
{
  constructor(opts)
  {
    Object.assign(this, opts);

    this.socket.on('admin.plugs.list', this._list);
    this.socket.on('admin.plugs.disconnect', this._disconnect);
    this.socket.on('disconnect', this._socketDisconnect);
  }
  _list = plugs =>
  {
    this.$list.find('.noresults').toggle(plugs.length == 0);

    $.each(plugs, (id, plug) =>
    {
      let $p = this.$list.find('[data-hostname="' + plug.hostname + '"]');
      if($p.length == 0)
      {
        $p = this.$tpl.clone().attr('id', '').attr('data-hostname', plug.hostname).show().appendTo(this.$list);
        $p.find('a.toggle').click(this._btnPlugToggle);
      }

      $p.find('.name').text(plug.name);
      $p.find('.description').text(plug.description);
      $p.find('.actions .fas')
        .removeClass('fa-circle-notch fa-spin')
        .addClass('fa-power-off')
        .toggleClass('text-success', plug.on == true)
        .toggleClass('text-danger', plug.on == false);
    });
  }
  _disconnect = hostname =>
  {
    let $plug = this.$list.find('[data-hostname="' + hostname + '"]');
    $plug.poof(true);
    this.$list.find('.noresults').toggle(this.$list.find('.plug-entry').length == 0);
  }
  _socketDisconnect = () =>
  {
    this.$list.find('.plug-entry').poof(true);
    this.$list.find('.noresults').toggle(true);
  }
  _btnPlugToggle = event =>
  {
    let $this = $(event.currentTarget);
    let hostname = $this.closest('.plug-entry').attr('data-hostname');
    $this.find('.fas')
      .removeClass('text-success text-danger fa-power-off')
      .addClass('fa-circle-notch fa-spin');
    this.socket.emit('admin.plug.toggle', hostname);
    event.preventDefault();
  }
  get $items() { return this.$list.find('.plug-entry') }
}

export default Plugs;