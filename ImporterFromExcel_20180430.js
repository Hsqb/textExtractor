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
                         /*if(R.length(word) > 20){
                             acc[acc.length - 1] = acc[acc.length - 1].concat(R.slice(0,20,word));
                             acc.push("");
                             acc[acc.length - 1] = acc[acc.length - 1].concat(R.slice(20,Infinity,word)+" ");
                         }else{
                             acc[acc.length - 1] = acc[acc.length - 1].concat(word+" ");
                         }*/
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
              //console.log(path+":"+node);
              Root[path] = node;
          }else if(R.test(msgWh, node)){
              MsgWhObj[path] = node;
          }
			return 0
		}
};
const valWalker = R.curry((value, node)=>{
        let rtn = false;
		if(R.isNil(node)){
			//elseJsonRoot[path] = node;
		}else if(R.is(Object, node)){
            rtn = false;
			for(let i in node){
                if(rtn) break;
                rtn = valWalker(value,node[i]);
			}
		}else if(R.is(Array, node)){
			for(let i in node){
              if(rtn) break;
				rtn = valWalker(value,node[i]);
			}
		}else{
            if(value == node){
              return true;
            };
		}
        return rtn;
});
//console.log(process.argv[2]);
/*
R.map(x => {
     if(R.length(x) == 1){
        console.log(x)
        x.push(""); }
     return x;
 })
*/
const worksheet  = nexcel.parse(__dirname+'/tmaps/'+process.argv[2]+'_translation_'+process.argv[3]+'.xlsx');
const rest  = nexcel.parse(__dirname+'/tmaps/noel_rest.xlsx');
//console.log(JSON.stringify(worksheet[0], null, 2));
let orgTrnMap = R.pipe(R.head, R.prop("data"), R.fromPairs)(worksheet);
let chinaRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[3]]), R.fromPairs)(rest);
let engRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[2]]), R.fromPairs)(rest);
orgTrnMap = R.merge(orgTrnMap, process.argv[3] == "eng" ? engRestMap : {});//chinaRestMap
//console.log(JSON.stringify(chinaRestMap, null, 2));
//console.log(JSON.stringify(engRestMap, null, 2));
fs.writeFileSync('./'+process.argv[2]+"orgTrnMap.json", JSON.stringify(orgTrnMap, null, 2));
let totalError = 0;
let target = getJsonInDataDir(__dirname+"/sources/"+process.argv[2]+"/data");

walker("root", target);
Promise.all(promiseArr)
.then(()=>{
    for(let i in Root){
      let val = Root[i];
      //console.log("before:"+val);
      let mapKey = val;///R.replace(/\\\./g,"",val)//val;
      //console.log("after:"+val);
      let path = R.compose(R.drop(1),R.split("/"))(i)
      let fileName = R.take(1, path);
      let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
      //console.log(innerPath)
      let transed = orgTrnMap[mapKey];
      if(!transed && cr.test(mapKey)){
          let newKey =R.compose(R.ifElse(x=> x[0]==" ",R.replace(/ /,""), R.identity),R.replace(/\n/g,"\r\n"))(mapKey)
          transed = orgTrnMap[newKey];
          //console.log(R.compose(R.replace(/ /,""),R.replace(/\n/g,"\r\n"))(mapKey))
          //console.log(transed)
      }
      if(!transed){
          transed = orgTrnMap[R.replace(/　/g," ")(mapKey)]
      }
      if(!transed){
          transed = orgTrnMap[R.replace(/　/g,"  ")(mapKey)]
      }
      if(!transed){
          transed = orgTrnMap[R.replace(/  /g," ")(mapKey)]
      }
      if(!transed){
          transed = orgTrnMap[R.replace(/　/,"")(mapKey)]
      }

      //console.log(innerPath)
      try{
      if(!R.isNil(transed) && !R.isEmpty(transed)){
        //console.log(innerPath+"|"+R.length(transed));
        let paramIndex = R.findIndex(R.equals('parameters'),innerPath);
        let pathToEvObj  = R.head(R.splitAt(paramIndex, innerPath));
        let afterParamToEvObj  = R.last(R.splitAt(paramIndex, innerPath));
        let pathToList  = R.dropLast(1,pathToEvObj);

        let targetList  = R.path(pathToList,target[fileName])
        let targetEvIdx = R.findIndex(valWalker(val))(targetList);

        let targetEvObj   = R.path(pathToList.concat([targetEvIdx]), target[fileName]);

        let prev101EvObj = {};
        for(let k = targetEvIdx ; k >= 0 ;k--){
            let tempbj = R.path(pathToList.concat([k]), target[fileName]);
            if(!!tempbj && tempbj.code == 101){
                prev101EvObj = tempbj;
                break;
            }
        }
        let prevEvObj   = R.path(pathToList.concat([targetEvIdx - 1]), target[fileName]);
        let NextEvObj   = R.path(pathToList.concat([targetEvIdx +1]), target[fileName]);
        NextEvObj = NextEvObj === undefined? {code: 'undef'} : NextEvObj;

        let splitedTrans = getSplitList(transed);
        if(!targetEvObj || targetEvObj.code == undefined){

            target[fileName] = R.set(R.lensPath(R.map((x)=>{
                if(!isNaN(parseInt(x)))
                    return  parseInt(x);
                else {
                    return x;
                }
            },innerPath)), transed, target[fileName]);
        }
        else if(targetEvObj.code === 102){
            target[fileName] = R.over(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), R.map((selection)=>{
                //console.log("102 "+selection+":"+val);
                if(selection === val){
                    return transed;
                }
                return selection;
            }), target[fileName]);
        }
        else if(targetEvObj.code === 402){
            //console.log("lenzPath "+pathToList.concat([targetEvIdx, "parameters", 1]));
            //console.log("targetEvObj code "+JSON.stringify(targetEvObj))
            target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 1])), transed, target[fileName]);
        }
        else if(targetEvObj.code === 356){
            console.log(fileName + ":PLUGIN_TEXT:"+val);
        }
        else if(R.length(splitedTrans) == 1 ){
            target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), splitedTrans[0], target[fileName]);
        }
        else if(R.length(splitedTrans) == 2 && prevEvObj.code === 101 && NextEvObj.code === 401){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 101){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 401 && NextEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 2 && prevEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]}];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 101 && NextEvObj.code === 401){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 101){
            let replaceList = [{"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               ];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 401 && NextEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }else if(R.length(splitedTrans) == 3 && prevEvObj.code === 401){
            let replaceList = [{"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[0]]},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[1]]},
                               {"code":101,"indent":targetEvObj.indent,"parameters":prev101EvObj.parameters},
                               {"code":401,"indent":targetEvObj.indent,"parameters":[splitedTrans[2]]},];
            target[fileName] = R.over(R.lensPath(pathToList), replacer(targetEvIdx, replaceList), target[fileName]);
        }
        else{
            target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), transed, target[fileName]);

        }
    }else{
        console.log(fileName + ":"+val);
    }
}catch(e){
    console.log(e);
    console.log("path : ", innerPath)
}

    }
    try{
        for(let j in MsgWhObj){
            let path = R.compose(R.drop(1),R.split("/"))(j)
            let fileName = R.take(1, path);
            let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
            let paramIndex = R.findIndex(R.equals('parameters'),innerPath);
            let pathToEvObj  = R.head(R.splitAt(paramIndex, innerPath));
            let pathToList  = R.dropLast(1,pathToEvObj);
            let targetList  = R.path(pathToList,target[fileName])
            let targetEvIdx = R.findIndex((tgtObj)=>{
                return R.test(msgWh, tgtObj.parameters[0]);
            })(targetList);

            let targetEvObj   = R.path(pathToList.concat([targetEvIdx]), target[fileName]);
            let strArr = [];
            for(let i = targetEvIdx+1 ; i < targetList.length ;i++){
                //console.log(pathToList.concat([i]))
                let obj = R.path(pathToList.concat([i]), target[fileName]);
                //console.log(JSON.stringify(obj))
                if(!!obj && (obj.code == 101 || obj.code == 401)){
                    if(obj.code == 401){
                        strArr.push(obj.parameters[0])
                    }
                }
                if(!obj || (obj.code != 101 && obj.code != 401)){
                    break;
                }
            }
            console.log("Msg width strlen: "+strArr.length+":"+strArr)
            if(strArr.length > 0){
                let maxLenStr = R.head(R.sort((a,b)=>{
                    let aByLen = (function(s,b,i,c){
                        for(b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
                        return b
                    })(a);
                    let bByLen = (function(s,b,i,c){
                        for(b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
                        return b
                    })(b);
                    return bByLen > aByLen;
                })(strArr));
                let bLen = (function(s,b,i,c){
                    for(b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
                    return b
                })(maxLenStr);
                target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), "MessageWidth "+bLen*20, target[fileName]);
            }

        }
    }catch(e){
        console.log("msg width error : "+e)
    }
    //console.log(JSON.stringify(target, null, 2));
    //console.log("promise result, finished" );

    for (let filename in target){
      let path = __dirname+"/sources/"+process.argv[2]+"/data_"+process.argv[3];
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
