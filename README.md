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

## Writing your own node client

Is possible

## Testing

Whats that?

## Credits

You know