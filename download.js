// Download images

var request = require("request");
var fs = require("fs");

var Thumbnails = JSON.parse(fs.readFileSync("thumbnails-all.json", "utf8"));
var dir = "N:/Data Sets/YT-1m/Images/";

// Create main folder if it doesn't exist
if(!fs.existsSync()){
	fs.mkdirSync(dir);
}

for(var cat in Thumbnails){
	// Create folders if they don't exist
	if(!fs.existsSync(dir + cat)){
		fs.mkdirSync(dir + cat);
	}

	for(var i = 0; i < 100; i++){
		dumpWorker(cat, i);
		//dumpImage(Thumbnails[cat][i], cat, i);
	}
}

function dumpWorker(cat, offset){
	if(offset < Thumbnails[cat].length){
		dumpImage(Thumbnails[cat][offset], cat, offset);
	}
}

function dumpImage(url, cat, offset){
	// Example: https://i.ytimg.com/vi/Qit3ALTelOo/hqdefault.jpg
	var id = (/^https:\/\/i.ytimg.com\/vi\/(.+)\/hqdefault.jpg/).exec(url)[1];
	var file = fs.createWriteStream(dir + cat + "/" + id + ".jpg");

	request
		.get(url)
		.on("error", function(err) {
			console.log("Error at " + id +": " + err);
			fs.appendFileSync("errors.txt", id+"\n");
		})
		.pipe(file);

	file.on("finish", function() {
		console.log(id);
		dumpWorker(cat, offset+100);
	});
}