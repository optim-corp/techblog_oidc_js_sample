var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

const { auth } = require('express-openid-connect');
const fetch = require('node-fetch');
require('dotenv').config()

var app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// ===================================
// ここから追記
// ===================================

/**
 * 認証情報
 */
const issuer = 'https://auth.optim.cloud'
const baseURL = 'http://localhost:3000'
const clientId = typeof process.env.CLIENT_ID === "undefined" ? '' : process.env.CLIENT_ID
const clientSecret = typeof process.env.CLIENT_SECRET === "undefined" ? '' : process.env.CLIENT_SECRET

/**
 * 初期化
 */
app.use(auth({
  issuerBaseURL: issuer,
  baseURL: baseURL,         // このアプリケーションのデプロイ先URL（デバッグ時はlocalhostを利用）
  clientID: clientId,
  secret: clientSecret,
  idpLogout: true,
  authRequired: true,       // すべてのRouteにAuthMiddlewareを導入
  routes:{
    callback: "/oauth2/callback"    // Callback Path をカスタム
  },
  authorizationParams: {            // OAuth2.0 フローを行う
    response_type: 'code',
    scope: 'openid user.profile',   // OAuth2.0 で認可させるスコープ
  }
}))

/**
 * Example API （アカウント情報取得）
 */
const accountAPI = 'https://accounts.optimcloudapis.com'
app.get('/', async (req, res) => {

  // DBにUser情報を持つ場合は
  // req.oidc.sub と User情報の紐付けを行うことが出来る
  
  // 認可レスポンスに含まれたAccessTokenを利用する
  let { token_type, access_token } = req.oidc.accessToken;

  // AccountAPIを叩く
  const me = await fetch(accountAPI + '/v2/me', {
    headers: {
      Authorization: `${token_type} ${access_token}`,
    },
  });
  
  res.json(await me.json());
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
