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
    let $l = this.$tpl.clone().attr('id', '').show().prependTo(this.$dropdown);
    let date = new Date().toLocaleTimeString('en-US', {
      hour12: false, 
      hour: 'numeric', 
      minute: 'numeric', 
      second: 'numeric'
    });
    $l.find('p').text(msg);
    $l.find('.text-secondary').text(date);
    this.$list.find('a').dropdown('update');
    if(this.$dropdown.is(':hidden'))
    {
      this._startRing();
      this.$badge.text((parseInt(this.$badge.text(), 10)||0)+1);
    }
    this.$dropdown.find('.log-entry:gt(99)').remove();
    this.$dropdown.find('.log-entry:gt(16).read').remove();
  }
  _dropdownShow = event =>
  {
    $(event.relatedTarget).dropdown('update');
    this._stopRing();
    this.$badge.text('');
    this.$dropdown.find('.log-entry:gt(16).read').remove();
  }
  _dropdownShown = event =>
  {
    $(event.relatedTarget).dropdown('update');
  }
  _dropdownHide = event =>
  {
    this.$dropdown.find('.log-entry:gt(16).read').remove();
    this.$dropdown.find('.log-entry').addClass('read').removeClass('event-column-success');
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
  get $items() { return this.$dropdown.find('.log-entry') }
}

export default Log;