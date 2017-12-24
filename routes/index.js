var express = require('express');
var request = require('request');
var router = express.Router();
var async = require('async');
var parser = require('json-parser');
var json2csv = require('json2csv');
var fs = require('fs');
var utf8 = require('utf8');
var key = require('../key')()
var glob = require("glob")

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
			var fields = ['name', 'address', 'lat', 'lon', 'floor', 'phone', 'website' ];
			var data = [];
			async.eachSeries(axilary, function iterator(index, callback) {
				getElement(query, index, function(err, element) {
					data.push(element)
					callback()
				});
			}, function done() {
				console.log()
				console.log("DONE")
				console.log()

				var csv = json2csv({ data: data, fields: fields });
				fs.writeFile(query + '.csv', csv, function(err) {
					if (err) throw err;
					//res.attachment('file.csv');
					res.send("Yor files will be available in list route after several minutes")
				});
			});
		})
	} else {
		res.render('index');
	}
});

router.get('/list', function(req, res, next) {
	glob("./*.csv",{}, function (er, files) {
		res.render('list', {'files': files});
	})
})

router.get('/get', function(req, res, next) {
	var fileName = req.query.fileName;
	fs.readFile(fileName, 'utf8', function (err,file) {
		if (err) throw err;
		res.attachment(fileName);
		res.send(file)
	});
})

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
			"name": utf8.decode(json.result.items[0].name)
		}
		if(json.result.items[0].address_name) {
			elem["address"] = utf8.decode(json.result.items[0].address_name)
		}
		/* handle error in case no location of organization */
		if(json.result.items[0].point) {
			elem["lat"] = json.result.items[0].point.lat
			elem["lon"] = json.result.items[0].point.lon
		} else {
			elem["lat"] = "none";
			elem["lon"] = "none";
		}
		console.log(elem.name)
		/* add floot if exist */
		if(json.result.items[0].address_comment) {
			elem["floor"] = utf8.decode(json.result.items[0].address_comment)
		} else {
			elem["floor"] = "none"
		}
		/* iterate over contacts, add just phone and website */
		if(json.result.items[0].contact_groups && json.result.items[0].contact_groups[0].contacts)
		{
			var object = json.result.items[0].contact_groups[0].contacts;
			async.eachSeries(object, function iterator(item, callback) {
				if(elem[item.type] == "phone")
					elem[item.type] = utf8.decode(item.value)				
				else if(elem[item.type] == "website")
					elem[item.type] = utf8.decode(item.text)	
				callback()
			}, function done() {
				cb(null, elem)
			});
		} else {
			cb(null, elem)
		}
	});
}

module.exports = router;