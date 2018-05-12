let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
const cr = /\n/g;
const Root = {}
const MsgWhObj = {};
const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const msgWh = /MessageWidth/;

const objFromKeys = R.curry((fn, keys) =>
  R.zipObj(keys, R.map(fn, keys)));
const promiseArr = [];

const replacer = R.curry((targetIndex, replaceList, target)=>{
    let removedTarget = R.remove(targetIndex, 1, target);
    let newTarget  =  R.insertAll(targetIndex, replaceList)(removedTarget);
    return newTarget;
});
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
	}, filesArr);
	return jsons;
};

const walker = (path, node)=>{
		if(R.isNil(node)){
				//elseJsonRoot[path] = node;
				return 0;
		}else if(R.is(Object, node)){
				for(let i in node){
					promiseArr.push(new Promise((resolve, reject) => {
            walker(path+"/"+i,node[i]);
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
			if(R.last(R.split("/", path)) == "displayName"){
				Root[path] = node;
			}
		}
};
let target = getJsonInDataDir(__dirname+"/sources/"+process.argv[2]+"/data");

walker("root", target);
Promise.all(promiseArr)
.then(()=>{
    for(let i in Root){
      let val = Root[i];
      //console.log("before:"+val);
      let mapKey = val//R.replace(/\\\./g,"",val);//val//
      //console.log("after:"+val);
      let path = R.compose(R.drop(1),R.split("/"))(i)
      let fileName = R.take(1, path);
      let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
      console.log(fileName + ":"+val)
  	}
})
.catch(console.error)
