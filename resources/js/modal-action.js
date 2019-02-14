import $ from 'jquery';
import Cookies from 'js-cookie';

class ActionModal
{
  constructor(opts)
  {
    Object.assign(this, opts);
    this.$btn = this.$modal.find('.btn-danger');
    this.$text = this.$modal.find('.modal-body');

    this.$modal.on('show.bs.modal', (event) =>
    {
      let rel = $(event.relatedTarget);
      let cmd = rel.data('command');
      let param = rel.data('param');

      switch(cmd)
      {
        case 'restart':
          this.$text.text('Are you sure you want to restart the administration server?');
          break;
        case 'reboot':
          this.$text.text('Are you sure you want to reboot ' + param + '?');
          break;
        case 'shutdown':
          this.$text.text('Are you sure you want to shutdown ' + param + '? You will need to use Wake-On-LAN or power cycle to get it back online.');
          break;
        case 'wake':
          this.$text.text('Are you sure you want to wake-up ' + param + '?');
          break;
        case 'rebootUsers':
          this.$text.text('Are you sure you want to reboot all intercom users? Clients will disconnect and will take approximately 30 seconds to get back online.');
          break;
        case 'updateUsers':
          this.$text.text('Are you sure you want to update all intercom users? Clients will disconnect and will take approximately 1 minute to get back online.');
          break;
        case 'shutdownUsers':
          this.$text.text('Are you sure you want to shutdown the server? You will need to use Wake-On-LAN or power cycle the PoE switch to get them back online.');
          break;
        case 'shutdownAll':
          this.$text.text('Are you sure you want to shutdown everything? You will need to use Wake-On-LAN or power cycle to get everything back online.');
          break;
        case 'logout':
          this.$text.text('Are you sure you want to logout of the administration page?');
          break;
        default:
          console.error('Invalid command');
          return false;
      }

      this.$btn.focus().off('click').one('click', () =>
      {
        if(cmd == 'logout')
        {
          Cookies.remove('adminPass');
        }
        this.socket.emit('admin.' + cmd, param);
        this.$modal.modal('hide');
      });
    }).on('shown.bs.modal', () =>
    {
      this.$btn.focus();
    }).on('hide.bs.modal', () =>
    {
      this.$btn.off('click');
    });
  }
}

export default ActionModal;