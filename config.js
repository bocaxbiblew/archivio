/**
 * Single source of truth for the backend URL.
 *
 * Previously the API base was hardcoded in three places (script.js,
 * login.html and admin_users.html), so pointing the site at a local backend
 * for testing meant editing three files and remembering to revert them.
 *
 * Now every page loads this file before its own scripts and reads
 * window.ARCHIVIO_API_BASE. To run against a local backend, either serve the
 * site from localhost (handled automatically below) or set
 * window.ARCHIVIO_API_BASE before this script loads.
 */
(function () {
  var PROD_API = 'https://api-archivio.duckdns.org/api';

  var host = window.location.hostname;
  var isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '' ||            // opened straight from the filesystem
    host.endsWith('.local');

  window.ARCHIVIO_API_BASE =
    window.ARCHIVIO_API_BASE || (isLocal ? 'http://localhost:3000/api' : PROD_API);
})();
