import $ from 'jquery';
import 'bootstrap';

class Log
{
  constructor(opts)
  {
    Object.assign(this, opts);
    this.$dropdown = this.$list.find('.dropdown-menu');
    this.$icon = this.$list.find('.fa-bell');
    this.$badge = this.$list.find('.badge');
    this._animateTimeout = null;

    this.socket.on('admin.log', this._log);
    this.$list.on('show.bs.dropdown', this._dropdownShow);
    this.$list.on('shown.bs.dropdown', this._dropdownShown);
    this.$list.on('hide.bs.dropdown', this._dropdownHide);
  }
  _log = msg =>
  {
    this.$dropdown.prepend($('<p class="text-sm log-entry"></p>').text(msg));
    this.$list.find('a').dropdown('update');
    if(this.$dropdown.is(':hidden'))
    {
      this._startRing();
      this.$badge.text((parseInt(this.$badge.text(), 10)||0)+1);
    }
    this.$list.find('.dropdown-menu p:gt(99)').remove();
    this.$list.find('.dropdown-menu p:gt(29).read').remove();
  }
  _dropdownShow = event =>
  {
    $(event.relatedTarget).dropdown('update');
    this._stopRing();
    this.$badge.text('');
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
  _startRing = () =>
  {
      this._stopRing();
      this.$icon.addClass('faa-ring');
      if(this._animateTimeout) clearTimeout(this._animateTimeout);
      this._animateTimeout = setTimeout(this._stopRing, 2000);
  }
  _stopRing = () =>
  {
    if(this._animateTimeout) clearTimeout(this._animateTimeout);
    this.$icon.removeClass('faa-ring');
  }
  get $items() { return this.$list.find('.log-entry') }
}

export default Log;