let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");

const Root = {}
const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
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

const getSplitList = (txt)=>{
   let spaceSplit = R.split(" ", txt);
   return R.compose(R.filter((x)=>{return R.length(x) > 0;}),
                    R.map(R.trim),
                    R.reduce((acc, word)=>{
                         if(R.length(acc) === 0){
                           acc.push("");
                         }
                         else if(R.length(acc[acc.length - 1]) > 40){
                           acc.push("");
                         }
                         acc[acc.length - 1] = acc[acc.length - 1].concat(word+" ");
                         return acc;
                    },[])
                )(spaceSplit);
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
            if(R.test(tester, node)){
              //console.log(path);
              Root[path] = node;
            }
			return 0
		}
};
//console.log(process.argv[2]);
const worksheet  = nexcel.parse(__dirname+'/tmaps/'+process.argv[2]+'_translated.xlsx');
let orgTrnMap = R.pipe(R.head, R.prop("data"), R.fromPairs)(worksheet);
//console.log(JSON.stringify(orgTrnMap, null, 2));

let totalError = 0;
let target = getJsonInDataDir(__dirname+"/sources/"+process.argv[2]+"/data");

walker("root", target);
Promise.all(promiseArr)
.then(()=>{
    for(let i in Root){
      let val = Root[i];
      //console.log("before:"+val);
      let mapKey = R.replace(/\\\./g,"",val);
      //console.log("after:"+val);
      let path = R.compose(R.drop(1),R.split("/"))(i)
      let fileName = R.take(1, path);
      let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
      //console.log(innerPath)
      let transed = orgTrnMap[mapKey];
      //console.log(innerPath)
      try{
      if(!R.isNil(transed)){
        //console.log(innerPath+"|"+R.length(transed));
        let paramIndex = R.findIndex(R.equals('parameters'),innerPath);
        let pathToEvObj  = R.head(R.splitAt(paramIndex, innerPath));
        let pathToList  = R.dropLast(1,pathToEvObj);

        let targetList  = R.path(pathToList,target[fileName])
        let targetEvIdx = R.findIndex(R.pathEq(["parameters",0], val))(targetList);

        let targetEvObj   = R.path(pathToList.concat([targetEvIdx]), target[fileName]);
        let prevEvObj   = R.path(pathToList.concat([targetEvIdx - 1]), target[fileName]);
        let NextEvObj   = R.path(pathToList.concat([targetEvIdx +1]), target[fileName]);
        NextEvObj = NextEvObj === undefined? {code: 'undef'} : NextEvObj;

        let splitedTrans = getSplitList(transed);
        if(R.length(splitedTrans) == 1 ){
            target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), splitedTrans[0], target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 101 && NextEvObj.code === 401){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 101){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 401 && NextEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 101 && NextEvObj.code === 401){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 101){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               ];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 401 && NextEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":["",0,2,2]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else{
            target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), transed, target[fileName]);

        }
    }else{
        console.log(fileName + ":"+val);
    }
}catch(e){
    console.error(e);
    console.log("path : ", innerPath)
}

    }
    //console.log(JSON.stringify(target, null, 2));
    //console.log("promise result, finished" );

    for (let filename in target){
      let path = __dirname+"/sources/"+process.argv[2]+"/t_data";
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
