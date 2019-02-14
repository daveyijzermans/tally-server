import $ from 'jquery';
import Cookies from 'js-cookie';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'bootstrap';
import Log from './log';
import Servers from './servers';
import Users from './users';
import Tallies from './tallies';
import Plugs from './plugs';
import LoginModal from './modal-login';
import ActionModal from './modal-action';
import EditUserModal from './modal-edit-user';
import { animatePuff } from './utils';

let socket = io({
  autoConnect: false
});

const $avSources = $('.avSource'),
      $avTargets = $('.avTarget')






const loginModal = new LoginModal({
  $modal: $('#loginModal'),
  socket: socket
}).on('authenticated', (password) =>
{
  socket.emit('admin.update');
  
  if($('#chkRemember').is(':checked'))
    Cookies.set('adminPass', password, { expires: 7 });

  $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');

  loginModal.$modal.modal('hide');
}).on('error', () =>
{
  $('#serverStatus').html('<i class="fas fa-times-circle fa-beat"></i> Disconnected');

  animatePuff($('.plug-entry'), true);
});

let storedPassword = Cookies.get('adminPass');
if(storedPassword)
{
  loginModal.connect(storedPassword);
} else {
  loginModal.$modal.modal();
}

const tallies = new Tallies({
  $list: $('#tallies'),
  $tpl: $('#tplTally'),
  socket: socket
});

const users = new Users({
  $list: $('#users'),
  $tpl: $('#tplUser'),
  socket: socket,
  tallies: tallies
});

const servers = new Servers({
  $list: $('#servers'),
  $tpl: $('#tplServer'),
  socket: socket
});

const plugs = new Plugs({
  $list: $('#plugs'),
  $tpl: $('#tplPlug'),
  socket: socket
});

const log = new Log({
  $list: $('#log'),
  socket: socket
});

const actionModal = new ActionModal({
  $modal: $('#actionModal'),
  socket: socket
});

const editUserModal = new EditUserModal({
  $modal: $('#editUserModal'),
  socket: socket
});





$avSources.draggable({
  cursor: 'move',
  revert: true
});
$avTargets.droppable({
  drop: function(event, ui)
  {
    let $target = $(this);
    let $source = ui.draggable;
    console.log($source, $target);
  }
});

