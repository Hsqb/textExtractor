let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");
const cr = /\n/g;
const Root = {}
const MsgWhObj = {};
const msgWh = /MessageWidth/;
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
    if(process.argv[3] === "eng"){
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
    }else{
        let tempTxt = "";
        let splitArr = [];
        let isLong = false;
        if(R.indexOf("\c[0]",txt) > -1){
            let noChar = R.compose(R.replace(/\\v\[\d+?\]/g,""),R.replace(/\c\[\d+?\]/g,""), R.replace(/\\\./g, ""))(txt);
            if((getStrByte(noChar) > 69 || R.length(noChar) > 23) && R.indexOf("，",txt) < 0){
                isLong = true;
                specialContainer.push({
                    original : txt,
                    noSpecial : noChar,
                    byte : getStrByte(noChar),
                    length : R.length(noChar),
                })
//                console.log(noChar)
//                console.log(":C[0]PROBLEM:"+getStrByte(noChar)+":"+txt);
            }
            if((getStrByte(noChar) > 69 || R.length(noChar) > 23) && R.indexOf("，",txt) > -1){
                let tempArr = R.split("，", txt);
                tempArr[0] += "，";
                splitArr = tempArr;
            }else if(isLong && R.indexOf("\r\n",txt) < 0){
                let tempArr = R.splitAt(R.indexOf("\c[0]",txt)+4, txt);
                console.log("isLong && R.indexOf(,txt) < 0 :"+JSON.stringify(tempArr))
                splitArr = tempArr;
            }else{
                splitArr = [txt];
            }

        }else{
            splitArr = R.splitEvery(24,txt);
        }

        return R.compose(R.filter((x)=>{return R.length(x) > 0;}),
                         R.map(R.trim),
                         R.reduce((acc, word)=>{
                              acc.push(word);
                              return acc;
                         },[])
                     )(splitArr);
    }

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
          if(R.is(String, node)){
              //console.log(path+":"+node);
              Root[path] = node;
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
// const worksheet  = nexcel.parse(__dirname+'/tmaps/'+process.argv[2]+'_translation_'+process.argv[3]+'.xlsx');
// const rest  = nexcel.parse(__dirname+'/tmaps/noel_rest.xlsx');
//console.log(JSON.stringify(worksheet[0], null, 2));
// let orgTrnMap = R.pipe(R.head, R.prop("data"), R.fromPairs)(worksheet);
// let chinaRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[3]]), R.fromPairs)(rest);
// let engRestMap = R.pipe(R.head, R.prop("data"), R.map(x => [x[1], x[2]]), R.fromPairs)(rest);
// orgTrnMap = R.merge(orgTrnMap, process.argv[3] == "eng" ? engRestMap : {});//chinaRestMap
// console.log(JSON.stringify(chinaRestMap, null, 2));
//console.log(JSON.stringify(engRestMap, null, 2));
//fs.writeFileSync('./'+process.argv[2]+"orgTrnMap.json", JSON.stringify(orgTrnMap, null, 2));
let totalError = 0;
let target = getJsonInDataDir(__dirname+"/sources/"+process.argv[2]);

walker("root", target);
Promise.all(promiseArr)
.then(()=>{
	//console.log(JSON.stringify(Root, null,2))
	let arr = R.toPairs(Root);
	R.map((x)=>{
		if(R.indexOf("Map",x[0]) > -1
		   && R.length(x[1]) < 6
		   && !R.isEmpty(x[1])
		   && (R.indexOf("Switch",x[0]) < 0)
		   && (R.indexOf("name",x[0]) < 0)
		   && (R.indexOf("parameters/0",x[0]) > -1)
	   ){
			console.log(x);
		}
	})(arr);

})
.catch(console.error)


/*
  c0 ~ c10;는 제외
  문장은 항상 trim
  데이터는 문장 | 출현수 | 문장길이 | 출현수 * 문장길이
*/
