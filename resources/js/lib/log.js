import $ from 'jquery';
import 'bootstrap';

/**
 * Class for updating the log in the navbar
 *
 * @memberof   Frontend.UI
 */
class Log
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {

    this.$list = opts.$list
      .on('show.bs.dropdown', this._dropdownShow)
      .on('shown.bs.dropdown', this._dropdownShown)
      .on('hide.bs.dropdown', this._dropdownHide);

    this.$tpl = opts.$tpl;

    this.socket = opts.socket
      .on('admin.log', this._log);
    /**
     * Dropdown menu
     * 
     * @type       {jQuery}
     */
    this.$dropdown = this.$list.find('.dropdown-menu');
    /**
     * Log bell icon in navbar
     * 
     * @type       {jQuery}
     */
    this.$icon = this.$list.find('.fa-bell');
    /**
     * Badge in bell icon
     * 
     * @type       {jQuery}
     */
    this.$badge = this.$list.find('.badge');
    /**
     * Timer id for the bell animation
     * 
     * @type       {null|number}
     */
    this._animateTimeout = null;
  }
  /**
   * Add a log message to the log list
   *
   * @param      {string}  msg     The message
   */
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
  /**
   * Executed when the dropdown will be shown.
   *
   * @param      {Object}  event   The event
   */
  _dropdownShow = event =>
  {
    $(event.relatedTarget).dropdown('update');
    this._stopRing();
    this.$badge.text('');
    this.$dropdown.find('.log-entry:gt(16).read').remove();
  }
  /**
   * Executed when the dropdown is shown.
   *
   * @param      {Object}  event   The event
   */
  _dropdownShown = event =>
  {
    $(event.relatedTarget).dropdown('update');
  }
  /**
   * Executes when the dropdown will be hidden.
   *
   * @param      {Object}  event   The event
   */
  _dropdownHide = event =>
  {
    this.$dropdown.find('.log-entry:gt(16).read').remove();
    this.$dropdown.find('.log-entry').addClass('read').removeClass('event-column-success');
  }
  /**
   * Starts a ring animation on the bell icon.
   */
  _startRing = () =>
  {
      this._stopRing();
      // Give the DOM a bit of time to update
      setTimeout(() =>
      {
        this.$icon.addClass('faa-ring');
        if(this._animateTimeout) clearTimeout(this._animateTimeout);
        this._animateTimeout = setTimeout(this._stopRing, 2000);
      }, 10);
  }
  /**
   * Stop the ring animation on the bell icon.
   */
  _stopRing = () =>
  {
    if(this._animateTimeout) clearTimeout(this._animateTimeout);
    this.$icon.removeClass('faa-ring');
  }
  /**
   * Get all log entries in the list
   *
   * @type       {jQuery}
   */
  get $items() { return this.$dropdown.find('.log-entry') }
}

export default Log;