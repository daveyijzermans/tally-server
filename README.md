# tally-server

## Introduction

![](info.gif)The aim of this project is to connected video production equipment and servers together. It will connect to devices over an API, gather info and process that into an admin dashboard. In this dashboard a couple of additional features can be activated, like:

* Linking video mixers together, actions (like transitions and cuts) on a "master" will be mirrored on a "slave" system, even cross-devices (vMix -> ATEM)
* Controlling those simultaneously via a web interface, also if they are linked
* Sending tally information to clients via a websocket
* Matching camera inputs to users connected to a Mumble VOIP server to make an intercom system, with above mentioned tally information
* Waking and shutting down PCs and equipment
* Controlling TP-Link smart plugs
* Monitoring APC UPSs via SNMP
* Monitoring Huawei 4G dongles

## Get started

````
sudo npm i gulp-cli && \
git clone https://github.com/daveyijzermans/tally-server.git && cd tally-server && npm i && \
cp config/admin.example.json config/admin.json && \
cp config/servers.example.json config/servers.json && \
cp config/users.example.json config/users.json && \
cp client/config.example.json client/config.json && \
cp admin/scss/_vendor.scss.example admin/scss/_vendor.scss && \
nano config/admin.json config/servers.json config/users.json client/config.json
````

Edit the configuration files opened by the previous command. See a description of these files [here](CONFIGURATION.md).

Then, build and run the server.

``gulp build --prod && gulp  --prod``

Then pray it runs.

## Usage

See [here](USAGE.md)

## Documentation

Run ``gulp docs`` to generate code documentation.

## API

There is a simple web API exposed at the url ``/api``. Check out the [API docs](API.md) to see what it can do.

## Writing your own client

The admin page uses web sockets (with Socket.io) and a very basic authentication system. So it's possible to either write a node client that connects to the server, or use the HTTP API to perform specific functions from an embedded device or microcontroller. This would allow you to send information about your complete production system to any device, like Raspberry PI's, Arduino's etc. for controlling tally lights, record indicators, audio levels, camera operator names, video or audio routing information or labels, you name it.

Take a look at the Events section in the documentation to see which events you can subscribe to. Check out the 'client' folder for a simple client that connects to the server, subscribes to tally events and pushes that to an Arduino tally light. The source code for that is in the 'tallybox folder'.

I will try to document this more in the future!

## Testing

Since writing tests would require making models of the actual devices, it would take a lot of time. You're free to do so, but writing unit tests has never been my thing. So try it, and if it breaks, fix it!

## Credits

I use a couple of API's available from NPM. In addition I've used source code from available packages and modified them or implemented my own version based on the logic they contained.

https://github.com/daveyijzermans/node-applest-atem was forked to upgrade dependency versions
https://github.com/daveyijzermans/apc-ups-snmp was forked and changed to retrieve all values at once
https://github.com/lmginc/io-videohub was used for creating server/lib/videohub.js
https://github.com/vargaradu/Focusrite-Midi-Control was used for creating server/lib/focusrite.js
https://github.com/daveyijzermans/p4d-huawei-router was based on an NPM package of the same name.