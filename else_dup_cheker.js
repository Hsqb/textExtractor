let fs = require( 'fs');
let R = require('ramda');
let nExcel = require("node-xlsx");
let catFile = JSON.parse(fs.readFileSync("./cat.json"));
let fileList = fs.readdirSync("./else_xlsx/");
let untransed = {};
const tester = /[一-龠]+|[ぁ-ゔ]+|[ァ-ヴー]+|[々〆〤]+/u;
const replacer = (str)=>{
	return R.reduce((acc, key)=>{
		let regExp = new RegExp(key,'g')
		acc = acc.replace(regExp, catFile[key]);
		return acc;
	},str,R.keys(catFile));
}
let result = R.reduce((acc, fileName)=>{
	if(fileName.indexOf('.xlsx') < 0)return acc;
	let targetFile = nExcel.parse(__dirname+'/else_xlsx/'+fileName);
	let datas = targetFile[0].data;
	R.map((data)=>{
		console.log(data);
		if(data.length === 1){
			if(!acc[data[0]]){
				console.log(data[0] +"is undefined");
			}
		}else{
			if(!acc[data[0]]){
				acc[data[0]] = data[1];
			}else{
				if(data[1] !== acc[data[0]]) console.log(data[0] +" is not equal val : "+ data[1] +"|"+acc[data[0]]);
			}
		}
	},datas);
	return acc;
},{}, fileList)

R.forEach((fileName)=>{
	if(fileName.indexOf('.xlsx') < 0)return;
	let targetFile = nExcel.parse(__dirname+'/else_xlsx/'+fileName);
	let datas = targetFile[0].data;
	R.map((data)=>{
		console.log(data);
		if(data.length === 1){
			if(!result[data[0]]){
				console.log(data[0] +"is undefined");
				untransed[data[0]] = true;
			}
		}
	},datas);
},fileList)


R.forEach((fileName)=>{
	if(fileName.indexOf('.xlsx') < 0)return;
	let targetFile = nExcel.parse(__dirname+'/else_xlsx/'+fileName);
	let datas = targetFile[0].data;
	datas = R.map((data)=>{
		if(data.length === 1){
			let firstStep = result[data[0]];
			let replac = replacer(data[0]);
			if(!!firstStep){
				return data.concat([firstStep]);
			}
			else if(replac !== data[0] && !R.test(tester, replac))
				return data.concat([replac])
			else {
				return data;
			}
		}
		else {
			return data
		}
	},datas);

	var buffer = nExcel.build([{name: targetFile[0].name, data: datas}]); // Returns a buffer
	fs.writeFileSync(__dirname + "/n_"+fileName+"", buffer, 'utf8')
},fileList)



console.log();
fs.writeFileSync("./else.json",JSON.stringify(result, null,2) )
fs.writeFileSync("./else_untransed.json",JSON.stringify(untransed, null,2) )

let length = R.reduce((acc,str) => {
	acc += str.length;
	return acc;
},0,R.keys(untransed));
console.log(length)
