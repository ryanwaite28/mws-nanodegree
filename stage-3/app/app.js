const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');

const app = express();

let main_directory = __dirname + '/client/';
let css_directory = main_directory + '/css/';
let js_directory = main_directory + '/js/';
let img_directory = main_directory + '/img/';

app.use('/', express.static( main_directory ));
app.use('/css', express.static( css_directory ));
app.use('/js', express.static( js_directory ));
app.use('/img', express.static( img_directory ));

nunjucks.configure(main_directory, {
  autoescape: true,
  express: app
});



app.get('/', function(request, response){
  return response.render('index.html');
});



// --- Listen
app.set('port', (process.env.PORT || 8000));
app.listen(app.get('port'), function() {
  console.log('Listening on port ' + app.get('port') + '...');
});
