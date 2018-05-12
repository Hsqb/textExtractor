let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
const cr = /\n/g;
const Root = {}
const MsgWhObj = {};
let listPaths = [];
//const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const msgWh = /MessageWidth/;
const regexpArr = [/\\\./g,/\.\\\\\./g,/　/g,/\\\\cl/g, /\\\\\./g,'\\\.',"\cl", '\\\.\\\.']///\./g
const removeSpecial = x => {
    if(R.is(String)(x)){
        //console.log(x)
        //console.log(R.apply(R.compose,R.map(R.replace(R.__,""),regexpArr ))(x))
        return R.apply(R.compose,R.map(R.replace(R.__,""),regexpArr ))(x);
    }
    else {
        return "";
    }
}
const getStrByte = function(s,b,i,c){
    for(b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
    return b
}
const specialContainer = [];
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
    // console.log(path)
	let filesArr = fs.readdirSync(path);
	// console.log("File ARRs.... : "+JSON.stringify(filesArr, null, 2));
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
                if(node.code == 101){
                    Root[path] = node;
                }else{
                    for(let i in node){
    					promiseArr.push(new Promise((resolve, reject) => {
                walker(path+"/"+i,node[i]);
    						resolve();
    					}));
    				}
                }
		}else if(R.is(Array, node)){
				for(let i in node){
					promiseArr.push(new Promise((resolve, reject) => {
						walker(path+"/"+i,node[i] );
						resolve();
					}));
				}
		}else{
/*            if(R.test(tester, node)){
              //console.log(path+":"+node);
              Root[path] = node;
          }else */
          if(R.test(msgWh, node)){
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

const getWidthPoint = (char)=>{
    switch(char){
        case "A":
            return 45
        case "B":
            return 38
        case "C":
            return 40
        case "D":
            return 45
        case "E":
            return 38
        case "F":
            return 36
        case "G":
            return 45
        case "H":
            return 45
        case "I":
            return 20
        case "J":
            return 38
        case "K":
            return 40
        case "L":
            return 38
        case "M":
            return 55
        case "N":
            return 45
        case "O":
            return 50
        case "P":
            return 40
        case "Q":
            return 50
        case "R":
            return 40
        case "S":
            return 36
        case "T":
            return 40
        case "U":
            return 42
        case "V":
            return 42
        case "W":
            return 55
        case "X":
            return 40
        case "Y":
            return 45
        case "Z":
            return 40
        case "a":
            return 36
        case "b":
            return 36
        case "c":
            return 36
        case "d":
            return 36
        case "e":
            return 36
        case "f":
            return 33
        case "g":
            return 36
        case "h":
            return 36
        case "i":
            return 16
        case "j":
            return 30
        case "k":
            return 40
        case "l":
            return 16
        case "m":
            return 55
        case "n":
            return 36
        case "o":
            return 36
        case "p":
            return 36
        case "q":
            return 36
        case "r":
            return 30
        case "s":
            return 33
        case "t":
            return 36
        case "u":
            return 36
        case "v":
            return 36
        case "w":
            return 50
        case "x":
            return 36
        case "y":
            return 36
        case "z":
            return 36
        case "1"  :
        case "2"  :
        case "3"  :
        case "4"  :
        case "5"  :
        case "6"  :
        case "7"  :
        case "8"  :
        case "9"  :
        case "0"  :
            return 45;
        case "."  :
            return 15;
        default :
            return 30;

    }
}
const getIsOverSentence= (str)=>{
    let strSplitArr = R.filter(x=> !R.isEmpty(x))(R.split(" ", str));
    let total = 0;
    for(let i = 0 ; i < strSplitArr.length ; i++){
        let newStr = removeSpecial(strSplitArr[i]);

        for(let j = 0 ; j < newStr.length; j++){
            let wp = getWidthPoint(newStr[j]);
            total += wp;
        }
    }
    //console.log(str+":::"+total);
    return total;
}
//console.log(process.argv[2]);
/*
R.map(x => {
     if(R.length(x) == 1){
        console.log(x)
        x.push(""); }
     return x;
 })
*/
//const worksheet  = nexcel.parse(__dirname+'/tmaps/'+process.argv[2]+'_translation_'+process.argv[3]+'.xlsx');
//const rest  = nexcel.parse(__dirname+'/tmaps/noel_rest.xlsx');
//console.log(JSON.stringify(worksheet[0], null, 2));
//let orgTrnMap = R.pipe(R.head, R.prop("data"), R.fromPairs)(worksheet);
//let chinaRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[3]]), R.fromPairs)(rest);
//let engRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[2]]), R.fromPairs)(rest);
//orgTrnMap = R.merge(orgTrnMap, process.argv[3] == "eng" ? engRestMap : {});//chinaRestMap
//console.log(JSON.stringify(chinaRestMap, null, 2));
//console.log(JSON.stringify(engRestMap, null, 2));
//fs.writeFileSync('./'+process.argv[2]+"orgTrnMap.json", JSON.stringify(orgTrnMap, null, 2));
let totalError = 0;
let target = getJsonInDataDir(__dirname+"/"+process.argv[2]);
let Tlength =0;
let Filize = [];
walker("root", target);
Promise.all(promiseArr)
.then(()=>{
    for(let i in Root){
        Tlength++;
        //let val = Root[i];
        let path = R.compose(R.drop(1),R.split("/"))(i)
        let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item))(path);

      try{
          //console.log(innerPath);
          // let targetEvObj  = R.path(innerPath,target[fileName])
          let pathToList   = R.dropLast(1,innerPath);
          listPaths.push(pathToList.join("/"));
      }catch(e){
          //console.log(" error in "+fileName)
          console.log(e);
          console.log("path : ", innerPath)
          //console.log("val : ", val)
      }

    }
    listPaths = R.uniq(listPaths);
    //console.log(listPaths);
    let markingId = 0;
    R.map((pathString)=>{
        //console.log(pathString);
        markingId = 0;
        let path = R.compose(R.split("/"))(pathString)
        let fileName = R.take(1, path);
        let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item), R.drop(1))(path);
        //console.log(innerPath);
        let targetEvList  = R.path(innerPath,target[fileName]);
        //console.log(targetEvList);
        let packageObj = [[pathString+"/"+markingId++]];
        for (let i = 0 ; i < targetEvList.length ; i++){
            if(targetEvList[i].code != 101 && targetEvList[i].code != 401){
                if(packageObj.length == 0){
                    continue;
                }else{
                    if(packageObj[packageObj.length - 1].length == 1){
                        continue;
                    }else{
                        packageObj.push([pathString+"/"+markingId++]);
                    }
                }
            }else{ //(targetEvList[i].code == 101)
                packageObj[packageObj.length - 1].push(targetEvList[i]);
                targetEvList[i].tempMarking = packageObj[packageObj.length - 1][0];
            }
        }
        target[fileName] = R.set(R.lensPath(innerPath), targetEvList, target[fileName]);
    }, listPaths);
    //console.log(target["Map057.json"].events[6].pages[0].list);
    let tempMarkingProcChecker = {};
    R.map((pathString)=>{
        let path = R.compose(R.split("/"))(pathString)
        let fileName = R.take(1, path);
        let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item), R.drop(1))(path);
        let targetEvList  = R.path(innerPath,target[fileName]);
        for (let i = 0 ; i < targetEvList.length ; i++){
            if(targetEvList[i].code == 101
                && !R.isNil(targetEvList[i].tempMarking)
                && !tempMarkingProcChecker[targetEvList[i].tempMarking]
                && targetEvList[i].parameters[3] != 0
                && targetEvList[i].parameters[4] != 1
            ){
                //console.log(targetEvList[i].tempMarking);
                let packageList = R.filter(R.propEq("tempMarking", targetEvList[i].tempMarking),targetEvList);
                if(R.compose(R.lt(1),R.length,R.uniq,R.map(R.prop("indent")))(packageList)){
                    throw new Error("indent Different! "+ targetEvList[i].tempMarking)
                }
                //console.log(packageList);
                let totalSentence = R.reduce((acc, item)=>{
                    if(item.code == 101){
                        return acc;
                    }else{
                        acc+= item.parameters[0];
                        return acc;
                    }
                }, "", packageList);
                let totalSentenceArr = R.splitEvery(10)(totalSentence);
                R.map((item)=>{
                    if(item.code == 101){
                        return "";
                    }else{
                        let totalWp = getIsOverSentence(item.parameters[0]);
                        if(totalWp > 1430){
                            console.log("LONG : "+item.parameters[0]+"::"+totalWp+" at "+targetEvList[i].tempMarking);
                        }
                        return item.parameters[0];
                    }

                },packageList)
                //console.log(totalSentenceArr)
                tempMarkingProcChecker[targetEvList[i].tempMarking] = true;
            }

        }
        //target[fileName] = R.set(R.lensPath(innerPath), targetEvList, target[fileName]);
    }, listPaths);
    R.map((pathString)=>{
        let path = R.compose(R.split("/"))(pathString)
        let fileName = R.take(1, path);
        let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item), R.drop(1))(path);
        let targetEvList  = R.path(innerPath,target[fileName]);
        for (let i = 0 ; i < targetEvList.length ; i++){
            if(targetEvList[i].tempMarking != undefined){
                delete targetEvList[i].tempMarking;
            }
        }
        target[fileName] = R.set(R.lensPath(innerPath), targetEvList, target[fileName]);
    }, listPaths);
    try{
        for(let j in MsgWhObj){
            //console.log(j);
            let path = R.compose(R.drop(1),R.split("/"))(j)
            let fileName = R.take(1, path);
            let innerPath = R.compose(R.map((item)=>!isNaN(parseInt(item)) ? parseInt(item) : item),R.drop(1))(path)
            let paramIndex = R.findIndex(R.equals('parameters'),innerPath);
            let pathToEvObj  = R.head(R.splitAt(paramIndex, innerPath));
            let pathToList  = R.dropLast(1,pathToEvObj);
            let targetList  = R.path(pathToList,target[fileName])
            let targetEvIdx = R.last(pathToEvObj);

            let targetEvObj   = R.path(pathToEvObj, target[fileName]);
            let targetRowEvObj   = R.path(pathToList.concat([targetEvIdx-1]), target[fileName]);

            let strArr = [];
            let count101 = 0;
            for(let i = targetEvIdx+1 ; i < targetList.length ;i++){
                //console.log(pathToList.concat([i]))
                let obj = R.path(pathToList.concat([i]), target[fileName]);
                //if(obj.indent > 0) console.log(JSON.stringify(obj))
                if(!!obj && (obj.code == 126 || obj.code == 101 || obj.code == 401)){
                    if(obj.code == 101){
                        count101++;
                    }
                    if(obj.code == 401){
                        strArr.push(obj.parameters[0])
                    }
                }
                if(!obj || (obj.code != 126 && obj.code != 101 && obj.code != 401)){
                    break;
                }
            }
            //console.log("Msg width strlen: "+strArr.length+":"+strArr)
            if(strArr.length > 0){
                let maxLenStr = R.head(R.sort((a,b)=>{
                    let aByLen = getIsOverSentence(a);
                    let bByLen = getIsOverSentence(b);
                    return bByLen > aByLen;
                })(strArr));
                let rowCount = Math.ceil((strArr.length/count101));
                let bLen = getIsOverSentence(maxLenStr);
                //console.log(strArr[0]+":"+rowCount)

                target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx-1, "parameters", 0])), "MessageRows "+rowCount, target[fileName]);

                target[fileName] = R.set(R.lensPath(pathToList.concat([targetEvIdx, "parameters", 0])), "MessageWidth "+parseInt(bLen*0.59130434782+10), target[fileName]);
            }

        }

    }catch(e){
        console.log("msg width error : "+e)
    }

    for (let filename in target){
      let path = __dirname+"/"+process.argv[2];
      if(!fs.existsSync(path)){
          fs.mkdirSync(path)
      }
      fs.writeFileSync(path+"/"+filename, JSON.stringify(target[filename]));
    }
    //console.log(JSON.stringify(target["Map005.json"], null, 2));
})
.catch(console.error)


/*
  c0 ~ c10;는 제외
  문장은 항상 trim
  데이터는 문장 | 출현수 | 문장길이 | 출현수 * 문장길이
*/
