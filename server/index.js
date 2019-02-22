/**
 * All code concerning the backend server
 *
 * @namespace        Backend
 */

import Application from './lib/application';
import path from 'path';

/**
 * Backend server application
 *
 * @type       {Backend.Application}
 * @memberof   Backend
 */
let app = new Application({
  paths: {
    admin: path.resolve(__dirname, '../config/admin.json'),
    servers: path.resolve(__dirname, '../config/servers.json'),
    users: path.resolve(__dirname, '../config/users.json')
  }
});