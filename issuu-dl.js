#!/usr/bin/env node

var argv = require('yargs').argv;
var request = require('request');
var	cheerio = require('cheerio');
var shell = require('shelljs');
var	_ = require('underscore');

var window = {};
var magazines = [];

function fetch(url) {
	var magazine = {url: url};
	request(url, function (error, response, body) {
		if (!error) {
			var $ = cheerio.load(body);

			// Parse page for document data
			var data = eval($($('script').not('script[src]').get(1)).text());
			var doc = data.apiCache['/query|actionissuu.document.get_user_doc|documentusername' +
					data.documentData.ownerUsername+'|formatjson|name' +
					data.documentData.docname + '|verifystate'].document;

			magazine.document = doc;
			magazine = download(magazine);
		} else {
			console.log("We've encountered an error: " + error);
		}
	});
	return magazine;
}

function download(magazine) {
	console.log("Downloading " + magazine.document.title + "...");
	// console.log(magazine);

	var temp_dir = 'issuu-dl-temp';
	shell.mkdir('-p', temp_dir);
	shell.cd(temp_dir);

	_(magazine.document.pageCount).times(function(index) {
		index = index + 1;
		var url = 'http://image.issuu.com/' + magazine.document.documentId +
				'/jpg/page_' + index +'.jpg';

		// Todo: use node to do this instead:
		shell.exec('wget -c --quiet ' + url);
		process.stdout.write(index + '/' + magazine.document.pageCount + '\r');
	});

	make_pdf(magazine);
	shell.exec('rmdir ' + temp_dir);
	return magazine;
}

function make_pdf(magazine) {
	var filename = magazine.document.title + '.pdf';
	if (shell.exec('convert page_*.jpg "' + filename + '"').code !== 0) {
	  console.log('Error: PDF creation failed');
	} else {
		shell.rm('page_*.jpg');
	}
	shell.mv(filename, '../');
	shell.cd('..');
	return magazine;
}

var magazines_urls = argv._;
magazines = _.each(magazines_urls, fetch);
