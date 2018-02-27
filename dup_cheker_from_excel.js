let fs = require( 'fs');
let R = require('ramda');
let nExcel = require("node-xlsx");
let results = {};
let allValues = {};
let totalError = 0;
/*
  c0 ~ c10;는 제외
  문장은 항상 trim
  데이터는 문장 | 출현수 | 문장길이 | 출현수 * 문장길이
*/

let targetFile = nExcel.parse(__dirname+'/'+process.argv[2]);
//console.log(JSON.stringify(targetFile, null, 2));
let targetFileRows = R.path([0, 'data'], targetFile);
let originals = R.map(R.head, targetFileRows);
let counterObj = R.reduce((acc, val) => {
  if(R.isNil(acc[val])){
    acc[val] = 1;
  }else{
    acc[val] += 1;
  }
  return acc;
},{}, originals);
//console.log(JSON.stringify(counterObj, null, 2));

let newArrays = R.map(key=>{ return [R.trim(key), counterObj[key], R.length(R.trim(key)), counterObj[key] * R.length(R.trim(key))] }, R.keys(counterObj));
//let newArrStr = R.reduce((acc, arr)=>acc+arr.toString()+",\n","",newArrays)

var buffer = nExcel.build([{name: "dup_check", data: [["원문","출현수","문장길이","출현수*문장길이"]].concat(newArrays)}]); // Returns a buffer
fs.writeFileSync(__dirname + "/dest/dup_check_Info.xlsx", buffer, 'utf8')
