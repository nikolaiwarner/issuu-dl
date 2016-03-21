#!/usr/bin/env node

var argv = require('yargs').argv;
var request = require('request');
var cheerio = require('cheerio');
var shell = require('shelljs');
var _ = require('underscore');

var window = {};
var magazines = [];

function fetch(url) {
  var magazine = {url: url};
  request(url, function (error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);

      // Parse page for document data
      var data = eval($($('script').not('script[src]').get(2)).text());
      var doc = data.apiCache['/query|actionissuu.document.get_user_doc|documentusername' +
          data.documentData.ownerUsername+'|formatjson|name' +
          data.documentData.docname + '|verifystate'].document;

      magazine.document = doc;
      magazine = download(magazine);
    } else {
      console.log("Error: Failed to fetch document. " + error);
      process.exit(1);
    }
  });
  return magazine;
}

function download(magazine) {
  console.log("Downloading " + magazine.document.title + "...");
  magazine.safe_title = magazine.document.title.replace(/[^\w_]/gi,'-');

  var temp_dir = magazine.safe_title + '-temp';
  shell.mkdir('-p', temp_dir);
  shell.cd(temp_dir);

  _(magazine.document.pageCount).times(function(index) {
    index = index + 1;
    var url = 'http://image.issuu.com/' + magazine.document.documentId +
        '/jpg/page_' + index +'.jpg';
    if (shell.exec('wget -c --quiet ' + url).code !== 0) {
      console.log('Error: Failed to download at page ' + index);
      process.exit(1);
    }
    process.stdout.write(index + '/' + magazine.document.pageCount + '\r');
  });

  magazine = make_pdf(magazine);
  shell.exec('rmdir ' + temp_dir);
  return magazine;
}

function make_pdf(magazine) {
  var filename =  magazine.safe_title + '.pdf';
  if (shell.exec('convert page_*.jpg "' + filename + '"').code !== 0) {
    console.log('Error: PDF creation failed');
    process.exit(1);
  }
  shell.rm('page_*.jpg');
  shell.mv(filename, '../');
  shell.cd('..');
  return magazine;
}

var magazines_urls = argv._;
magazines = _.each(magazines_urls, fetch);
