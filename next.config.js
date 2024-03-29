const withPlugins = require('next-compose-plugins');
const withCSS = require('@zeit/next-css');
const withOffline = require('next-offline');

module.exports = withPlugins([withCSS, withOffline]);
