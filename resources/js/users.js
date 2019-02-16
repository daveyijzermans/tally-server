import $ from 'jquery';
import poof from './jquery-poof';
import EditUserModal from './modal-edit-user';
$.fn.poof = poof;
import talkingIndicator from './jquery-talkingIndicator';
$.fn.talkingIndicator = talkingIndicator;
import EventEmitter from 'events';

class Users extends EventEmitter
{
  constructor(opts)
  {
    super()
    Object.assign(this, opts);

    this.on('tallies', this._updateUserTallies);

    this.socket.on('admin.user.disconnect', this._disconnect);
    this.socket.on('admin.users.list', this._list);
    this.$btnPopout.click(this._popout);

    /**
     * Create the edit user modal instance
     * @type {EditUserModal}
     */
    this.editUserModal = new EditUserModal({
      $modal: this.$modal,
      socket: this.socket
    });
  }
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
    this.emit('updated');
  }
  _disconnect = username =>
  {
    let $user = this.$list.find('[data-username="' + username + '"]');
    $user.poof(true);
    this.$list.find('.noresults').toggle(this.$list.find('.user-entry').length == 0);
  }
  _popout = event =>
  {
    window.open('/users_popout.html', 'users_popout', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=350,height=500');
    event.preventDefault();
  }
  get $items() { return this.$list.find('.user-entry') }
}

export default Users;