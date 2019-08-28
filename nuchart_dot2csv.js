//USAGE: node dot2csv.js nuchart_result.dot experimentname

var fs = require('fs');
var readline = require('readline');

var filename = process.argv[2];
var experiment = process.argv[3];

var prefixfile = filename.split(".")[0];
var nodestream = fs.createWriteStream(prefixfile+"_nodes.csv");
var edgestream = fs.createWriteStream(prefixfile+"_edges.csv");
var experimentstream = fs.createWriteStream(prefixfile+".csv");

var rl = readline.createInterface({
  input: fs.createReadStream(filename)
});
var row;
var closebracket;
var idnum=0;
var nodenum;
var edgenum=0;
var mycurrentobject;

var mynodelist = new Object();
var myedgelist = new Object();
var proteinnames = new Object();

var data, datum;
var first, last;
var cypherquery ="";


var nodeproperties = new Set();
var edgeproperties = new Set();

rl.on('line', function (line) {
  init = line.indexOf('[');
  fin = line.indexOf(']');

  data = line.trim().split(" ");


  if (line.search("--") != -1) { //EDGE
    if (mynodelist.hasOwnProperty(data[0]) && mynodelist.hasOwnProperty(data[2])) {
      if(data[0] != data[2]) {

        var myedge = new Object();

        myedge.from = mynodelist[data[0]].label;
        myedge.to = mynodelist[data[2]].label;

        proteinnames[myedge.from]++;
        proteinnames[myedge.to]++;

        data = line.substr(init+1,fin-init-1).split(", ");
        for (var i=0; i<data.length;i++) {
          datum=data[i].split("=");
          myedge[datum[0]] = datum[1];
          edgeproperties.add(datum[0]);
        }

        myedgelist[edgenum] = myedge;
        edgenum++;

      }
    }
  }

  else if (!isNaN(data[0]) && data[0]) { //NODE
    nodenum = data[0];
    let mynode = new Object();
    data = line.substr(init+1,fin-init-1).split(", ");
    for (var i=0; i<data.length;i++) {
      datum=data[i].split("=");
      if(datum[1] == "\"\"") datum[1] = -999;
      mynode[datum[0]] = datum[1];
      nodeproperties.add(datum[0]);
    }

    if (mynode.label != -999) {
      mynode.idnum = idnum++;
      mynodelist[nodenum] = mynode;

      if (proteinnames.hasOwnProperty(mynode.label)) { console.log("ATTENTION: duplicated value! "+mynode.label+" \n");}
      else { proteinnames[mynode.label] = 1;}
    }

  }
});


rl.on('close', function (line) {

  experimentstream.write("name,label,nodenum,edgenum\n");
  var createcommand = experiment+",experiment,"+idnum+","+edgenum;
  experimentstream.write(createcommand+"\n");
  experimentstream.close();

  //Commands to be issued within the neo4j console
  console.log("cp "+prefixfile+"*.csv <neo4j_install_dir>/import\n");
  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+".csv\" AS line");
  console.log("MERGE (n:experiment {label: line.name, nodes: line.nodenum, relations: line.edgenum})");
  console.log("RETURN n\n");


  let ne = Object.keys(mynodelist);
  let nearray = [...nodeproperties];

  createcommand = "pid,type,";

  for (let i=0; i<nearray.length; i++) { createcommand += nearray[i]+"," }
  createcommand = createcommand.substr(0, createcommand.length-1);
  nodestream.write(createcommand+"\n");

  for (let i=0;i<ne.length;i++) {
    let id = mynodelist[ne[i]].idnum;
    createcommand = id+",protein,";

    for (let j=0; j<nearray.length; j++) {
      if(nearray[j] in mynodelist[ne[i]]){
        let m = mynodelist[ne[i]][nearray[j]].toString().replace(/\"/g, '');
        createcommand += m +",";
      } else { createcommand += ","}
    }
    createcommand = createcommand.substr(0, createcommand.length-2);
    createcommand += "\n";
    nodestream.write(createcommand);

    if (proteinnames[mynodelist[ne[i]].label] < 30) {
      console.log("A few links: "+mynodelist[ne[i]].label+" "+proteinnames[mynodelist[ne[i]].label]);

    }
  }
  nodestream.close();

  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+"_nodes.csv\" AS line");
  console.log("merge(n:protein {label: line.label})\n");

  var ee = Object.keys(myedgelist);
  let eearray = [...edgeproperties];

  createcommand = "start,end,type,";
  for (let i=0; i<eearray.length; i++) { createcommand += eearray[i]+"," }
  createcommand = createcommand.substr(0, createcommand.length-1);
  edgestream.write(createcommand+"\n");

  for (var j=0;j<ee.length;j++) {
      createcommand = myedgelist[ee[j]].from.toString().replace(/\"/g, '')+","+myedgelist[ee[j]].to.toString().replace(/\"/g, '')+","+experiment+",";

      for (let j=0; j<eearray.length; j++) {
        if(eearray[j] in myedgelist[ee[j]]){
          let m = myedgelist[ee[j]][eearray[j]].toString().replace(/\"/g, '');
          createcommand += m +",";
        } else { createcommand += ","}
      }
      createcommand = createcommand.substr(0, createcommand.length-1);
      edgestream.write(createcommand+"\n");
  }

  console.log("USING PERIODIC COMMIT 500");
  console.log("LOAD CSV WITH HEADERS FROM \"file:///"+prefixfile+"_edges.csv\" AS csvLine");
  console.log("MATCH (s { label: csvLine.start}),(q { label: csvLine.end})");
  console.log("CREATE (s)-[:"+experiment+" {color: csvLine.color, penwidth: csvLine.penwidth }]->(q)\n");
  rl.close();
});
