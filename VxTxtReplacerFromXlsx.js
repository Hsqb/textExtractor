let fs = require( 'fs');
let R = require('ramda');
let nexcel = require("node-xlsx");

console.log("start");
console.log(process.argv[2]);
const worksheet  = nexcel.parse(__dirname+'/tmaps/'+process.argv[2]+'.xlsx');
let arr = R.pipe(R.head, R.prop("data"))(worksheet);
const dialog = fs.readFileSync(__dirname+'/sources/'+process.argv[3]+'.txt', 'utf8')
//console.log(JSON.stringify(arr, null, 2));

R.map((array)=>{
	let len = R.length(R.defaultTo("",array[1]));
	if(len > 18){
//		console.log("length is "+len+" | sentence : "+array[1]);
	}
}, arr)

//console.log(JSON.stringify(R.split("\r\n",dialog),null,2));
let dialogArr = R.split("\r\n",dialog);
let replaced = R.addIndex(R.map)((origin, idx)=>{
	try{
		if(arr[idx][1] == null) return origin;
		else return arr[idx][1];
	}catch(e){
		console.log('error in ' + idx)
		return origin;
	}
},dialogArr);
console.log(JSON.stringify(replaced, null, 2));
let result = R.join("\r\n",replaced);
fs.writeFileSync(__dirname+'/dest/'+process.argv[3]+'.txt', result);
