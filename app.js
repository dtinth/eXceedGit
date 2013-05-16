

var express = require('express')
var shelljs = require('shelljs')
var Q = require('q')

var queue = Q.when(0)

var app = express()
var fs = require('fs')

function random() {
	return Math.random() + '' + Math.random() + '' + new Date()
}

var write = fs.createWriteStream('users.txt', { flags: 'a', encoding: 'utf-8', mode: 0600 })

var nextId = function() {
	var id
	console.log('next id')
	return Q.ninvoke(fs, 'readFile', 'usercount.txt', 'utf-8')
		.then(function(c) { id = parseInt(c, 10) }, function() { id = 0 })
		.then(function() {
			console.log('id')
			return Q.ninvoke(fs, 'writeFile', 'usercount.txt', id + 1 + '')
		})
		.then(function() {
			var a = '000' + (1296 + id).toString(36)
			a = a.substr(a.length - 3)
			var b = '0' + Math.floor(Math.random() * 36).toString(36)
			b = b.substr(b.length - 1)
			return 'git' + a + '1' + b
		})
}

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(express.logger())
app.use(express.cookieParser('derp'))
app.use(express.bodyParser())
app.post('/newuser', function(req, res, next) {
	if (req.param('token') + '' != req.signedCookies.token) {
		res.send(400, 'invalid cookie<br>' + req.param('token') + '<br>' + req.signedCookies.token)
		return
	}
	var work = function(username) {
		console.log('wtf')
		var password = ''
		var chars = 'bcdfghkmnpqrstvwxyz'
		var vowel = 'aeiou'
		for (var i = 0; i < 4; i ++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length))
			password += vowel.charAt(Math.floor(Math.random() * vowel.length))
		}
		console.log(username)
		var defer = Q.defer()
		write.write(username + ':' + password)
		shelljs.exec('./newuser ' + username + ' ' + password, function(code, output) {
			if (code == 0) {
				defer.resolve()
			} else {
				defer.reject(new Error('Cannot create Git user'))
			}
		})
		res.cookie('token', '', { signed: true })
		res.render('success', { username: username, password: password, ip: process.env.IP })
	}
	var fail = function(e) {
		res.send(400, 'error' + e.stack)
	}
	queue = queue.then(nextId).then(work).fail(fail);
})

var ansi2html = require('ansi2html')
app.get('/log/:username', function(req, res, next) {
	if (!req.param('username').match(/^git[a-z0-9]+$/)) {
	  	return next()
	}
	var username = req.param('username')
	res.locals.username = username
	shelljs.exec('./getlog ' + username, { silent: true }, function(code, output) {
	  	if (code != 0) {
		  	return res.render('log', { repo: false })
		}
		output = ansi2html(output)
		return res.render('log', { repo: true, output: output })
	})
})

app.get('/', function(req, res, next) {
	res.set('Pragma', 'no-cache')
	res.set('Cache-Control', 'no-cache')
	var token = random()
	res.cookie('token', token, { signed: true });
	res.render('index', { token: token })
})

app.use(express.static(__dirname + "/static"))
app.listen(80)
