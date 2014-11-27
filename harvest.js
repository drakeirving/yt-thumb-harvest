// Tool for harvesting Youtube video thumbnails for data set construction

var https = require("https");
var fs = require("fs");

var API_KEY = "";// KEY HERE

// Categories taken from Youtube API videoCategory query
// https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US
var categories = [1,2,10,15,17,19,20,22,23,24,25,26,27,28,29];

// Data set object
// Contains an array of urls for each category
var Thumbnails = {};
	// init
	categories.forEach(function (c){
		Thumbnails[c.toString()] = [];
	});


function getURL(page, category, dateStr){
	var url = "https://www.googleapis.com/youtube/v3/search"
					+ "?part=snippet&maxResults=50&order=viewCount&pageToken=" + page
					+ "&type=video&videoCategoryId=" + category
					+ "&publishedAfter=" + dateStr[0] + "&publishedBefore=" + dateStr[1]
					+ "&fields=items/snippet/thumbnails/high,nextPageToken&key=" + API_KEY;
	return url;
}

// Batch harvest for a single category
//function harvestCategory(categoryIndex, categories){
for(var categoryIndex = 0; categoryIndex < categories.length; categoryIndex++){

	var date = new Date(2009, 0, 1);
	var dateStr = ["",""];
	dateStr[0] = date.toISOString();
	date.setTime(date.getTime()+(1000*60*60*24*14)); // Add two weeks
	dateStr[1] = date.toISOString();

	for(var dateNum = 0; dateNum < 134; dateNum++){

		var cat = categories[categoryIndex].toString();
		var file = "thumbnails-" + cat + ".txt";

		function harvestPage(cat, file, pageNum, pageToken, dateStr){
		//var pageToken = " ";
		//for(var pageNum = 0; pageNum < 10; pageNum++){

			var nextPage = pageToken; // Next page token
			var currDateStr = dateStr.slice(); // Shallow copy
			var urls = [];			// Grabbed urls
			var buf = "";

			// GET request
			https.get( getURL(pageToken, cat, currDateStr), function (res){

				// On response data
				res.on("data", function (chunk){
					// Get data from stream
					buf += chunk.toString();

				});

				// On response finish
				res.on("end", function (){

					try{
						// Parse response data
						var data = JSON.parse(buf);

						// Next page token for next request
						nextPage = data.nextPageToken;

						// Extract urls from JSON
						urls = data.items.map( function (item){
											return item.snippet.thumbnails.high.url;
										});

						// Append to data set
						Thumbnails[cat] = Thumbnails[cat].concat(urls);

						// Write page of results to safety file
						fs.appendFile(file, urls.toString()+",", function (err){
							if(err){
								console.log("Error at " + cat + " " + currDateStr[0] + " " + pageNum);
							}else{
								console.log(cat + " " + currDateStr[0] + " " + pageNum + " written.");
							}
						});

					}catch(err){
						console.error(err);
						// Emergency save
						finalWrite(err);
					}

					// Do next page
					// 15 categories * 134 dates * 10 pages * 50 urls/page = 1005000 urls
					if(pageNum < 9){
						harvestPage(cat, file, pageNum+1, nextPage, currDateStr);
					}else{
						// If we're sure everything's done writing
						if( Object.keys(Thumbnails).every( function (key){
							return (Thumbnails[key].length >= 67000);
						})){
							finalWrite();
						}
					}

				});

			}).on("error", function (err) {
				console.error(err);
				// Emergency save
				finalWrite(err);
			});

		}

		// Start page
		harvestPage(cat, file, 0, " ", dateStr); // Space is valid default page token

		dateStr[0] = dateStr[1];
		date.setTime(date.getTime()+(1000*60*60*24*14)); // Add two weeks
		dateStr[1] = date.toISOString();

	}

}

// START
//harvestCategory(0, categories);


function finalWrite(err){
	// Run once all requests are compiled, hopefully
	console.log("Final write...");
	fs.writeFileSync("thumbnails-all.json", JSON.stringify(Thumbnails, null, "\t"));
	console.log("Done!");
	if(err){ throw err; }
}



// Response JSON example:
// {
// 	"nextPageToken": "CDIQAA",
// 	"items": [
// 		{
// 			"snippet": {
// 				"thumbnails": {
// 					"high": {
// 						"url": "https://i.ytimg.com/vi/astISOttCQ0/hqdefault.jpg"
// 					}
// 				}
// 			}
// 		}
// 	]
// }