# Usage

## Rationale

The server tries to connect to servers defined in `config/servers.json`. So you need to make a copy of the example file and fill in your devices with the correct parameters. If the connection can not be made the server will keep trying and notify in the console and web admin if it succeeds.

The server will retrieve and then continue to either poll for or subscribe to changes in the device state and save them in objects. These objects can emit node events following a certain convention that other servers can subscribe to and translate to actions specific to that device. In this way an ATEM could for example be "linked" to a vMix software switcher instance, or a Blackmagic Smarthub router could be linked to a different brand router, even though they use different protocols. In other words the server is a translation layer between device APIs.

## Configuration

See a description of these files [here](CONFIGURATION.md).

## Web admin

The web admin can be accessed on the host on port 8080. It will ask for a password, which is set in `config/admin.json`. This password is md5 hashed. The dashboard consists of the following sections.

### Intercom

This is a list of users that are successfully connected to the server via a websocket. Only "normal" users appear here (not admin connections, they also connect through websockets). These users should connect with a query parameter `username` and this username should appear in `config/users.json`, otherwise the server rejects them.

In the json file, a nice `name` can be set as well as a `camNumber`. The will be subscribed to changes in tally state for this camera number. This way a tally client can be realized. See tally-client section.

If a user is connected the name and username will appear in the list, alongside their camera number and tally light. You can click the tally light to switch to its assigned camera input on all mixers. You can click the three dots next to a user to send a remote update, restart or shutdown command.

You can pop out this section into a popup window by clicking the icon in the top right on the section. 

### Tallies

This panel displays the tally information collected from all able servers. Currently `atem` and `vmix` type servers give out tally information. Also displayed is a "Combined result" section. These tally states are combined from all servers, with priority given first to state 3 (program and preview at the same time), then state 1 (program), then state 2 (preview) and then state 0 (no light or default/white).

This way, camera operators can be on program on one switcher or the other, and their tally light is still in the program state (program state is more important than preview state)

### Smart plugs

I use TP-Link smart plugs to control the power to some devices, so I added this section to be able to toggle these on and off, rather than having to grab my phone everytime. This feature is also currently implemented in the [web API](API.md) so I could toggle smart plugs with a simple CURL command/Windows shortcut.

### Connections

This table shows the connection state to all the servers. In addition a cog icon appears if there are actions to perform on that server such as sending a Wake-On-Lan packet, remote shutdown, or linking mixers and other devices together. Some types of servers serve a similar kind of function. These are defined as "routers" and "mixers".

### Routers

Routers are displayed in the slide-out panel which is toggled with the floating arrow button in the top left. It shows the output number on the left and a select box with the currently assigned input. In itself this is not a special feature but controlling routers is essential to the "master plan" described [here](FUTURE.md).

### Mixers

In the "Tallies" section click the link "combined mixer". This will open a popup with a video switcher interface and audio mixer interface. From here you can control one or more mixers. If a mixer is linked to another, its controls will not work, but you will see the controls changing if the master changes.

### UPS status

If configured, a battery icon will appear in the top right of the navigation bar with UPS information. The number in the badge shows the runtime in minutes. The icon is flashing if the UPS is run on battery. Click on the icon to show more statistics.

### 4G Dongle status

If configured, a signal indicator icon will appear in the top right of the navigation bar with 4G dongle information. The text in the badge shows the currently connected to network. Click on the icon to show more statistics.

### Notifications

There is a bell icon in the top right navigation bar that animated if there is a notification. Click the icon to show a dropdown with latest messages. Messages that appear here are connect and disconnect messages and admin initiated action notifications. Debug and API messages appear only in the console log.

### Server info

To the far right in the navigation bar there is room for your logo (image path is `admin/externals/index/logo-sm.png`) and host name (set in `config/admin/json`, just for display purposes). Click this section and a dropdown appears with server uptime, a logout button to logout this admin session and remove the password cookie (if set). "Restart server" actually exits the server so you need some tool like [forever](https://github.com/foreverjs/forever) to automatically restart it. "Shutdown everything" will send a shutdown command (using the `net rpc shutdown` command on Unix, using a timer of 30 seconds) to Windows PCs. It will also emit a `shutdown` event to connected websockets to instruct them to shutdown. Then the system that is running the server will be scheduled for shutdown in 1 minute.