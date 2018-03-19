 "use strict";
//Map-Event-Page
let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const is117 = /code\/117/u
/*
process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
});
HHAN-MBP13:textExtractor HHAN$ node Event_Extractor.js hi this is hyunseop;
0: /usr/local/bin/node
1: /Users/HHAN/workspace/textExtractor/Event_Extractor.js
2: hi
3: this
4: is
5: hyunseop
*/
const mapKeys = R.curry((fn, obj) =>
  R.fromPairs(R.map(R.adjust(fn, 0), R.toPairs(obj))));
const objMap = R.curry((fn, obj) =>
  R.fromPairs(R.map(R.adjust(fn, 1), R.toPairs(obj))));

const dupCheckObj = {};
const diff = R.comparator((a, b) => a < b);
const getJsonInDataDir = (path)=>{
	let jsons = {};
	let filesArr = fs.readdirSync(path);
	//console.log("File ARRs.... : "+JSON.stringify(filesArr, null, 2));
	R.map((fileName)=>{
		//console.log("ReadFile.... : "+path+"/"+fileName);
		if(fileName.indexOf(".json") > -1){
			let fileCont = fs.readFileSync(path+"/"+fileName,  'utf8');
			jsons[fileName] = JSON.parse(fileCont);
		}
	}, filesArr)
	return jsons;
}
/*
R.is(Object, {}); //=> true
R.is(Number, 1); //=> true
R.is(Object, 1); //=> false
R.is(String, 's'); //=> true
R.is(String, new String('')); //=> true
R.is(Object, new String('')); //=> true
R.is(Object, 's'); //=> false
R.is(Number, {}); //=> false
*/
const promiseArr = []
const elseJsonRoot = {}
const walker = (path, node)=>{
		if(R.isNil(node)){
				//elseJsonRoot[path] = node;
				return 0;
		}else if(R.is(Object, node)){
				for(let i in node){
					promiseArr.push(new Promise((resolve, reject) => {
            if(R.propEq("code", 117, node) && R.contains("CommonEvents", path)){
   					 let commonEvent = R.find(R.compose(R.propEq("id", node.parameters[0]), R.defaultTo({})), commonEvents);
   					 let eventName = commonEvent.name;
     					if(R.test(/ﾒｯｾｰｼﾞｳｨﾝﾄﾞｳ:消去|ﾒｯｾｰｼﾞｳｨﾝﾄﾞｳ:\+W消去/,eventName)){
     //						console.log("")
     						//pageObj.textArr.push("");
     					}else if(R.test(/ﾒｯｾｰｼﾞｳｨﾝﾄﾞ/,eventName)){
     						//console.log("")
     						//console.log(R.split(":",commonEvent.name)[1]);
     						//pageObj.textArr.push("");

                elseJsonRoot[path] = R.split(":",commonEvent.name)[1];
     					}


            }else{
              walker(path+"/"+i,node[i] )
            }

						resolve();
					}));
				}
		}else if(R.is(Array, node)){
				for(let i in node){
					promiseArr.push(new Promise((resolve, reject) => {
						walker(path+"/"+i,node[i] );
						resolve();
					}));
				}
		}else{
        if(R.test(tester, node)) elseJsonRoot[path] = node;

				return 0
		}

}

const getElseJsons= (mapKey, json) =>{
		walker("root/"+mapKey, json);
		//console.log("mapkey : ", mapKey);
		Promise.all(promiseArr)
		.then(()=>{
				//console.log("mapKey result", mapKey);
				//console.log("promise result, finished" );
		})

}

const getMapEvents= (map, commonEvents) =>{
//code 117 : 공통이벤트 호출/ 주로 메시지표시.
//
	const events = map.events;
	R.map((event)=>{
		if(R.isNil(event)) return 0;
		//console.log("reading event... "+event.name);
		let pages = event.pages;
		R.addIndex(R.map)((page,idx)=>{
			let pageObj = {
				allText : "",
				textArr : []
			};
			let list = page.list;
			if(R.isNil(list) || R.isEmpty(list)){
				return 0;
			}
			const isPage401 = R.compose(R.not, R.isNil, R.find(R.propEq("code", 401)))(list)
			if(isPage401) {
				//console.log("- "+event.name + " page "+idx +" START ----");
			}

			R.map((eventLine)=>{
				if(R.isNil(eventLine)) return 0;
				if(eventLine.code === 117){
					 //console.log("CommentEvent : "+ eventLine.parameters[0]);
					 let commonEvent = R.find(R.compose(R.propEq("id",eventLine.parameters[0]), R.defaultTo({})), commonEvents);
					 let eventName = commonEvent.name;
					if(R.test(/ﾒｯｾｰｼﾞｳｨﾝﾄﾞｳ:消去|ﾒｯｾｰｼﾞｳｨﾝﾄﾞｳ:\+W消去/,eventName)){
//						console.log("")
						pageObj.textArr.push("");
					}else if(R.test(/ﾒｯｾｰｼﾞｳｨﾝﾄﾞ/,eventName)){
						//console.log("")
						//console.log(R.split(":",commonEvent.name)[1]);
						//pageObj.textArr.push("");
						pageObj.allText += R.split(":",commonEvent.name)[1];
						pageObj.textArr.push(R.split(":",commonEvent.name)[1]);
					}

				}
				//if(eventLine.code === 101) console.log("Serif Event : "+ eventLine.parameters);
				if(eventLine.code === 401) {
					//console.log(eventLine.parameters[0]);
					pageObj.allText += eventLine.parameters[0];
					pageObj.textArr.push(eventLine.parameters[0]);
				}
			}, list)
			if(isPage401) {
				//console.log("- "+event.name + " page "+idx +" END   ----");
				//console.log("");
				if(dupCheckObj[pageObj.allText] != undefined){
					return 0;
				}else{
					dupCheckObj[pageObj.allText] = pageObj

					console.log("- "+event.name + " page "+idx +" START ----");
					R.map((text)=>{
						console.log(text);
					},pageObj.textArr)
					console.log("- "+event.name + " page "+idx +" END   ----");
					console.log("");
				}
			}
		}, pages);
	}, events);
}

const isMapMode = process.argv[3] === "map";
let jsons = getJsonInDataDir(process.argv[2]);

let jsonsKey = R.keys(jsons);

let commonEvents = jsons["CommonEvents.json"];

let mapEventsKeys = R.compose(R.sort(diff), R.filter(R.test(/Map\d+/)))( jsonsKey);

let elseEventKeys =  R.compose(R.without(["MapInfos.json"]), R.sort(diff), R.filter(R.compose(R.not, R.test(/Map\d+/))))(jsonsKey);

//console.log(mapEventsKeys);
//console.log(elseEventKeys);

if(isMapMode){
	R.map((mapKey)=>{
		let id = [mapKey]
		let map = jsons[mapKey];
		//let events = R.prop('events');
		console.log("Map "+mapKey+" START ----------------");
		let result = getMapEvents(map,commonEvents);
		console.log("Map "+mapKey+"  END  ----------------");
		console.log("");
		//make Excel;
	}, mapEventsKeys)
}else{ // elseMode
	R.map((mapKey)=>{
		let id = [mapKey]
		let map = jsons[mapKey];
		//let events = R.prop('events');
		//console.log("Map "+mapKey+" START ----------------");
		getElseJsons(mapKey, map);
		//console.log("Map "+mapKey+"  END  ----------------");
		//make Excel;
	}, elseEventKeys)
  let keys = R.keys(elseJsonRoot);
  //let pathKeys = R.map(R.split("/"),keys);
  let processed = R.reduce((acc, pair)=>{

      if(R.isNil(acc[R.split("/", pair[0])[1]]))
      {
        acc[R.split("/", pair[0])[1]] = [pair[1]];
      }else{
        acc[R.split("/", pair[0])[1]].push(pair[1]);
      }
      return acc;
  }, {}, R.toPairs(elseJsonRoot));
  let forExcel = R.reduce((acc, key)=>{
    acc.push([key]);
    R.map((origin)=>{
      acc.push([origin]);
    }, processed[key]);
    return acc;
  },[],R.keys(processed));
	console.log(JSON.stringify(processed, null, 2));
  let chap = R.split("/",process.argv[2])[2];
  var buffer = nexcel.build([{name: chap, data: forExcel}]); // Returns a buffer
  fs.writeFileSync(__dirname + "/dest/"+chap+"_else_Info.xlsx", buffer, 'utf8')
}
