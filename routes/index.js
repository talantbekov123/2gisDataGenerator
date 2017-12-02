var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');
var parser = require('json-parser');
var json2csv = require('json2csv');
var fs = require('fs');
var utf8 = require('utf8');
var key = require('../key')()
/* GET home page. */
router.get('/', function(req, res, next) {
	var query = req.query.query
	if(query) {
		getNumberOfElements(query, function (err, numberOfItems) {
			var axilary = [];
			for(var i = 1; i <= numberOfItems; i++){
			    axilary.push(i);
			}
			// loop over each element and save as scv
			var fields = ['name', 'address', 'lat', 'lon'];
			var data = [];
			async.eachSeries(axilary, function iterator(index, callback) {
				getElement(query, index, function(err, element) {
					data.push(element)
					callback()
				});
			}, function done() {
				var csv = json2csv({ data: data, fields: fields });
				fs.writeFile('file.csv', csv, function(err) {
					if (err) throw err;
					res.attachment('file.csv');
					res.send(csv)
				});
			});
		})
	} else {
		res.render('index');
	}
});

var getNumberOfElements = function (query, cb) {
	request({uri:'https://catalog.api.2gis.ru/2.0/catalog/branch/search?page=1&page_size=1&q=' +  encodeURIComponent(query) + '&region_id=112&locale=ru_KG&fields=dym%2Crequest_type%2Citems.contact_groups%2Citems.address%2Citems.point%2Citems.schedule%2Citems.reviews&key=' + key, method:'GET', encoding:'binary'}, function (err, res, page) {
		var json = parser.parse(page);
		cb(null, json.result.total)
	});
}

var getElement = function (query, index, cb) {
	request({uri:'https://catalog.api.2gis.ru/2.0/catalog/branch/search?page=' +  encodeURIComponent(index) + '&page_size=1&q=' +  encodeURIComponent(query) + '&region_id=112&locale=ru_KG&fields=dym%2Crequest_type%2Citems.contact_groups%2Citems.address%2Citems.point%2Citems.schedule%2Citems.reviews&key=' + key, method:'GET', encoding:'binary'}, function (err, res, page) {
		var json = parser.parse(page);
		var elem = {
			"name": utf8.decode(json.result.items[0].name),
			"address": utf8.decode(json.result.items[0].address_name),
			"lat": json.result.items[0].point.lat,
			"lon": json.result.items[0].point.lon
		}
		cb(null, elem)
	});
}

module.exports = router;
