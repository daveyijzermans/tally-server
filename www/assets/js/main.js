$(function()
{
  var socket = null,
      servers = null,
      $servers = $('#servers'),
      tallies = null,
      $tallies = $('#tallies'),
      $users = $('#users');

  var connect = function(p, cb) {
    socket = io({
      query: {
        password: p
      }
    });
    socket.on('authenticated', function()
    {
      cb(null);

      $('#statusText').html('<i class="fas fa-check-circle"></i> Connected');
      socket.emit('admin.update');
    });
    socket.on('admin.status.servers', function(data)
    {
      if(JSON.stringify(data) === JSON.stringify(servers))
        return false;
      servers = data;

      $servers.empty();
      var $tpl = $('#tplServer');
      $.each(servers, function(id, server)
      {
        var $li = $tpl.clone().attr('id', server.name).show().appendTo($servers);
        var iClass = server.connected ? 'fa-check-circle' : 'fa-times-circle fa-beat';
        $li.find('.fas').addClass(iClass);
        var $dropdown = $li.find('.dropdown-menu').attr('aria-labelledby', server.name);

        var $a = $li.find('a.nav-link').append(' ' + server.name);
        $('<a class="dropdown-item disabled" href="#"></a>')
          .text('Type: ' + server.type)
          .appendTo($dropdown);
        $('<a class="dropdown-item disabled" href="#"></a>')
          .text('Hostname: ' + server.hostname)
          .appendTo($dropdown);

        var wol = typeof server.wol == 'string';
        if(wol || server.type == 'netgear')
          $dropdown.append('<div class="dropdown-divider"></div><h6 class="dropdown-header">ACTIONS</h6>');
        if(wol)
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="wake">Wake</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
        if(wol || server.type == 'netgear')
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
        if(wol)
        {
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
            .attr('data-param', server.name)
            .appendTo($dropdown);
        }
      });
    });
    socket.on('admin.status.tallies', function(data)
    {
      if(JSON.stringify(data) === JSON.stringify(tallies))
        return false;
      tallies = data;
      var max = tallies['_combined'].length;
      var colors = ['#333', '#ff0000', '#00ff00'];

      $tallies.empty();
      var $tpl = $('#tplTally');
      $.each(tallies, function(host, result)
      {
        var $li = $tpl.clone().attr('id','').show().appendTo($tallies);
        var name = host == '_combined' ? 'Combined result' : host;
        var $a = $li.find('a.nav-link').html(name + '<br/>');

        for (var i = 0; i < max; i++)
        {
          var $s = $('<span>&bull;</span>').appendTo($a);
          c = typeof result == 'string' ? colors[result[i]] : '#ccc'
          $s.css({ color: c });
        }
      });
      updateUserTallies(tallies._combined);
    });
    socket.on('admin.users.list', function(users)
    {
      $users.empty();
      var $tpl = $('#tplUser');
      if(users.length == 0)
        $users.html('<p><em>No users are connected.</em></p>');
      $.each(users, function(id, user)
      {
        var $u = $tpl.clone().attr('id', user.username).show().tooltip({
          title: user.name,
        }).appendTo($users);
        $u.find('.user').attr('data-camnumber', user.camNumber);
        $u.find('h6').append(' ' + user.username);
        $u.find('.camNumber').append(' ' + user.camNumber);
        var $dropdown = $u.find('.dropdown-menu').attr('aria-labelledby', user.username);
        $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#editUserModal">Edit</a>')
            .data('user', user)
            .appendTo($dropdown);
        $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
            .attr('data-param', user.username)
            .appendTo($dropdown);
        $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
            .attr('data-param', user.username)
            .appendTo($dropdown);
      });
      updateUserTallies(tallies._combined);
    });
    socket.on('disconnect', function()
    {
      $('#statusText').html('<i class="fas fa-times-circle fa-beat"></i> Disconnected');
      cb(new Error('Could not connect to socket'));
    });
  }

  updateUserTallies = function(t)
  {
    var t = t.split('');
    for (var i = 0; i < t.length; i++) {
      var val = t[i];
      $users.find('[data-camnumber="' + (i + 1) + '"]')
        .toggleClass('user-program', val == '1')
        .toggleClass('user-preview', val == '2');
    }
  }

  var loginCallback = function(err)
  {
    if(err)
    {
      $txtPassword.addClass('is-invalid');
      if($loginModal.hasClass('show'))
      {
        $loginModal.trigger('shown.bs.modal');
      }
      else
      {
        $loginModal.modal('show');
      }
      return false;
    }
    $loginModal.modal('hide');
  }

  // Button event handlers
  var loginHandler = function(event)
  {
    $frmLogin.off('submit', loginHandler);
    $btnLogin.off('click', loginHandler);
    var p = $.md5($txtPassword.val());
    connect(p, loginCallback);
    event.preventDefault();
  };

  // Bind handlers to buttons and events
  var $loginModal = $('#loginModal').on('shown.bs.modal', function ()
  {
    $txtPassword.focus().select();
    $frmLogin.one('submit', loginHandler);
    $btnLogin.one('click', loginHandler);
  }).on('hidden.bs.modal', function ()
  {
    $loginModal.modal('dispose');
  });
  var $txtPassword = $loginModal.find('#txtPassword');
  var $frmLogin = $loginModal.find('form');
  var $btnLogin = $loginModal.find('#btnLogin');

  var urlHash = location.hash.match(new RegExp('password=([^&]*)'));
  if(urlHash)
  {
    var p = $.md5(urlHash[1]);
    connect(p, loginCallback);
  }
  else
    $loginModal.modal();
  var $actionModal = $('#actionModal').on('show.bs.modal', function(event)
  {
    var rel = $(event.relatedTarget);
    var cmd = rel.data('command');
    var param = rel.data('param');
    var $t = $actionModal.find('.modal-body');
    switch(cmd)
    {
      case 'restart':
        $t.text('Are you sure you want to restart the administration server?');
        break;
      case 'reboot':
        $t.text('Are you sure you want to reboot ' + param + '?');
        break;
      case 'shutdown':
        $t.text('Are you sure you want to shutdown ' + param + '? You will need to use Wake-On-LAN or power cycle to get it back online.');
        break;
      case 'wake':
        $t.text('Are you sure you want to wake-up ' + param + '?');
        break;
      case 'rebootUsers':
        $t.text('Are you sure you want to reboot all intercom users? Clients will disconnect and will take approximately 30 seconds to get back online.');
        break;
      case 'updateUsers':
        $t.text('Are you sure you want to update all intercom users? Clients will disconnect and will take approximately 1 minute to get back online.');
        break;
      case 'shutdownUsers':
        $t.text('Are you sure you want to shutdown the server? You will need to use Wake-On-LAN or power cycle the PoE switch to get them back online.');
        break;
      case 'shutdownAll':
        $t.text('Are you sure you want to shutdown everything? You will need to use Wake-On-LAN or power cycle to get everything back online.');
        break;
      default:
        console.error('Invalid command');
        return false;
    }

    var $btn = $(this).find('.btn-danger').focus().off('click').one('click', function()
    {
      socket.emit('admin.' + cmd, param);
      $actionModal.modal('hide');
    });
  }).on('shown.bs.modal', function()
  {
    $(this).find('.btn-danger').focus()
  }).on('hide.bs.modal', function()
  {
    $(this).find('.btn-danger').off('click');
  });
  var $editUserModal = $('#editUserModal').on('show.bs.modal', function(event)
  {
    var rel = $(event.relatedTarget);
    var user = rel.data('user');
    var $name = $editUserModal.find('#user-name').focus().val(user.name);
    var $camNumber = $editUserModal.find('#user-camnumber').val(user.camNumber);

    var $btn = $(this).find('.btn-primary').off('click');
    $btn.on('click', function()
    {
      socket.emit('admin.set.user', {
        username: user.username,
        name: $name.val(),
        camNumber: $camNumber.val()
      }, (err) =>
        {
          if (err)
          {
            $camNumber.addClass('is-invalid');
            return err;
          }
          $editUserModal.modal('hide');
        });
    });
  }).on('shown.bs.modal', function()
  {
    $editUserModal.find('#user-name').focus()
  }).on('hide.bs.modal', function()
  {
    $(this).find('#user-camnumber').removeClass('is-invalid');
    $(this).find('.btn-primary').off('click');
  });
});