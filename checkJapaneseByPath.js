let fs = require( 'fs');
let R = require('ramda');
//const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const tester = /[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;

const getJsonInDataDir = (path)=>{
	let jsons = {};
	let filesArr = fs.readdirSync(path);
	//console.log("File ARRs.... : "+JSON.stringify(filesArr, null, 2));
	R.map((fileName)=>{
		//console.log("ReadFile.... : "+path+"/"+fileName);
		if(fileName.indexOf(".json") > -1){
			try{
			let fileCont = fs.readFileSync(path+"/"+fileName,  'utf8');
			jsons[fileName] = JSON.parse(fileCont);
		}catch(e){
			console.error(e);
			console.log("Finename:"+fileName);
		}

		}
	}, filesArr);
	return jsons;
};
let arr = [process.argv[2]];
//"noel_s4_china","noel_s5_china"
//"noel_s6_china","noel_s7_china"
arr.map(x=>{

	let Root = {};
	let LengthObj = {};
	let target = getJsonInDataDir(__dirname+"/"+x);
	let promiseArr = [];
	let walker = (path, node)=>{
			if(R.isNil(node)){
					//elseJsonRoot[path] = node;
					return 0;
			}else if(R.is(Object, node)){
				if(node.code === 122){
					//console.log(path+":"+JSON.stringify(node))
					if(R.is(String)(node.parameters[0])){
						console.log(path+": is STRING")
					}
				}
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
	            if(R.test(tester, node)){
	              //console.log(path+":"+node);
	              Root[path] = node;
	          }else if(R.is(String)(node) && (R.length(node) > 40 || (R.length(node) < 6 && R.length(node) > 0))){
				  LengthObj[path] = node;
			  }
				return 0
			}
	};
	walker("root", target);
	Promise.all(promiseArr)
	.then(()=>{
		console.log(x);
		for(let i in Root){
			console.log(i+":"+Root[i]);
		}
		for(let i in LengthObj){
			console.log(i+":"+R.length(LengthObj[i])+":"+LengthObj[i]);
		}
	})

})
