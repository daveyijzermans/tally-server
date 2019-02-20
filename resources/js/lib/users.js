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
     * jQuery object of the modal container
     * 
     * @type       {jQuery}
     */
    this.$modal = opts.$modal;
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('admin.user.disconnect', this._disconnect)
      .on('admin.users.list', this._list);
    /**
     * User popout button
     * 
     * @type       {jQuery}
     */
    this.$btnPopout = opts.$btnPopout
      .click(this._popout);

    /**
     * Update users' tally information when it it received.
     *
     * @event      Frontend.UI.Users#event:tallies
     * @param      {number[]}  tallies  The combined tally information
     */
    this.on('tallies', this._updateUserTallies);

    /**
     * Edit user modal instance
     * @type       {Frontend.UI.EditUserModal}
     */
    this.editUserModal = new EditUserModal({
      $modal: this.$modal,
      socket: this.socket
    });
  }
  /**
   * Executed when tally information is updated, primarily by the Tallies class
   *
   * @method     Frontend.UI.Users#_updateUserTallies
   *
   * @param      {number[]}  tallies  The combined tally information
   */
  _updateUserTallies = tallies =>
  {
    this.$list.find('.user-entry').each((i, el) =>
    {
      let $el = $(el);
      let n = $el.attr('data-camnumber');
      let val = tallies[n - 1];
      $el.find('.avatar')
        .toggleClass('avatar-danger', val == '1')
        .toggleClass('avatar-success', val == '2')
        .toggleClass('avatar-secondary', val == '0');
    });
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Users#_list
   *
   * @param      {Backend.User[]}  users   Array of users
   * @fires      Frontend.UI.Users#event:updated
   */
  _list = users =>
  {
    this.$list.find('.noresults').toggle(users.length == 0);

    $.each(users, (id, user) =>
    {
      let $u = this.$list.find('[data-username="' + user.username + '"]');
      let $dropdown = $u.find('.dropdown-menu');
      if($u.length == 0)
      {
        $u = this.$tpl.clone().attr('id', '').attr('data-username', user.username).show().appendTo(this.$list);
        $dropdown = $u.find('.dropdown-menu');
        $dropdown.attr('aria-labelledby', user.username);
        $('<a class="dropdown-item edit-user-modal" href="#" data-toggle="modal" data-target="#editUserModal">Edit</a>')
            .appendTo($dropdown);
        $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
            .attr('data-param', user.username)
            .appendTo($dropdown);
        $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
            .attr('data-param', user.username)
            .appendTo($dropdown);
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
      $u.find('.camNumber').text(user.camNumber);
      $u.find('.channelName').text(user.channelName);
      $dropdown.find('.edit-user-modal').data('user', user);
    });
    /**
     * Let listeners know that user information was updated.
     *
     * @event      Frontend.UI.Users#event:updated
     */
    this.emit('updated');
  }
  /**
   * Executed when a user disconnects. Remove the entry from the UI.
   *
   * @method     Frontend.UI.Users#_disconnect
   *
   * @param      {string}  username  The username
   */
  _disconnect = username =>
  {
    let $user = this.$list.find('[data-username="' + username + '"]');
    $user.poof(true);
    this.$list.find('.noresults').toggle(this.$list.find('.user-entry').length == 0);
  }
  /**
   * Open the intercom box in a seperate window
   *
   * @param      {Object}  event   The event
   *
   * @method     Frontend.UI.Users#_popout
   */
  _popout = event =>
  {
    window.open('/users_popout.html', 'users_popout', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=350,height=500');
    event.preventDefault();
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.user-entry') }
}

export default Users;