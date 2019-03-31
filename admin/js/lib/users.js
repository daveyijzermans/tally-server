import $ from 'jquery';
import poof from './jquery-poof';
import EditUserModal from './modal-edit-user';
$.fn.poof = poof;
import talkingIndicator from './jquery-talkingIndicator';
$.fn.talkingIndicator = talkingIndicator;
import EventEmitter from 'events';

/**
 * Class for users UI.
 *
 * @extends    EventEmitter
 * @memberof   Frontend.UI
 */
class Users extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('admin.user.disconnect', this._disconnect)
      .on('admin.users.list', this._list)
      .on('admin.config', this._configUpdate);
    /**
     * jQuery object of the modal container
     * 
     * @type       {jQuery}
     */
    this.$modal = opts.$modal;
    /**
     * Main container for this UI element
     * 
     * @type       {jQuery}
     */
    this.$list = opts.$list;
    /**
     * Template for an entry for this UI element. Will be cloned to make a new
     * entry and appended to $list
     *
     * @type       {jQuery}
     */
    this.$tpl = opts.$tpl;
    /**
     * Checkbox object
     *
     * @type       {jQuery}
     */
    this.$chkUpdateInput = opts.$chkUpdateInput;
    if(this.$chkUpdateInput)
      this.$chkUpdateInput.click(this._toggleUpdateInput);
    /**
     * User popout button
     * 
     * @type       {jQuery}
     */
    this.$btnPopout = opts.$btnPopout
    if(this.$btnPopout)
        this.$btnPopout.click(this._popout);
    /**
     * Edit user modal instance
     * 
     * @type       {Frontend.UI.EditUserModal}
     */
    this.editUserModal = new EditUserModal({
      $modal: this.$modal,
      socket: this.socket
    });
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Users#_list
   *
   * @param      {Backend.User[]}  users   Array of users
   * @listens    Socket#event:"admin.users.list"
   * @fires      Socket#event:"admin.mixer.command"
   */
  _list = users =>
  {
    this.$list.find('.noresults').toggle(users.length == 0);

    $.each(users, (id, user) =>
    {
      let $u = this.$list.find('.user-entry[data-username="' + user.username + '"]');
      let $dropdown = $u.find('.dropdown-menu');
      if($u.length == 0)
      {
        $u = this.$tpl.clone().attr('id', '').attr('data-username', user.username).addClass('user-entry')
          .show().appendTo(this.$list);
        $dropdown = $u.find('.dropdown-menu');
        $dropdown.attr('aria-labelledby', user.username);
        $dropdown.find('a').attr('data-param', user.username);
      }

      if(user.talking)
      {
        if(!$u.data('talkingTimer'))
        {
          let to = () =>
          {
            $u.talkingIndicator();
            $u.data('talkingTimer', setTimeout(to, 500));
          };
          to();
        }
      } else {
        clearTimeout($u.data('talkingTimer'));
        $u.data('talkingTimer', null);
      }

      $u.toggleClass('user-talking', user.talking);
      $u.attr('data-camnumber', user.camNumber);
      $u.find('.name').text(user.name);
      $u.find('.username').text(user.username);
      $u.find('.camNumber')
        .text(user.camNumber)
        .toggleClass('avatar-danger', user.status == 1 || user.status == 3)
        .toggleClass('avatar-success', user.status == 2)
        .toggleClass('avatar-secondary', user.status == 0)
        .off('click.switch')
        .one('click.switch', (event) =>
        {
          if(user.status == 1 || user.status == 3) return;
          let newState = user.status == 0 ? 2 : 1;
          this.socket.emit('admin.mixer.command', '*', 'switchInput', [user.camNumber, newState]);
          event.preventDefault();
        });
      $u.find('.channelName').text(user.channelName);
      $dropdown.find('.edit-user-modal').data('user', user);
    });
  }
  /**
   * Executed when a user disconnects. Remove the entry from the UI.
   *
   * @method     Frontend.UI.Users#_disconnect
   *
   * @param      {string}  username  The username
   * 
   * @listens    Socket#event:"admin.user.disconnect"
   */
  _disconnect = username =>
  {
    let $user = this.$list.find('.user-entry[data-username="' + username + '"]');
    $user.poof(true);
    this.$list.find('.noresults').toggle(this.$list.find('.user-entry').length == 0);
  }
  /**
   * Send command to server to toggle updateMixerNames option
   *
   * @param      {Object}  event   The event
   * @fires      Socket#event:"admin.config.toggle"
   */
  _toggleUpdateInput = (event) =>
  {
    event.preventDefault();
    this.socket.emit('admin.config.toggle', 'updateMixerNames')
  }
  /**
   * Open the intercom box in a seperate window
   *
   * @method     Frontend.UI.Users#_popout
   *
   * @param      {Object}  event   The event
   */
  _popout = event =>
  {
    let t = event.currentTarget.href;
    window.open(t, 'Users', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=350,height=500');
    event.preventDefault();
  }
  /**
   * Parse server config options
   *
   * @param      {Object}  config  The configuration
   * @listens    Socket#event:"admin.config"
   */
  _configUpdate = (config) =>
  {
    this.$chkUpdateInput.prop('checked', config.updateMixerNames);
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.user-entry') }
}

export default Users;