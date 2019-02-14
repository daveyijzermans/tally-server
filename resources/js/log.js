import $ from 'jquery';
import 'bootstrap';

class Log
{
  constructor(opts)
  {
    Object.assign(this, opts);

    this.socket.on('admin.log', this._log);
    this.$list.on('show.bs.dropdown', this._dropdownShow);
    this.$list.on('shown.bs.dropdown', this._dropdownShown);
    this.$list.on('hide.bs.dropdown', this._dropdownHide);
  }
  _log = (msg) =>
  {
    let $dropdown = this.$list.find('.dropdown-menu')
      .prepend($('<p class="text-sm"></p>').text(msg));
    this.$list.find('a').dropdown('update');
    let $badge = this.$list.find('.badge');
    if($dropdown.is(':hidden'))
      $badge.text((parseInt($badge.text(), 10)||0)+1);
    this.$list.find('.dropdown-menu p:gt(99)').remove();
    this.$list.find('.dropdown-menu p:gt(29).read').remove();
  }
  _dropdownShow = event =>
  {
    $(event.relatedTarget).dropdown('update');
    let $badge = this.$list.find('.badge').text('');
    this.$list.find('.dropdown-menu p:gt(29).read').remove();
  }
  _dropdownShown = event =>
  {
    $(event.relatedTarget).dropdown('update');
  }
  _dropdownHide = event =>
  {
    this.$list.find('.dropdown-menu p:gt(29).read').remove();
    this.$list.find('.dropdown-menu p').addClass('read');
  }
}

export default Log;