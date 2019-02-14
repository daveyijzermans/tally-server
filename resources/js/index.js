import $ from 'jquery';
import Cookies from 'js-cookie';
import Log from './log';
import Servers from './servers';
import Users from './users';
import Tallies from './tallies';
import Plugs from './plugs';
import LoginModal from './modal-login';
import ActionModal from './modal-action';
import AVSetup from './avsetup';
import poof from './jquery-poof';
$.fn.poof = poof;

/**
 * Create the socket client instance
 * This will be resused indefinitely
 * @type {Object}
 */
let socket = io({
  autoConnect: false
});

/**
 * Executed every time the socket authenticates correctly
 * @param  {string} password MD5 hashed password that was used for logging in
 */
let authenticated = function(password)
{
  socket.emit('admin.update');
  
  if(this.remember)
    Cookies.set('adminPass', password, { expires: 7 });

  $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');
}

/**
 * Executed every time the socket disconnects or
 * authentication is incorrect
 */
let loginError = () =>
{
  $('#serverStatus').html('<i class="fas fa-times-circle faa-beat"></i> Disconnected');
}

/**
 * Create the login modal instance
 * @type {LoginModal}
 */
const loginModal = new LoginModal({
  $modal: $('#loginModal'),
  socket: socket
}).on('authenticated', authenticated)
  .on('error', loginError);

/**
 * Get stored password from cookie and attempt a login
 * if it exists. Else show the login modal
 */
let storedPassword = Cookies.get('adminPass');
if(storedPassword)
{
  loginModal.connect(storedPassword);
} else {
  loginModal.$modal.modal();
}

/**
 * Executed when tally info is updated
 * @param  {Object} tallies Tally information
 */
let talliesUpdated = (tallies) => 
{
  users.emit('tallies', tallies._combined);
}

/**
 * Create tallies class instance
 * @type {Tallies}
 */
const tallies = new Tallies({
  $list: $('#tallies'),
  $tpl: $('#tplTally'),
  socket: socket
}).on('updated', talliesUpdated);

/**
 * Executed when user info is updated
 */
let usersUpdated = () => 
{
  users.emit('tallies', tallies.combined);
}

/**
 * Create users class instance
 * @type {Users}
 */
const users = new Users({
  $list: $('#users'),
  $btnPopout: $('#usersPopout'),
  $tpl: $('#tplUser'),
  $modal: $('#editUserModal'),
  socket: socket
}).on('updated', usersUpdated);

/**
 * Create servers class instance
 * @type {Servers}
 */
const servers = new Servers({
  $list: $('#servers'),
  $tpl: $('#tplServer'),
  socket: socket
});

/**
 * Create smartplugs class instance
 * @type {Plugs}
 */
const plugs = new Plugs({
  $list: $('#plugs'),
  $tpl: $('#tplPlug'),
  socket: socket
});

/**
 * Create logging class instance
 * @type {Log}
 */
const log = new Log({
  $list: $('#log'),
  socket: socket
});

/**
 * Create the action modal instance
 * @type {ActionModal}
 */
const actionModal = new ActionModal({
  $modal: $('#actionModal'),
  socket: socket
}).on('command.logout', () => Cookies.remove('adminPass'));

/**
 * Create the AV setup instance
 * @type {AVSetup}
 */
const avSetup = new AVSetup({
  $sources: $('.avSource'),
  $targets: $('.avTarget')
});
