let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");

const Root = {}
const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const objFromKeys = R.curry((fn, keys) =>
  R.zipObj(keys, R.map(fn, keys)));
const promiseArr = [];

const getJsonInDataDir = (path)=>{
	let jsons = {};
	let filesArr = fs.readdirSync(path);
	//console.log("File ARRs.... : "+JSON.stringify(filesArr, null, 2));
	R.map((fileName)=>{
		//console.log("ReadFile.... : "+path+"/"+fileName);
		if(fileName.indexOf(".json") > -1)){
			let fileCont = fs.readFileSync(path+"/"+fileName,  'utf8');
			jsons[fileName] = JSON.parse(fileCont);
		}
	}, filesArr)
	return jsons;
}


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
        if(R.test(tester, node)){
          //console.log(path);
          Root[path] = node;
        }
				return 0
		}

};

const worksheet  = nexcel.parse(__dirname+'/noel_s3_translated.xlsx');
let orgTrnMap = R.pipe(R.head, R.prop("data"), R.fromPairs)(worksheet);
//console.log(JSON.stringify(orgTrnMap, null, 2));

let totalError = 0;
let target = getJsonInDataDir(process.argv[2]);

walker("root", target);
Promise.all(promiseArr)
.then(()=>{

    for(let i in Root){
      let val = Root[i];
      let path = R.compose(R.drop(1),R.split("/"))(i)
      let fileName = R.take(1, path);
      let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
      //console.log(innerPath)
      let transed = orgTrnMap[val];
      //console.log(innerPath)
      if(!R.isNil(transed)){
        //  console.log(transed)
        target[fileName] = R.set(R.lensPath(innerPath), transed, target[fileName]);
      }


    }
    //console.log(JSON.stringify(target, null, 2));
    //console.log("promise result, finished" );

    for (let filename in target){
      let path = __dirname+"/noel_s3/t_data";
      if(!fs.existsSync(path)){
          fs.mkdirSync(path)
      }
      fs.writeFileSync(path+"/"+filename, JSON.stringify(target[filename]));
    }

})
.catch(console.error)


/*
  c0 ~ c10;는 제외
  문장은 항상 trim
  데이터는 문장 | 출현수 | 문장길이 | 출현수 * 문장길이
*/
